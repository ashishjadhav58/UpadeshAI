const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./data/translation.json', 'utf-8'));

// Get verse 47 (famous Karma Yoga verse - Chapter 2, Verse 47)
const verse47 = data.filter(d => d.verse_id === 47);

console.log('=== VERSE 47 - Famous Karma Yoga Verse ===\n');
console.log(`Total translations: ${verse47.length}\n`);

verse47.forEach(t => {
  console.log(`\n--- ${t.authorName} (${t.lang}) ---`);
  console.log(t.description);
});

// Check a practical life advice verse
const verse62 = data.filter(d => d.verse_id === 62);
console.log('\n\n=== VERSE 62 - About Desire and Anger ===\n');
console.log(`Total translations: ${verse62.length}\n`);

verse62.forEach(t => {
  if (t.lang === 'english') {
    console.log(`\n--- ${t.authorName} ---`);
    console.log(t.description.substring(0, 300));
  }
});
