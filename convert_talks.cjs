const fs = require('fs');
const xlsx = require('xlsx');
const path = require('path');

const chrDir = path.join(__dirname, 'files', 'CHR');
const files = fs.readdirSync(chrDir).filter(f => f.startsWith('talk_') && f.endsWith('.xlsx'));

for (const file of files) {
    const filePath = path.join(chrDir, file);
    const wb = xlsx.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    const talkData = {};
    for (const row of rows) {
        if (!row || row.length < 2) continue;
        const key = String(row[0]).trim();
        const text = String(row[1]).trim();
        if (!key || !text) continue;
        // Ignore header/comments which don't match typical keys
        if (key.length > 20) continue; // heuristic
        
        if (!talkData[key]) {
            talkData[key] = [];
        }
        talkData[key].push(text);
    }
    
    // Output JSON with the same base name, except 蒼樹 -> 青樹 for compatibility if needed.
    // Wait, let's just use the exact base name, and we will update BootScene.js if needed.
    let baseName = file.replace('.xlsx', '');
    if (baseName === 'talk_蒼樹') baseName = 'talk_青樹'; // Keep compatibility with BootScene.js
    
    const outPath = path.join(chrDir, baseName + '.json');
    fs.writeFileSync(outPath, JSON.stringify(talkData, null, 2), 'utf8');
    console.log(`Converted ${file} to ${baseName}.json`);
}
