const fs = require('fs');
let code = fs.readFileSync('src/systems/BattleEngine.js', 'utf8');

const targetStr = `            // ガチャの処理 (1秒ごと)
            p.gachaTimer = (p.gachaTimer === undefined ? 1.0 : p.gachaTimer) - dt;
            if (p.gachaTimer <= 0) {
                p.gachaTimer += 1.0;
                
                const gs = GlobalState.getInstance();
                const leveledUpType = gs.rollAttackLevelGacha(p.charId, p.isFront);
                if (leveledUpType) {
                    // Sync the new levels to the PlayerCharacter instance so it uses the correct attack patterns
                    const charData = gs.characters[p.charId];
                    if (charData) {
                        p.nearLevel = charData.meleeLevel;
                        p.farLevel = charData.rangedLevel;
                        p.wlv = p.nearLevel + p.farLevel;
                        p.updateAttackPatterns();
                        
                        // 基本攻撃力やリロードなど最新ステータスを再計算して反映する
                        const newStats = gs.calcStats(p.charId, this.config.party);
                        if (newStats) {
                            p.atk = newStats.atk || p.charDef.baseAtk || 100;
                            p.reloadStat = newStats.reload || 100;
                        }
                    }

                    const textStr = (leveledUpType === 'melee') ? 'MELEE LV UP!' : 'RANGED LV UP!';
                    this.floatingTexts.push({
                        id: ++this.floatingTextIdCounter,
                        x: p.x, yOffset: 2, z: p.z,
                        amount: textStr, type: 'heal', lifeTime: 1.5, maxLife: 1.5 // heal(緑文字)を流用するか独自色
                    });
                }
            }`;

const newStr = `            // ガチャ処理はループ外に移動`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, newStr);
    
    // Add the global gacha timer logic after the players loop
    const playersLoopEnd = `        for (const p of this.players) {
            p.update(dt);
            
            // ガチャ処理はループ外に移動
        }`;
        
    const globalGachaLogic = `        for (const p of this.players) {
            p.update(dt);
        }

        // ガチャの処理 (パーティ全体で1秒ごと)
        this.globalGachaTimer = (this.globalGachaTimer === undefined ? 1.0 : this.globalGachaTimer) - dt;
        if (this.globalGachaTimer <= 0) {
            this.globalGachaTimer += 1.0;
            const candidates = [...this.players, null]; // Add one 'hazure' candidate
            const winnerIndex = Math.floor(Math.random() * candidates.length);
            const winner = candidates[winnerIndex];
            
            if (winner) {
                const gs = GlobalState.getInstance();
                const leveledUpType = gs.rollAttackLevelGacha(winner.charId, winner.isFront);
                if (leveledUpType) {
                    const charData = gs.characters[winner.charId];
                    if (charData) {
                        winner.nearLevel = charData.meleeLevel;
                        winner.farLevel = charData.rangedLevel;
                        winner.wlv = winner.nearLevel + winner.farLevel;
                        winner.updateAttackPatterns();
                        
                        const newStats = gs.calcStats(winner.charId, this.config.party);
                        if (newStats) {
                            winner.atk = newStats.atk || winner.charDef.baseAtk || 100;
                            winner.reloadStat = newStats.reload || 100;
                        }
                    }

                    const textStr = (leveledUpType === 'melee') ? 'MELEE LV UP!' : 'RANGED LV UP!';
                    this.floatingTexts.push({
                        id: ++this.floatingTextIdCounter,
                        x: winner.x, yOffset: 2, z: winner.z,
                        amount: textStr, type: 'heal', lifeTime: 1.5, maxLife: 1.5
                    });
                    
                    if (!gs.levelUpLogs) gs.levelUpLogs = [];
                    const typeStr = leveledUpType === 'melee' ? '近接' : '遠隔';
                    gs.levelUpLogs.push({ charId: winner.charId, text: \`\${typeStr}攻撃レベルが上がった\` });
                }
            }
        }`;
        
    code = code.replace(playersLoopEnd, globalGachaLogic);
    
    // reset logs in setup
    code = code.replace('this.earnedExp = 0;', 'this.earnedExp = 0;\n        GlobalState.getInstance().levelUpLogs = [];');
    
    fs.writeFileSync('src/systems/BattleEngine.js', code, 'utf8');
    console.log('Successfully updated BattleEngine.js');
} else {
    console.log('Could not find targetStr!');
}
