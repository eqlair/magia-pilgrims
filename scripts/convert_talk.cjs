const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const CHR_DIR = path.join(__dirname, '../files/CHR');

// Read all files in the CHR directory
const files = fs.readdirSync(CHR_DIR);

const talkFiles = files.filter(f => f.startsWith('talk_') && f.endsWith('.xlsx') && !f.startsWith('~$'));

talkFiles.forEach(file => {
    const filePath = path.join(CHR_DIR, file);
    const wb = xlsx.readFile(filePath);
    const sheetName = wb.SheetNames[0];
    const rawData = xlsx.utils.sheet_to_json(wb.Sheets[sheetName]);
    
    // Transform data to a cleaner format
    // Map the key (which is a long string) and the value (`__EMPTY`)
    const parsedData = {};
    
    rawData.forEach(row => {
        const keys = Object.keys(row);
        const condition = row[keys[0]];
        const text = row['__EMPTY'];
        
        if (condition && text) {
            if (!parsedData[condition]) {
                parsedData[condition] = [];
            }
            parsedData[condition].push(text);
        }
    });
    
    const baseName = path.basename(file, '.xlsx');
    const outPath = path.join(CHR_DIR, `${baseName}.json`);
    
    fs.writeFileSync(outPath, JSON.stringify(parsedData, null, 2), 'utf-8');
    console.log(`Converted ${file} to ${baseName}.json`);
});

console.log('Done converting talk files.');
