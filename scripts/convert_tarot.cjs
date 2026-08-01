const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const FILE_PATH = path.join(__dirname, '../files/tarot/TAROT_data.xlsx');
const OUT_PATH = path.join(__dirname, '../public/files/DATA/tarot.json');

const wb = xlsx.readFile(FILE_PATH);
const sheetName = wb.SheetNames[0];
const rawData = xlsx.utils.sheet_to_json(wb.Sheets[sheetName]);

const parsedData = {};

rawData.forEach(row => {
    if (row['管理番号'] === undefined || typeof row['管理番号'] !== 'number') return;
    
    const originalId = row['管理番号'];
    const id = originalId + 1; // Adjust 0->1 for Fool, up to 21->22 for World
    
    parsedData[id] = {
        id: id,
        name: row['和名'] || '',
        character: row['__EMPTY'] || '',
        scenario: row['登場シナリオ'] || '',
        upright: (row['正位置'] || '').replace(/\\n/g, '\n'),
        reversed: (row['逆位置'] || '').replace(/\\n/g, '\n')
    };
});

const outDir = path.dirname(OUT_PATH);
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(OUT_PATH, JSON.stringify(parsedData, null, 2), 'utf-8');
console.log(`Converted TAROT_data.xlsx to tarot.json`);
