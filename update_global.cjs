const fs = require('fs');
let code = fs.readFileSync('src/systems/GlobalState.js', 'utf8');

const target1 = `            exp: 0,
            affection: 0, // 親愛度
            meleeLevel: 1, // 近接攻撃レベル
            rangedLevel: 1, // 遠隔攻撃レベル
            gachaFails: 0, // 攻撃レベル上昇ガチャのハズレ回数`;

const rep1 = `            exp: 0,
            affection: 0, // 親愛度（旧プロパティ、後方互換のため残す）
            friendships: {}, // 各キャラへの友好度（ID -> 友好度 -10~25）
            friendshipPoints: 0, // 友好度ボーナスポイント
            metCharacters: [], // 一緒に編成したことのあるキャラIDリスト
            meleeLevel: 1, // 近接攻撃レベル
            rangedLevel: 1, // 遠隔攻撃レベル
            gachaFails: 0, // 攻撃レベル上昇ガチャのハズレ回数`;

code = code.split(target1).join(rep1);
code = code.split(target1.replace(/\n/g, '\r\n')).join(rep1.replace(/\n/g, '\r\n'));

const target2 = `    // レベルを上げる処理
    levelUp(charId) {
        const char = this.characters[charId];
        if (!char) return false;

        const reqExp = this.getRequiredExp(char.level);
        const totalAvailable = char.exp + this.stockExp;

        if (totalAvailable >= reqExp) {
            // 必要な経験値をキャラのEXPとストックから差し引く
            let remainingCost = reqExp - char.exp;
            
            if (char.exp >= reqExp) {
                // キャラの所持EXPだけで足りる場合
                char.exp -= reqExp;
            } else {
                // ストックEXPも消費する場合
                char.exp = 0;
                this.stockExp -= remainingCost;
            }

            const oldStats = this.calcStats(charId);

            char.level += 1;

            // レベルアップ後の最大HP
            const newStats = this.calcStats(charId);

            // 上昇分を現在HPにも加算
            char.currentHp += (newStats.maxHp - oldStats.maxHp);
            char.currentSp += (newStats.maxSp - oldStats.maxSp);
            
            return true;
        }
        return false;
    }`;

const rep2 = `    // レベルを上げる処理
    levelUp(charId) {
        const char = this.characters[charId];
        if (!char) return false;

        const reqExp = this.getRequiredExp(char.level);
        const totalAvailable = char.exp + this.stockExp;

        if (totalAvailable >= reqExp) {
            // 必要な経験値をキャラのEXPとストックから差し引く
            let remainingCost = reqExp - char.exp;
            
            if (char.exp >= reqExp) {
                // キャラの所持EXPだけで足りる場合
                char.exp -= reqExp;
            } else {
                // ストックEXPも消費する場合
                char.exp = 0;
                this.stockExp -= remainingCost;
            }

            const oldStats = this.calcStats(charId);

            char.level += 1;
            char.friendshipPoints = (char.friendshipPoints || 0) + 1;

            // レベルアップ後の最大HP
            const newStats = this.calcStats(charId);

            // 上昇分を現在HPにも加算
            char.currentHp += (newStats.maxHp - oldStats.maxHp);
            char.currentSp += (newStats.maxSp - oldStats.maxSp);
            
            return true;
        }
        return false;
    }

    // パーティが組まれたときに、互いに編成履歴を記録する
    recordPartyEncounter(party) {
        if (!party || party.length <= 1) return;
        for (let i = 0; i < party.length; i++) {
            const char = this.characters[party[i]];
            if (!char) continue;
            char.metCharacters = char.metCharacters || [];
            char.friendships = char.friendships || {};
            for (let j = 0; j < party.length; j++) {
                if (i === j) continue;
                const targetId = party[j];
                if (!char.metCharacters.includes(targetId)) {
                    char.metCharacters.push(targetId);
                }
                if (char.friendships[targetId] === undefined) {
                    char.friendships[targetId] = 0;
                }
            }
        }
    }`;

code = code.split(target2).join(rep2);
code = code.split(target2.replace(/\n/g, '\r\n')).join(rep2.replace(/\n/g, '\r\n'));

const target3 = `    // レベルに応じたステータスの計算（レベルごとに元の値の5%上昇）
    calcStats(charId) {
        const char = this.characters[charId];
        if (!char) return null;

        const levelBonus = (char.level - 1) * 0.05;
        return {
            maxHp: Math.floor(char.baseHp * (1 + levelBonus)),
            maxSp: Math.floor(char.baseSp * (1 + levelBonus)),
            atk: Math.floor(char.baseAtk * (1 + levelBonus)),
            reload: Math.floor(char.baseReload)
        };
    }

    // 装備・攻防バフを加味した最終ステータス
    calcFinalStats(charId) {
        const stats = this.calcStats(charId);
        if (!stats) return null;

        const char = this.characters[charId];
        let hpMod = 0;
        let spMod = 0;
        let atkMod = 0;
        let reloadMod = 0;

        // 装備品からの加算
        [char.equipGem, ...char.equipRelics].forEach(equip => {
            if (!equip) return;
            if (!equip.traits) return;
            equip.traits.forEach(trait => {
                if (trait.level === 0) return;
                
                if (trait.name === '生命力UP(%)') {
                    hpMod += trait.level * 0.05;
                } else if (trait.name === '精神力UP(%)') {
                    spMod += trait.level * 0.05;
                } else if (trait.name === '攻撃力UP(%)') {
                    atkMod += trait.level * 0.05;
                } else if (trait.name === 'リロード短縮(%)') {
                    reloadMod += trait.level * 0.02;
                }
            });
        });`;

const rep3 = `    // レベルに応じたステータスの計算（レベルごとに元の値の5%上昇）
    calcStats(charId, party = []) {
        const char = this.characters[charId];
        if (!char) return null;

        let affectionBonus = 0;
        if (party && party.length > 0 && party.includes(charId)) {
            let affection = 0;
            for (const otherId of party) {
                if (otherId === charId) continue;
                const otherChar = this.characters[otherId];
                if (otherChar && otherChar.friendships && otherChar.friendships[charId]) {
                    affection += otherChar.friendships[charId];
                }
            }
            if (affection > 0) {
                affectionBonus = Math.min(0.50, affection / 100.0);
            }
        }

        const levelBonus = (char.level - 1) * 0.05;
        const totalBonus = levelBonus + affectionBonus;
        
        return {
            maxHp: Math.floor(char.baseHp * (1 + totalBonus)),
            maxSp: Math.floor(char.baseSp * (1 + totalBonus)),
            atk: Math.floor(char.baseAtk * (1 + totalBonus)),
            reload: Math.floor(char.baseReload)
        };
    }

    // 装備・攻防バフを加味した最終ステータス
    calcFinalStats(charId, party = []) {
        const stats = this.calcStats(charId, party);
        if (!stats) return null;

        const char = this.characters[charId];
        let hpMod = 0;
        let spMod = 0;
        let atkMod = 0;
        let reloadMod = 0;

        // 装備品からの加算
        [char.equipGem, ...char.equipRelics].forEach(equip => {
            if (!equip) return;
            if (!equip.traits) return;
            equip.traits.forEach(trait => {
                if (trait.level === 0) return;
                
                if (trait.name === '生命力UP(%)') {
                    hpMod += trait.level * 0.05;
                } else if (trait.name === '精神力UP(%)') {
                    spMod += trait.level * 0.05;
                } else if (trait.name === '攻撃力UP(%)') {
                    atkMod += trait.level * 0.05;
                } else if (trait.name === 'リロード短縮(%)') {
                    reloadMod += trait.level * 0.02;
                }
            });
        });`;

code = code.split(target3).join(rep3);
code = code.split(target3.replace(/\n/g, '\r\n')).join(rep3.replace(/\n/g, '\r\n'));

fs.writeFileSync('src/systems/GlobalState.js', code, 'utf8');
console.log('Update GlobalState Complete');
