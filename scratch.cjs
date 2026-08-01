const fs = require('fs');
const data = JSON.parse(fs.readFileSync('src/data/characters.json', 'utf8'));
for (const [id, char] of Object.entries(data.characters)) {
    if (char.ultimate) {
        console.log(`Char ${id} ultimate:`, char.ultimate);
    } else {
        console.log(`Char ${id} ultimate not found in json`);
    }
}
