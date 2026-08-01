const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const wb = xlsx.readFile(path.join(__dirname, '../files/DATA/CHR_data.xlsx'));
const sheets = ['10紫苑', '12蒼樹', '9紅華', '4黄蘭', '15李乃果data'];
const charIds = ['001', '002', '003', '004', '005'];

const output = {
    characters: {}
};

sheets.forEach((sName, idx) => {
    const sh = wb.Sheets[sName];
    if(!sh) return;
    const rows = xlsx.utils.sheet_to_json(sh, {header:1, defval:''});
    const charId = charIds[idx];
    
    let hp = 1000, sp = 1000, atk = 100, weight = 50;
    rows.forEach(r => {
        if(r[0] === '基本生命力') hp = parseFloat(r[1]);
        if(r[0] === '基本精神力') sp = parseFloat(r[1]);
        if(r[0] === '基本攻撃力') atk = parseFloat(r[1]);
        if(r[0] === '体重' || r[0] === '重量' || r[0] === 'weight') weight = parseFloat(r[1]);
    });

    const patterns = { far: {}, near: {} };
    for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const lvl = parseInt(r[0]);
        if (lvl >= 1 && lvl <= 7) {
            const typeStr = r[1];
            if (typeStr === '遠距離' || typeStr === '近距離') {
                const type = typeStr === '遠距離' ? 'far' : 'near';
                if (!patterns[type][lvl]) patterns[type][lvl] = [];
                
                const wname = String(r[2]).trim();
                let speed = parseFloat(r[6]) / 50;
                if (isNaN(speed)) speed = 0;

                const pat = {
                    name: wname,
                    power: parseFloat(r[3]),
                    reload: parseFloat(r[4]),
                    count: parseInt(r[5]),
                    speed: speed,
                    range: parseFloat(r[7]),
                    stepDist: type === 'near' ? parseFloat(r[8] || 0) : 0,
                    knockback: type === 'near' ? parseFloat(r[9] || 0) : parseFloat(r[8] || 0)
                };
                
                // Mappings
                if (charId === '001') {
                    if (wname === '弾丸') { pat.type = 'bullet'; pat.size = 0.5; pat.spread = type==='far'?5:1; pat.shotCount = 1; }
                    if (wname === '手りゅう弾') { pat.type = 'grenade'; pat.size = 1.0; pat.spread = 0; pat.shotCount = 1; }
                    if (wname === 'キックしながらのリロード') { pat.type = 'kick'; pat.size = 1.5; pat.isPiercing = true; }
                } else if (charId === '002') {
                    if (wname === '剣投げ' || wname === '剣投げorリロード') { pat.type = 'weapon_002'; pat.size = 1.0; pat.spread = type==='far'?10:0; pat.shotCount = 1; if(type==='near') pat.isPiercing=true; }
                    if (wname === '剣振り') { pat.type = 'swing_002'; pat.size = 1.2; pat.isPiercing = true; pat.swingAngle = 120; pat.swingDur = 0.25; pat.speed = 0; }
                    if (wname === 'リロード') { pat.type = 'reload'; }
                } else if (charId === '003') {
                    if (wname === '槍投げ') { pat.type = 'weapon_003'; pat.size = 1.0; }
                    if (wname === '槍回し') { pat.type = 'swing_003'; pat.size = 1.5; pat.isPiercing = true; pat.swingAngle = 360; pat.swingDur = 0.8; pat.speed = 0; }
                    if (wname === '槍突きorリロード') { pat.type = 'weapon_003'; pat.size = 1.0; }
                    if (wname === 'リロード') { pat.type = 'reload'; }
                } else if (charId === '004') {
                    if (wname === 'ショットガン') { pat.type = 'weapon_004'; pat.size = 0.8; pat.spread = type==='far'?15:30; pat.shotCount = 4; }
                    if (wname === 'リボン') { pat.type = 'swing_004'; pat.size = 1.5; pat.isPiercing = true; pat.swingAngle = 180; pat.swingDur = 0.25; pat.speed = 0; }
                    if (wname === 'リロード') { pat.type = 'reload'; }
                } else if (charId === '005') {
                    if (wname === '光の矢' || wname === '矢') { pat.type = 'weapon_005'; pat.size = 0.5; pat.isPiercing = type==='far'; pat.spread = type==='far'?0:5; pat.shotCount = type==='far'?1:2; }
                    if (wname === 'キックながらのリロード' || wname.includes('キック')) { pat.type = 'kick'; pat.size = 1.5; pat.isPiercing = true; }
                    if (wname === 'リロード') { pat.type = 'reload'; }
                }
                
                const dupIdx = patterns[type][lvl].findIndex(p => p.name === pat.name && p.power === pat.power && p.count === pat.count);
                if (dupIdx !== -1) {
                    patterns[type][lvl][dupIdx] = pat;
                } else {
                    patterns[type][lvl].push(pat);
                }
            }
        }
    }
    
    output.characters[charId] = {
        name: sName,
        baseHp: hp,
        baseSp: sp,
        baseAtk: atk,
        weight: weight,
        patterns: patterns
    };
});

const outPath = path.join(__dirname, '../src/data/characters.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log('Saved to src/data/characters.json');
