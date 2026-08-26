const fs = require('fs');
const path = require('path');

/**
 * Maps Pinecone verse ids → chapter / in-chapter verse / Sanskrit text.
 * Looked up at runtime so we can cite sources without re-ingesting the index.
 */
let verseById = null;

function loadVerseIndex() {
  if (verseById) return verseById;

  const filePath = path.join(__dirname, '../data/verse.json');
  const verses = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  verseById = new Map();

  for (const v of verses) {
    verseById.set(Number(v.id), {
      id: Number(v.id),
      chapter: Number(v.chapter_number),
      verse: Number(v.verse_number),
      sanskrit: (v.text || '').trim(),
      transliteration: (v.transliteration || '').trim(),
      reference: `Bhagavad Gita ${v.chapter_number}.${v.verse_number}`,
    });
  }

  return verseById;
}

/**
 * Attach chapter/verse citation fields to a retrieved verse object.
 * Accepts either `{ score, verse: {...} }` or a bare verse-like object.
 */
function enrichVerseSource(item) {
  const index = loadVerseIndex();
  const isWrapped = item && item.verse && typeof item.verse === 'object';
  const verse = isWrapped ? item.verse : item;
  const id = Number(verse?.id ?? verse?.verseNumber);
  const meta = index.get(id) || {};

  const enriched = {
    id: id || verse?.id,
    verseNumber: verse?.verseNumber ?? id,
    chapter: meta.chapter ?? null,
    verse: meta.verse ?? null,
    reference: meta.reference || (id ? `Verse ${id}` : null),
    sanskrit: meta.sanskrit || '',
    transliteration: meta.transliteration || '',
    translation: verse?.translation || '',
    meaning: verse?.meaning || '',
    explanation: verse?.explanation || '',
  };

  if (isWrapped) {
    return {
      score: item.score,
      verse: enriched,
    };
  }

  return enriched;
}

function enrichSearchResults(results) {
  return (results || []).map(enrichVerseSource);
}

module.exports = {
  loadVerseIndex,
  enrichVerseSource,
  enrichSearchResults,
};
