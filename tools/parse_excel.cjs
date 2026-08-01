const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const EXCEL_PATH = path.join(__dirname, '../files/DATA/CHR_data.xlsx');
const OUT_PATH = path.join(__dirname, '../src/data/characters.json');

const workbook = xlsx.readFile(EXCEL_PATH);
const characters = {};

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

    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    let baseHp = 0, baseSp = 0, baseAtk = 0, weight = 0;

    for (const row of data) {
        if (!row || !row.length) continue;
        if (row[0] === '基本生命力') baseHp = Number(row[1]) || 0;
        if (row[0] === '基本精神力') baseSp = Number(row[1]) || 0;
        if (row[0] === '基本攻撃力') baseAtk = Number(row[1]) || 0;
        if (row[0] === '体重') weight = Number(row[1]) || 0;
    }

    const patterns = { far: {}, near: {} };
    let inPattern = false;
    let currentHeader = {};

    for (const row of data) {
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
                idxSpeed: row.indexOf('弾丸速度'),
                idxRange: row.findIndex(c => typeof c === 'string' && c.startsWith('射程')),
                idxStepDist: row.indexOf('踏み込み'),
                idxKnockback: row.findIndex(c => typeof c === 'string' && c.startsWith('ノックバック')),
                idxWeaponRange: row.indexOf('武器の射程'),
                seenKeys: new Set()
            };
            continue;
        }

        if (inPattern && typeof row[0] === 'string' && row[0].startsWith('特技')) {
            inPattern = false;
            continue;
        }

        if (inPattern) {
            const level = row[currentHeader.idxLevel];
            const pType = row[currentHeader.idxType]; 
            
            if (typeof level === 'number' && pType) {
                const typeKey = pType === '遠距離' ? 'far' : (pType === '近距離' ? 'near' : null);
                if (typeKey) {
                    const key = typeKey + '_' + level;
                    if (!currentHeader.seenKeys.has(key)) {
                        currentHeader.seenKeys.add(key);
                        patterns[typeKey][level] = []; // Clear old data from previous tables
                    }
                    
                    const name = row[currentHeader.idxName] || "";
                    const power = currentHeader.idxPower >= 0 ? (Number(row[currentHeader.idxPower]) || 0) : 0;
                    const reload = currentHeader.idxReload >= 0 ? (Number(row[currentHeader.idxReload]) || 0) : 0;
                    const count = currentHeader.idxCount >= 0 ? (Number(row[currentHeader.idxCount]) || 1) : 1;
                    let speed = currentHeader.idxSpeed >= 0 ? (Number(row[currentHeader.idxSpeed]) || 0) : 0;
                    const range = currentHeader.idxRange >= 0 ? (Number(row[currentHeader.idxRange]) || 0) : 0;
                    const stepDist = currentHeader.idxStepDist >= 0 ? (Number(row[currentHeader.idxStepDist]) || 0) : 0;
                    const knockback = currentHeader.idxKnockback >= 0 ? (Number(row[currentHeader.idxKnockback]) || 0) : 0;
                    
                    let weaponRange = range;
                    if (currentHeader.idxWeaponRange >= 0) {
                        weaponRange = Number(row[currentHeader.idxWeaponRange]) || 0;
                    }
                    
                    let isPiercing = false;
                    for (const cell of row) {
                        if (typeof cell === 'string' && cell.includes('貫通') && !cell.includes('貫通しない')) {
                            isPiercing = true;
                        }
                    }

                    // typeとspeedの調整
                    let type = `weapon_${charId}`;
                    if (name === 'リロード') {
                        type = 'reload';
                    } else if (name.includes('キック')) {
                        type = 'kick';
                    } else if (name.includes('振り') || name.includes('回し') || name.includes('リボン')) {
                        type = `swing_${charId}`;
                        speed = 0; // スイング扱いにするためspeed=0に強制
                    }
                    // ナイフ（紫苑の近接）があればスイング扱いにするが、名前で判定する
                    if (charId === '001' && name.includes('ナイフ')) {
                        type = `swing_${charId}`;
                        speed = 0;
                    }

                    patterns[typeKey][level].push({
                        name, type, power, reload, count, speed, range, stepDist, knockback, weaponRange, isPiercing
                    });
                }
            }
        }
    }

    characters[charId] = {
        name: sheetName, baseHp, baseSp, baseAtk, weight, patterns
    };
}

fs.writeFileSync(OUT_PATH, JSON.stringify({ characters }, null, 2));
console.log('Parsed successfully to', OUT_PATH);
