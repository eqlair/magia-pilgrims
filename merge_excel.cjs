
const fs = require('fs');
const xlsx = require('xlsx');
const path = require('path');

const EXCEL_PATH = path.join(__dirname, 'files/DATA/CHR_data.xlsx');
const JSON_PATH = path.join(__dirname, 'src/data/characters.json');

const workbook = xlsx.readFile(EXCEL_PATH);
const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

const targetSheets = {
    '10紫苑': '001',
    '12蒼樹': '002',
    '9紅華': '003',
    '4黄蘭': '004',
    '15李乃果data': '005'
};

for (const sheetName in targetSheets) {
    const charId = targetSheets[sheetName];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    let inPattern = false;
    let currentHeader = {};
    for (const row of rows) {
        if (!row || !row.length) continue;
        const hasLevel = row.includes('レベル');
        const hasType = row.includes('種別');
        if (hasLevel && hasType) {
            inPattern = true;
            currentHeader = {
                idxLevel: row.indexOf('レベル'),
                idxType: row.indexOf('種別'),
                idxName: row.indexOf('種別') + 1,
                idxPower: row.findIndex(c => typeof c === 'string' && c.startsWith('威力')),
                idxReload: row.indexOf('リロード'),
                idxCount: row.indexOf('連続回数'),
                idxSpeed: row.findIndex(c => typeof c === 'string' && c.startsWith('弾丸速度')),
                idxRange: row.findIndex(c => typeof c === 'string' && c.startsWith('射程')),
                idxStepDist: row.indexOf('踏み込み'),
                idxKnockback: row.findIndex(c => typeof c === 'string' && c.startsWith('ノックバック'))
            };
            continue;
        }
        if (inPattern && typeof row[0] === 'string' && row[0].startsWith('特技')) {
            inPattern = false; continue;
        }
        if (inPattern) {
            const level = row[currentHeader.idxLevel];
            const pType = row[currentHeader.idxType]; 
            if (typeof level === 'number' && pType) {
                const typeKey = pType === '遠距離' ? 'far' : (pType === '近距離' ? 'near' : null);
                if (!typeKey) continue;
                
                const name = row[currentHeader.idxName] || '';
                
                if (data.characters[charId].patterns && data.characters[charId].patterns[typeKey] && data.characters[charId].patterns[typeKey][level]) {
                    const attacks = data.characters[charId].patterns[typeKey][level];
                    const attackToUpdate = attacks.find(a => a.name === name);
                    if (attackToUpdate) {
                        if (currentHeader.idxPower >= 0) attackToUpdate.power = Number(row[currentHeader.idxPower]) || 0;
                        if (currentHeader.idxReload >= 0) attackToUpdate.reload = Number(row[currentHeader.idxReload]) || 0;
                        if (currentHeader.idxCount >= 0) attackToUpdate.count = Number(row[currentHeader.idxCount]) || 1;
                        if (currentHeader.idxSpeed >= 0) attackToUpdate.speed = Number(row[currentHeader.idxSpeed]) || 0;
                        if (currentHeader.idxRange >= 0) attackToUpdate.range = Number(row[currentHeader.idxRange]) || 0;
                        if (currentHeader.idxStepDist >= 0) attackToUpdate.stepDist = Number(row[currentHeader.idxStepDist]) || 0;
                        if (currentHeader.idxKnockback >= 0) attackToUpdate.knockback = Number(row[currentHeader.idxKnockback]) || 0;
                        
                        // Parse some notes if needed for shotCount/spread
                        const notes = row.slice(6).filter(c => typeof c === 'string' && c.length > 5).join(' ');
                        if (charId === '004' && name === 'ショットガン') {
                            if (notes.includes('4発')) attackToUpdate.shotCount = 4;
                            if (notes.includes('5発')) attackToUpdate.shotCount = 5;
                            if (notes.includes('15度')) attackToUpdate.spread = 15;
                            if (notes.includes('20度')) attackToUpdate.spread = 20;
                            if (notes.includes('30度')) attackToUpdate.spread = 30;
                            if (notes.includes('35度')) attackToUpdate.spread = 35;
                            if (notes.includes('90%の確率')) attackToUpdate.stunChance = 0.9;
                            else if (notes.includes('80%の確率')) attackToUpdate.stunChance = 0.8;
                            else if (notes.includes('75%の確率')) attackToUpdate.stunChance = 0.75;
                        }
                    }
                }
            }
        }
    }
}
fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2));
console.log('Merged successfully!');

