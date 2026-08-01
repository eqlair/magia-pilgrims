const fs = require('fs');
let code = fs.readFileSync('src/scenes/CampScene.js', 'utf8');

code = code.replace(/fontFamily: 'sans-serif'/g, 'stroke: \'#000000\', strokeThickness: 3, fontFamily: \'sans-serif\'');

fs.writeFileSync('src/scenes/CampScene.js', code, 'utf8');
console.log('Replaced styles.');
