import charDataJson from '../data/characters.json';

export class PvpEnemyGenerator {
    static PRESETS = [
        { id: 1, name: '① 紫苑 単騎 (1人)', party: ['001'] },
        { id: 2, name: '② 蒼樹 ＆ 紅華 (2人)', party: ['002', '003'] },
        { id: 3, name: '③ 紫苑・黄蘭・李乃果 (3人)', party: ['001', '004', '005'] },
        { id: 4, name: '④ 蒼樹・紅華・黄蘭・白蓮 (4人)', party: ['002', '003', '004', '010'] },
        { id: 5, name: '⑤ 5人フル編成 (5人)', party: ['001', '002', '003', '004', '005'] },
        { id: 6, name: '⑥ 紫苑 4人 (4人)', party: ['001', '001', '001', '001'] }
    ];

    static DEFAULT_FRONT_ROLES = {
        '001': true,  // 紫苑: 前衛
        '002': true,  // 蒼樹: 前衛 (近接型)
        '003': true,  // 紅華: 前衛 (近接型)
        '004': false, // 黄蘭: 後衛 (支援型)
        '005': false, // 李乃果: 後衛 (後衛型)
        '010': false  // 白蓮: 後衛 (後衛型)
    };

    static DEFAULT_LANES = {
        1: [0],
        2: [-1, 1],
        3: [-1, 0, 1],
        4: [-2, -1, 1, 2],
        5: [-2, -1, 0, 1, 2]
    };

    static generateEnemyParty(presetId = 1, level = 1) {
        const preset = this.PRESETS.find(p => p.id === presetId) || this.PRESETS[0];
        const partyIds = preset.party;
        const lanes = this.DEFAULT_LANES[partyIds.length] || [0];

        const enemies = [];
        for (let i = 0; i < partyIds.length; i++) {
            const charId = partyIds[i];
            const charDef = charDataJson.characters[charId] || charDataJson.characters['001'];
            
            // レベルに応じたステータス計算
            const levelBonus = (level - 1) * 0.05;
            const maxHp = Math.floor((charDef.baseHp || 1000) * (1 + levelBonus));
            const maxSp = Math.floor((charDef.baseSp || 500) * (1 + levelBonus));
            const atk = 100 + level * 50;
            const meleeLevel = Math.ceil(level / 2) + 1;
            const rangedLevel = Math.ceil(level / 2) + 1;

            let isFront = this.DEFAULT_FRONT_ROLES[charId] !== undefined ? this.DEFAULT_FRONT_ROLES[charId] : (i % 2 === 0);
            if (presetId === 6) {
                isFront = (i < 2); // 2人前衛、2人後衛
            }
            const lane = lanes[i] !== undefined ? lanes[i] : 0;

            enemies.push({
                charId: charId,
                name: '敵・' + (charDef.name || '魔法少女'),
                level: level,
                lane: lane,
                isFront: isFront,
                maxHp: maxHp,
                hp: maxHp,
                maxSp: maxSp,
                sp: maxSp,
                atk: atk,
                meleeLevel: meleeLevel,
                rangedLevel: rangedLevel,
                weight: charDef.weight || 50,
                attribute: charDef.attribute || 1
            });
        }
        return enemies;
    }
}
