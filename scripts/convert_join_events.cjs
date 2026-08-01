const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const FILE_PATH = path.join(__dirname, '../files/CHR/ev_join.xlsx');
const OUT_PATH = path.join(__dirname, '../public/files/DATA/join_events.json');

const wb = xlsx.readFile(FILE_PATH);
const parsedData = {};

// We want to process these specific sheets
const targetSheets = ['3黄蘭', '8紅華', '11蒼樹', '14李乃果'];

targetSheets.forEach(sheetName => {
    if (!wb.SheetNames.includes(sheetName)) return;

    // Parse the ID out of the sheet name
    const match = sheetName.match(/^(\d+)/);
    if (!match) return;
    
    // The ID in the sheet name is based on tarot Manage ID (0-based originally)
    // Excel sheet says 3黄蘭. 3 + 1 = 4 (Empress).
    // Let's use the ID + 1.
    const originalId = parseInt(match[1], 10);
    const tarotId = originalId + 1; 

    const rawData = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });
    
    const events = [];

    rawData.forEach(row => {
        if (!row || row.length === 0) return;
        
        // Skip header if it exists
        if (row[0] && row[0].includes('表記しない')) {
            // some rows might have text in column 1 instead of 0 if header shifted
            if (row[1]) {
                text = row[1];
            } else {
                return; // ignore header row
            }
        }
        
        let text = row[0] || '';
        // If row[0] is the instruction string, maybe row[1] has the text? 
        // In the dump, the keys were "##[]内の文章は画像や音源の変更等の指示、表記しない "
        // So `row[0]` might be the text. Wait, `{ header: 1 }` makes row an array of strings.
        if (typeof text !== 'string') return;
        text = text.trim();
        if (!text) return;

        // check for [画像：evp005.jpg ／ BGM：JOIN_US.mp3]
        if (text.startsWith('[')) {
            const imgMatch = text.match(/画像：(evp\d+)\.jpg/);
            const bgmMatch = text.match(/BGM：([^\]]+)\.mp3/);
            
            if (imgMatch) {
                events.push({ cmd: 'illust', key: imgMatch[1] });
            }
            if (bgmMatch) {
                events.push({ cmd: 'bgm', key: bgmMatch[1] });
            }
            return;
        }

        // check for Name: text
        // "黄蘭：「……助かったぁ……。" -> "黄蘭"
        let name = '';
        let body = text;
        const nameMatch = text.match(/^(.+?)：(?:「)?(.+)$/);
        if (nameMatch && nameMatch[1] !== '？？？') { // Let's keep ？？？ as name if needed, but it matches anything. Wait, name is anything before ：
            name = nameMatch[1];
            body = nameMatch[2];
            // Remove trailing 」 if it exists
            if (body.endsWith('」')) {
                body = body.slice(0, -1);
            }
        } else if (nameMatch && nameMatch[1] === '？？？') {
            name = '？？？';
            body = nameMatch[2];
            if (body.endsWith('」')) body = body.slice(0, -1);
        } else if (text.startsWith('（') && text.endsWith('）')) {
            // Narrative or SE
            name = '';
        }

        events.push({ cmd: 'text', name: name.trim(), text: body.trim() });
    });

    parsedData[tarotId] = events;
});

const outDir = path.dirname(OUT_PATH);
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(OUT_PATH, JSON.stringify(parsedData, null, 2), 'utf-8');
console.log(`Converted join events to join_events.json`);
