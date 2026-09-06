import charDataJson from '../data/characters.json';

export class PvpEnemyGenerator {
    static CHAR_LIST = [
        { id: '001', name: '紫苑', roleName: '前衛/射撃近接', isDefaultFront: true, color: '#b993ff' },
        { id: '002', name: '蒼樹', roleName: '前衛/大剣連撃', isDefaultFront: true, color: '#66aaff' },
        { id: '003', name: '紅華', roleName: '前衛/双剣突進', isDefaultFront: true, color: '#ff6666' },
        { id: '004', name: '黄蘭', roleName: '後衛/リボン支援', isDefaultFront: false, color: '#ffea77' },
        { id: '005', name: '李乃果', roleName: '後衛/全体回復', isDefaultFront: false, color: '#77ff88' },
        { id: '007', name: 'ななよ', roleName: '後衛/三鈷杵結界', isDefaultFront: false, color: '#ffbb66' },
        { id: '008', name: 'ノア', roleName: '後衛/不死鳥射撃', isDefaultFront: false, color: '#ff7755' },
        { id: '009', name: 'リフィエル', roleName: '前衛/変身槍連撃', isDefaultFront: true, color: '#55ffcc' },
        { id: '010', name: 'プロセル', roleName: '後衛/氷柱範囲', isDefaultFront: false, color: '#88ddff' },
        { id: '011', name: '白蓮', roleName: '後衛/バリア援護', isDefaultFront: false, color: '#ddaaff' }
    ];

    static PRESETS = [
        { id: 1, name: '① 紫苑 単騎 (1人)', party: ['001'] },
        { id: 2, name: '② 蒼樹 ＆ 紅華 (2人)', party: ['002', '003'] },
        { id: 3, name: '③ 紫苑・黄蘭・李乃果 (3人)', party: ['001', '004', '005'] },
        { id: 4, name: '④ 蒼樹・紅華・黄蘭・白蓮 (4人)', party: ['002', '003', '004', '010'] },
        { id: 5, name: '⑤ 5人初期編成 (5人)', party: ['001', '002', '003', '004', '005'] },
        { id: 6, name: '⑥ 10人全員出撃！ (10人)', party: ['001', '002', '003', '004', '005', '007', '008', '009', '010', '011'] }
    ];

    static LANE_PATTERNS = {
        1: [0],
        2: [-1, 1],
        3: [-1, 0, 1],
        4: [-2, -1, 1, 2],
        5: [-2, -1, 0, 1, 2]
    };

    /** 指定されたキャラクターIDリストから敵パーティを生成（最大10人対応） */
    static generateEnemyPartyFromIds(partyIds = ['001'], level = 10) {
        if (!partyIds || partyIds.length === 0) partyIds = ['001'];

        // 1. 各キャラのデフォルト前衛/後衛判定
        const frontCandidates = [];
        const rearCandidates = [];

        for (const charId of partyIds) {
            const charMeta = this.CHAR_LIST.find(c => c.id === charId);
            const isFront = charMeta ? charMeta.isDefaultFront : true;
            if (isFront) {
                frontCandidates.push(charId);
            } else {
                rearCandidates.push(charId);
            }
        }

        // 2. 前衛・後衛の人数調整（各列最大5枠、前衛最小1枠）
        // 前衛が5人を超える場合は超過分を後衛へ
        while (frontCandidates.length > 5) {
            rearCandidates.unshift(frontCandidates.pop());
        }
        // 後衛が5人を超える場合は超過分を前衛へ
        while (rearCandidates.length > 5) {
            frontCandidates.push(rearCandidates.shift());
        }
        // 前衛が0人で後衛がいる場合、後衛から1人を前衛へ
        if (frontCandidates.length === 0 && rearCandidates.length > 0) {
            frontCandidates.push(rearCandidates.shift());
        }

        // 3. レーンの割り当て
        const frontLanes = this.LANE_PATTERNS[frontCandidates.length] || [0];
        const rearLanes = this.LANE_PATTERNS[rearCandidates.length] || [0];

        const enemies = [];

        // 前衛の生成
        for (let i = 0; i < frontCandidates.length; i++) {
            const charId = frontCandidates[i];
            const lane = frontLanes[i] !== undefined ? frontLanes[i] : 0;
            enemies.push(this._createEnemyData(charId, level, lane, true));
        }

        // 後衛の生成
        for (let i = 0; i < rearCandidates.length; i++) {
            const charId = rearCandidates[i];
            const lane = rearLanes[i] !== undefined ? rearLanes[i] : 0;
            enemies.push(this._createEnemyData(charId, level, lane, false));
        }

        return enemies;
    }

    /** キャラクター1人分のステータスデータを構築 */
    static _createEnemyData(charId, level, lane, isFront) {
        const charDef = charDataJson.characters[charId] || charDataJson.characters['001'];
        const charMeta = this.CHAR_LIST.find(c => c.id === charId);
        const displayName = charMeta ? charMeta.name : (charDef.name || '魔法少女');

        const levelBonus = (level - 1) * 0.05;
        const maxHp = Math.floor((charDef.baseHp || 1000) * (1 + levelBonus));
        const maxSp = Math.floor((charDef.baseSp || 500) * (1 + levelBonus));
        const atk = 100 + level * 50;
        const meleeLevel = Math.max(1, Math.min(7, Math.floor(level / 2)));
        const rangedLevel = Math.max(1, Math.min(7, Math.floor(level / 2)));

        return {
            charId: charId,
            name: '敵・' + displayName,
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
        };
    }

    /** 従来のプリセットID指定用メソッド（後方互換） */
    static generateEnemyParty(presetId = 1, level = 10) {
        const preset = this.PRESETS.find(p => p.id === presetId) || this.PRESETS[0];
        return this.generateEnemyPartyFromIds(preset.party, level);
    }
}
