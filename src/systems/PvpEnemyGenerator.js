import charDataJson from '../data/characters.json';

export class PvpEnemyGenerator {
    static CHAR_LIST = [
        { id: '001', name: '紫苑', roleName: '前衛/射撃近接', isDefaultFront: true, color: '#b993ff' },
        { id: '002', name: '蒼樹', roleName: '前衛/大剣連撃', isDefaultFront: true, color: '#66aaff' },
        { id: '003', name: '紅華', roleName: '前衛/双剣突進', isDefaultFront: true, color: '#ff6666' },
        { id: '004', name: '黄蘭', roleName: '後衛/リボン支援', isDefaultFront: false, color: '#ffea77' },
        { id: '005', name: '李乃果', roleName: '後衛/全体回復', isDefaultFront: false, color: '#77ff88' },
        { id: '006', name: 'さくら', roleName: '前衛/瞬間移動連撃', isDefaultFront: true, color: '#ff77aa' },
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
        { id: 6, name: '⑥ 11人全員出撃！ (11人)', party: ['001', '002', '003', '004', '005', '006', '007', '008', '009', '010', '011'] }
    ];

    static LANE_PATTERNS = {
        1: [0],
        2: [-1, 1],
        3: [-1, 0, 1],
        4: [-2, -1, 1, 2],
        5: [-2, -1, 0, 1, 2],
        6: [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5]
    };

    /** 指定されたキャラクターIDリストから敵パーティを生成（最大10人対応、友好度対応） */
    static generateEnemyPartyFromIds(partyIds = ['001'], level = 10, friendshipsMap = {}) {
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
        const totalCount = frontCandidates.length + rearCandidates.length;
        let frontLanes = [];
        let rearLanes = [];

        if (totalCount <= 5) {
            // 5人以下の場合は、プレイヤー側と同様に前衛と後衛でレーンが絶対に重複しないよう綺麗に配分する
            const fCount = frontCandidates.length;
            const rCount = rearCandidates.length;

            if (totalCount === 5) {
                if (fCount === 5) { frontLanes = [-2, -1, 0, 1, 2]; rearLanes = []; }
                else if (fCount === 4) { frontLanes = [-2, -1, 1, 2]; rearLanes = [0]; }
                else if (fCount === 3) { frontLanes = [-1, 0, 1]; rearLanes = [-2, 2]; }
                else if (fCount === 2) { frontLanes = [-1, 1]; rearLanes = [-2, 0, 2]; }
                else if (fCount === 1) { frontLanes = [0]; rearLanes = [-2, -1, 1, 2]; }
                else { frontLanes = []; rearLanes = [-2, -1, 0, 1, 2]; }
            } else if (totalCount === 4) {
                if (fCount === 4) { frontLanes = [-2, -1, 1, 2]; rearLanes = []; }
                else if (fCount === 3) { frontLanes = [-1, 0, 1]; rearLanes = [2]; }
                else if (fCount === 2) { frontLanes = [-1, 1]; rearLanes = [-2, 2]; }
                else if (fCount === 1) { frontLanes = [0]; rearLanes = [-2, -1, 1]; }
                else { frontLanes = []; rearLanes = [-2, -1, 1, 2]; }
            } else if (totalCount === 3) {
                if (fCount === 3) { frontLanes = [-1, 0, 1]; rearLanes = []; }
                else if (fCount === 2) { frontLanes = [-1, 1]; rearLanes = [0]; }
                else if (fCount === 1) { frontLanes = [0]; rearLanes = [-1, 1]; }
                else { frontLanes = []; rearLanes = [-1, 0, 1]; }
            } else if (totalCount === 2) {
                if (fCount === 2) { frontLanes = [-1, 1]; rearLanes = []; }
                else if (fCount === 1) { frontLanes = [-1]; rearLanes = [1]; }
                else { frontLanes = []; rearLanes = [-1, 1]; }
            } else {
                frontLanes = fCount > 0 ? [0] : [];
                rearLanes = rCount > 0 ? [0] : [];
            }
        } else {
            // 6人以上の場合は各列ごとに独立してレーンを割り振る
            frontLanes = this.LANE_PATTERNS[frontCandidates.length] || [0];
            rearLanes = this.LANE_PATTERNS[rearCandidates.length] || [0];
        }

        const enemies = [];

        // 前衛の生成
        for (let i = 0; i < frontCandidates.length; i++) {
            const charId = frontCandidates[i];
            const lane = frontLanes[i] !== undefined ? frontLanes[i] : 0;
            const charFriendships = friendshipsMap[charId] || {};
            enemies.push(this._createEnemyData(charId, level, lane, true, charFriendships));
        }

        // 後衛の生成
        for (let i = 0; i < rearCandidates.length; i++) {
            const charId = rearCandidates[i];
            const lane = rearLanes[i] !== undefined ? rearLanes[i] : 0;
            const charFriendships = friendshipsMap[charId] || {};
            enemies.push(this._createEnemyData(charId, level, lane, false, charFriendships));
        }

        // 4. 友好度による能力強化ボーナス（HP/SP/ATK最大+50%）の適用
        for (const ep of enemies) {
            let affectionTotal = 0;
            for (const other of enemies) {
                if (other === ep || other.charId === ep.charId) continue;
                if (other.friendships && other.friendships[ep.charId]) {
                    affectionTotal += other.friendships[ep.charId];
                }
            }
            ep.affectionTotal = affectionTotal;
            if (affectionTotal > 0) {
                const affectionBonus = Math.min(0.50, affectionTotal / 100.0);
                ep.affectionBonus = affectionBonus;
                ep.maxHp = Math.floor(ep.maxHp * (1 + affectionBonus));
                ep.hp = ep.maxHp;
                ep.maxSp = Math.floor(ep.maxSp * (1 + affectionBonus));
                ep.sp = ep.maxSp;
                ep.atk = Math.floor(ep.atk * (1 + affectionBonus));
            } else {
                ep.affectionBonus = 0;
            }
        }

        return enemies;
    }

    /** キャラクター1人分のステータスデータを構築 */
    static _createEnemyData(charId, level, lane, isFront, friendships = {}) {
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
            friendships: friendships,
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
