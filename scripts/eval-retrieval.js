/**
 * Retrieval hit-rate evaluation
 *
 * Usage:
 *   node scripts/eval-retrieval.js              # baseline: no LLM rewrite/expand/rerank
 *   node scripts/eval-retrieval.js --rewrite    # rewrite only (then embed)
 *   node scripts/eval-retrieval.js --full       # production: rewrite + expand + rerank
 *   node scripts/eval-retrieval.js --k=10
 *
 * Hit = at least one expectedReferences entry appears in top-k result references.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const vectorStore = require('../lib/vectorStore');

const EVAL_PATH = path.join(__dirname, '../eval/retrieval_eval_set.json');

function parseArgs(argv) {
  const args = { full: false, rewrite: false, k: 5 };
  for (const a of argv.slice(2)) {
    if (a === '--full') args.full = true;
    else if (a === '--rewrite') args.rewrite = true;
    else if (a.startsWith('--k=')) args.k = Number(a.split('=')[1]) || 5;
  }
  return args;
}

function normalizeRef(ref) {
  if (!ref) return '';
  const m = String(ref).match(/(\d+)\s*\.\s*(\d+)/);
  return m ? `${m[1]}.${m[2]}` : String(ref).trim().toLowerCase();
}

function isHit(expectedReferences, retrieved) {
  const got = new Set(
    retrieved.map((r) => normalizeRef(r.verse.reference || `${r.verse.chapter}.${r.verse.verse}`))
  );
  const matched = expectedReferences.filter((e) => got.has(normalizeRef(e)));
  return { hit: matched.length > 0, matched };
}

async function main() {
  const { full, rewrite, k } = parseArgs(process.argv);
  const cases = JSON.parse(fs.readFileSync(EVAL_PATH, 'utf-8'));

  const useRewrite = full || rewrite;
  const useExpansion = full;
  const useRerank = full;

  console.log(`\n📊 Retrieval eval — ${cases.length} queries, topK=${k}`);
  if (full) {
    console.log('Mode: FULL (rewrite + expansion + LLM re-rank)\n');
  } else if (rewrite) {
    console.log('Mode: REWRITE (LLM rewrite before embed; no expand/rerank)\n');
  } else {
    console.log('Mode: FAST (embed + keyword enhance only)\n');
  }

  await vectorStore.initialize();

  const rows = [];
  let hits = 0;

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    process.stdout.write(`[${i + 1}/${cases.length}] ${c.id} ... `);

    try {
      const results = await vectorStore.searchSimilarVerses(c.query, k, {
        skipRewrite: !useRewrite,
        skipExpansion: !useExpansion,
        skipRerank: !useRerank,
        // Eval should see nearest neighbors even if below chat threshold
        applyThreshold: false,
      });

      const { hit, matched } = isHit(c.expectedReferences, results);
      if (hit) hits += 1;

      const topRefs = results
        .slice(0, k)
        .map((r) => `${r.verse.reference}(${(r.score * 100).toFixed(0)}%)`)
        .join(', ');

      console.log(hit ? `HIT [${matched.join(', ')}]` : 'MISS');
      if (!hit) {
        console.log(`   expected: ${c.expectedReferences.join(' | ')}`);
        console.log(`   got:      ${topRefs || '(none)'}`);
      }

      rows.push({
        id: c.id,
        hit,
        matched,
        topRefs: results.slice(0, k).map((r) => r.verse.reference),
      });
    } catch (err) {
      console.log(`ERROR ${err.message}`);
      rows.push({ id: c.id, hit: false, error: err.message });
    }
  }

  const hitRate = cases.length ? (hits / cases.length) * 100 : 0;
  console.log('\n────────────────────────────────────');
  console.log(`Hit-rate: ${hits}/${cases.length} = ${hitRate.toFixed(1)}%`);
  console.log('────────────────────────────────────\n');

  const outPath = path.join(__dirname, '../eval/last_retrieval_report.json');
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        ranAt: new Date().toISOString(),
        mode: full ? 'full' : rewrite ? 'rewrite' : 'fast',
        topK: k,
        hitRate,
        hits,
        total: cases.length,
        rows,
      },
      null,
      2
    )
  );
  console.log(`Wrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
