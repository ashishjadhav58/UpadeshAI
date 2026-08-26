require('dotenv').config();
const fs = require('fs');
const path = require('path');
const vectorStore = require('../lib/vectorStore');

/**
 * CHUNKING GRANULARITY (per-verse, not multi-verse / fixed-token windows)
 * ----------------------------------------------------------------------
 * One Pinecone vector = one Bhagavad Gita shloka (grouped by verse_id).
 *
 * Why per-verse (not paragraph / multi-verse / sliding window)?
 * 1. Natural document unit — each shloka is a self-contained teaching with
 *    its own chapter.verse citation; retrieval must map cleanly to a source.
 * 2. Provenance — top-k hits are individually citable (e.g. "2.47") instead of
 *    a blob spanning several verses that the UI cannot attribute cleanly.
 * 3. Semantic purity — mixing adjacent verses (often different themes) dilutes
 *    the embedding and hurts cosine ranking for emotional/life queries.
 * 4. Corpus size (~701 verses) is small; per-verse recall is affordable and
 *    re-ranking can still consider neighbors if needed later.
 *
 * Trade-off accepted: themes that span consecutive verses may need query
 * expansion / multi-query retrieval rather than larger chunks.
 */
async function ingestData() {
  try {
    console.log('🚀 Starting data ingestion...\n');

    const dataPath = path.join(__dirname, '../data/translation.json');
    const translationData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    // Group translations by verse_id → one chunk per shloka
    const verseMap = new Map();
    
    translationData.forEach(entry => {
      const verseId = entry.verse_id;
      if (!verseMap.has(verseId)) {
        verseMap.set(verseId, {
          id: verseId,
          verseNumber: entry.verseNumber,
          translations: []
        });
      }
      verseMap.get(verseId).translations.push({
        author: entry.authorName,
        lang: entry.lang,
        description: entry.description
      });
    });

    const verses = Array.from(verseMap.values());
    console.log(`📚 Found ${verses.length} unique verses to process (1 vector each)\n`);

    await vectorStore.initialize();

    for (let i = 0; i < verses.length; i++) {
      const verse = verses[i];
      
      // Chunk text = English author commentaries + primary EN/HI display strings
      // (still one verse_id; commentaries enrich the same shloka embedding)
      const englishTranslations = verse.translations
        .filter(t => t.lang === 'english')
        .map(t => `${t.author}: ${t.description}`)
        .join('\n\n');
      
      // Get first Hindi and English translations for display
      const hindiTranslation = verse.translations.find(t => t.lang === 'hindi');
      const englishTranslation = verse.translations.find(t => t.lang === 'english');
      
      const verseData = {
        id: verse.id,
        verseNumber: verse.verseNumber,
        translation: englishTranslation ? englishTranslation.description : '',
        meaning: hindiTranslation ? hindiTranslation.description : '',
        explanation: englishTranslations,
        allTranslations: verse.translations
      };
      
      console.log(`Processing verse ${i + 1}/${verses.length}: Verse ${verse.verseNumber}`);
      
      try {
        await vectorStore.upsertVerse(verseData);
        console.log(`✅ Successfully ingested verse ${verse.id}\n`);
      } catch (error) {
        console.error(`❌ Error ingesting verse ${verse.id}:`, error.message);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n✨ Data ingestion completed successfully!');
    console.log(`📊 Total verses processed: ${verses.length}`);
    
  } catch (error) {
    console.error('❌ Fatal error during ingestion:', error);
    process.exit(1);
  }
}

ingestData();
