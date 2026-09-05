import charDataJson from '../data/characters.json' with { type: 'json' };
import { GlobalState } from './GlobalState.js';

/**
 * 戦闘用エンティティのベースクラス群
 * 描画とは切り離された、論理座標（メートル）とステータスのみを持ちます。
 */

export class BattleEntity {
    constructor(x, z) {
        this.x = x; // メートル (横方向: -5 〜 +5)
        this.z = z; // メートル (奥行き: 0 〜 18)
        this.vx = 0; // m/s
        this.vz = 0; // m/s
        
        this.hp = 1;
        this.maxHp = 1;
        this.sp = 1;
        this.maxSp = 1;
        this.weight = 10; // kg
        this.size = 1.0;  // m (当たり判定の直径)
        this.isDead = false;
        this.lastDamagedTime = -9999;
        this.attackShakeTimer = 0;
        this.damageTiltTimer = 0; // ダメージゲージの表示制御用
        
        // 必殺技用
        this.maxUltimateCooldown = 0;
        this.ultimateCooldown = 0;

        // 呼吸アニメーション用（ラジアン）
        this.breathPhase = Math.random() * Math.PI * 2; 

        // ノックバック変位量（秒速3mで定位置へ復帰）
        this.knockbackOffsetX = 0;
        this.knockbackOffsetZ = 0;
    }

    triggerAttackShake() {
        this.attackShakeTimer = 0.2;
    }

    triggerDamageTilt() {
        this.damageTiltTimer = 0.2;
    }

    update(dt) {
        if (this.attackShakeTimer > 0) this.attackShakeTimer -= dt;
        if (this.damageTiltTimer > 0) this.damageTiltTimer -= dt;
        if (this.kickTimer > 0) {
            this.kickTimer -= dt;
            if (this.kickTimer <= 0) {
                this.kickTimer = 0;
                this.isKickAttacking = false;
            }
        }
        // 汎用必殺技タイマー（リフィエル(009)は独自のriphielUltTimerで管理するので除外）
        if (this.isUltimateActive && this.charId !== '009') {
            if (this.ultimateActiveTimer === undefined) this.ultimateActiveTimer = 5.0;
            this.ultimateActiveTimer -= dt;
            if (this.ultimateActiveTimer <= 0) {
                this.isUltimateActive = false;
                this.ultimateActiveTimer = 5.0;
                this.updateAttackPatterns(); // 攻撃パターンを通常に戻す
            }
        } else if (!this.isUltimateActive || this.charId !== '009') {
            this.ultimateActiveTimer = 5.0;
        }

        // 被弾による必殺技短縮のインターバル(1秒に1回制限)
        if (this.hitUltBoostCooldown > 0) {
            this.hitUltBoostCooldown -= dt;
            if (this.hitUltBoostCooldown < 0) this.hitUltBoostCooldown = 0;
        }


        if (this.stunTimer > 0) {
            this.stunTimer -= dt;
            if (this.stunTimer <= 0) {
                this.stunTimer = 0;
            }
        } else {
            this.x += this.vx * dt;
            this.z += this.vz * dt;
        }

        if (this.sp > 0) {
            // 生命力か精神力、低い方の割合を算出
            const hpRatio = this.maxHp > 0 ? Math.max(0, this.hp / this.maxHp) : 1.0;
            const spRatio = this.maxSp > 0 ? Math.max(0, this.sp / this.maxSp) : 1.0;
            const lowestRatio = Math.min(hpRatio, spRatio);

            // 最小〜最大までの周期（半周期）は1.0秒〜0.5秒
            const halfCycle = 0.5 + 0.5 * lowestRatio;
            const fullCycle = halfCycle * 2.0;

            this.breathPhase += (Math.PI * 2 / fullCycle) * dt;
        }
    }

    applyKnockback(forceX, forceZ) {
        // 力 / 重量 = 移動距離
        let distanceX = forceX / (this.weight || 50);
        let distanceZ = forceZ / (this.weight || 50);
        
        // 異常なノックバック値による画面外への吹き飛びを防ぐための上限
        distanceX = Math.max(-2.0, Math.min(distanceX, 2.0));
        distanceZ = Math.max(-4.0, Math.min(distanceZ, 4.0));

        this.knockbackOffsetX = (this.knockbackOffsetX || 0) + distanceX;
        this.knockbackOffsetZ = (this.knockbackOffsetZ || 0) + distanceZ;

        // baseXを持たない通常雑魚敵用の直接座標移動
        if (this.baseX === undefined && !this.isEnemy) {
            this.x += distanceX;
            this.z += distanceZ;
            this.z = Math.min(this.z, 24.0);
        }
    }
}

export class PlayerCharacter extends BattleEntity {
    constructor(x, z, data = {}) {
        super(x, z);
        this.owner = 'player';
        this.name = data.name || "Unknown";
        this.lane = data.lane || 0; // -2, -1, 0, 1, 2
        this.isFront = data.isFront !== undefined ? data.isFront : false;
        
        this.charId = data.charId || '001';
        this.size = 1.0;

        this.baseX = (typeof x === 'number' && !isNaN(x)) ? x : (this.lane * 2.0);
        this.baseZ = (typeof z === 'number' && !isNaN(z)) ? z : (this.isFront ? 6.0 : 1.0);
        this.x = this.baseX;
        this.z = this.baseZ;
        
        // キャラクター定義の取得
        this.charDef = charDataJson.characters[this.charId] || charDataJson.characters['001'];
        
        // GlobalStateからステータスを取得（ベースATK100、ベースReload100を前提とした値）
        const globalState = GlobalState.getInstance();
        const party = data.party || [this.charId];
        const isJikukan = !!data.isJikukan;
        const stats = globalState ? globalState.calcStats(this.charId, party, this.isFront, isJikukan) : null;
        
        this.hp = (stats && stats.maxHp) ? stats.maxHp : (this.charDef.baseHp || 1000);
        this.maxHp = this.hp;
        this.sp = (stats && stats.maxSp) ? stats.maxSp : (this.charDef.baseSp || 500);
        this.maxSp = this.sp;
        this.atk = (stats && stats.atk) ? stats.atk : (this.charDef.baseAtk || 100);
        this.reloadStat = (stats && stats.reload) ? stats.reload : 100; // ベース100
        this.hitRateBonus = (stats && stats.hitRateBonus) ? stats.hitRateBonus : 0; // 命中率ボーナス
        this.evadeRateBonus = ((stats && stats.evadeRateBonus) ? stats.evadeRateBonus : 0) + 0.05; // デフォルト回避率5% ＋ 装備補正
        this.critRateBonus = (stats && stats.critRateBonus) ? stats.critRateBonus : 0; // クリティカル率ボーナス
        this.critMultBonus = (stats && stats.critMultBonus) ? stats.critMultBonus : 0; // クリティカル倍率ボーナス
        this.elemMods = (stats && stats.elemMods) ? stats.elemMods : { red: 0, blue: 0, green: 0, yellow: 0, purple: 0 };
        this.damageResist = (stats && stats.damageResist) ? stats.damageResist : 0;
        this.allElemDef = Math.round(this.damageResist * 100); // 道場等の全属性防御力ボーナス(%)
        this.debuffResist = Math.round(this.damageResist * 100); // 道場等のデバフ耐性ボーナス(%)
        this.spDrainRate = (stats && stats.spDrainRate) ? stats.spDrainRate : 1.0;
        this.level = (stats && stats.level) ? stats.level : 1;
        
        this.weight = this.charDef.weight || 50;

        const charIdToAttr = {
            '001': 'purple',
            '002': 'blue',
            '003': 'red',
            '004': 'yellow',
            '005': 'green',
            '007': 'yellow',
            '008': 'red',
            '009': 'green',
            '010': 'purple',
            '011': 'blue'
        };
        this.attribute = charIdToAttr[this.charId] || 'purple';

        // レベルと成長の管理
        const charData = globalState.characters[this.charId];
        this.nearLevel = charData ? charData.meleeLevel : 1;
        this.farLevel = charData ? charData.rangedLevel : 1;
        this.wlv = this.nearLevel + this.farLevel; // 遠近攻撃レベルの合計
        this.gachaTimer = 1.0;

        // 起動射程（キャラクター固有の閾値）
        this.nearThreshold = this.charId === '003' ? 5.5 : (this.charId === '005' || this.charId === '010' ? 8.0 : (this.charId === '009' ? 6.0 : 4.0));
        this.farThreshold = this.charId === '001' ? 20.0 : (this.charId === '004' || this.charId === '009' || this.charId === '010' ? 18.0 : 16.0);
        if (this.charId === '001') this.nearThreshold = 8.0;

        this.updateAttackPatterns();
        // --- 特技（オートスキル）用のプロパティ ---
        const initSpecialInterval = this.charId === '003' ? 12.0 : 10.0;
        this.specialTimer = initSpecialInterval; // 開幕はリロードタイム(10s/12s)からスタート
        this.reloadMultiplier = 1.0;
        this.hitRateBonus = 0;
        this.barrierHp = 0;
        this.barrierTimer = 0;
        this.buffTimer = 0; // 紫苑のバフタイマーなど


        // 必殺技のクールダウン設定
        this.maxUltimateCooldown = Math.max(0, 60.0 - (this.wlv * 2.0));
        // 食料がない場合、必殺技リロードは0でスタート
        this.isFoodEmpty = data.isFoodEmpty || false;
        this.ultimateCooldown = this.isFoodEmpty ? 0 : 0;
        this.hitUltBoostCooldown = 0; // 被弾による必殺技短縮インターバル(1秒制限)


        // SP drainタイマー（1秒ごとに消費）
        this.spDrainTimer = 1.0;
        // ダメージ累積値（10ごとにSP-1）
        this.accumulatedDamage = 0;

        // ────────────────────────────────────────────
        // コンボステートマシン
        this.combatState = {
            phase:       'idle',
            comboType:   null,
            stepIdx:     0,
            countIdx:    0,
            reloadTimer: 0,
            cancelled:   false,
        };

        this.isKickAttacking = false;
        this.kickTimer = 0;

        // 旧システム互換 (レンダラー向け)
        this.attackState = { pattern: null, step: 0, subCount: 0, cooldown: 0 };


        // UI用
        this.targetEnemy = null;
        
        // 前衛・後衛の基準Z座標
        this.targetZ = this.isFront ? 6.0 : 1.0;
        this.z = this.targetZ;
        
        // アニメーション用オフセット
        this.animOffsetX = 0;
        this.animOffsetZ = 0;
        this.animY = 0;
        this.targetOffsetX = 0;
        this.targetOffsetZ = 0;
        this.isHopping = false;
        this.hopTimer = 0;
        this.hopDuration = 0.3; // 跳び戻る時間
        
        this.delayedActions = [];

        // ノア(008)のお供のエネルギー球体
        if (this.charId === '008') {
            this.noahOrbs = [];
            this.maxNoahOrbs = Math.min(5, Math.floor(this.wlv / 4) + 1);
            this.noahOrbSpawnTimer = 0.2; // 開始0.2秒後に1個目、以降1秒ごとに生成
        }
    }

    updateAttackPatterns() {
        if (this.charId === '009' && this.isUltimateActive) {
            // 🌸 リフィエル必殺技（大人変身時）: 紅華(003)と同様に槍回し(360°薙ぎ払い) & 槍投げで猛攻撃！
            const swingCount = Math.min(4, Math.floor(((this.nearLevel || 1) + 1) / 2));
            this.patterns = {
                near: [
                    {
                        name: "槍回し",
                        type: "swing_009",
                        power: 120,
                        reload: 0.5,
                        count: swingCount,
                        speed: 0,
                        range: 6.0,      // nearThreshold(6m)と揃える → 射程内と判定されて即攻撃
                        stepDist: 3.0,   // 3m踏み込み（全キャラトップ）
                        knockback: 15,
                        weaponRange: 3.5, // アーム1m + 槍先端2.5m ≈ 3.5m以内なら踏み込み不要
                        isPiercing: true
                    },
                    {
                        name: "リロード",
                        type: "reload",
                        power: 0,
                        reload: 0.5,
                        count: 1,
                        speed: 0,
                        range: 0,
                        stepDist: 0,
                        knockback: 0,
                        weaponRange: 0,
                        isPiercing: false
                    }
                ],
                far: [
                    {
                        name: "槍投げ",
                        type: "weapon_009",
                        power: 120,
                        reload: 0.8,
                        count: 1,
                        speed: 28,
                        range: 18.0,
                        stepDist: 0.5,
                        knockback: 200,
                        weaponRange: 8.0,
                        isPiercing: true
                    },
                    {
                        name: "リロード",
                        type: "reload",
                        power: 0,
                        reload: 0.6,
                        count: 1,
                        speed: 0,
                        range: 0,
                        stepDist: 0,
                        knockback: 0,
                        weaponRange: 0,
                        isPiercing: false
                    }
                ]
            };
        } else {
            // 現在のレベルのパターンを取得
            this.patterns = {
                far: this.charDef.patterns.far[this.farLevel] || this.charDef.patterns.far[1],
                near: this.charDef.patterns.near[this.nearLevel] || this.charDef.patterns.near[1]
            };
        }
    }



    updateSpecialSkills(dt, players, effects, floatingTexts) {
        if (this.isDead) return;

        // SP定期減少（1秒ごとに1削る、食料がない場合は+1削る、道場強化で軽減）
        this.spDrainTimer -= dt;
        if (this.spDrainTimer <= 0) {
            this.spDrainTimer += 1.0;
            const baseDrain = this.isFoodEmpty ? 2 : 1;
            const drainAmount = baseDrain * (this.spDrainRate || 1.0);
            this.sp = Math.max(0, this.sp - drainAmount);
        }

        // 一時バフの減衰
        if (this.buffTimer > 0) {
            this.buffTimer -= dt;
            if (this.buffTimer <= 0) {
                // バフ切れ
                this.reloadMultiplier = 1.0;
                this.hitRateBonus = 0;
            }
        }
        
        // バリアの減衰
        if (this.barrierTimer > 0 && this.barrierHp > 0) {
            this.barrierTimer -= dt;
            if (this.barrierTimer <= 0) {
                this.barrierHp = 0;
            }
        }

        // --- 黄蘭のパッシブスキル（常時更新） ---
        if (this.charId === '004') {
            const backCount = players.filter(p => !p.isFront && !p.isDead).length;
            if (this.isFront) {
                this.reloadMultiplier = Math.max(0.1, 1.0 - (backCount * 0.05));
                // 攻撃力15%アップは適用が難しいので直接atkにかけず、コンボ時のダメージ計算で使いたいが、
                // 簡単のためatkに乗算する。毎フレームリセットは難しいのでatkのベース値を保持するか？
                // -> baseAtk + レベルボーナス で算出済みなので、ここで補正をかけるとややこしい。
                // BattleEngine側で攻撃時に this.atk を参照するときに this.atkMultiplier のようなプロパティを設けるのがベスト。
                this.atkMultiplier = 1.0 + (backCount * 0.15);
            } else {
                this.atkMultiplier = 1.0;
                // 味方の後衛に命中率アップバフを付与する。自分自身も後衛。
                for (const p of players) {
                    if (!p.isFront && !p.isDead) {
                        p.hitRateBonus = (this.wlv + 10) * 0.01;
                    }
                }
            }
        } else {
            this.atkMultiplier = 1.0;
        }


        // --- 定期発動特技 ---
        let specialInterval = 10.0;
        if (this.charId === '003' || this.charId === '007') specialInterval = 12.0;
        if (this.charId === '008') specialInterval = 15.0;

        this.specialTimer -= dt;
        if (this.specialTimer <= 0) {
            this.specialTimer += specialInterval;
            
            let lowestHpPlayer = null;
            let lowestHpRatio = 999;
            for (const p of players) {
                if (p.isDead) continue;
                const ratio = p.hp / p.maxHp;
                if (ratio < lowestHpRatio) {
                    lowestHpRatio = ratio;
                    lowestHpPlayer = p;
                }
            }

            if (this.charId === '001') {
                // 紫苑
                if (this.isFront) {
                    this.buffTimer = 3.0;
                    this.reloadMultiplier = 0.33; // 1/3
                    floatingTexts.push({ id: Math.random(), x: this.x, yOffset: 0, z: this.z, amount: "RELOAD UP", type: "skill", lifeTime: 1.0, maxLife: 1.0 });
                    effects.push(new EffectEntity(this.x, this.z, { type: 'buff_circle', radius: 1.5, lifeTime: 0.5, customData: { color: 'purple' } }));
                } else {
                    for (const p of players) {
                        if (!p.isDead) {
                            p.hitRateBonus = 0.10;
                            p.buffTimer = 3.0; // 3秒と仮定
                            effects.push(new EffectEntity(p.x, p.z, { type: 'buff_circle', radius: 1.5, lifeTime: 0.5, customData: { color: 'purple' } }));
                        }
                    }
                    floatingTexts.push({ id: Math.random(), x: this.x, yOffset: 0, z: this.z, amount: "HIT RATE UP", type: "skill", lifeTime: 1.0, maxLife: 1.0 });
                }
            } else if (this.charId === '002' || this.charId === '005' || this.charId === '009') {
                // 蒼樹 & 李乃果 & リフィエル (回復)
                let baseHeal, altHeal;
                if (this.charId === '002') {
                    baseHeal = 10 + (this.wlv * 2);
                    altHeal = 10 + (this.wlv * 2);
                } else if (this.charId === '005' || this.charId === '009') {
                    baseHeal = 10 + (this.wlv * 3);
                    altHeal = 10 + (this.wlv * 3);
                } else {
                    baseHeal = 0;
                    altHeal = 0;
                }
                
                if (this.isFront) {
                    if (this.hp / this.maxHp >= 0.9 && lowestHpPlayer) {
                        lowestHpPlayer.hp = Math.min(lowestHpPlayer.maxHp, lowestHpPlayer.hp + altHeal);
                        floatingTexts.push({ id: Math.random(), x: lowestHpPlayer.x, yOffset: 0, z: lowestHpPlayer.z, amount: Math.ceil(altHeal), type: "heal", lifeTime: 1.0, maxLife: 1.0 });
                        effects.push(new EffectEntity(lowestHpPlayer.x, lowestHpPlayer.z, { type: 'buff_circle', radius: 1.5, lifeTime: 0.5, customData: { color: 'green' } }));
                    } else {
                        this.hp = Math.min(this.maxHp, this.hp + baseHeal);
                        floatingTexts.push({ id: Math.random(), x: this.x, yOffset: 0, z: this.z, amount: Math.ceil(baseHeal), type: "heal", lifeTime: 1.0, maxLife: 1.0 });
                        effects.push(new EffectEntity(this.x, this.z, { type: 'buff_circle', radius: 1.5, lifeTime: 0.5, customData: { color: 'green' } }));
                    }
                } else {
                    if (lowestHpPlayer) {
                        lowestHpPlayer.hp = Math.min(lowestHpPlayer.maxHp, lowestHpPlayer.hp + baseHeal);
                        floatingTexts.push({ id: Math.random(), x: lowestHpPlayer.x, yOffset: 0, z: lowestHpPlayer.z, amount: Math.ceil(baseHeal), type: "heal", lifeTime: 1.0, maxLife: 1.0 });
                        effects.push(new EffectEntity(lowestHpPlayer.x, lowestHpPlayer.z, { type: 'buff_circle', radius: 1.5, lifeTime: 0.5, customData: { color: 'green' } }));
                    }
                }
            } else if (this.charId === '003') {
                // 紅華 (バリア: 12秒に1回、耐久量 10 + wlv * 3、持続 8.0秒)
                const barrierVal = 10 + (this.wlv * 3);
                let targets = [];
                if (this.isFront) {
                    targets.push(this);
                    const others = players.filter(p => p !== this && p.isFront && !p.isDead).slice(0, 2);
                    targets.push(...others);
                } else {
                    const frontAllies = players.filter(p => p.isFront && !p.isDead).slice(0, 2);
                    if (frontAllies.length > 0) {
                        targets.push(...frontAllies);
                    } else {
                        const backAllies = players.filter(p => !p.isFront && !p.isDead).slice(0, 2);
                        targets.push(...backAllies);
                    }
                }
                for (const t of targets) {
                    t.barrierHp = barrierVal;
                    t.barrierTimer = 8.0;
                    floatingTexts.push({ id: Math.random(), x: t.x, yOffset: 0, z: t.z, amount: "BARRIER", type: "skill", lifeTime: 1.0, maxLife: 1.0 });
                    effects.push(new EffectEntity(t.x, t.z, { type: 'buff_circle', radius: 1.5, lifeTime: 0.5, customData: { color: 'cyan' } }));
                }
            } else if (this.charId === '007') {
                // ななよ (特技: 12秒に1回、自身と隣接レーンの味方の属性防御・デバフ抵抗を30下げる＝ダメージ軽減、持続 3 + wlv/2 秒)
                const buffDuration = 3.0 + (this.wlv / 2.0);
                const targets = players.filter(p => !p.isDead && Math.abs((p.lane !== undefined ? p.lane : 1) - (this.lane !== undefined ? this.lane : 1)) <= 1);
                for (const t of targets) {
                    t.elementalDefBuff = 30;
                    t.elementalDefBuffTimer = buffDuration;
                    floatingTexts.push({ id: Math.random(), x: t.x, yOffset: 0, z: t.z, amount: "DEF UP!", type: "skill", lifeTime: 1.0, maxLife: 1.0 });
                    effects.push(new EffectEntity(t.x, t.z, { type: 'buff_circle', radius: 1.5, lifeTime: 0.5, customData: { color: 'yellow' } }));
                }
            } else if (this.charId === '008') {
                // ノア (特技: 15秒に1回、エネルギー球の位置に直径3mのフィールドを形成。5秒間維持、攻撃力0、触れた敵の属性防御力を50上げる(弱体化、敵のデバフ抵抗力で増減)。デバフ効果は 5 + WLV 秒維持)
                const debuffDuration = 5.0 + this.wlv;
                const activeOrbs = (this.noahOrbs || []).filter(o => !o.isDead);
                
                // 生きているエネルギー球体の位置、なければノアの前方にフィールドを形成
                const spawnPoints = activeOrbs.length > 0 
                    ? activeOrbs.map(o => ({ x: o.x, z: o.z }))
                    : [{ x: this.x, z: this.z + 1.5 }];

                for (const pt of spawnPoints) {
                    const specialField = new Bullet(pt.x, pt.z, {
                        owner: 'player',
                        vx: 0,
                        vz: 0, // その場に固定で5秒間維持
                        damage: 0,
                        knockback: 0,
                        size: 3.0, // 直径3m
                        lifeTime: 5.0,
                        type: 'special_field_008',
                        textureKey: 'weapon_008_orb',
                        isPiercing: true,
                        debuffDuration: debuffDuration,
                        baseDebuff: 50
                    });
                    specialField.sourceEntity = this;
                    if (this.engine) {
                        this.engine.bullets.push(specialField);
                    }
                }
                floatingTexts.push({ id: Math.random(), x: this.x, yOffset: 0, z: this.z, amount: "WEAKEN FIELD!", type: "skill", lifeTime: 1.0, maxLife: 1.0 });
            } else if (this.charId === '010') {
                // プロセル (特技: 10秒に1回、前衛なら2m前、後衛なら8m前に直径1.5mの氷塊を生成。敵弾を5+WLV発吸収、6秒持続)
                const spawnZ = this.z + (this.isFront ? 2.0 : 8.0);
                const iceBlock = new Bullet(this.x, spawnZ, {
                    owner: 'player',
                    vx: 0, vz: 0,
                    damage: 0,
                    knockback: 10,
                    size: 1.5, // 直径1.5m
                    lifeTime: 6.0,
                    type: 'ice_barrier_010',
                    erasesEnemyBullets: true,
                    bulletDurability: 5 + (this.wlv || 0),
                    isPiercing: true
                });
                iceBlock.sourceEntity = this;
                if (this.engine) {
                    this.engine.bullets.push(iceBlock);
                }
                floatingTexts.push({ id: Math.random(), x: this.x, yOffset: 0, z: this.z, amount: "ICE BLOCK!", type: "skill", lifeTime: 1.0, maxLife: 1.0 });
            } else if (this.charId === '011') {
                // 白蓮 (特技: 8秒に1回、前方に初速15m/sで進みシャボン玉減速で漂う直径1.0mのバリア弾。攻撃力0, ノックバック40, WLV個の敵弾消し)
                const specialBullet = new Bullet(this.x, this.z, {
                    owner: 'player',
                    vx: 0,
                    vz: 15.0,
                    damage: 0,
                    knockback: 40,
                    size: 1.0, // 直径1.0m固定
                    lifeTime: 10.0,
                    type: 'special_barrier_011',
                    erasesEnemyBullets: true,
                    bulletDurability: this.wlv
                });
                specialBullet.sourceEntity = this;
                if (this.engine) {
                    this.engine.bullets.push(specialBullet);
                }
                floatingTexts.push({ id: Math.random(), x: this.x, yOffset: 0, z: this.z, amount: "BARRIER BULLET", type: "skill", lifeTime: 1.0, maxLife: 1.0 });
            }


        }
    }


    triggerUltimate(players, enemies, bullets, effects, floatingTexts, isLinked = false) {
        let spCostMultiplier = 1.0;
        let ultimateDamageMultiplier = 1.0;
        
        const gs = GlobalState.getInstance();
        if (gs.activeTarots && gs.activeTarots.length > 0) {
            for (const tarot of gs.activeTarots) {
                if (tarot.id === 2 && !tarot.isUpright) {
                    spCostMultiplier *= 2.0;
                    ultimateDamageMultiplier *= 2.5;
                }
            }
        }
        
        const cost = (this.charId === '005' ? 25 + this.wlv : (this.charId === '009' ? 20 + this.wlv : 10 + this.wlv)) * spCostMultiplier;
        
        if (!isLinked) {
            if (this.sp < cost) {
                floatingTexts.push({ id: Math.random(), x: this.x, yOffset: 0, z: this.z, amount: "NO SP", type: "miss", lifeTime: 1.0, maxLife: 1.0 });
                return;
            }
            if (this.ultimateCooldown > 0) {
                floatingTexts.push({ id: Math.random(), x: this.x, yOffset: 0, z: this.z, amount: "RELOADING", type: "miss", lifeTime: 1.0, maxLife: 1.0 });
                return;
            }
            this.sp -= cost;
            if (this.sp <= 0) {
                this.sp = 0;
                // ※仕様に従うならSP0で気絶や死亡する仕組みがある場合は維持
                // this.isDead = true; 
                // effects.push(new EffectEntity(this.x, this.z, { type: 'majo_death_1', radius: 3.0, lifeTime: 1.0 }));
            }
            this.ultimateCooldown = this.maxUltimateCooldown;
        }

        floatingTexts.push({ id: Math.random(), x: this.x, yOffset: 0, z: this.z, amount: "ULTIMATE", type: "skill", lifeTime: 1.5, maxLife: 1.5 });

        // 各キャラの必殺技ロジック
        this.isUltimateActive = false; // デフォルトは通常攻撃を妨げない

        if (this.charId === '001') {
            // 紫苑: リロード速度1/3, 命中率UP
            this.buffTimer = 4.0 + this.wlv;
            this.reloadMultiplier = 0.33;
            this.isUltimateMode = true;
            for (const p of players) {
                if (!p.isDead) {
                    p.hitRateBonus = (10 + this.wlv) * 0.01;
                    p.buffTimer = 4.0 + this.wlv;
                    effects.push(new EffectEntity(p.x, p.z, { type: 'buff_circle', radius: 1.5, lifeTime: 0.5, customData: { color: 'purple' } }));
                }
            }
        } else if (this.charId === '002') {
            if (!this.delayedActions) {
                this.delayedActions = [];
            }
            // 蒼樹: 0.5秒ごとに剣が出現
            // 必殺技発動中(4秒間)は通常攻撃を行えないようにする
            this.actionTimer = 4.0;
            
            // 各剣は出現後すぐに蒼樹の周囲を360度薙ぎ払い(2.0秒)、その後ターゲットに向けて飛んでいく
            for (let i = 0; i < 8; i++) {
                this.delayedActions.push({ timer: i * 0.5, action: () => {
                    if (this.isDead) return;
                    
                    const bulletDmg = 1.5 * this.atk * ultimateDamageMultiplier;
                    
                    // 1. 360度薙ぎ払い用のスイング弾丸を生成 (2.0秒)
                    // 1. 360度薙ぎ払い用のスイング弾丸を生成 (回転速度2倍: 1.0秒, サイズは元の0.5)
                    const swingBullet = new Bullet(this.x, this.z, {
                        owner: 'player', isPiercing: true,
                        vx: 0, vz: 0,
                        damage: bulletDmg, knockback: 5, size: 0.5, hitRange: 3.5 * (2/3), lifeTime: 1.0, type: 'swing_ultimate_002'
                    });
                    swingBullet.sourceEntity = this;
                    swingBullet.maxLife = 1.0;
                    swingBullet.baseAngle = 0; // 0から360度回転する
                    swingBullet.swingDir = 1; // 8本の剣の回転方向を時計回りに統一！
                    bullets.push(swingBullet); if (swingBullet && swingBullet.sourceEntity && swingBullet.sourceEntity.triggerAttackShake) swingBullet.sourceEntity.triggerAttackShake();
                    
                    // 2. 薙ぎ払い終了後(1.0秒後)に飛び道具として発射
                    this.delayedActions.push({ timer: 1.0, action: () => {
                        if (this.isDead || !this.targetEnemy) return;
                        
                        const dx = this.targetEnemy.x - this.x;
                        const dz = this.targetEnemy.z - this.z;
                        const len = Math.sqrt(dx*dx + dz*dz) || 1.0;
                        const speed = 30.0;
                        // 飛んでいく剣の大きさを今の2倍(size: 1.0)に拡大
                        const flyBullet = new Bullet(this.x, this.z, {
                            owner: 'player', isPiercing: true,
                            vx: (dx/len)*speed, vz: (dz/len)*speed,
                            damage: bulletDmg, knockback: 0, size: 1.0, targetDist: 10.0, lifeTime: 2.0, type: 'weapon_002'
                        });
                        flyBullet.sourceEntity = this;
                        bullets.push(flyBullet); if (flyBullet && flyBullet.sourceEntity && flyBullet.sourceEntity.triggerAttackShake) flyBullet.sourceEntity.triggerAttackShake();
                    }});


                }});
            }

        } else if (this.charId === '004') {
            // 黄蘭: 垂直上向きから左右に10度づつの二方向に黄色い帯が伸びる
            const ribbonDmg = 1.2 * this.atk * ultimateDamageMultiplier;
            const bulletDmg = ribbonDmg * 0.2;
            const speed = 50; // ショットガン速度
            
            const ribbonLife = 1.0;
            effects.push(new EffectEntity(this.x, this.z, { type: 'weapon_004_ribbon', radius: 1.0, lifeTime: ribbonLife, angle: -10, ownerEntity: this }));
            effects.push(new EffectEntity(this.x, this.z, { type: 'weapon_004_ribbon', radius: 1.0, lifeTime: ribbonLife, angle: 10, ownerEntity: this }));
            
            // 攻撃判定用の不可視の薙ぎ払い(swing)弾丸を生成
            // V字(±10度)をカバーするように、前方±15度の範囲に扇状の判定を一瞬だけ発生
            const ribbonHit = new Bullet(this.x, this.z, {
                owner: 'player', isPiercing: true,
                vx: 0, vz: 0, // 動かない
                damage: ribbonDmg, knockback: 5, size: 40.0, hitRange: 20.0, lifeTime: 0.1, type: 'swing_ultimate_004', ownerEntity: this,
                stunDuration: 1.0, stunChance: 1.0
            });

            ribbonHit.sourceEntity = this;
            bullets.push(ribbonHit); if (ribbonHit && ribbonHit.sourceEntity && ribbonHit.sourceEntity.triggerAttackShake) ribbonHit.sourceEntity.triggerAttackShake();

            if (!this.delayedActions) {
                this.delayedActions = [];
            }
            
            // 0.2秒後から1.0秒後にかけて、根本から順に弾丸へ変化
            // 1mごとに1発（両側で計40発 = 片側20発）
            for (let i = 0; i < 40; i++) {
                const delay = 0.2 + 0.8 * (i / 40); // 0.2s 〜 1.0s
                const isLeft = i % 2 === 0;
                const ribbonAngle = isLeft ? -10 : 10;
                
                this.delayedActions.push({ timer: delay, action: () => {
                    if (this.isDead) return;
                
                    // 根本から順に進む距離 (片側20発なので、1発につき約1m進む = Math.floor(i/2) * 1.0)
                    const distance = Math.floor(i / 2) * 1.0; 
                    const angleRad = ribbonAngle * Math.PI / 180;
                    const spawnX = this.x + Math.sin(angleRad) * distance;
                    const spawnZ = this.z + Math.cos(angleRad) * distance;
                    
                    // 方向は360度完全ランダム
                    const randomAngle = Math.random() * Math.PI * 2;
                    const spd = 1.0 + Math.random() * 1.5; // ゆっくり進む
                    
                    const bObj = new Bullet(spawnX, spawnZ, {
                        owner: 'player', isPiercing: true,
                        vx: Math.cos(randomAngle)*spd, vz: Math.sin(randomAngle)*spd,
                        damage: bulletDmg, knockback: 1, size: 0.8, lifeTime: 4.0, type: 'weapon_004_ribbon',
                        swayPhase: 0,
                        swayAmp: 0,
                        spinAngle: Math.random() * Math.PI * 2,
                        spinSpeed: (Math.random() < 0.5 ? 1 : -1) * (0.8 + Math.random() * 1.5), // 全てランダムな回転方向・速度でゆっくり回転
                        stunDuration: 1.0, // 命中時に1秒間行動不能(スタン)
                        stunChance: 1.0
                    });


                    bObj.sourceEntity = this;
                    
                    if (this.engine) {
                        this.engine.bullets.push(bObj); if (bObj && bObj.sourceEntity && bObj.sourceEntity.triggerAttackShake) bObj.sourceEntity.triggerAttackShake();
                    } else {
                        bullets.push(bObj); if (bObj && bObj.sourceEntity && bObj.sourceEntity.triggerAttackShake) bObj.sourceEntity.triggerAttackShake();
                    }
                }});
            }
        } else if (this.charId === '005') {
            // 李乃果: 全体回復 300+(WLV)*30 をメンバーの数で割った分回復
            const healTotal = 300 + (this.wlv * 30);
            const alivePlayers = players.filter(p => !p.isDead);
            if (alivePlayers.length > 0) {
                const healAmount = healTotal / alivePlayers.length;
                for (const p of alivePlayers) {
                    p.hp = Math.min(p.maxHp, p.hp + healAmount);
                    floatingTexts.push({ id: Math.random(), x: p.x, yOffset: 0, z: p.z, amount: Math.ceil(healAmount), type: "heal", lifeTime: 1.0, maxLife: 1.0 });
                    effects.push(new EffectEntity(p.x, p.z, { type: 'buff_circle', radius: 1.5, lifeTime: 0.5, customData: { color: 'green' } }));
                }
            }
        } else if (this.charId === '009') {
            // リフィエル 必殺技: 10 + WLV 秒間大人の姿に変身して槍で猛攻撃！
            this.isUltimateActive = true;
            this.riphielUltTimer = 15.0 + this.wlv;
            this.updateAttackPatterns();
            this.combatState.phase = 'idle';
            floatingTexts.push({ id: Math.random(), x: this.x, yOffset: 0, z: this.z, amount: "大人の覚醒！", type: "skill", lifeTime: 1.5, maxLife: 1.5 });

            // ① nrg.png 加算合成バーストフラッシュ（大小の姿を重ねて光らせる）
            effects.push(new EffectEntity(this.x, this.z, { type: 'ultimate_burst_009', radius: 3.0, lifeTime: 0.6 }));

            // ② 直径3m(半径1.5m)の押し返しバレットを生成（槍回しと同じ攻撃力・ノックバック）
            const blastDmg = 1.2 * this.atk;
            const blastBullet = new Bullet(this.x, this.z, {
                owner: 'player',
                vx: 0, vz: 0,
                damage: blastDmg,
                knockback: 15,
                size: 3.0,
                hitRange: 1.5,
                isPiercing: true,
                type: 'blast_009',
                lifeTime: 0.4
            });
            blastBullet.sourceEntity = this;
            bullets.push(blastBullet);
        } else if (this.charId === '003') {
            // 紅華: 4m槍投げ（両端を繋げた形）
            const dmg = 2.0 * this.atk * ultimateDamageMultiplier;
            const spawnX = this.x;
            const spawnZ = this.z;
            let dirX = 0; let dirZ = 1;
            
            const bObj = new Bullet(spawnX, spawnZ, {
                owner: 'player', isPiercing: true,
                vx: dirX * 5.0, vz: dirZ * 5.0, // 初速5.0m/s
                damage: dmg, knockback: 200, size: 30.0, hitRange: 3.0, lifeTime: 10.0, type: 'ultimate_003'
            });
            bObj.sourceEntity = this;
            bObj.isReturning = false;
            bObj.distanceTraveled = 0;
            bObj.spinAngle = 0;
            
            bObj.update = function(dt) {
                this.spinAngle += 5 * Math.PI * dt;
                if (!this.isReturning) {
                    this.x += this.vx * dt; 
                    this.z += this.vz * dt; 
                    this.distanceTraveled += 5.0 * dt;
                    if (this.distanceTraveled >= 16.0) {
                        this.isReturning = true;
                    }
                } else {
                    const dx = this.sourceEntity.x - this.x;
                    const dz = this.sourceEntity.z - this.z;
                    const dist = Math.sqrt(dx*dx + dz*dz) || 0.001;
                    if (dist < 1.0) {
                        this.isDead = true;
                        this.sourceEntity.isUltimateActive = false;
                        return;
                    }
                    const spd = 10.0 * dt;
                    this.x += (dx / dist) * spd;
                    this.z += (dz / dist) * spd;
                }
            };
            
            this.isUltimateActive = true;
            this.ultimateTimer = 0;
            if (this.engine) {
                this.engine.bullets.push(bObj); if (bObj && bObj.sourceEntity && bObj.sourceEntity.triggerAttackShake) bObj.sourceEntity.triggerAttackShake();
            } else {
                bullets.push(bObj); if (bObj && bObj.sourceEntity && bObj.sourceEntity.triggerAttackShake) bObj.sourceEntity.triggerAttackShake();
            }
        } else if (this.charId === '007') {
            // ななよ 必殺技:
            // 消費SP: 10 + WLV, CD: 60 - WLV*2
            // 三鈷杵が一番耐久力のある敵に向かって秒速35mで15m進む。全貫通。
            // 突進ごとに「臨・兵・闘・者・皆・陣・烈・在・前」が頭上に1文字ずつ表示される！
            // 9回突進を行ったあと、最後はななよに向かって戻り、ななよに接触すると消滅。
            const spCost = Math.floor((10 + this.wlv) * spCostMultiplier);
            if (this.sp < spCost) return;
            this.sp -= spCost;

            const cdVal = Math.max(10, 60 - (this.wlv * 2));
            this.ultimateCooldown = cdVal;

            const ultDamage = Math.max(1, Math.floor((this.atk * (1.5 + this.wlv * 0.1)) * ultimateDamageMultiplier));
            const self = this;

            // 必殺技発動中: 印を結んでいるため通常攻撃・格闘攻撃は一切行えない
            this.isUltimateActive = true;

            const ultBullet = new Bullet(this.x, this.z + 1.0, {
                owner: 'player',
                isPiercing: true,
                vx: 0,
                vz: 35.0,
                damage: ultDamage,
                knockback: 30,
                size: 1.8,
                lifeTime: 25.0,
                type: 'ultimate_007'
            });
            ultBullet.sourceEntity = this;
            ultBullet.hitEnemyIds = new Set();
            ultBullet.thrustStep = 1; // 1〜9
            ultBullet.stepState = 'moving'; // 'moving' | 'pausing' | 'returning'
            ultBullet.pauseTimer = 0;
            ultBullet.travelDist = 0;
            ultBullet.maxDistForStep = 15.0; // 1回目は15m、2〜9回目は12m
            ultBullet.speed = 35.0;

            const KUJI_CHARS = ['臨', '兵', '闘', '者', '皆', '陣', '烈', '在', '前'];

            const showKujiWord = (step) => {
                const char = KUJI_CHARS[step - 1] || '前';
                const ft = {
                    id: Math.random(),
                    x: self.x,
                    yOffset: 0.2, // ななよの頭上
                    z: self.z,
                    amount: char,
                    type: 'kuji_word',
                    color: '#ffd700',
                    stroke: '#000000',
                    strokeThickness: 6,
                    fontSize: '36px',
                    fontStyle: 'bold',
                    lifeTime: 0.85,
                    maxLife: 0.85
                };
                if (self.engine) {
                    self.engine.floatingTexts.push(ft);
                    self.engine.effects.push(new EffectEntity(self.x, self.z, { type: 'buff_circle', radius: 1.2, lifeTime: 0.35, customData: { color: 'yellow' } }));
                } else {
                    floatingTexts.push(ft);
                }
            };

            // 最もHP（耐久力）の高い敵の方向へ速度ベクトルを設定
            ultBullet.aimAtToughestEnemy = function() {
                this.hitEnemyIds.clear();
                const aliveEnemies = (self.engine ? self.engine.enemies : enemies).filter(e => !e.isDead);
                if (aliveEnemies.length > 0) {
                    aliveEnemies.sort((a, b) => b.hp - a.hp);
                    const target = aliveEnemies[0];
                    const dx = target.x - this.x;
                    const dz = target.z - this.z;
                    const dist = Math.hypot(dx, dz) || 1.0;
                    this.vx = (dx / dist) * this.speed;
                    this.vz = (dz / dist) * this.speed;
                } else {
                    this.vx = 0;
                    this.vz = this.speed;
                }
                this.travelDist = 0;
                showKujiWord(this.thrustStep);
            };

            ultBullet.aimAtToughestEnemy();

            ultBullet.update = function(dt) {
                if (this.stepState === 'moving') {
                    this.x += this.vx * dt;
                    this.z += this.vz * dt;
                    this.travelDist += this.speed * dt;

                    if (this.travelDist >= this.maxDistForStep) {
                        if (this.thrustStep < 9) {
                            this.stepState = 'pausing';
                            this.pauseTimer = 0.20; // 0.2秒のタメで次の一閃へ！
                            this.vx = 0;
                            this.vz = 0;
                        } else {
                            // 9回突進完了（「前」まで到達） ➔ ななよへ帰還！
                            this.stepState = 'returning';
                        }
                    }
                } else if (this.stepState === 'pausing') {
                    this.pauseTimer -= dt;
                    if (this.pauseTimer <= 0) {
                        this.thrustStep++;
                        this.stepState = 'moving';
                        this.maxDistForStep = 12.0;
                        this.aimAtToughestEnemy();
                    }
                } else if (this.stepState === 'returning') {
                    const targetX = self.x;
                    const targetZ = self.z;
                    const dx = targetX - this.x;
                    const dz = targetZ - this.z;
                    const dist = Math.hypot(dx, dz);
                    if (dist < 1.0) {
                        this.isDead = true;
                        self.isUltimateActive = false; // 三鈷杵帰還完了！通常行動再開
                    } else {
                        const returnSpd = 40.0;
                        this.vx = (dx / dist) * returnSpd;
                        this.vz = (dz / dist) * returnSpd;
                        this.x += this.vx * dt;
                        this.z += this.vz * dt;
                    }
                }
            };

            if (this.engine) {
                this.engine.bullets.push(ultBullet);
            } else {
                bullets.push(ultBullet);
            }
            floatingTexts.push({ id: Math.random(), x: this.x, yOffset: 0, z: this.z, amount: "九字結界・破！", type: "skill", lifeTime: 1.2, maxLife: 1.2 });
        } else if (this.charId === '008') {
            // ノア 必殺技:
            // 消費SP: 20 + WLV, CD: 60 - WLV*2
            // ノアの前方1mに 008004a.png を出現させ、1秒かけて高さ1mから高さ3mまで拡大しながら秒速0.5mで前進。
            // 同じ大きさの 008004b.png に変化したあと、0.1秒ごとに秒速1mづつ加速して前進。
            // 全貫通、攻撃力 60 + 5 * WLV、接触した弾丸を消す！
            const spCost = Math.floor((20 + this.wlv) * spCostMultiplier);
            if (this.sp < spCost) return;
            this.sp -= spCost;

            const cdVal = Math.max(10, 60 - (this.wlv * 2));
            this.ultimateCooldown = cdVal;

            const ultDmg = Math.max(1, Math.floor((this.atk * ((60 + 5 * this.wlv) / 100)) * ultimateDamageMultiplier));
            const ultBullet = new Bullet(this.x, this.z + 1.0, {
                owner: 'player',
                isPiercing: true,
                vx: 0,
                vz: 0.5,
                damage: ultDmg,
                knockback: 100,
                size: 1.0,
                type: 'ultimate_008',
                textureKey: 'weapon_008_ult_a',
                lifeTime: 15.0,
                erasesEnemyBullets: true
            });
            ultBullet.sourceEntity = this;
            ultBullet.expandTimer = 0;
            ultBullet.currentVz = 0.5;
            ultBullet.isWingExpanded = false;

            if (this.engine) {
                this.engine.bullets.push(ultBullet);
            } else {
                bullets.push(ultBullet);
            }
            floatingTexts.push({ id: Math.random(), x: this.x, yOffset: 0, z: this.z, amount: "不滅の不死鳥！", type: "skill", lifeTime: 1.2, maxLife: 1.2 });
        } else if (this.charId === '010') {
            // プロセル 必殺技:
            // 消費SP: 20 + WLV, CD: 30 - WLV*2
            // 3 + WLV/3 秒間、本体中心から距離1mのランダム位置から、真上±5度に乱射！
            // つらら大を0.4秒に1発、つらら小を0.2秒に1発乱射
            const spCost = Math.floor((20 + this.wlv) * spCostMultiplier);
            if (this.sp < spCost) return;
            this.sp -= spCost;

            const cdVal = Math.max(10, 30 - (this.wlv * 2));
            this.ultimateCooldown = cdVal;

            this.isUltimateActive = true;
            this.proserUltTimer = 3.0 + (this.wlv / 3.0);
            this.proserLargeIcicleTimer = 0;
            this.proserSmallIcicleTimer = 0;

            floatingTexts.push({ id: Math.random(), x: this.x, yOffset: 0, z: this.z, amount: "絶対零度の吹雪！", type: "skill", lifeTime: 1.5, maxLife: 1.5 });
            effects.push(new EffectEntity(this.x, this.z, { type: 'buff_circle', radius: 2.0, lifeTime: 0.8, customData: { color: 'purple' } }));
        } else if (this.charId === '011') {
            // 白蓮 必殺技:
            // 消費SP: 10 + WLV, CD: 60 - WLV*2
            // 前方に秒速2mで進む直径1mのバリア弾。攻撃力0, ノックバック40, 敵弾丸を消す。
            // 15m進むと直径8mに拡大して破裂し、範囲内に基本攻撃力の (100 + 10 * WLV)% のダメージ！
            const spCost = Math.floor((10 + this.wlv) * spCostMultiplier);
            if (this.sp < spCost) return;
            this.sp -= spCost;

            const cdVal = Math.max(10, 60 - (this.wlv * 2));
            this.ultimateCooldown = cdVal;
            
            // 白蓮 (必殺技: 初速6.5m/sから0.1秒ごと6%減速で3秒かけて8m前進し、8m到達で突然直径8mの特大バリアに大爆発拡大！
            // 5秒+(WLV/2)秒持続し、範囲内の敵に毎秒(攻撃力の10%+WLV%)の継続ダメージを与え、敵弾を完全吸収しながら秒速1.0mでジワジワ前進)
            const ultBullet = new Bullet(this.x, this.z, {
                owner: 'player', isPiercing: true,
                vx: 0, vz: 6.5, // 初速 6.5m/s
                damage: 0, knockback: 40, size: 1.0, lifeTime: 30.0, type: 'ultimate_011',
                erasesEnemyBullets: true
            });
            ultBullet.sourceEntity = this;
            ultBullet.travelDist = 0;
            ultBullet.hasExploded = false;

            const self = this;
            ultBullet.update = function(dt) {
                this.x += this.vx * dt;
                this.z += this.vz * dt;

                if (!this.hasExploded) {
                    this.travelDist += Math.abs(this.vz) * dt;
                    // 0.1秒ごとに約6%減速 (3.0秒で約8m到達し、最終速度は秒速1.0m)
                    const decay = Math.pow(0.94, dt / 0.1);
                    this.vz *= decay;

                    if (this.travelDist >= 8.0) {
                        // 8m到達！突然直径8mの超巨大バリアへ大爆発拡大！
                        this.hasExploded = true;
                        this.size = 8.0; // 直径8.0m (半径4m)
                        this.vz = 1.0;   // 最終速度 1.0m/s でジワジワ前進
                        this.type = 'ultimate_burst_field_011';
                        const burstDuration = 5.0 + (self.wlv / 2.0); // 5秒 + (WLV/2)秒 持続
                        this.lifeTime = burstDuration;

                        if (self.engine) {
                            self.engine.effects.push(new EffectEntity(this.x, this.z, { type: 'ultimate_burst_011', radius: 4.0, lifeTime: burstDuration }));
                        }
                    }
                }
            };

            if (this.engine) {
                this.engine.bullets.push(ultBullet);
            } else {
                bullets.push(ultBullet);
            }
            floatingTexts.push({ id: Math.random(), x: this.x, yOffset: 0, z: this.z, amount: "浄化の結界！", type: "skill", lifeTime: 1.2, maxLife: 1.2 });
        }
    }


    hopBack() {
        if (this.animOffsetX !== 0 || this.animOffsetZ !== 0) {
            this.targetOffsetX = 0;
            this.targetOffsetZ = 0;
            this.isHopping = true;
            this.hopTimer = this.hopDuration;
        }
    }

    update(dt) {
        if (this.isDead || this.hp <= 0) {
            // 戦闘不能時は定位置への引き戻しを行わず、スクロール移動（zの変化）をそのまま維持
            this.animOffsetX = 0;
            this.animOffsetZ = 0;
            this.animY = 0;
            this.baseX = this.x;
            this.baseZ = this.z;
            super.update(dt);
            return;
        }

        // ベース位置の更新
        const targetX = (typeof this.lane === 'number' ? this.lane : 0) * 2.0;
        const targetZ = typeof this.targetZ === 'number' ? this.targetZ : (this.isFront ? 6.0 : 1.0);

        if (this.baseX === undefined || isNaN(this.baseX)) {
            this.baseX = targetX;
        }
        if (this.baseZ === undefined || isNaN(this.baseZ)) {
            this.baseZ = targetZ;
        }
        
        this.baseX += (targetX - this.baseX) * 10.0 * dt;
        this.baseZ += (targetZ - this.baseZ) * 5.0 * dt;

        // オフセットの更新（跳び戻り中の場合は特別な補間）
        for (let i = this.delayedActions.length - 1; i >= 0; i--) {
            this.delayedActions[i].timer -= dt;
            if (this.delayedActions[i].timer <= 0) {
                this.delayedActions[i].action();
                this.delayedActions.splice(i, 1);
            }
        }
        if (this.isHopping) {
            this.hopTimer -= dt;
            if (this.hopTimer <= 0) {
                this.isHopping = false;
                this.hopTimer = 0;
                this.animOffsetX = 0;
                this.animOffsetZ = 0;
                this.animY = 0;
            } else {
                const progress = 1.0 - (this.hopTimer / this.hopDuration);
                // X, Zは線形補間で0へ
                this.animOffsetX -= this.animOffsetX * (dt / this.hopTimer);
                this.animOffsetZ -= this.animOffsetZ * (dt / this.hopTimer);
                // Yは放物線 (最大高さ 1.0m 程度)
                this.animY = Math.sin(progress * Math.PI) * 1.0;
            }
        } else {
            // スムーズにtargetOffsetへ移動（踏み込み）
            this.animOffsetX += (this.targetOffsetX - this.animOffsetX) * 15.0 * dt;
            this.animOffsetZ += (this.targetOffsetZ - this.animOffsetZ) * 15.0 * dt;
            this.animY = 0;
        }

        // ノックバックオフセットの復帰処理（スワイプ移動と同等の秒速8mで素早く復帰）
        const returnSpeed = 8.0;
        const kbDist = Math.sqrt((this.knockbackOffsetX || 0) ** 2 + (this.knockbackOffsetZ || 0) ** 2);
        if (kbDist > 0.001) {
            const moveDist = returnSpeed * dt;
            if (kbDist <= moveDist) {
                this.knockbackOffsetX = 0;
                this.knockbackOffsetZ = 0;
            } else {
                this.knockbackOffsetX -= (this.knockbackOffsetX / kbDist) * moveDist;
                this.knockbackOffsetZ -= (this.knockbackOffsetZ / kbDist) * moveDist;
            }
        }

        // 最終座標の合成
        this.x = this.baseX + this.animOffsetX + (this.knockbackOffsetX || 0);
        this.z = this.baseZ + this.animOffsetZ + (this.knockbackOffsetZ || 0);

        super.update(dt);
        
        // --- 特殊パッシブスキルの動的評価 ---
        if (this.charId === '004' && this.engine) {
            // 前衛にいる時、後衛にいるキャラクタ一人につき攻撃力が15%上がり、リロード速度が5％短縮される
            if (this.isFront) {
                const backlineCount = this.engine.players.filter(p => !p.isDead && !p.isFront).length;
                this.atkMultiplier = 1.0 + (0.15 * backlineCount);
                this.reloadMultiplier = 1.0 - (0.05 * backlineCount);
            } else {
                this.atkMultiplier = 1.0;
                this.reloadMultiplier = 1.0;
            }
        }
        
        // --- リフィエル(009)の必殺技変身タイマー更新 ---
        if (this.charId === '009' && this.isUltimateActive) {
            this.riphielUltTimer -= dt;
            if (this.riphielUltTimer <= 0) {
                this.isUltimateActive = false;
                this.riphielUltTimer = 0;
                this.updateAttackPatterns();
                this.combatState.phase = 'idle';
                this.combatState.comboType = null;
                this.combatState.stepIdx = 0;
                this.combatState.countIdx = 0;
                this.combatState.reloadTimer = 0;
                this.targetOffsetX = 0;
                this.targetOffsetZ = 0;
                this.hopBack();
                // 変身解除後に残っているswing_009弾を全消去（変身後も槍で攻撃し続けるバグ修正）
                if (this.engine && this.engine.bullets) {
                    for (const bul of this.engine.bullets) {
                        if (bul.type === 'swing_009' && bul.sourceEntity === this) {
                            bul.isDead = true;
                        }
                    }
                }
            }
        }

        // --- プロセル(010)の必殺技吹雪乱射更新 ---
        if (this.charId === '010' && this.isUltimateActive && this.engine && !this.isDead) {
            this.proserUltTimer -= dt;
            this.proserLargeIcicleTimer -= dt;
            this.proserSmallIcicleTimer -= dt;

            // つらら大乱射 (0.4秒に1発)
            if (this.proserLargeIcicleTimer <= 0) {
                this.proserLargeIcicleTimer = 0.4;
                const spawnAngle = Math.random() * Math.PI * 2;
                const spawnX = this.x + Math.cos(spawnAngle) * 1.0;
                const spawnZ = this.z + Math.sin(spawnAngle) * 1.0;
                const shotAngle = (Math.random() - 0.5) * 10 * (Math.PI / 180);
                const vx = Math.sin(shotAngle) * 30.0;
                const vz = Math.cos(shotAngle) * 30.0; // 真上(奥)方向
                const bulletDmg = Math.floor(this.atk * 0.5);

                const b = new Bullet(spawnX, spawnZ, {
                    owner: 'player',
                    vx: vx, vz: vz,
                    damage: bulletDmg,
                    knockback: 20,
                    size: 0.6,
                    type: 'icicle_large_010',
                    targetDist: 18.0,
                    lifeTime: 18.0 / 30.0 + 0.2,
                    isPiercing: true
                });
                b.sourceEntity = this;
                this.engine.bullets.push(b);
                if (this.triggerAttackShake) this.triggerAttackShake();
            }

            // つらら小乱射 (0.2秒に1発)
            if (this.proserSmallIcicleTimer <= 0) {
                this.proserSmallIcicleTimer = 0.2;
                const spawnAngle = Math.random() * Math.PI * 2;
                const spawnX = this.x + Math.cos(spawnAngle) * 1.0;
                const spawnZ = this.z + Math.sin(spawnAngle) * 1.0;
                const shotAngle = (Math.random() - 0.5) * 10 * (Math.PI / 180);
                const vx = Math.sin(shotAngle) * 35.0;
                const vz = Math.cos(shotAngle) * 35.0; // 真上(奥)方向
                const bulletDmg = Math.floor(this.atk * 0.1);

                const b = new Bullet(spawnX, spawnZ, {
                    owner: 'player',
                    vx: vx, vz: vz,
                    damage: bulletDmg,
                    knockback: 5,
                    size: 0.4,
                    type: 'icicle_small_010',
                    targetDist: 8.0,
                    lifeTime: 8.0 / 35.0 + 0.2,
                    isPiercing: true
                });
                b.sourceEntity = this;
                this.engine.bullets.push(b);
            }

            if (this.proserUltTimer <= 0) {
                this.isUltimateActive = false;
                this.proserUltTimer = 0;
            }
        }
        
        // --- ノア(008)のお供エネルギー球体の自律更新 ---
        if (this.charId === '008' && this.engine && !this.isDead) {
            if (!this.noahOrbs) this.noahOrbs = [];
            this.maxNoahOrbs = Math.min(5, Math.floor((this.wlv || 0) / 3) + 2);
            
            const noahX = typeof this.x === 'number' && !isNaN(this.x) ? this.x : (this.baseX || 0);
            const noahZ = typeof this.z === 'number' && !isNaN(this.z) ? this.z : (this.baseZ || 1.0);

            // 初回: 最初から2個生成（最大個数まで）
            if (this.noahOrbs.length === 0) {
                const initCount = Math.min(2, this.maxNoahOrbs);
                for (let i = 0; i < initCount; i++) {
                    const initAngle = Math.random() * Math.PI * 2;
                    this.noahOrbs.push({
                        orbId: i + 1, // 1号, 2号...
                        x: noahX + (Math.random() - 0.5) * 0.8,
                        z: noahZ + (Math.random() - 0.5) * 0.8,
                        size: 0.30, // 直径30cm
                        speed: 1.0, // 秒速1m
                        moveAngle: initAngle,
                        targetAngle: initAngle,
                        changeDirTimer: 0.5 + Math.random() * 1.0,
                        wavePhase: Math.random() * Math.PI * 2,
                        shootTimer: 0.3 + (i * 0.4), // 少しズラして発射開始
                        isDead: false,
                        textureKey: 'weapon_008_orb'
                    });
                }
                this.noahOrbSpawnTimer = 1.0;
            }

            // 1秒に1個ずつ生成（最大個数まで）
            if (this.noahOrbs.length < this.maxNoahOrbs) {
                this.noahOrbSpawnTimer = (this.noahOrbSpawnTimer !== undefined ? this.noahOrbSpawnTimer : 1.0) - dt;
                if (this.noahOrbSpawnTimer <= 0) {
                    this.noahOrbSpawnTimer = 1.0;
                    const initAngle = Math.random() * Math.PI * 2;
                    const nextId = this.noahOrbs.length + 1;
                    this.noahOrbs.push({
                        orbId: nextId,
                        x: noahX + (Math.random() - 0.5) * 0.8,
                        z: noahZ + (Math.random() - 0.5) * 0.8,
                        size: 0.30, // 直径30cm
                        speed: 1.0, // 秒速1m
                        moveAngle: initAngle,
                        targetAngle: initAngle,
                        changeDirTimer: 0.5 + Math.random() * 1.0,
                        wavePhase: Math.random() * Math.PI * 2,
                        shootTimer: 0.5 + Math.random() * 0.5, // 1秒に1回弾丸発射
                        isDead: false,
                        textureKey: 'weapon_008_orb'
                    });
                }
            }

            const enemyList = this.engine.isPvpBattle ? this.engine.pvpEnemies : this.engine.enemies;
            const aliveEnemies = (enemyList || []).filter(e => !e.isDead && !e.isDying && e.hp > 0 && typeof e.x === 'number');

            // ノア本体に最も近い敵（ノアへの直接の脅威）を検索
            let threatEnemy = null;
            let minThreatDist = 99999;
            for (const e of aliveEnemies) {
                const d = Math.hypot(e.x - noahX, e.z - noahZ);
                if (d < minThreatDist) {
                    minThreatDist = d;
                    threatEnemy = e;
                }
            }

            for (let i = 0; i < this.noahOrbs.length; i++) {
                const orb = this.noahOrbs[i];
                if (orb.isDead) continue;
                if (isNaN(orb.x) || isNaN(orb.z)) {
                    orb.x = noahX;
                    orb.z = noahZ;
                }

                const orbNum = orb.orbId || (i + 1); // 1号〜5号
                // 個別防衛判定距離: 6 - ナンバー(m) （1号: 5m, 2号: 4m, 3号: 3m, 4号: 2m, 5号: 1m）
                const defenseThreshold = Math.max(1.0, 6.0 - orbNum);
                const isDefendingNoah = threatEnemy && (minThreatDist <= defenseThreshold);

                // 距離制限なしで一番近い敵を検索（ゼロ距離から遠距離まで全対応）
                let nearestEnemy = null;
                let minDist = 99999;
                for (const e of aliveEnemies) {
                    const d = Math.hypot(e.x - orb.x, e.z - orb.z);
                    if (d < minDist) {
                        minDist = d;
                        nearestEnemy = e;
                    }
                }

                // 攻撃・移動のターゲット決定（防衛モード時はノアに迫る敵、通常時はオーブに近い敵）
                const activeTarget = isDefendingNoah ? threatEnemy : nearestEnemy;
                const activeTargetDist = activeTarget ? Math.hypot(activeTarget.x - orb.x, activeTarget.z - orb.z) : 99999;

                // ノアからの距離
                const distFromNoah = Math.hypot(orb.x - noahX, orb.z - noahZ);

                // --- うろうろ移動（ランダム方向転換＋波状蛇行） ---
                orb.changeDirTimer = (orb.changeDirTimer || 0) - dt;
                if (orb.changeDirTimer <= 0) {
                    orb.changeDirTimer = 1.0 + Math.random() * 1.5;
                    // 新しいランダムな目標方向（-120度〜+120度旋回）
                    orb.targetAngle = (orb.moveAngle || 0) + (Math.random() - 0.5) * (Math.PI * 1.3);
                }

                // 目標角度へ滑らかに旋回
                if (orb.moveAngle === undefined) orb.moveAngle = 0;
                let angleDiff = orb.targetAngle - orb.moveAngle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                orb.moveAngle += angleDiff * 3.0 * dt;

                // 基本のランダムうろうろベクトル
                let vx = Math.cos(orb.moveAngle);
                let vz = Math.sin(orb.moveAngle);

                // 左右のふわふわ波状揺らぎ
                orb.wavePhase = (orb.wavePhase || 0) + dt * 3.0;
                const waveMag = Math.sin(orb.wavePhase) * 0.4;
                const perpX = -Math.sin(orb.moveAngle) * waveMag;
                const perpZ = Math.cos(orb.moveAngle) * waveMag;
                vx += perpX;
                vz += perpZ;

                if (isDefendingNoah) {
                    // 🛡️ ノア防衛モード: ノア本体（およびノアと敵の間）へ向かって強い引力で駆け戻る！
                    const noahDx = (noahX - orb.x) / Math.max(0.001, distFromNoah);
                    const noahDz = (noahZ - orb.z) / Math.max(0.001, distFromNoah);
                    // ノアに戻る引力を強めに合成
                    vx = vx * 0.25 + noahDx * 0.75;
                    vz = vz * 0.25 + noahDz * 0.75;
                } else {
                    // 👾 通常索敵モード: 敵がいる場合は、敵の方向へ適度に引力（重み0.5）を合成して接近
                    if (nearestEnemy) {
                        const enemyDx = (nearestEnemy.x - orb.x) / Math.max(0.001, minDist);
                        const enemyDz = (nearestEnemy.z - orb.z) / Math.max(0.001, minDist);
                        vx = vx * 0.5 + enemyDx * 0.5;
                        vz = vz * 0.5 + enemyDz * 0.5;
                    }

                    // ノアから離れすぎた場合（6m以上）はノア方向へ戻す引力を加える
                    if (distFromNoah >= 6.0) {
                        const noahDx = (noahX - orb.x) / distFromNoah;
                        const noahDz = (noahZ - orb.z) / distFromNoah;
                        const returnWeight = Math.min(0.8, (distFromNoah - 6.0) * 0.4);
                        vx = vx * (1.0 - returnWeight) + noahDx * returnWeight;
                        vz = vz * (1.0 - returnWeight) + noahDz * returnWeight;
                    }
                }

                // フィールド外壁の反発
                if (orb.x < -4.5) vx += 0.8;
                if (orb.x > 4.5) vx -= 0.8;
                if (orb.z < 0.5) vz += 0.8;
                if (orb.z > 16.0) vz -= 0.8;

                // ベクトルの正規化
                const vLen = Math.hypot(vx, vz) || 1.0;
                const moveSpeed = orb.speed || 1.0; // 秒速1m
                orb.x += (vx / vLen) * moveSpeed * dt;
                orb.z += (vz / vLen) * moveSpeed * dt;

                // 攻撃: 1秒に1回、赤いレーザー弾丸を発射（防衛対象の敵 or 最寄りの敵）
                orb.shootTimer = (orb.shootTimer !== undefined ? orb.shootTimer : 0.2) - dt;
                if (activeTarget) {
                    if (orb.shootTimer <= 0) {
                        orb.shootTimer = 1.0;
                        const targetDx = activeTarget.x - orb.x;
                        const targetDz = activeTarget.z - orb.z;
                        const targetDist = Math.hypot(targetDx, targetDz);
                        
                        // ゼロ距離(重なっている時)でも前方へ確実に発射
                        let baseAngle = Math.PI / 2; // デフォルト真上(Z正方向)
                        if (targetDist > 0.01) {
                            baseAngle = Math.atan2(targetDz, targetDx);
                        }
                        const deviationRad = (Math.random() - 0.5) * (6 * Math.PI / 180); // 3度ブレ
                        const shootAngle = baseAngle + deviationRad;

                        const bulletSpeed = 25.0; // 速度25m/s
                        const bulletDmg = Math.max(1, Math.floor(this.atk * 0.50)); // 威力: 攻撃力の50%

                        const bullet = new Bullet(orb.x, orb.z, {
                            owner: 'player',
                            vx: Math.cos(shootAngle) * bulletSpeed,
                            vz: Math.sin(shootAngle) * bulletSpeed,
                            damage: bulletDmg,
                            knockback: 20,
                            size: 0.8,
                            isPiercing: false,
                            type: 'noah_bullet_008',
                            textureKey: 'weapon_008_bullet',
                            targetDist: 15.0,
                            lifeTime: 15.0 / bulletSpeed + 0.1 // 射程15m
                        });
                        bullet.sourceEntity = this;
                        bullet.textureKey = 'weapon_008_bullet';
                        this.engine.bullets.push(bullet);

                    }
                } else {
                    // 敵がいない時はタイマーを0付近で待機（敵が出現した瞬間即発射）
                    if (orb.shootTimer < 0) orb.shootTimer = 0;
                }
            }
        }
    }
}



export class EnemyCharacter extends BattleEntity {
    constructor(x, z, data = {}) {
        super(x, z);
        this.owner = 'enemy';
        this.name = data.name || 'スウォーム';
        
        const gs = GlobalState.getInstance();
        this.level = data.level || 1;
        // レベルごとにもとの50%を加算増加 (Lv1=100%, Lv2=150%, Lv3=200%...)
        const levelHpMult = 1.0 + Math.max(0, this.level - 1) * 0.5;
        
        this.hp = (data.hp || 30) * levelHpMult * (gs.debugEnemyHpMultiplier || 1.0);

        this.maxHp = this.hp;
        // 敵は精神力なし
        this.sp = 0;
        this.maxSp = 0;

        // 基準速度 (m/s)
        let baseSpeed = data.speed !== undefined ? data.speed : 3;
        let atkFreq = data.atkFreq || 0.5;
        if (gs.enemySpeedHalf) {
            baseSpeed /= 2;
            atkFreq *= 2;
        }
        this.speed = baseSpeed; // m/s直接使用

        this.weight = data.weight || 5;
        this.debuffResist = data.debuffResist !== undefined ? data.debuffResist : 0;
        const sizeBonus = data.isTowerEnemy ? 0 : Math.max(0, this.level - 1) * 0.1;
        const baseSize = (data.size || 1.0) + sizeBonus;

        this.size = baseSize * (gs.debugEnemySizeMultiplier || 1.0);

        
        this.isDropSpawn = false;
        this.spawnDropTimer = 0;
        
        // 描画・属性情報
        this.textureKey = data.textureKey || 'en001';
        this.frame = data.frame !== undefined ? data.frame : 0;
        this.attribute = data.attribute || 'red'; // 赤,紫,緑,黄,青
        
        // 攻撃関連パラメータ
        this.atkRange = (data.atkRange || 1.0) * (gs.debugEnemyRangeMultiplier || 1.0);
        this.atkFreq = atkFreq;
        // 雑魚敵の攻撃力をレベルと同じにする（サンドバッグ等のatkPower: 0は維持）
        this.atkPower = (data.atkPower === 0) ? 0 : Math.max(1, this.level);
        this.atkTimer = 0;

        // 移動用パラメータ
        const moveMult = gs.debugEnemyMoveMultiplier || 1.0;
        this.moveDist = (data.moveDist || 2.0) * moveMult; 
        this.moveInterval = (data.moveInterval || 1.0) / moveMult; 
        this.moveTimer = this.moveInterval;
        this.isMoving = false;

        this.state = 'wait'; // wait, move, attack
        this.timer = 0;
        
        // 死亡演出用
        this.isDying = false;
        this.deathTimer = 0.0;
    }

    update(dt) {
        if (this.spawnDropTimer > 0) {
            this.spawnDropTimer -= dt;
            if (this.spawnDropTimer < 0) this.spawnDropTimer = 0;
            // 実体化前（1秒間）は移動・攻撃などの行動を行わない
            return;
        }

        if (this.spawnAnimTimer > 0) {
            this.spawnAnimTimer -= dt;
            if (this.spawnAnimTimer < 0) this.spawnAnimTimer = 0;
            // アニメーション中は行動しない
            return;
        }

        super.update(dt);
    }

}

export class BossCharacter extends BattleEntity {
    constructor(x, z, data = {}) {
        super(x, z);
        this.owner = 'enemy';
        this.name = data.name || '魔女';
        this.isBoss = true;
        
        // 魔女レベルによって強さが変わる
        const level = Math.max(1, data.level || 1);
        this.level = level;
        
        // LV1〜10の基礎テーブル
        const baseHpTable = [6000, 12000, 18000, 24000, 33000, 42000, 51000, 60000, 80000, 100000];
        const baseWeightTable = [15, 36, 90, 223, 550, 1350, 3300, 8000, 12700, 18000];
        const baseSizeTable = [1.2, 1.6, 2.2, 3.0, 4.0, 5.4, 7.2, 8.0, 9.0, 10.0];

        // 1. 生命力 (HP)
        if (level <= 10) {
            this.hp = baseHpTable[level - 1];
        } else {
            this.hp = level * 10000;
        }
        this.maxHp = this.hp;

        // 2. 攻撃力 (14 + level)
        this.atkPower = 14 + level;

        // 3. 重量 (LV11以降は20,000カンスト固定)
        this.weight = level <= 10 ? baseWeightTable[level - 1] : 20000;

        // 4. デバフ抵抗 (全レベル100)
        this.debuffResist = 100;

        // 5. 大きさ (LV10以降は+0.5m/LVずつ増加)
        let calcSize = 1.0;
        if (level <= 10) {
            calcSize = baseSizeTable[level - 1];
        } else {
            calcSize = 10.0 + (level - 10) * 0.5;
        }
        const gs = GlobalState.getInstance();
        this.size = calcSize * (gs.debugEnemySizeMultiplier || 1.0);

        // 6. 各属性防御力(%) - LV10毎にガクッと10%ずつ増加 (LV1=0%, LV2~10=10%, LV11~19=20%, LV20~29=30%...)
        if (level === 1) {
            this.allElemDef = 0;
        } else if (level <= 10) {
            this.allElemDef = 10;
        } else {
            this.allElemDef = 20 + Math.floor((level - 10) / 10) * 10;
        }

        // 7. 回避率(%) - LV10毎にガクッと10%ずつ増加 (LV1~10=5%, LV11~19=10%, LV20~29=20%, LV30~39=30%...)
        if (level <= 10) {
            this.evadeRateBonus = 0.05;
        } else {
            this.evadeRateBonus = 0.10 + Math.floor((level - 10) / 10) * 0.10;
        }

        this.sp = 0;
        this.maxSp = 0;
        
        // 魔女の大きさ/2 + 魔女の座標 が画面センター(約12.6m)になる場所へ出現
        this.z = 12.6 - (this.size / 2);
        
        // 登場アニメーション用タイマー
        this.spawnAnimTimer = 1.0;
        this.spawnAnimMax = 1.0;

        this.zMoveTimer = 5.0;
        this.xMoveTimer = 3.0;
        this.targetZMode = 'vanguard';
        this.targetLane = 0;

        this.attribute = data.attribute || 'yellow';

        // 個性（移動パターン）の決定
        if (data.movePattern !== undefined) {
            this.movePattern = (data.movePattern === 'normal' || data.movePattern === 'standard') ? 1 : data.movePattern;
        } else {
            const r = Math.floor(Math.random() * 8);
            if (r < 4) this.movePattern = 1;      // 1: 通常タイプ
            else if (r === 4) this.movePattern = 2; 
            else if (r === 5) this.movePattern = 3; 
            else if (r === 6) this.movePattern = 4; 
            else this.movePattern = 5;              
        }


        // 移動用パラメータ
        this.moveDist = 2.0; 
        this.moveInterval = 0.4 + (level - 1) * 0.1;
        
        // 描画・属性情報
        this.textureKey = data.textureKey || 'boss001';
        this.frame = 0;
        this.attribute = data.attribute || 'red';

        // 移動ステート
        this.moveTimer = this.moveInterval;
        this.isMoving = false;

        // アニメーション用
        this.animTimer = 0;
        this.nextAnimTime = 0.5 + Math.random() * 7.5; // 0.5秒〜8秒

        // 攻撃用タイマー群
        this.atkTimers = {
            randomBullet: 1.0,  // ランダム弾
            dpsBullet: 4.5,     // 狙い撃ち弾
            nearAttack: 0.9,    // 近接攻撃
            special: 12.0 - level
        };
        if (gs.enemySpeedHalf) {
            this.atkTimers.randomBullet *= 2;
            this.atkTimers.dpsBullet *= 2;
            this.atkTimers.nearAttack *= 2;
            this.atkTimers.special *= 2;
        }
        
        // 大技用進行ステート
        this.activeSpecial = null;
        this.specialState = {};

        this.state = 'wait';
        
        // 死亡演出用
        this.isDying = false;
        this.deathTimer = 0.0;
        this.deathPhase = 0;
    }

    update(dt) {
        super.update(dt);
        if (this.isDead || this.isDying) return;

        if (this.spawnAnimTimer > 0) {
            this.spawnAnimTimer -= dt;
            if (this.spawnAnimTimer < 0) this.spawnAnimTimer = 0;
        }

        // アニメーション（ランダムフレーム切り替え）
        this.animTimer += dt;
        if (this.animTimer >= this.nextAnimTime) {
            this.animTimer = 0;
            this.nextAnimTime = 0.5 + Math.random() * 7.5;
            this.frame = Math.floor(Math.random() * 4); // 0~3のランダム
        }

        // 遅延アクションの処理
        if (this.delayedActions) {
            for (let i = this.delayedActions.length - 1; i >= 0; i--) {
                this.delayedActions[i].timer -= dt;
                if (this.delayedActions[i].timer <= 0) {
                    this.delayedActions[i].action();
                    this.delayedActions.splice(i, 1);
                }
            }
        }
    }
}

export class Bullet extends BattleEntity {
    constructor(x, z, data) {
        super(x, z);
        this.vx = data.vx || 0;
        this.vz = data.vz || 0;
        this.damage = data.damage || 1;
        this.knockback = data.knockback || 0;
        this.size = data.size || 0.2; // 弾の当たり判定サイズ(m)
        this.hitRange = data.hitRange || 1.0; // スイングなどの描画/判定用追加パラメータ
        this.owner = data.owner || 'player'; // 'player' or 'enemy'
        
        if (this.owner === 'enemy' && GlobalState.getInstance().enemySpeedHalf) {
            this.vx /= 2;
            this.vz /= 2;
        }
        this.isPiercing = data.isPiercing || false;
        this.erasesEnemyBullets = data.erasesEnemyBullets || false;
        this.hitCount = 0;
        this.isFollowOwner = data.isFollowOwner || false;
        this.ownerEntity = data.ownerEntity || null; // 追従対象
        this.isDead = false;
        
        this.color = data.color || null; // 属性色用
        this.targetDist = data.targetDist || 20.0;
        this.type = data.type || 'bullet';

        this.distanceTraveled = 0;
        this.hitTargets = new Set();
        this.lifeTime = data.lifeTime || 5.0;
        
        this.swayPhase = data.swayPhase || 0;
        this.swayAmp = data.swayAmp || 0;
        this.baseVx = this.vx;
        this.stunDuration = data.stunDuration || 0; // 行動不能効果
    }

    update(dt) {
        if (this.growTimer !== undefined && this.growTimer > 0) {
            this.growTimer -= dt;
            if (this.growTimer <= 0) {
                // 成長完了、設定されていた最終速度を適用
                this.vx = this.finalVx || 0;
                this.vz = this.finalVz || 0;
                this.baseVx = this.vx;
                this.size = this.finalSize || 0.3;
            } else {
                // 成長中（サイズを徐々に大きく）
                if (this.finalSize) {
                    const maxTime = this.maxGrowTimer || 2.0;
                    const progress = 1.0 - (this.growTimer / maxTime);
                    this.size = this.finalSize * progress;
                }
                // 成長中の速度はそのまま(vx, vz)を維持する
            }
        }

        if (this.swayAmp > 0) {
            this.swayPhase += dt * 5.0; // ゆらゆら速度
            this.vx = this.baseVx + Math.sin(this.swayPhase) * this.swayAmp;
        }

        if (this.isFollowOwner && this.ownerEntity && !this.ownerEntity.isDead) {
            this.x = this.ownerEntity.x;
            this.z = this.ownerEntity.z;
        } else {
            super.update(dt);
        }
        const speed = Math.sqrt(this.vx * this.vx + this.vz * this.vz);
        this.distanceTraveled += speed * dt;
        
        this.lifeTime -= dt;
        if (this.lifeTime <= 0) {
            this.isDead = true;
        }
        
        // swing等で速度が0の場合は、寿命を設定
        if (speed === 0 && !this.maxLife) {
            this.maxLife = 0.5; // スイングなどのデフォルト寿命は0.5秒
        }
    }
}

export class EffectEntity extends BattleEntity {
    constructor(x, z, data) {
        super(x, z);
        this.type = data.type || 'explosion';
        this.radius = data.radius || 1.0;
        this.lifeTime = data.lifeTime || 0.5;
        this.maxLife = this.lifeTime;
        this.isDead = false;
        this.angle = data.angle || 0; // 追加：エフェクトの描画角度
        this.ownerEntity = data.ownerEntity || null; // 追従対象
        this.customData = data.customData || {}; // 追加：専用のカスタムデータ用
    }

    update(dt) {
        if (this.ownerEntity && !this.ownerEntity.isDead) {
            this.x = this.ownerEntity.x;
            this.z = this.ownerEntity.z;
        } else {
            super.update(dt);
        }
        this.lifeTime -= dt;
        if (this.lifeTime <= 0) {
            this.isDead = true;
        }
    }
}

export class PvpEnemyCharacter extends PlayerCharacter {
    constructor(x, z, data = {}) {
        super(x, z, data);
        this.owner = 'enemy';
        this.isEnemy = true;
        this.name = data.name || '敵・魔法少女';
        this.charId = data.charId || '001';
        this.lane = data.lane !== undefined ? data.lane : 0;
        this.isFront = data.isFront !== undefined ? data.isFront : true;

        // 指定された完成ステータスを直接適用
        this.level = data.level || 1;
        this.maxHp = data.maxHp || 1000;
        this.hp = this.maxHp;
        this.maxSp = data.maxSp || 500;
        this.sp = this.maxSp;
        this.atk = data.atk || (100 + this.level * 50);
        this.nearLevel = data.meleeLevel || (Math.ceil(this.level / 2) + 1);
        this.farLevel = data.rangedLevel || (Math.ceil(this.level / 2) + 1);
        this.wlv = this.nearLevel + this.farLevel;
        this.weight = data.weight || 50;

        // 必殺技ゲージ: 開幕は0%（最大クールダウン値）からスタート
        this.maxUltimateCooldown = Math.max(0, 60.0 - (this.wlv * 2.0));
        this.ultimateCooldown = this.maxUltimateCooldown;

        // 座標: 前衛なら Z=9.0、後衛なら Z=14.0
        this.baseX = this.lane * 1.8;
        this.baseZ = this.isFront ? 9.0 : 14.0;
        this.x = this.baseX;
        this.z = this.baseZ;
        this.targetZ = this.baseZ;

        const charIdToAttr = {
            '001': 'purple',
            '002': 'blue',
            '003': 'red',
            '004': 'yellow',
            '005': 'green',
            '007': 'yellow',
            '008': 'red',
            '010': 'blue'
        };
        this.attribute = charIdToAttr[this.charId] || 'yellow';

        this.updateAttackPatterns();
    }
}
