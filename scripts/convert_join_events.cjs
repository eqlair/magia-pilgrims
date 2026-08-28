const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const FILE_PATH = path.join(__dirname, '../files/CHR/ev_join.xlsx');
const OUT_PATH = path.join(__dirname, '../public/files/DATA/join_events.json');

const wb = xlsx.readFile(FILE_PATH);
const parsedData = {};

// We want to process these specific sheets
const sheetConfigs = [
    { sheetName: '0ななよ', tarotId: '1', charId: '007' },
    { sheetName: '3黄蘭', tarotId: '4', charId: '004' },
    { sheetName: '0ノア', tarotId: '5', charId: '008' },
    { sheetName: '4ﾉｱ', tarotId: '5', charId: '008' },
    { sheetName: '8紅華', tarotId: '9', charId: '003' },
    { sheetName: '009白蓮', tarotId: '10', charId: '010' },
    { sheetName: '11蒼樹', tarotId: '12', charId: '002' },
    { sheetName: '14李乃果', tarotId: '15', charId: '005' }
];

sheetConfigs.forEach(cfg => {
    if (!wb.SheetNames.includes(cfg.sheetName)) return;

    const rawData = xlsx.utils.sheet_to_json(wb.Sheets[cfg.sheetName], { header: 1 });
    const events = [];

    rawData.forEach(row => {
        if (!row || row.length === 0) return;
        
        let text = row[0] || '';
        if (typeof text !== 'string') text = String(text);
        
        // Skip header if it exists
        if (text.includes('表記しない')) {
            if (row[1]) {
                text = String(row[1]);
            } else {
                return; // ignore header row
            }
        }
        
        text = text.trim();
        if (!text) return;

        // check for [画像：evp007.jpg ／ BGM：JOIN_US.mp3]
        if (text.startsWith('[')) {
            const imgMatch = text.match(/画像：(evp\d+)\.jpg/i);
            const bgmMatch = text.match(/BGM：([^\]]+)\.mp3/i);
            
            if (imgMatch) {
                events.push({ cmd: 'illust', key: imgMatch[1] });
            }
            if (bgmMatch) {
                events.push({ cmd: 'bgm', key: bgmMatch[1] });
            }
            return;
        }

        // check for Name: text
        let name = '';
        let body = text;
        const nameMatch = text.match(/^(.+?)：(?:「)?(.+)$/);
        if (nameMatch) {
            name = nameMatch[1];
            body = nameMatch[2];
            if (body.endsWith('」')) {
                body = body.slice(0, -1);
            }
        } else if (text.startsWith('「') && text.endsWith('」')) {
            body = text.slice(1, -1);
        }

        events.push({ cmd: 'text', name: name.trim(), body: body.trim(), text: body.trim() });
    });

    if (events.length > 0) {
        parsedData[cfg.tarotId] = events;
        parsedData[cfg.charId] = events;
        console.log(`Parsed sheet: ${cfg.sheetName} -> tarotId: ${cfg.tarotId}, charId: ${cfg.charId} (${events.length} events)`);
    }
});

const outDir = path.dirname(OUT_PATH);
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(OUT_PATH, JSON.stringify(parsedData, null, 2), 'utf-8');
console.log(`Converted join events to join_events.json`);

