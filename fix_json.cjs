const fs = require('fs');
const path = 'src/data/characters.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

const kouka = data.characters['003'];
if (kouka && kouka.patterns && kouka.patterns.near) {
    const near1 = kouka.patterns.near['1'];
    if (near1 && near1.length > 2) {
        // Remove the bad duplicate!
        kouka.patterns.near['1'] = near1.filter(a => !(a.name === '槍突きorリロード' && a.stepDist > 10));
    }
}

for (const charId in data.characters) {
    const char = data.characters[charId];
    if (char && char.patterns) {
        for (const category in char.patterns) {
            for (const level in char.patterns[category]) {
                const actions = char.patterns[category][level];
                if (Array.isArray(actions)) {
                    for (const action of actions) {
                        if (action.stepDist > 10) {
                            action.knockback = action.stepDist;
                            action.stepDist = 0.75;
                        }
                    }
                }
            }
        }
    }
}

fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log("Done");
