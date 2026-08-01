const fs = require('fs');
let code = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
let lines = code.split('\n');
// Delete lines 389 to 477 (which are indices 388 to 476)
lines.splice(388, 89);
fs.writeFileSync('src/scenes/BattleScene.js', lines.join('\n'), 'utf8');
console.log('Deleted lines');
