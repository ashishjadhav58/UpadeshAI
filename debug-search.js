require('dotenv').config();
const vectorStore = require('./lib/vectorStore');

async function debugSearch() {
  await vectorStore.initialize();
  
  const query = "I have a big presentation tomorrow and I am so anxious I cannot sleep. What if I fail? What if everyone judges me? I keep thinking about all the things that could go wrong.";
  
  console.log('Query:', query);
  console.log('\nSearching for relevant verses...\n');
  
  const results = await vectorStore.searchSimilarVerses(query, 10);
  
  results.forEach((result, i) => {
    console.log(`\n=== Result ${i + 1} ===`);
    console.log(`Verse Number: ${result.verse.verseNumber}`);
    console.log(`Score: ${(result.score * 100).toFixed(1)}%`);
    console.log(`Translation: ${result.verse.translation.substring(0, 100)}...`);
    console.log(`Meaning: ${result.verse.meaning.substring(0, 100)}...`);
  });
  
  process.exit(0);
}

debugSearch();
