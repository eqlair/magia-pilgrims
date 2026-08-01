import { PlayerCharacter, EnemyCharacter, BossCharacter, Bullet, EffectEntity } from './BattleEntities';
import { GlobalState } from './GlobalState';

// 防御側から見た属性防御力（例: 赤(防御)は紫(攻撃)から75%ダメージを受ける）
const ATTR_DEF = {
    'red':    { 'red': 100, 'purple': 75,  'green': 100, 'yellow': 100, 'blue': 125 },
    'purple': { 'red': 125, 'purple': 100, 'green': 75,  'yellow': 100, 'blue': 100 },
    'green':  { 'red': 100, 'purple': 125, 'green': 100, 'yellow': 75,  'blue': 100 },
    'yellow': { 'red': 100, 'purple': 100, 'green': 125, 'yellow': 100, 'blue': 75  },
    'blue':   { 'red': 75,  'purple': 100, 'green': 100, 'yellow': 125, 'blue': 100 }
};

export const ENEMY_TYPES = [
    { id: 1, name: 'スウォーム', spawnCount: 9, hp: 15, speed: 100, moveDist: 6.0, moveInterval: 0.5, atkRange: 3.0, atkFreq: 0.5, atkPower: 1, weight: 5, debuffResist: 0, size: 0.5, textureKey: 'en003', frame: 0 },
    { id: 2, name: 'フライ', spawnCount: 4, hp: 30, speed: 75, moveDist: 4.5, moveInterval: 0.45, atkRange: 4.0, atkFreq: 0.5, atkPower: 1, weight: 10, debuffResist: 0, size: 0.75, textureKey: 'en003', frame: 1 },
    { id: 3, name: 'スピリット', spawnCount: 8, hp: 50, speed: 55, moveDist: 6.0, moveInterval: 0.4, atkRange: 4.0, atkFreq: 0.5, atkPower: 1, weight: 45, debuffResist: 50, size: 1.0, textureKey: 'en003', frame: 2 },
    { id: 4, name: 'マノウォー', spawnCount: 3, hp: 30, speed: 60, moveDist: 6.0, moveInterval: 0.3, atkRange: 8.0, atkFreq: 1.0, atkPower: 1, weight: 15, debuffResist: 50, size: 1.0, textureKey: 'en003', frame: 3 },
    { id: 5, name: 'ゴブリン', spawnCount: 8, hp: 50, speed: 50, moveDist: 3.0, moveInterval: 0.25, atkRange: 4.0, atkFreq: 1.0, atkPower: 1, weight: 35, debuffResist: 0, size: 0.5, textureKey: 'en001', frame: 2 },
    { id: 6, name: 'コボルド', spawnCount: 6, hp: 90, speed: 40, moveDist: 4.5, moveInterval: 0.35, atkRange: 4.0, atkFreq: 1.0, atkPower: 1, weight: 55, debuffResist: 50, size: 0.75, textureKey: 'en002', frame: 3 },
    { id: 7, name: 'オーク', spawnCount: 6, hp: 90, speed: 30, moveDist: 3.9, moveInterval: 0.5, atkRange: 8.0, atkFreq: 2.0, atkPower: 1, weight: 75, debuffResist: 0, size: 0.75, textureKey: 'en001', frame: 0 },
    { id: 8, name: 'オーガ', spawnCount: 3, hp: 125, speed: 25, moveDist: 3.6, moveInterval: 0.35, atkRange: 8.0, atkFreq: 2.0, atkPower: 1, weight: 110, debuffResist: 50, size: 1.0, textureKey: 'en002', frame: 2 },
    { id: 9, name: 'ゴーレム', spawnCount: 1, hp: 250, speed: 25, moveDist: 3.6, moveInterval: 0.6, atkRange: 8.0, atkFreq: 2.0, atkPower: 1, weight: 110, debuffResist: 50, size: 1.25, textureKey: 'en002', frame: 1 }
];

export class BattleEngine {
    constructor() {
        this.players = [];
        this.enemies = [];
        this.bullets = [];
        this.effects = [];
        this.floatingTexts = [];
        this.floatingTextIdCounter = 0;
        this.time = 0;
        this.waveTime = 0;
        this.earnedExp = 0;
        this.earnedSp = 0;
        this.eventQueue = []; // 'warning' などのイベント通知用
        this.linkedUltimateQueue = [];
        this.linkedUltimateTimer = 0;
        this.totalDamage = 0;       // DPS計算用：累計ダメージ
        this.damageHistory = [];    // DPS計算用：[{time, damage}] の履歴
        this.maxDps = 0;            // DPS最大値
    }

    setup(config, chrData) {
        this.config = config || {};
        this.rule = this.config.rule || 0;
        this.enemyAttribute = this.config.attribute || 'red';
        this.enemyCountPerWave = this.config.enemyCount || 10;
        // 味方が増えると敵も増える（主人公1人基準で+1人につき+15体）
        const partySize = (this.config.party || ['001']).length;
        this.enemyCountPerWave += Math.max(0, partySize - 1) * 15;
        const gs = GlobalState.getInstance();
        this.totalWaves = Math.max(1, (this.config.waveCount || 1) + gs.extraWaves);
        this.majoLevel = Math.max(0, (this.config.majoLevel || 0) + gs.extraWitchLevel);
        this.enemyLevel = Math.max(1, (this.config.enemyLevel || 1) + gs.extraEnemyLevel);
        this.earnedExp = 0;
        this.earnedSp = 0;
        this.totalDamage = 0;
        this.damageHistory = [];
        this.maxDps = 0;
        gs.levelUpLogs = [];

        this.currentWave = 1;
        this.spawnedInWave = 0;
        this.waveState = 'intermission'; // 'playing', 'intermission', 'boss', 'cleared'
        this.waveTimer = 3.0; // 最初のウェーブまでの待機時間
        this.spawnTimer = 5.0;

        // 突破モード(rule=2)パラメータ
        this.breakthroughDist = 0;
        this.breakthroughTarget = this.config.breakthroughTarget || 42195;
        this.advanceSpeed = 0;
        this.spawnInterval = this.config.spawnInterval !== undefined ? this.config.spawnInterval : 0.2;



        // パーティ情報を取得
        const party = this.config.party || ['001'];
        this.players = [];

        // レーン配置 (-2, -1, 0, 1, 2)
        const laneOffsets = [0, -1, 1, -2, 2];
        
        for (let i = 0; i < party.length && i < 5; i++) {
            const charId = party[i];
            const data = chrData ? chrData[charId] : null;
            const name = data ? data.name : (charId === '001' ? '紫苑' : 'Unknown');
            const baseHp = data ? data.baseHp : 1000;
            
            let lane = laneOffsets[i];
            let isFront = false;
            if (gs.savedFormation && gs.savedFormation[charId]) {
                lane = gs.savedFormation[charId].lane;
                isFront = gs.savedFormation[charId].isFront;
            }
            
            const isFoodEmpty = (this.config.isFoodEmpty === true);
            const pc = new PlayerCharacter(lane, isFront ? 3.0 : 1.0, { name: name, lane: lane, isFront: isFront, charId: charId, party: party, isFoodEmpty: isFoodEmpty });
            pc.engine = this;
            const charIdToAttr = {
                '001': 'purple',
                '002': 'blue',
                '003': 'red',
                '004': 'yellow',
                '005': 'green'
            };
            pc.attribute = charIdToAttr[charId] || 'red';
            
            // GlobalStateで計算されたHP(レベル・タロット補正込み)を維持するために上書きしない
            // もしGlobalStateの現在HPシステムを完全に稼働させるなら pc.hp = gs.characters[charId].currentHp とすべき
            const charState = gs.characters[charId];
            if (charState && charState.currentHp !== undefined) {
                pc.hp = charState.currentHp;
                // maxHpはPlayerCharacter内で設定済み
            }
            if (charState && charState.currentSp !== undefined) {
                pc.sp = charState.currentSp;
            }
            
            pc.charId = charId; // レンダラー用にIDを保存
            this.players.push(pc);
        }

        // --- 戦闘開始時のタロット効果 (No.5, No.6) ---
        if (gs.activeTarots && gs.activeTarots.length > 0) {
            for (const tarot of gs.activeTarots) {
                if (tarot.id === 5) {
                    if (tarot.isUpright) {
                        // 正位置: 戦闘毎にランダムで味方一人の攻撃力が50%上がる。
                        if (this.players.length > 0) {
                            const luckyPlayer = this.players[Math.floor(Math.random() * this.players.length)];
                            luckyPlayer.atkMultiplier = (luckyPlayer.atkMultiplier || 1.0) * 1.5;
                        }
                    } else {
                        // 逆位置: 前衛位置にいるキャラクタが一人の時、そのキャラの攻撃力が50％上がる。
                        const frontPlayers = this.players.filter(p => p.isFront);
                        if (frontPlayers.length === 1) {
                            frontPlayers[0].atkMultiplier = (frontPlayers[0].atkMultiplier || 1.0) * 1.5;
                        }
                    }
                }
                if (tarot.id === 6 && tarot.isUpright) {
                    // 正位置: 最も精神力を失っているメンバーの精神力を最大まで回復できる分のSPを得る
                    let maxMissingSp = 0;
                    for (const p of this.players) {
                        const missing = p.maxSp - p.sp; // PlayerCharacterで設定された最大SPと現在SP
                        if (missing > maxMissingSp) {
                            maxMissingSp = missing;
                        }
                    }
                    if (maxMissingSp > 0) {
                        gs.stockSp += maxMissingSp;
                        this.earnedSp = (this.earnedSp || 0) + maxMissingSp;
                        console.log(`[Tarot 6 Upright] Recovered ${maxMissingSp} SP`);
                    }
                }
                if (tarot.id === 12 && !tarot.isUpright) {
                    // 戦闘毎にランダムで味方一人の攻撃力と命中率が50%上がる
                    if (this.players.length > 0) {
                        const target = this.players[Math.floor(Math.random() * this.players.length)];
                        target.atk = Math.floor(target.atk * 1.5);
                        target.hitRateBonus = (target.hitRateBonus || 0) + 0.50;
                        console.log(`[Tarot 12 Reversed] Boosted ${target.charId} ATK/HIT by 50%`);
                    }
                }
                if (tarot.id === 16 && tarot.isUpright) {
                    // 戦闘毎にランダムで味方一人の攻撃力が100％上がり、1秒ごとに1点の生命力を失うようになる
                    if (this.players.length > 0) {
                        const target = this.players[Math.floor(Math.random() * this.players.length)];
                        target.atk = Math.floor(target.atk * 2.0);
                        target.devilPoison = true; // カスタムフラグ
                        console.log(`[Tarot 16 Upright] Boosted ${target.charId} ATK by 100% with poison`);
                    }
                }
            }
        }
    }

    retreat() {
        this.waveState = 'retreated';
        this.eventQueue.push('RETREATING...');
    }

    spawnEnemyGroup(typeIndex = null, forceDropSpawn = null) {
        let typeDef;
        if (typeIndex !== null && ENEMY_TYPES[typeIndex]) {
            typeDef = ENEMY_TYPES[typeIndex];
        } else {
            const idx = Math.floor(Math.random() * ENEMY_TYPES.length);
            typeDef = ENEMY_TYPES[idx];
        }

        const count = typeDef.spawnCount || 1;
        const spawnedEnemies = [];

        for (let i = 0; i < count; i++) {
            // 各個体ごとにスポーン判定を個別に行う
            const isDropSpawn = forceDropSpawn !== null ? forceDropSpawn : (Math.random() < 0.2); // 1/5の確率で画面内に降下
            let x, z;
            if (isDropSpawn) {
                const posIdx = Math.floor(Math.random() * 3);
                x = (posIdx - 1) * 3.5 + (Math.random() - 0.5) * 6.0;
                z = 10.0 + Math.random() * 2.0; // 画面中段付近
            } else {
                x = (Math.random() - 0.5) * 10.0;
                z = 20.0 + Math.random() * 4.0; // z=20.0 ~ 24.0 (最奥Z=24まで拡大)
            }



            const enemyData = {
                name: typeDef.name,
                hp: typeDef.hp,
                speed: typeDef.speed,
                weight: typeDef.weight,
                atkRange: typeDef.atkRange,
                atkFreq: typeDef.atkFreq,
                atkPower: typeDef.atkPower,
                size: typeDef.size,
                moveDist: typeDef.moveDist,
                moveInterval: typeDef.moveInterval,
                debuffResist: typeDef.debuffResist,
                textureKey: typeDef.textureKey,
                frame: typeDef.frame,
                attribute: this.enemyAttribute,
                level: this.enemyLevel
            };

            const enemy = new EnemyCharacter(x, z, enemyData);
            enemy.isDropSpawn = isDropSpawn;
            enemy.spawnDropTimer = 1.0;
            this.enemies.push(enemy);
            spawnedEnemies.push(enemy);
        }

        return spawnedEnemies;
    }

    spawnEnemy(x, z, typeIndex = null) {
        const group = this.spawnEnemyGroup(x, z, typeIndex);
        return group[0];
    }


    spawnBoss(x, z) {
        const textureIndex = Math.floor(Math.random() * 4) + 1;
        const textureKey = `boss00${textureIndex}`;
        const bossData = {
            name: '魔女',
            level: this.majoLevel,
            textureKey: textureKey,
            attribute: this.enemyAttribute
        };
        this.enemies.push(new BossCharacter(x, z, bossData));
    }

    applyDamage(attacker, defender, amount, type = 'normal', distance = 0, hitX = null, hitZ = null) {
        if (defender.isDead || defender.isDying || defender.hp <= 0) return false;
        // 実体化前（スポーン演出中）は無敵
        if (defender.spawnDropTimer > 0 || defender.spawnAnimTimer > 0) return false;

        
        let finalDamage = amount;
        let damageType = type;

        // --- 命中率とレベル差計算 ---
        let hitRate = 1.0;
        if (attacker && defender) {
            // Playerの場合はWLV/2を仮のレベルとする。敵はlevelプロパティ
            const atkLevel = attacker.owner === 'player' ? Math.floor((attacker.wlv || 2) / 2) : (attacker.level || 1);
            const defLevel = defender.owner === 'player' ? Math.floor((defender.wlv || 2) / 2) : (defender.level || 1);
            const levelDiff = atkLevel - defLevel;
            // 距離による低下: 1mあたり2%
            let distDrop = distance * 0.02;
            
            // レベル差による命中率補正: レベル差 * 5%
            let levelHitBonus = levelDiff * 0.05;
            let levelDmgBonusAmount = (levelDiff * 0.05 * finalDamage);
            
            // タロット効果(戦闘時)
            const activeTarots = GlobalState.getInstance().activeTarots || [];
            let isFoolReversedActive = false;
            
            for (const tarot of activeTarots) {
                if (tarot.id === 1 && !tarot.isUpright) {
                    isFoolReversedActive = true;
                }
                if (tarot.id === 9) {
                    if (tarot.isUpright && levelDiff < 0 && attacker.owner === 'player') {
                        // 敵が高レベルの場合、レベル差による減少を半分にする
                        levelHitBonus /= 2;
                        levelDmgBonusAmount /= 2;
                    } else if (!tarot.isUpright && levelDiff > 0 && attacker.owner === 'player') {
                        // 敵が低レベルの場合、レベル差による増加を倍にする
                        levelHitBonus *= 2;
                        levelDmgBonusAmount *= 2;
                    }
                }
                if (tarot.id === 10 && tarot.isUpright && attacker.owner === 'player') {
                    // 距離による命中率マイナス補正を無くす
                    distDrop = 0;
                }
            }
            
            // 基本命中率100%
            hitRate = 1.0 - distDrop + levelHitBonus;
            if (attacker.hitRateBonus) {
                hitRate += attacker.hitRateBonus;
            }
            if (defender.evadeRateBonus) {
                hitRate -= defender.evadeRateBonus;
            }
            hitRate = Math.max(0.01, Math.min(1.0, hitRate)); // 1%〜100%
            
            // 回避判定
            if (Math.random() > hitRate) {
                // MISS
                this.floatingTexts.push({
                    id: ++this.floatingTextIdCounter,
                    x: defender.x, yOffset: 0, z: defender.z,
                    amount: "MISS", type: "miss", lifeTime: 0.5, maxLife: 0.5
                });
                return false; // 攻撃失敗
            }
            
            // 攻撃力補正適用（プレイヤー攻撃時のみレベル差加算を適用）
            if (attacker.owner === 'player') {
                finalDamage += levelDmgBonusAmount;
            }

            
            // クリティカル判定
            let critChance = 0.05 + (attacker.critRateBonus || 0);
            if (Math.random() < critChance) {
                let critMult = 2.0 + (attacker.critMultBonus || 0);
                finalDamage *= critMult; // クリティカル倍率は基本2倍＋装備補正
                damageType = 'critical';
            }
            
            // アタッカーの特技補正（黄蘭のパッシブなど）
            if (attacker.atkMultiplier !== undefined) {
                finalDamage *= attacker.atkMultiplier;
            }
            
            // 愚者(逆)効果適用 (被ダメージ20%増し)
            if (defender.owner === 'player' && defender.isFront && isFoolReversedActive) {
                finalDamage *= 1.20;
            }

            if (finalDamage < 1) finalDamage = 1;
            finalDamage = Math.ceil(finalDamage);
        }

        // --- バリア判定 ---
        if (defender.barrierHp && defender.barrierHp > 0) {
            this.effects.push(new EffectEntity(defender.x, defender.z, {
                type: 'barrier_hit',
                radius: defender.size * 0.8, // キャラの大きさに合わせる
                lifeTime: 0.3,
                customData: { color: 0x00ffff, alpha: 0.5 }
            }));
            
            if (finalDamage <= defender.barrierHp) {
                defender.barrierHp -= finalDamage;
                finalDamage = 0;
            } else {
                finalDamage -= defender.barrierHp;
                defender.barrierHp = 0;
            }
        }
        
        if (attacker && attacker.attribute && defender.attribute) {
            const atkAttr = attacker.attribute;
            const defAttr = defender.attribute;
            if (ATTR_DEF[defAttr] && ATTR_DEF[defAttr][atkAttr]) {
                let defBase = ATTR_DEF[defAttr][atkAttr];
                if (defender.elemMods && defender.elemMods[atkAttr]) {
                    defBase = Math.max(1, defBase - defender.elemMods[atkAttr]);
                }
                const multiplier = defBase / 100.0;
                finalDamage *= multiplier;
                
                if (multiplier > 1.0 && type === 'normal') damageType = 'critical'; // 有効
                else if (multiplier < 1.0 && type === 'normal') damageType = 'resist'; // 軽減
            }
        }

        if (finalDamage > 0) {
            defender.hp -= finalDamage;
            defender.lastDamagedTime = this.time;
            if (defender.triggerDamageTilt) defender.triggerDamageTilt();
            
            // プレイヤーが与えたダメージをDPS用に蓄積
            if (attacker && attacker.owner === 'player' && defender.owner === 'enemy') {
                this.totalDamage += finalDamage;
                this.damageHistory.push({ time: this.time, damage: finalDamage });
            }
            
            // プレイヤーがダメージを受けた時：10ダメージごとにSP-1（食料0時は-2）
            if (defender.owner === 'player' && defender.accumulatedDamage !== undefined) {
                defender.accumulatedDamage += finalDamage;
                const spDrainPerDmg = defender.isFoodEmpty ? 2 : 1;
                while (defender.accumulatedDamage >= 10) {
                    defender.accumulatedDamage -= 10;
                    defender.sp = Math.max(0, defender.sp - spDrainPerDmg);
                }
            }
            
            this.floatingTexts.push({
                id: ++this.floatingTextIdCounter,
                x: defender.x,
                yOffset: 0, 
                z: defender.z,
                amount: Math.ceil(finalDamage),
                type: damageType,
                lifeTime: 1.0,
                maxLife: 1.0
            });
            
            // 属性ヒットエフェクトの発生
            const attrMap = { 'red': 1, 'purple': 2, 'green': 3, 'yellow': 4, 'blue': 5 };
            const attr = (defender && defender.attribute) ? defender.attribute : (attacker && attacker.attribute ? attacker.attribute : null);
            if (attr && attrMap[attr]) {
                const effId = attrMap[attr];
                let effX = defender.x;
                let effZ = defender.z;
                if (hitX !== null && hitZ !== null) {
                    effX = (defender.x + hitX) / 2;
                    effZ = (defender.z + hitZ) / 2;
                }
                const rx = effX + (Math.random() - 0.5) * Math.min(0.5, defender.size || 1.0);
                const rz = effZ + (Math.random() - 0.5) * Math.min(0.5, defender.size || 1.0);
                
                // 致死判定とパターンのランダム決定
                const isFatal = (defender.hp <= 0);
                const hitPattern = Math.floor(Math.random() * 8); // 0-7の8パターン
                
                this.effects.push(new EffectEntity(rx, rz, {
                    type: `element_hit_${effId}`,
                    radius: 0.1,
                    lifeTime: 0.6,
                    customData: {
                        isFatal: isFatal,
                        targetSize: defender.size || 1.0,
                        pattern: hitPattern
                    }
                }));
            }
        }

        if (defender.hp <= 0) {
            defender.hp = 0;
            defender.isDying = true;
            defender.deathTimer = 0;
            
            // 経験値計算 (敵死亡時)
            if (defender.owner === 'enemy') {
                const lv = defender.level || 1;
                const baseExp = defender.isBoss ? Math.pow(lv, 2) * 200 : lv;
                this.earnedExp += Math.floor(baseExp * GlobalState.getInstance().expMultiplier);
            }

            if (defender.isBoss) {
                // 魔女死亡時の第一段階エフェクト
                this.effects.push(new EffectEntity(defender.x, defender.z, { type: 'majo_death_1', radius: 10.0, lifeTime: 1.0 }));
            }
        }

        return true;
    }

    update(dt) {
        this.time += dt;

        // 全滅判定
        if (this.waveState === 'playing' || this.waveState === 'boss' || this.waveState === 'intermission') {
            const alivePlayers = this.players.filter(p => !p.isDead);
            if (alivePlayers.length === 0) {
                this.waveState = 'gameover';
                this.eventQueue.push('PARTY WIPED OUT...');
            }
        }

        if (this.waveState === 'playing') {
            this.waveTime += dt;
        }

        // 連携必殺技の処理
        if (this.linkedUltimateQueue && this.linkedUltimateQueue.length > 0) {
            this.linkedUltimateTimer -= dt;
            if (this.linkedUltimateTimer <= 0) {
                const nextPlayer = this.linkedUltimateQueue.shift();
                if (nextPlayer && !nextPlayer.isDead && !nextPlayer.isUltimateActive) {
                    this.triggerUltimate(nextPlayer, true);
                    this.linkedUltimateTimer = 4.0; // 4秒ごとに発動
                } else if (nextPlayer) {
                    // スキップされた場合はすぐ次へ
                    this.linkedUltimateTimer = 0.1;
                }
            }
        }

        // 浮遊テキストの更新
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.lifeTime -= dt;
            ft.yOffset += 1.0 * dt; 
            if (ft.lifeTime <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }

        // ウェーブ進行管理
        if (this.waveState === 'intermission') {
            this.waveTimer -= dt;
            if (this.waveTimer <= 0) {
                console.log(`[BattleEngine] intermission->next: currentWave=${this.currentWave} totalWaves=${this.totalWaves} majoLevel=${this.majoLevel}`);
                if (this.currentWave <= this.totalWaves) {
                    this.waveState = 'playing';
                    this.waveTime = 0; // ウェーブ開始時にタイマーをリセット
                    this.spawnTimer = 1.0; 
                    this.eventQueue.push(`WAVE ${this.currentWave} START`);
                } else if (this.majoLevel > 0) {
                    this.waveState = 'boss_presentation';
                    this.bossPresTimer = 8.0;
                } else {
                    console.log('[BattleEngine] -> cleared!');
                    this.waveState = 'cleared';
                    this.eventQueue.push('Silence returns...');
                }
            }
        } else if (this.waveState === 'playing') {
            const aliveEnemies = this.enemies.filter(e => !e.isDead && !e.isDying);
            
            if (this.rule === 2) {
                // ── 突破モード (rule=2) ──
                // 後衛人数に応じて進行速度が落ちる (基本8m/s - 後衛1人につき-1m/s)
                const rearCount = this.players.filter(p => !p.isDead && !p.isFront).length;
                this.advanceSpeed = Math.max(0, 8.0 - rearCount * 1.0);
                this.breakthroughDist += this.advanceSpeed * dt;

                // 目標距離走破でクリア
                if (this.breakthroughDist >= this.breakthroughTarget) {
                    this.breakthroughDist = this.breakthroughTarget;
                    this.waveState = 'cleared';
                    this.eventQueue.push('BREAKTHROUGH COMPLETE!');
                }

                // フィールド上の生存敵が enemyCountPerWave (最大生成量) 未満の場合、spawnIntervalごとに前方から新規生成
                if (aliveEnemies.length < this.enemyCountPerWave && this.breakthroughDist < this.breakthroughTarget) {
                    this.spawnTimer -= dt;
                    if (this.spawnTimer <= 0) {
                        this.spawnTimer = this.spawnInterval || 1.0;
                        const x = (Math.random() - 0.5) * 10.0;
                        const z = 20.0 + Math.random() * 2.0;
                        this.spawnEnemyGroup(x, z);
                    }
                }



                // 前衛キャラと重い敵の正面衝突判定 → 後衛に押し戻される
                for (const p of this.players) {
                    if (p.isFront && !p.isDead) {
                        for (const e of aliveEnemies) {
                            if (e.isHeavy || (e.size && e.size > 1.2)) {
                                const dx = Math.abs(e.x - p.x);
                                const dz = Math.abs(e.z - p.z);
                                if (dx < 1.0 && dz < 1.0) {
                                    p.isFront = false;
                                    p.targetZ = 1.0;
                                    this.eventQueue.push(`${p.name} pushed back by heavy enemy!`);
                                    this.floatingTexts.push({
                                        id: ++this.floatingTextIdCounter,
                                        x: p.x, yOffset: 0.5, z: p.z,
                                        amount: "PUSHED!", type: "miss", lifeTime: 1.5, maxLife: 1.5
                                    });
                                    break;
                                }
                            }
                        }
                    }
                }
            } else {
                // ── 通常・殲滅モード (rule=0 / 1) ──
                if (this.spawnedInWave < this.enemyCountPerWave) {
                    this.spawnTimer -= dt;
                    if (this.spawnTimer <= 0) {
                        this.spawnTimer = 1.0; // 1秒間隔
                        const isDropSpawn = Math.random() < 0.2; // 1/5の確率で画面内に降下
                        let x, z;
                        if (isDropSpawn) {
                            const posIdx = Math.floor(Math.random() * 3);
                            x = (posIdx - 1) * 3.5 + (Math.random() - 0.5) * 6.0;
                            z = 10.0 + Math.random() * 2.0; // 画面中段付近
                        } else {
                            x = (Math.random() - 0.5) * 10.0;
                            z = 20.0 + Math.random() * 4.0; // z=20.0 ~ 24.0 (最奥Z=24まで拡大)
                        }

                        const spawnedList = this.spawnEnemyGroup(x, z, null, isDropSpawn);
                        this.spawnedInWave += spawnedList.length;
                    }
                }

                // スポーン済みか否かに関わらず、全敵死亡 → ウェーブクリア
                if (this.spawnedInWave >= this.enemyCountPerWave && aliveEnemies.length === 0) {
                    console.log(`[BattleEngine] Wave ${this.currentWave} cleared! total=${this.totalWaves}`);
                    this.currentWave++;
                    this.spawnedInWave = 0;
                    this.waveState = 'intermission';
                    this.waveTimer = 3.0;
                }
            }
        } else if (this.waveState === 'boss_presentation') {
            this.bossPresTimer -= dt;
            if (this.bossPresTimer <= 0) {
                this.waveState = 'boss';
                this.spawnBoss(0, 20); // z座標はBossCharacter内で調整される
            }
        } else if (this.waveState === 'boss') {
            const aliveEnemies = this.enemies.filter(e => !e.isDead && !e.isDying);
            if (aliveEnemies.length === 0) {
                this.waveState = 'cleared';
                this.eventQueue.push('Silence returns...');
                // 魔女撃破: stockSp加算 (majoLevel² × 100)
                if (this.majoLevel > 0) {
                    const gs = GlobalState.getInstance();
                    let spGained = this.majoLevel * this.majoLevel * 100;
                    spGained = Math.floor(spGained * gs.spMultiplier);
                    gs.stockSp += spGained;
                    this.earnedSp = (this.earnedSp || 0) + spGained;
                    console.log(`[BattleEngine] Majo defeated, gained ${spGained} SP`);
                }
            }
        }

        // エフェクトの更新
        for (const eff of this.effects) {
            if (!eff.isDead) eff.update(dt);
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
                const result = gs.rollAttackLevelGacha(winner.charId, winner.isFront);
                const leveledUpType = result.type;
                
                winner.gachaDebugText = `${result.denominator}`;
                winner.gachaDebugTimer = 1.0;
                
                if (leveledUpType) {
                    winner.gachaDebugText = `${result.denominator}\nUP!`;
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
                    gs.levelUpLogs.push({ charId: winner.charId, text: `${typeStr}攻撃レベルが上がった` });
                }
            }
        }

        // プレイヤーの更新と自動攻撃（ステートマシン方式）
        for (const p of this.players) {
            p.update(dt);
            
            // 死亡判定と後衛への吹き飛ばし
            if (p.hp <= 0 && !p.isDead) {
                p.hp = 0;
                p.isDead = true;
                if (p.isFront) {
                    p.isFront = false;
                    p.targetZ = 1.0;
                    this.eventQueue.push(`${p.name} is incapacitated!`);
                }
            }

            if (p.devilPoison && !p.isDead) {
                p.devilPoisonTimer = (p.devilPoisonTimer || 0) + dt;
                if (p.devilPoisonTimer >= 1.0) {
                    p.devilPoisonTimer -= 1.0;
                    p.hp -= 1;
                    if (p.hp <= 0) {
                        p.hp = 0;
                        p.isDead = true;
                        if (p.isFront) {
                            p.isFront = false;
                            p.targetZ = 1.0;
                            this.eventQueue.push(`${p.name} is incapacitated!`);
                        }
                        this.floatingTexts.push({
                            id: ++this.floatingTextIdCounter,
                            x: p.x, yOffset: 0, z: p.z,
                            amount: "DEAD", type: "miss", lifeTime: 1.5, maxLife: 1.5
                        });
                    } else {
                        this.floatingTexts.push({
                            id: ++this.floatingTextIdCounter,
                            x: p.x, yOffset: 0.5, z: p.z,
                            amount: "-1", type: "normal", lifeTime: 1.0, maxLife: 1.0,
                            customData: { color: 0xaa00aa }
                        });
                    }
                }
            }
            
            // 行動不能判定（HP0 または SP0）
            if (p.hp <= 0 || p.sp <= 0) {
                p.combatState.phase = 'idle';
                p.combatState.cancelled = false;
                continue;
            }

            if (p.isUltimateActive) continue;
            
            let target = null;
            let minDist = 9999;
            let minDistCenter = 9999;
            for (const e of this.enemies) {
                // 死亡中、または実体化演出中（spawnDropTimer/spawnAnimTimer > 0）の敵はターゲットにしない
                if (e.isDead || e.isDying || e.spawnDropTimer > 0 || e.spawnAnimTimer > 0) continue;
                const dx = e.x - p.x;

                const dz = e.z - p.z;
                const distCenter = Math.sqrt(dx*dx + dz*dz);
                const surfaceDist = Math.max(0, distCenter - (e.size / 2));
                if (surfaceDist < minDist) { 
                    minDist = surfaceDist; 
                    minDistCenter = distCenter; 
                    target = e; 
                }
            }
            p.targetEnemy = target;

            const cs = p.combatState;

            // ── RELOADING: リロードタイマーを消化 ──
            if (cs.phase === 'reloading') {
                cs.reloadTimer -= dt;
                if (cs.reloadTimer <= 0) {
                    if (cs.cancelled) {
                        // キャンセル由来 → コンボをリセットして判断フェーズへ
                        cs.comboType = null;
                        cs.stepIdx   = 0;
                        cs.countIdx  = 0;
                        cs.cancelled = false;
                        cs.phase     = 'deciding';
                    } else {
                        // 通常完了 → 次のカウントへ進む
                        const action = p.patterns[cs.comboType][cs.stepIdx];
                        cs.countIdx++;
                        if (cs.countIdx >= action.count) {
                            // このステップのcount回繰り返しが終了 → 次のステップへ
                            cs.countIdx = 0;
                            cs.stepIdx++;
                            if (cs.stepIdx >= p.patterns[cs.comboType].length) {
                                // コンボ全完了 → 判断フェーズへ戻り、元の位置へ戻る
                                cs.stepIdx   = 0;
                                cs.comboType = null;
                                cs.phase     = 'deciding';
                                p.hopBack();
                            } else {
                                cs.phase = 'acting';
                            }
                        } else {
                            // まだ同じステップのcount繰り返しが残っている
                            cs.phase = 'acting';
                        }
                    }
                }
                continue; // このフレームはリロード消化のみ
            }

            // ── IDLE / DECIDING: コンボ種別を決定 ──
            if (cs.phase === 'idle' || cs.phase === 'deciding') {
                if (!target) {
                    if (cs.phase !== 'idle') p.hopBack(); // 敵を見失ったら戻る
                    cs.phase = 'idle';
                } else if (minDist <= p.nearThreshold) {
                    cs.comboType = 'near'; cs.stepIdx = 0; cs.countIdx = 0; cs.phase = 'acting';
                } else if (minDist <= p.farThreshold) {
                    cs.comboType = 'far';  cs.stepIdx = 0; cs.countIdx = 0; cs.phase = 'acting';
                } else {
                    cs.phase = 'idle';
                }
                continue;
            }

            // ── ACTING: 現在のステップを実行 ──
            if (cs.phase === 'acting') {
                const action = p.patterns[cs.comboType][cs.stepIdx];

                // キックアクションの判定
                const isKick = action.type === 'kick';

                if (isKick) {
                    // キックの射程距離（4.0m）内に敵がいるか確認（ノックバック後も踏み込み蹴りが繋がるように拡張）
                    const kickRange = action.range !== undefined ? Math.max(action.range, 4.0) : 4.0;
                    let kickTarget = null;
                    let minKickDist = 999;
                    for (const e of this.enemies) {
                        if (!e.isDead && !e.isDying) {
                            const edx = e.x - p.x;
                            const edz = e.z - p.z;
                            const edist = Math.sqrt(edx*edx + edz*edz);
                            const surfDist = edist - (e.size / 2);
                            if (surfDist <= kickRange && surfDist < minKickDist) {
                                minKickDist = surfDist;
                                kickTarget = e;
                            }
                        }
                    }

                    if (!kickTarget) {
                        // 射程内に目標の敵がいない場合はキックモーションも弾も発生させずリロードへ移行
                        p.isKickAttacking = false;
                        p.kickTimer = 0;
                        cs.cancelled = false;
                        cs.reloadTimer = (action.reload || 0.5) * p.reloadMultiplier;
                        cs.phase = 'reloading';
                        continue;
                    }

                    // 射程内に目標がいるのでキック発動！
                    p.isKickAttacking = true;
                    p.kickTimer = 0.35; // 0.35秒間キックモーション維持

                    const dx = kickTarget.x - p.x;
                    const dz = kickTarget.z - p.z;
                    const dist = Math.sqrt(dx*dx + dz*dz) || 1.0;
                    const dirX = dx / dist;
                    const dirZ = dz / dist;

                    // 0.5m 目標の敵に向かってスムーズに踏み込む！
                    const stepDist = 0.5;
                    p.targetOffsetX = (p.targetOffsetX || 0) + dirX * stepDist;
                    p.targetOffsetZ = (p.targetOffsetZ || 0) + dirZ * stepDist;

                    // キック時の発射方向角度を記憶（ターゲットが消滅しても向きを維持するため）
                    p.kickAngle = Math.atan2(dz, dx) * 180 / Math.PI;

                    const damage = (p.atk * (action.power || 0)) / 100;
                    // 紫苑は100、李乃果は80、その他は定義値
                    const knockbackVal = p.charId === '001' ? 100 : (p.charId === '005' ? 80 : (action.knockback || 50));
                    const speed = 30.0; // 超高速 30m/s

                    const b = new Bullet(p.x, p.z, {
                        vx: dirX * speed,
                        vz: dirZ * speed,
                        damage: damage,
                        knockback: knockbackVal,
                        owner: 'player',
                        size: 1.5,                 // 直径1.5m
                        isPiercing: true,           // 貫通属性
                        type: 'kick_bullet',
                        targetDist: 1.5,            // 指示: 当たり判定は1.5m飛ぶ
                        lifeTime: 1.5 / speed,      // 30m/sで1.5m飛ぶ時間
                        erasesEnemyBullets: true,   // 敵弾消去
                        isFollowOwner: false,
                        ownerEntity: p
                    });
                    b.sourceEntity = p;
                    this.bullets.push(b);
                    if (p.triggerAttackShake) p.triggerAttackShake();

                    cs.cancelled = false;
                    cs.reloadTimer = (action.reload || 0.5) * p.reloadMultiplier;
                    cs.phase = 'reloading';
                    continue;
                }



                // ターゲットが射程内か確認
                const inRange = target && !target.isDead && !target.isDying && minDist <= action.range;


                if (inRange && action.type !== 'reload') {
                    // ── アクション実行 ──
                    const dx   = target.x - p.x;
                    const dz   = target.z - p.z;
                    const dist = minDistCenter || 1.0;
                    const dirX = dx / dist;
                    const dirZ = dz / dist;
                    const damage = (p.atk * (action.power || 0)) / 100;

                    if (cs.comboType === 'near') {
                        let stepDist = action.stepDist !== undefined ? action.stepDist : 1.0;
                        
                        // 敵が武器の届く範囲内にいるときは踏み込まない
                        const wRange = action.weaponRange !== undefined ? action.weaponRange : action.range;
                        if (minDist <= wRange) {
                            stepDist = 0;
                        }

                        const pWeight = p.weight || 50; // キャラクターの体重(kg)
                        
                        // 相手の表面までの距離から自身の半径を引いて、移動可能な距離を算出
                        const availableDist = minDist - (p.size / 2);
                        
                        if (availableDist < stepDist) {
                            // 衝突発生！自身の体重分のノックバック力(force)を与える
                            // ※適用先で force / target.weight メートル押し戻される
                            target.applyKnockback(dirX * pWeight, dirZ * pWeight);
                            
                            // 相手が自身より重い場合は、押し込めずそこで止まる
                            if (target.weight > pWeight) {
                                stepDist = Math.max(0, availableDist);
                            }
                        }
                        
                        p.targetOffsetX += dirX * stepDist;
                        p.targetOffsetZ += dirZ * stepDist;
                    }

                    const isSwing = action.speed === 0;

                    if (isSwing) {
                        // ── スイング系: キャラ位置に固定された範囲弾丸を生成 ──
                        const b = new Bullet(p.x, p.z, {
                            vx: 0, vz: 0,
                            damage:     damage,
                            knockback:  action.knockback || 0,
                            owner:      'player',
                            size:       action.size || 3.0,
                            hitRange:   action.weaponRange !== undefined ? action.weaponRange : action.range,
                            isPiercing: action.isPiercing !== false,
                            type:       `swing_${p.charId}`,
                            lifeTime:   action.swingDur || 0.25,
                        });
                        b.sourceEntity = p;
                        b.maxLife      = action.swingDur || 0.25;
                        b.baseAngle    = Math.atan2(dz, dx); // 固定する
                        b.swingDir     = Math.random() < 0.5 ? 1 : -1;
                        this.bullets.push(b); if (b && b.sourceEntity && b.sourceEntity.triggerAttackShake) b.sourceEntity.triggerAttackShake();
                    } else {
                        // ── 飛び道具系: shotCount分の弾を拡散発射 ──
                        const sc     = action.shotCount || 1;
                        const spread = action.spread || 0;
                        const speed  = action.speed || 10;

                        for (let s = 0; s < sc; s++) {
                            // ショットガン: sc発をspread度の範囲に均等配置
                            let angleOffset = 0;
                            if (sc > 1) {
                                const totalAngle = spread;
                                angleOffset = -totalAngle / 2 + (totalAngle / (sc - 1)) * s;
                            } else {
                                angleOffset = (Math.random() - 0.5) * spread * 2;
                            }
                            
                            // deviation
                            if (action.deviation) {
                                angleOffset += (Math.random() - 0.5) * 2 * action.deviation;
                            }
                            const rad  = angleOffset * (Math.PI / 180);
                            const cosR = Math.cos(rad);
                            const sinR = Math.sin(rad);
                            const vxDir = dirX * cosR - dirZ * sinR;
                            const vzDir = dirX * sinR + dirZ * cosR;

                            const b = new Bullet(p.x, p.z, {
                                vx:         vxDir * speed,
                                vz:         vzDir * speed,
                                damage:     damage,
                                knockback:  action.knockback || 0,
                                owner:      'player',
                                size:       action.size || 0.5,
                                isPiercing: action.isPiercing || false,
                                type:       action.type,
                                targetDist: action.range !== undefined ? action.range : 20.0,
                                lifeTime:   action.speed ? (action.range / action.speed) * 2 + 1 : 5,
                            });
                            b.sourceEntity = p;
                            this.bullets.push(b); if (b && b.sourceEntity && b.sourceEntity.triggerAttackShake) b.sourceEntity.triggerAttackShake();
                        }
                    }
                    cs.cancelled = false;
                } else {
                    // ターゲットが射程外 or reloadステップ → キャンセル
                    cs.cancelled = true;
                }

                // 成功・キャンセルどちらもリロードへ
                // 実際の攻撃間隔 = 基本間隔 * (100 / ステータス値) * 各種バフ倍率
                const baseReload = p.reloadStat || 100;
                cs.reloadTimer = action.reload * (100 / baseReload) * (p.reloadMultiplier || 1.0);
                cs.phase       = 'reloading';
                
                // キャンセルの場合のみ即時ホップバック（距離が遠すぎた場合など）
                if (cs.cancelled) {
                    p.hopBack();
                }
                // 最後の攻撃（isLastHit）の場合はここでは hopBack せず、
                // 次のアクションを決定するフェーズ（reloading終了時）に hopBack させることで踏み込みを維持する
            }
        }

        // 敵の更新
        for (const e of this.enemies) {
            if (e.isDead) continue;

            // 突破モード(rule=2)中、味方が前進している分の相対移動 (敵が手前Z方向へ流れる)
            if (this.rule === 2 && !e.isDying && this.waveState === 'playing') {
                e.z -= (this.advanceSpeed || 0) * dt;
            }

            if (e.isDying) {
                e.deathTimer += dt;
                
                if (e.isBoss) {
                    // 魔女の死亡演出進行（3段階）
                    if (e.deathPhase === 0 && e.deathTimer >= 1.0) {
                        e.deathPhase = 1;
                        // 1と並行してランダムな位置に小爆発を3秒間発生（BattleRenderer側で毎フレームランダム円を描画するか、エフェクトを生成）
                        for (let i = 0; i < 24; i++) { // 3秒間分一気に仕込む（手抜き）
                            setTimeout(() => {
                                if (e.isDead) return;
                                const rx = e.x + (Math.random() - 0.5) * e.size * 0.66;
                                const rz = e.z + (Math.random() - 0.5) * e.size * 0.66;
                                this.effects.push(new EffectEntity(rx, rz, { type: 'majo_death_2', radius: e.size * 0.5, lifeTime: 0.5 }));
                            }, 1000 + (3000 / 24) * i);
                        }
                    } else if (e.deathPhase === 1 && e.deathTimer >= 4.0) { // +3秒後
                        e.deathPhase = 2;
                        this.effects.push(new EffectEntity(e.x, e.z, { type: 'majo_death_3', radius: 20.0, lifeTime: 1.0 }));
                    } else if (e.deathPhase === 2 && e.deathTimer >= 5.0) { // さらに+1秒後
                        e.isDead = true;
                    }
                } else {
                    // 通常の敵は1秒かけて消滅する
                    if (e.deathTimer >= 1.0) {
                        e.isDead = true;
                    }
                }
                continue;
            }

            if (e.spawnDropTimer > 0) {
                e.spawnDropTimer -= dt;
                if (e.spawnDropTimer <= 0) {
                    e.spawnDropTimer = 0;
                } else {
                    continue; // 実体化中は行動しない
                }
            }

            e.update(dt);
            if (e.stunTimer > 0) continue; // スタン中は行動しない

            if (e.isBoss) {
                // 魔女の行動（移動と攻撃）
                
                // --- 移動ロジック ---
                // 前衛のZ座標を取得（生存プレイヤー内で最大のZ座標）
                let vanguardZ = 0;
                const alivePlayers = this.players.filter(p => !p.isDead);
                if (alivePlayers.length > 0) {
                    vanguardZ = Math.max(...alivePlayers.map(p => p.z));
                }
                
                // Z軸目標切り替え（5秒ごと）
                if (e.zMoveTimer !== undefined) {
                    e.zMoveTimer -= dt;
                    if (e.zMoveTimer <= 0) {
                        e.zMoveTimer = 5.0;
                        e.targetZMode = Math.random() < 0.5 ? 'vanguard' : 'rearguard';
                    }
                } else {
                    e.zMoveTimer = 5.0;
                    e.targetZMode = 'vanguard';
                }

                // X軸目標切り替え（3秒ごと）
                if (e.xMoveTimer !== undefined) {
                    e.xMoveTimer -= dt;
                    if (e.xMoveTimer <= 0) {
                        e.xMoveTimer = 3.0;
                        const lanes = [-2, -1, 0, 1, 2];
                        e.targetLane = lanes[Math.floor(Math.random() * lanes.length)];
                    }
                } else {
                    e.xMoveTimer = 3.0;
                    e.targetLane = 0;
                }

                // 定位置（目標座標）
                const fixedVanguardZ = 12.0 + (e.size / 2);
                const fixedRearguardZ = 15.0 + (e.size / 2);
                const targetZ = e.targetZMode === 'rearguard' ? fixedRearguardZ : fixedVanguardZ;
                const targetX = e.targetLane || 0;
                
                // 1.0 m/s^2 の加速度 (dt = 0.1s なら速度が 0.1 変化)
                let accel = 1.0; 
                let isFlee = false;
                
                if (e.movePattern === 2) {
                    accel = 2.0;
                } else if (e.movePattern === 3) {
                    accel = 0.5;
                } else if (e.movePattern === 4) {
                    accel = 0;
                    // 目標地点へ直接テレポート
                    e.x = targetX;
                    e.z = targetZ;
                    e.vx = 0;
                    e.vz = 0;
                } else if (e.movePattern === 5) {
                    accel = 1.0;
                    isFlee = true; // 逆に離れようとする
                    const vMag = Math.sqrt(e.vx * e.vx + e.vz * e.vz);
                    if (vMag > 10.0) {
                        e.x = targetX;
                        e.z = targetZ;
                        e.vx = 0;
                        e.vz = 0;
                    }
                }

                // Z軸の加速
                let currentAccelZ = accel;
                if (isFlee) {
                    if (e.z < targetZ) {
                        e.vz -= currentAccelZ * dt; // 離れる
                    } else if (e.z > targetZ) {
                        e.vz += currentAccelZ * dt; // 離れる
                    }
                } else {
                    if (e.z < targetZ) {
                        if (e.z < fixedVanguardZ) currentAccelZ *= 2.0;
                        e.vz += currentAccelZ * dt;
                    } else if (e.z > targetZ) {
                        if (e.z > fixedRearguardZ) currentAccelZ *= 2.0;
                        e.vz -= currentAccelZ * dt;
                    }
                }
                
                // X軸の加速
                if (isFlee) {
                    if (e.x < targetX) {
                        e.vx -= accel * dt;
                    } else if (e.x > targetX) {
                        e.vx += accel * dt;
                    }
                } else {
                    if (e.x < targetX) {
                        e.vx += accel * dt;
                    } else if (e.x > targetX) {
                        e.vx -= accel * dt;
                    }
                }
                
                // 画面端の処理
                const limitX = 9.0 - (e.size / 4);
                if (e.movePattern === 5) {
                    // ループ処理 (X軸)
                    if (e.x > limitX) e.x = -limitX;
                    else if (e.x < -limitX) e.x = limitX;
                    
                    // ループ処理 (Z軸)
                    if (e.z > 25.0) e.z = 0.0;
                    else if (e.z < 0.0) e.z = 25.0;
                } else {
                    // 跳ね返り（画像が1/4見切れる位置）
                    if (e.x > limitX) {
                        e.x = limitX; // めり込み防止
                        e.vx = -Math.abs(e.vx) * 0.5; // 反転して半減
                    } else if (e.x < -limitX) {
                        e.x = -limitX;
                        e.vx = Math.abs(e.vx) * 0.5;
                    }
                }
                
                // Z軸の画面外テレポート安全装置 (とりあえずの処理)
                if (e.z < -e.size / 2 || e.z > 25.2 + e.size / 2) {
                    e.z = targetZ;
                    e.vz = 0;
                }

                // --- 攻撃パターン ---
                e.atkTimers.randomBullet -= dt;
                e.atkTimers.dpsBullet -= dt;
                e.atkTimers.nearAttack -= dt;
                if (e.atkTimers.special4) e.atkTimers.special4 -= dt;
                if (e.atkTimers.special5) e.atkTimers.special5 -= dt;
                if (e.atkTimers.special6) e.atkTimers.special6 -= dt;
                if (e.atkTimers.special7) e.atkTimers.special7 -= dt;
                
                // 1. ランダム弾 (検証用: オレンジ 0xffa500)
                if (e.atkTimers.randomBullet <= 0) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 12; // 12 m/s
                    const bColor = 0xffa500;
                    const bullet = new Bullet(e.x, e.z, {
                        vx: Math.cos(angle)*speed, vz: Math.sin(angle)*speed,
                        damage: e.atkPower || 1, knockback: 0, owner: 'enemy', size: 0.3, type: 'enemy_bullet', targetDist: 20, textureKey: 'enemy_bullet', color: bColor, opacity: 0.75
                    });
                    bullet.sourceEntity = e;
                    this.bullets.push(bullet); if (bullet.sourceEntity && bullet.sourceEntity.triggerAttackShake) bullet.sourceEntity.triggerAttackShake();
                    
                    if (e.attribute === 'red') {
                        e.atkTimers.randomBullet = Math.max(0.2, (0.9 + Math.random() * 0.5) - (e.level * 0.05));
                    } else {
                        e.atkTimers.randomBullet = Math.max(0.2, (1.2 + Math.random() * 0.5) - (e.level * 0.05));
                    }
                }
                
                // 2. DPS弾 (検証用: 黄緑 0x99cc00)
                if (e.atkTimers.dpsBullet <= 0) {
                    const alivePlayers = this.players.filter(p => !p.isDead);
                    if (alivePlayers.length > 0) {
                        const target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
                        const dx = target.x - e.x;
                        const dz = target.z - e.z;
                        const dist = Math.sqrt(dx*dx + dz*dz) || 1.0;
                        const speed = 12; // 12 m/s
                        const bColor = 0x99cc00;
                        const bullet = new Bullet(e.x, e.z, {
                            vx: (dx/dist)*speed, vz: (dz/dist)*speed,
                            damage: e.atkPower || 1, knockback: 0, owner: 'enemy', size: 0.3, type: 'enemy_bullet', targetDist: 20, textureKey: 'enemy_bullet', color: bColor, opacity: 0.75
                        });
                        bullet.sourceEntity = e;
                        this.bullets.push(bullet); if (bullet.sourceEntity && bullet.sourceEntity.triggerAttackShake) bullet.sourceEntity.triggerAttackShake();
                    }
                    e.atkTimers.dpsBullet = 4.5 / (this.players.length || 1);
                }

                // 3. 近接攻撃 (検証用: 水色 0x00ffff)
                if (e.atkTimers.nearAttack <= 0) {
                    for (const p of this.players) {
                        if (p.isDead) continue;
                        const dx = p.x - e.x;
                        const dz = p.z - e.z;
                        const dist = Math.sqrt(dx*dx + dz*dz) || 1.0;
                        // 魔女の大きさ/2 + 2m の範囲
                        if (dist <= e.size / 2 + 2.0) {
                            const speed = 18; // 18 m/s
                            const bColor = 0x00ffff;
                            const bullet = new Bullet(e.x, e.z, {
                                vx: (dx/dist)*speed, vz: (dz/dist)*speed,
                                damage: e.atkPower || 1, knockback: 10, owner: 'enemy', size: 0.3, type: 'enemy_bullet', targetDist: dist, textureKey: 'enemy_bullet', color: bColor, opacity: 0.75
                            });
                            bullet.sourceEntity = e;
                            this.bullets.push(bullet); if (bullet.sourceEntity && bullet.sourceEntity.triggerAttackShake) bullet.sourceEntity.triggerAttackShake();
                        }
                    }
                    e.atkTimers.nearAttack = 0.9;
                }

                // 大技タイマー (4, 5, 6, 7 を統合)
                if (e.atkTimers.special !== undefined) {
                    e.atkTimers.special -= dt;
                    if (e.atkTimers.special <= 0) {
                        // 1. 技の抽選
                        let selectedSpecial = 4;
                        if (e.attribute === 'red') {
                            selectedSpecial = 4 + Math.floor(Math.random() * 4);
                            e.atkTimers.special = 16.0 - e.level;
                        } else {
                            const attrToSpecial = { 'yellow': 4, 'purple': 5, 'blue': 6, 'green': 7 };
                            const favored = attrToSpecial[e.attribute];
                            if (favored && Math.random() < 0.5) {
                                selectedSpecial = favored;
                                e.atkTimers.special = 12.0 - e.level;
                            } else {
                                const others = [4, 5, 6, 7].filter(num => num !== favored);
                                selectedSpecial = others[Math.floor(Math.random() * others.length)];
                                e.atkTimers.special = 16.0 - e.level;
                            }
                        }

                        // 2. 技の発動
                        if (selectedSpecial === 4) {
                            // 貯め弾幕（黄）
                            if (e.triggerAttackShake) e.triggerAttackShake();
                            const durationSeconds = 2 + (e.level || 1);
                            const bulletCount = 20 * durationSeconds;
                            for (let i = 0; i < bulletCount; i++) {
                                if (!e.delayedActions) e.delayedActions = [];
                                e.delayedActions.push({
                                    timer: (i / bulletCount) * durationSeconds,
                                    action: () => {
                                        const finalAngle = Math.random() * Math.PI * 2;
                                        const growAngle = Math.random() * Math.PI * 2;
                                        const bullet = new Bullet(e.x, e.z, {
                                            vx: Math.cos(growAngle) * 2, vz: Math.sin(growAngle) * 2,
                                            damage: 5, knockback: 5, owner: 'enemy', size: 0.01, type: 'enemy_bullet', textureKey: 'enemy_bullet', color: 0xffff00, opacity: 0.75
                                        });
                                        bullet.growTimer = 2.0; // 2秒かけて育つ
                                        bullet.maxGrowTimer = 2.0;
                                        bullet.finalSize = 0.3;
                                        bullet.finalVx = Math.cos(finalAngle) * 30; // 最終速度30
                                        bullet.finalVz = Math.sin(finalAngle) * 30;
                                        bullet.targetDist = 40; 
                                        this.bullets.push(bullet);
                                    }
                                });
                            }
                        } else if (selectedSpecial === 5) {
                            // 大量弾（紫）
                            if (e.triggerAttackShake) e.triggerAttackShake();
                            const waveCount = 2 + (e.level || 1);
                            for (let wave = 0; wave < waveCount; wave++) {
                                if (!e.delayedActions) e.delayedActions = [];
                                e.delayedActions.push({
                                    timer: wave * 1.0,
                                    action: () => {
                                        for(let i=0; i<30; i++) {
                                            const angle = Math.random() * Math.PI * 2;
                                            const bullet = new Bullet(e.x, e.z, {
                                                vx: Math.cos(angle)*3, vz: Math.sin(angle)*3,
                                                damage: 5, knockback: 5, owner: 'enemy', size: 0.3, type: 'enemy_bullet', targetDist: 20, textureKey: 'enemy_bullet', color: 0xff00ff, opacity: 0.75
                                            });
                                            this.bullets.push(bullet);
                                        }
                                    }
                                });
                            }
                        } else if (selectedSpecial === 6) {
                            // レーザー（青）
                            if (e.triggerAttackShake) e.triggerAttackShake();
                            let targets = this.players.filter(p => !p.isDead && !p.isFront);
                            if (targets.length === 0) targets = this.players.filter(p => !p.isDead && p.isFront);
                            
                            if (targets.length > 0) {
                                const target = targets[Math.floor(Math.random() * targets.length)];
                                const tx = target.x; // 固定座標
                                const tz = target.z;
                                const dx = tx - e.x;
                                const dz = tz - e.z;
                                const dist = Math.sqrt(dx*dx + dz*dz) || 1.0;
                                const nx = dx/dist;
                                const nz = dz/dist;
                                
                                const bulletCount = (2 + (e.level || 1)) * 10;
                                for (let i = 0; i < bulletCount; i++) {
                                    if (!e.delayedActions) e.delayedActions = [];
                                    e.delayedActions.push({
                                        timer: (i / bulletCount) * (2 + (e.level || 1)),
                                        action: () => {
                                            const bullet = new Bullet(e.x, e.z, {
                                                vx: nx*50, vz: nz*50,
                                                damage: 1, knockback: 5, owner: 'enemy', size: 0.3, type: 'enemy_bullet', targetDist: 40, textureKey: 'enemy_bullet', color: 0x0088ff, opacity: 0.75
                                            });
                                            this.bullets.push(bullet);
                                        }
                                    });
                                }
                            }
                        } else if (selectedSpecial === 7) {
                            // 並列弾（緑）
                            if (e.triggerAttackShake) e.triggerAttackShake();
                            const durationSeconds = 2 + (e.level || 1);
                            const bulletCount = 30 * durationSeconds;
                            for (let i = 0; i < bulletCount; i++) {
                                if (!e.delayedActions) e.delayedActions = [];
                                e.delayedActions.push({
                                    timer: (i / bulletCount) * durationSeconds,
                                    action: () => {
                                        const sx = (Math.random() - 0.5) * 10; // X: -5 ~ +5
                                        const sz = e.z + 15.0; // 手前へ向かって落下してくる想定（Z=25~30など）
                                        const bullet = new Bullet(sx, sz, {
                                            vx: 0, vz: -10,
                                            damage: 5, knockback: 5, owner: 'enemy', size: 0.3, type: 'enemy_bullet', targetDist: 40, textureKey: 'enemy_bullet', color: 0x00ff00, opacity: 0.75
                                        });
                                        this.bullets.push(bullet);
                                    }
                                });
                            }
                        }
                    }
                }
            } else {
                // 通常敵のAI
                if (e.atkTimer) e.atkTimer -= dt;

                let target = null;
                let minDist = 9999;
                for (const p of this.players) {
                    if (p.isDead) continue;
                    const dx = p.x - e.x;
                    const dz = p.z - e.z;
                    const distSq = dx*dx + dz*dz;
                    if (distSq < minDist) {
                        minDist = distSq;
                        target = p;
                    }
                }

                if (target) {
                    const dist = Math.sqrt(minDist);
                    // 攻撃射程内の場合、弾を飛ばす
                    if (dist <= e.atkRange) {
                        if (e.atkTimer <= 0) {
                            const speed = 15; // 弾速15m/s
                            const dx = target.x - e.x;
                            const dz = target.z - e.z;

                            // 属性に応じた色を取得
                            let bColor = 0xffffff;
                            if (e.attribute === 'red') bColor = 0xff0000;
                            else if (e.attribute === 'blue') bColor = 0x0000ff;
                            else if (e.attribute === 'green') bColor = 0x00ff00;
                            else if (e.attribute === 'yellow') bColor = 0xffff00;
                            else if (e.attribute === 'purple') bColor = 0xcc00ff;

                            const bullet = new Bullet(e.x, e.z, {
                                vx: (dx/dist)*speed, vz: (dz/dist)*speed,
                                damage: 1, knockback: 0, owner: 'enemy', size: 0.15, type: 'enemy_bullet', targetDist: dist, color: bColor
                            });
                            bullet.sourceEntity = e;
                            this.bullets.push(bullet); if (bullet && bullet.sourceEntity && bullet.sourceEntity.triggerAttackShake) bullet.sourceEntity.triggerAttackShake();
                            e.atkTimer = e.atkFreq;
                        }
                    }
                }
                
                // 移動ロジック（ズッ、ズッと動く）
                if (e.isMoving) {
                    // 移動中
                    e.moveTimer -= dt;
                    if (e.moveTimer <= 0) {
                        e.isMoving = false;
                        e.moveTimer = e.moveInterval;
                        e.vx = 0; e.vz = 0;
                    } else {
                        // プレイヤーとの衝突判定（バンプ攻撃）
                        for (const p of this.players) {
                            if (p.isDead) continue;
                            const dx = p.x - e.x;
                            const dz = p.z - e.z;
                            const dist = Math.sqrt(dx*dx + dz*dz);
                            if (dist < (e.size/2 + 0.5)) { // 女の子のサイズ(約1.0)の半径0.5と自分の半径
                                // ダメージ判定
                                const isHit = this.applyDamage(e, p, e.atkPower, 'normal', dist);
                                // 180度反転
                                e.vx *= -1;
                                e.vz *= -1;
                                break;
                            }
                        }
                    }
                } else {
                    // 待機中
                    e.moveTimer -= dt;
                    if (e.moveTimer <= 0) {
                        e.isMoving = true;
                        e.moveTimer = e.moveDist / e.speed;
                        
                        let angle = 0;
                        if (target && Math.sqrt(minDist) <= 10.0) {
                            // 10m以内にいる場合、そちらへ向かう
                            const dx = target.x - e.x;
                            const dz = target.z - e.z;
                            angle = Math.atan2(dz, dx);
                        } else {
                            // 下方向（手前: -z方向）±10度
                            const baseAngle = -Math.PI / 2; // -z方向 (画面下＝手前)
                            const spread = (Math.random() - 0.5) * 20 * (Math.PI / 180);
                            angle = baseAngle + spread;
                        }
                        
                        e.vx = Math.cos(angle) * e.speed;
                        e.vz = Math.sin(angle) * e.speed;
                    }
                }

            }
            
            if (e.x < -5) e.x = -5;
            if (e.x > 5) e.x = 5;
            if (e.z < -5) {
                // 画面手前(下)に抜けたら削除して新規生成（再抽選）へ
                e.isDead = true;
            }
            if (e.z > 30) e.z = 25.0; // 画面奥に行き過ぎた場合の安全装置
        }

        // 敵同士の衝突判定と押し出し（体重比較）
        for (let i = 0; i < this.enemies.length; i++) {
            const e1 = this.enemies[i];
            if (e1.isDead) continue;
            for (let j = i + 1; j < this.enemies.length; j++) {
                const e2 = this.enemies[j];
                if (e2.isDead) continue;
                
                const dx = e2.x - e1.x;
                const dz = e2.z - e1.z;
                const dist = Math.sqrt(dx*dx + dz*dz) || 0.001;
                const minDist = (e1.size + e2.size) / 2.0;
                
                if (dist < minDist) {
                    const overlap = minDist - dist;
                    const pushX = (dx / dist) * overlap;
                    const pushZ = (dz / dist) * overlap;
                    
                    // 体重(weight)を比較して押し出し量を決定
                    if (e1.weight > e2.weight) {
                        e2.x += pushX;
                        e2.z += pushZ;
                    } else if (e2.weight > e1.weight) {
                        e1.x -= pushX;
                        e1.z -= pushZ;
                    } else {
                        // 同重量なら半分ずつ
                        e1.x -= pushX * 0.5;
                        e1.z -= pushZ * 0.5;
                        e2.x += pushX * 0.5;
                        e2.z += pushZ * 0.5;
                    }
                }
            }
        }

        // プレイヤーの特技更新など
        for (const p of this.players) {
            if (p.isDead) continue;
            
            if (p.gachaDebugTimer > 0) {
                p.gachaDebugTimer -= dt;
            }
            
            // 特技の更新
            p.updateSpecialSkills(dt, this.players, this.effects, this.floatingTexts);
        }

        // 弾の更新と当たり判定
        for (const b of this.bullets) {
            if (b.isDead) continue;
            b.update(dt);

            // 敵弾消去属性の処理（キック弾など）
            if (b.erasesEnemyBullets && b.owner === 'player') {
                for (const eb of this.bullets) {
                    if (!eb.isDead && eb.owner === 'enemy') {
                        const edx = b.x - eb.x;
                        const edz = b.z - eb.z;
                        const edistSq = edx * edx + edz * edz;
                        const eradius = (b.size / 2) + (eb.size / 2);
                        if (edistSq <= eradius * eradius) {
                            eb.isDead = true; // 敵弾を打ち消し消滅！
                            this.effects.push(new EffectEntity(eb.x, eb.z, { type: 'spark', radius: 0.5, lifeTime: 0.2 }));
                        }
                    }
                }
            }

            // スイング系の武器はキャラクターの動きに追従させる

            if (b.type && b.type.startsWith('swing_') && b.sourceEntity) {
                b.x = b.sourceEntity.x;
                b.z = b.sourceEntity.z;

                // 軌跡エフェクトの生成
                if (b.baseAngle !== undefined && b.baseAngle !== null) {
                    const progress = 1.0 - (b.lifeTime / b.maxLife);
                    let swingRange = 60 * (Math.PI / 180);
                    if (b.type === 'swing_004') swingRange = 90 * (Math.PI / 180);
                    else if (b.type === 'swing_003') swingRange = 360 * (Math.PI / 180);
                    else if (b.type === 'swing_ultimate_004') swingRange = 15 * (Math.PI / 180);
                    else if (b.type === 'swing_ultimate_002') swingRange = 180 * (Math.PI / 180);
                    
                    const dir = b.swingDir || 1;
                    const currentAngle = b.baseAngle - (swingRange * dir) + (swingRange * 2 * progress * dir);
                    const hitRange = b.hitRange !== undefined ? b.hitRange : (b.size / 2);
                    
                    const tipX = b.x + Math.cos(currentAngle) * hitRange;
                    const tipZ = b.z + Math.sin(currentAngle) * hitRange;
                    
                    let trailColor = 0x00ffff;
                    if (b.owner === 'player' && b.sourceEntity) {
                        const cid = b.sourceEntity.charId;
                        if (cid === '001') trailColor = 0xaa00aa; // 紫
                        else if (cid === '002') trailColor = 0x00ffff; // 青/水
                        else if (cid === '003') trailColor = 0xff3333; // 赤
                        else if (cid === '004') trailColor = 0xffff00; // 黄
                        else if (cid === '005') trailColor = 0x8888ff; // 薄青
                    }

                    const prevX = b.lastTipX !== undefined ? b.lastTipX : tipX;
                    const prevZ = b.lastTipZ !== undefined ? b.lastTipZ : tipZ;
                    b.lastTipX = tipX;
                    b.lastTipZ = tipZ;

                    this.effects.push(new EffectEntity(tipX, tipZ, {
                        type: 'swing_trail',
                        radius: 0.2, // 線にするため少し太く
                        lifeTime: 1.0, // 1秒かけて消える
                        customData: { color: trailColor, prevX, prevZ }
                    }));
                }
            }

            if (b.type && !b.type.startsWith('swing_') && b.distanceTraveled >= b.targetDist) {
                if (b.type === 'grenade') {
                    this.effects.push(new EffectEntity(b.x, b.z, { type: 'explosion', radius: 2.0, lifeTime: 0.5 }));
                    const targets = b.owner === 'player' ? this.enemies : this.players;
                    for (const aoeTarget of targets) {
                        if (aoeTarget.isDead || aoeTarget.isDying) continue;
                        const adx = b.x - aoeTarget.x;
                        const adz = b.z - aoeTarget.z;
                        if (adx*adx + adz*adz <= 4.0) {
                            this.applyDamage(b.sourceEntity, aoeTarget, b.damage, 'normal', 0, b.x, b.z);
                            const len = Math.sqrt(adx*adx + adz*adz) || 1.0;
                            aoeTarget.applyKnockback((b.knockback * -adx)/len, (b.knockback * -adz)/len);
                        }
                    }
                }
                b.isDead = true;
                continue;
            }

            const targets = b.owner === 'player' ? this.enemies : this.players;
            for (const t of targets) {
                if (t.isDead || t.isDying) continue;

                if (!b.hitTimes) b.hitTimes = new Map();
                const lastHitTime = b.hitTimes.get(t) || -999;
                if (this.time - lastHitTime < 0.2) continue; // 同じ対象には0.2秒間ダメージを与えない

                const dx = b.x - t.x;
                const dz = b.z - t.z;
                const distSq = dx*dx + dz*dz;
                
                // 武器の場合は hitRange が設定されていればそれを当たり判定半径とする
                const hitRadius = b.hitRange !== undefined ? b.hitRange : (b.size/2);
                const r = hitRadius + (t.size/2);

                if (distSq < r*r) {
                    // スイング攻撃の角度チェック
                    if (b.type && b.type.startsWith('swing_')) {
                        let inAngle = false;
                        let baseAngle = null;
                        
                        if (b.baseAngle !== undefined && b.baseAngle !== null) {
                            baseAngle = b.baseAngle;
                        } else if (b.type === 'swing_ultimate_004') {
                            baseAngle = Math.PI / 2; // 奥（前衛から敵側）へ向かう角度
                        } else if (b.sourceEntity && b.sourceEntity.targetEnemy) {
                            const tx = b.sourceEntity.targetEnemy.x - b.sourceEntity.x;
                            const tz = b.sourceEntity.targetEnemy.z - b.sourceEntity.z;
                            baseAngle = Math.atan2(tz, tx);
                        }
                        
                        if (baseAngle !== null) {
                            const targetAngle = Math.atan2(t.z - b.sourceEntity.z, t.x - b.sourceEntity.x);
                            
                            let angleDiff = Math.abs(targetAngle - baseAngle);
                            if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
                            
                            let swingRange = 60 * (Math.PI / 180);
                            if (b.type === 'swing_004') swingRange = 90 * (Math.PI / 180);
                            else if (b.type === 'swing_003') swingRange = 360 * (Math.PI / 180);
                            else if (b.type === 'swing_ultimate_004') swingRange = 15 * (Math.PI / 180);
                            else if (b.type === 'swing_ultimate_002') swingRange = 180 * (Math.PI / 180);
                            
                            if (angleDiff <= swingRange) {
                                inAngle = true;
                            }
                        } else {
                            inAngle = true; // ターゲット不在の通常スイングは全方位
                        }
                        if (!inAngle) continue;
                    }

                    b.hitTimes.set(t, this.time);

                    if (b.type === 'grenade') {
                        this.effects.push(new EffectEntity(b.x, b.z, { type: 'explosion', radius: 2.0, lifeTime: 0.5 }));
                        for (const aoeTarget of targets) {
                            if (aoeTarget.isDead || aoeTarget.isDying) continue;
                            const adx = b.x - aoeTarget.x;
                            const adz = b.z - aoeTarget.z;
                            if (adx*adx + adz*adz <= 4.0) {
                                const len = Math.sqrt(adx*adx + adz*adz) || 1.0;
                                const isHit = this.applyDamage(b.sourceEntity, aoeTarget, b.damage, 'normal', b.distanceTraveled, b.x, b.z);
                                if (isHit) {
                                    aoeTarget.applyKnockback((b.knockback * -adx)/len, (b.knockback * -adz)/len);
                                }
                            }
                        }
                    } else {
                        const isCrit = Math.random() < 0.1; 
                        const type = isCrit ? 'critical' : 'normal';
                        let finalDmg = isCrit ? b.damage * 1.5 : b.damage;
                        
                        // 貫通弾はヒットごとに威力が2/3に減衰
                        let isPiercing = b.isPiercing || b.type === 'weapon_003';
                        let isSwing = b.type && b.type.startsWith('swing_');
                        
                        if (isPiercing && !isSwing && b.type !== 'ultimate_003' && b.type !== 'kick_bullet' && b.hitCount > 0) {
                            finalDmg *= Math.pow(2/3, b.hitCount);
                        }
                        
                        const dist = Math.sqrt(distSq);
                        const isHit = this.applyDamage(b.sourceEntity, t, finalDmg, type, b.distanceTraveled, b.x, b.z);
                        if (isHit) {
                            if (b.stunDuration > 0 && Math.random() < b.stunChance) {
                                t.stunTimer = b.stunDuration;
                            }
                            if (b.type && b.type.startsWith('swing_')) {
                                const len = Math.sqrt(dx*dx + dz*dz) || 1.0;
                                t.applyKnockback((b.knockback * -dx) / len, (b.knockback * -dz) / len);
                            } else {
                                const len = Math.sqrt(b.vx*b.vx + b.vz*b.vz) || 1.0;
                                t.applyKnockback((b.knockback * b.vx) / len, (b.knockback * b.vz) / len);
                            }
                            if (t.isPlayer && b.owner === 'enemy' && b.knockback >= 5) {
                                t.isFront = false; // ボスの攻撃で吹き飛ばされたら強制後衛
                            }
                            if (b.type === 'kick_bullet') {
                                const src = b.sourceEntity;
                                const midX = src ? (src.x + t.x) / 2 : (b.x + t.x) / 2;
                                const midZ = src ? (src.z + t.z) / 2 : (b.z + t.z) / 2;
                                this.effects.push(new EffectEntity(midX, midZ, {
                                    type: 'kick_hit',
                                    lifeTime: 0.3,
                                    maxLife: 0.3,
                                    radius: 1.5
                                }));
                            }
                            if (isPiercing) {
                                b.hitCount = (b.hitCount || 0) + 1;
                            }
                        }
                    }

                    let isPiercing = b.isPiercing || b.type === 'weapon_003';
                    let isSwing = b.type && b.type.startsWith('swing_');
                    
                    if (!isPiercing && !isSwing) {
                        b.isDead = true;
                        break;
                    }
                }
            }
        }
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            if (this.enemies[i].isDead) this.enemies.splice(i, 1);
        }
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            if (this.bullets[i].isDead) this.bullets.splice(i, 1);
        }
        for (let i = this.effects.length - 1; i >= 0; i--) {
            if (this.effects[i].isDead) this.effects.splice(i, 1);
        }
    }

    swapLane(player, direction) {
        if (!player || player.isDead) return;
        const oldLane = player.lane;
        const newLane = oldLane + direction;
        
        if (newLane >= -2 && newLane <= 2) {
            const other = this.players.find(o => !o.isDead && o !== player && o.lane === newLane);
            if (other) {
                other.lane = oldLane;
            }
            player.lane = newLane;
        }
    }

    swapFrontBack(player, isFront) {
        if (!player || player.isDead || player.isFront === isFront) return;
        
        // 前後移動時はレーンは変わらないため衝突は起きない想定
        player.isFront = isFront;
        player.targetZ = isFront ? 6.0 : 1.0;
    }

    debugFastForward() {
        if (this.isCompleted) return;
        const gs = GlobalState.getInstance();
        
        if (this.waveState === 'boss') {
            this.time += 60;
            this.waveTime += 60;
            for (const enemy of this.enemies) {
                if (enemy.isBoss && enemy.hp > 1) {
                    enemy.hp = 1;
                }
            }
            const rolls = 40;
            for (let i = 0; i < rolls; i++) {
                const activePlayers = this.players.filter(p => !p.isDead);
                if (activePlayers.length > 0) {
                    const rp = activePlayers[Math.floor(Math.random() * activePlayers.length)];
                    const result = gs.rollAttackLevelGacha(rp.charId, rp.isFront);
                    if (result.type) {
                        const typeStr = result.type === 'melee' ? '近接' : '遠隔';
                        if (!gs.levelUpLogs) gs.levelUpLogs = [];
                        gs.levelUpLogs.push({ charId: rp.charId, text: `${typeStr}攻撃レベルが上がった` });
                    }
                }
            }
        } else if (this.waveState === 'playing' || this.waveState === 'intermission') {
            const remainingWaves = this.totalWaves - this.currentWave + 1;
            const timePassed = remainingWaves * 15;
            this.time += timePassed;
            this.waveTime += timePassed;
            
            const remainingEnemies = (remainingWaves * this.enemyCountPerWave) - this.spawnedInWave;
            const aliveEnemies = this.enemies.filter(e => !e.isDead && !e.isDying);
            const totalToKill = remainingEnemies + aliveEnemies.length;

            const enemyLv = this.enemyLevel || 1;
            const baseExp = enemyLv; 
            this.earnedExp += Math.floor(baseExp * totalToKill * gs.expMultiplier);

            for (const enemy of this.enemies) {
                if (!enemy.isDead && enemy.hp > 0) {
                    enemy.hp = 0;
                    enemy.isDying = true;
                    enemy.deathTimer = 0;
                }
            }
            
            for (let i = 0; i < totalToKill; i++) {
                const activePlayers = this.players.filter(p => !p.isDead);
                if (activePlayers.length > 0) {
                    const rp = activePlayers[Math.floor(Math.random() * activePlayers.length)];
                    const result = gs.rollAttackLevelGacha(rp.charId, rp.isFront);
                    if (result.type) {
                        const typeStr = result.type === 'melee' ? '近接' : '遠隔';
                        if (!gs.levelUpLogs) gs.levelUpLogs = [];
                        gs.levelUpLogs.push({ charId: rp.charId, text: `${typeStr}攻撃レベルが上がった` });
                    }
                }
            }

            this.currentWave = this.totalWaves;
            this.spawnedInWave = this.enemyCountPerWave; 
            if (this.waveState === 'intermission') {
                this.waveState = 'playing';
                this.waveTimer = 0;
            }
        }
    }

    triggerUltimate(player, isLinked = false) {
        if (!player || player.isDead) return;
        
        // 必殺技発動
        player.triggerUltimate(this.players, this.enemies, this.bullets, this.effects, this.floatingTexts, isLinked);
        
        // 自分が必殺技を出した直後だったり、SP不足で発動しなかった場合は isUltimateActive になる
        if (!player.isUltimateActive) return;

        // 自分が発動した必殺技に連携したBさんの必殺技によって他のキャラクターがさらに連携することはない
        if (isLinked) return;

        // 連携判定
        const gs = GlobalState.getInstance();
        let standbyPlayers = [];

        for (const other of this.players) {
            if (other === player || other.isDead) continue;
            
            // 既に必殺技発動中、または既にキューにいる場合は除外
            if (other.isUltimateActive) continue;
            if (this.linkedUltimateQueue.includes(other)) continue;

            // other から player への友好度
            const otherChar = gs.characters[other.charId];
            let friendship = 0;
            if (otherChar && otherChar.friendships && otherChar.friendships[player.charId]) {
                friendship = otherChar.friendships[player.charId];
            }

            // 判定：友好度 + 10 %
            const prob = (friendship + 10) / 100.0;
            if (Math.random() < prob) {
                standbyPlayers.push({ player: other, friendship: friendship });
                
                // スタンバイ表示
                this.floatingTexts.push({ 
                    id: Math.random(), 
                    x: other.x, 
                    yOffset: -1.0, 
                    z: other.z, 
                    amount: 'STANDBY', 
                    type: 'heal',
                    lifeTime: 2.0, 
                    maxLife: 2.0 
                });
            }
        }

        // 友好度が高い順にソート
        standbyPlayers.sort((a, b) => b.friendship - a.friendship);
        
        // キューに追加
        for (const p of standbyPlayers) {
            this.linkedUltimateQueue.push(p.player);
        }
    }
}
