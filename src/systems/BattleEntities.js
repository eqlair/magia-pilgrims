import charDataJson from '../data/characters.json';
import { GlobalState } from './GlobalState';

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
        if (this.ultimateCooldown > 0) {
            this.ultimateCooldown -= dt;
            if (this.ultimateCooldown < 0) this.ultimateCooldown = 0;
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
        let distanceX = forceX / this.weight;
        let distanceZ = forceZ / this.weight;
        
        // 異常なノックバック値による画面外への吹き飛びを防ぐための上限
        distanceX = Math.max(-2.0, Math.min(distanceX, 2.0));
        distanceZ = Math.max(-5.0, Math.min(distanceZ, 5.0));

        this.x += distanceX;
        this.z += distanceZ;
        
        // Z座標が遠くに行き過ぎないように制限（24.0付近がスポーン地点のやや奥）
        this.z = Math.min(this.z, 24.0);
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
        
        // キャラクター定義の取得
        this.charDef = charDataJson.characters[this.charId] || charDataJson.characters['001'];
        
        // GlobalStateからステータスを取得（ベースATK100、ベースReload100を前提とした値）
        const globalState = GlobalState.getInstance();
        const party = data.party || [this.charId];
        const stats = globalState.calcStats(this.charId, party, this.isFront);
        
        this.hp = stats.maxHp || this.charDef.baseHp;
        this.maxHp = this.hp;
        this.sp = stats.maxSp || this.charDef.baseSp;
        this.maxSp = this.sp;
        this.atk = stats.atk || this.charDef.baseAtk || 100;
        this.reloadStat = stats.reload || 100; // ベース100
        this.hitRateBonus = stats.hitRateBonus || 0; // 命中率ボーナス
        this.evadeRateBonus = stats.evadeRateBonus || 0; // 回避率ボーナス
        this.critRateBonus = stats.critRateBonus || 0; // クリティカル率ボーナス
        this.critMultBonus = stats.critMultBonus || 0; // クリティカル倍率ボーナス
        this.elemMods = stats.elemMods || { red: 0, blue: 0, green: 0, yellow: 0, purple: 0 };
        
        this.weight = this.charDef.weight || 50;

        // レベルと成長の管理
        // レベルと成長の管理
        const charData = globalState.characters[this.charId];
        this.nearLevel = charData ? charData.meleeLevel : 1;
        this.farLevel = charData ? charData.rangedLevel : 1;
        this.wlv = this.nearLevel + this.farLevel; // 遠近攻撃レベルの合計
        this.gachaTimer = 1.0;

        // 起動射程（キャラクター固有の閾値はとりあえず固定。後でJSON化してもよい）
        this.nearThreshold = this.charId === '003' ? 5.5 : (this.charId === '005' ? 8.0 : 4.0);
        this.farThreshold = this.charId === '001' ? 20.0 : (this.charId === '004' ? 18.0 : 16.0);
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


        // SP drainタイマー（10秒ごとに消費）
        this.spDrainTimer = 10.0;
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
    }

    updateAttackPatterns() {
        // 現在のレベルのパターンを取得
        this.patterns = {
            far: this.charDef.patterns.far[this.farLevel] || this.charDef.patterns.far[1],
            near: this.charDef.patterns.near[this.nearLevel] || this.charDef.patterns.near[1]
        };
    }



    updateSpecialSkills(dt, players, effects, floatingTexts) {
        if (this.isDead) return;

        // SP定期減少（10秒ごとに1削る、食料がない場合は+1削る）
        this.spDrainTimer -= dt;
        if (this.spDrainTimer <= 0) {
            this.spDrainTimer += 10.0;
            const drainAmount = this.isFoodEmpty ? 2 : 1;
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
        const specialInterval = this.charId === '003' ? 12.0 : 10.0;
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
            } else if (this.charId === '002' || this.charId === '005') {
                // 蒼樹 & 李乃果 (回復)
                let baseHeal, altHeal;
                if (this.charId === '002') {
                    baseHeal = 10 + (this.wlv * 2);
                    altHeal = 10 + (this.wlv * 2);
                } else if (this.charId === '005') {
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
            } else if (this.charId === '010') {
                // 白蓮 (特技: 8秒に1回、前方に秒速0.5mで進む直径2.5mのバリア弾。攻撃力0, ノックバック40, WLV個の敵弾消し)
                const specialBullet = new Bullet(this.x, this.z, {
                    owner: 'player',
                    vx: 0,
                    vz: 0.5,
                    damage: 0,
                    knockback: 40,
                    size: 2.5, // 直径2.5mの判定エリアで広範囲の敵弾を吸収！
                    lifeTime: 10.0,
                    type: 'special_barrier_010',
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
        
        const cost = (this.charId === '005' ? 25 + this.wlv : 10 + this.wlv) * spCostMultiplier;
        
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
        if (this.charId === '001') {
            // 紫苑: リロード速度1/3, 命中率UP
            this.buffTimer = 4.0 + this.wlv;
            this.reloadMultiplier = 0.33;
            // 弾丸の見た目を倍にするため、フラグを立てる（弾丸生成時に参照）
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
                        damage: bulletDmg, knockback: 1, size: 0.8, lifeTime: 4.0, type: 'weapon_004',
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
        } else if (this.charId === '003') {
            // 紅華: 4m槍投げ（両端を繋げた形）
            const dmg = 2.0 * this.atk * ultimateDamageMultiplier;
            // baseX, baseZ を使用してキャラクターの現在位置から発射

            const spawnX = this.x;
            const spawnZ = this.z;
            
            // 向いている方向を計算（設定通り前方へ）
            let dirX = 0; let dirZ = 1;
            
            const bObj = new Bullet(spawnX, spawnZ, {
                owner: 'player', isPiercing: true,
                vx: dirX * 5.0, vz: dirZ * 5.0, // 初速5.0m/s
                damage: dmg, knockback: 200, size: 30.0, hitRange: 3.0, lifeTime: 10.0, type: 'ultimate_003'
            });
            bObj.sourceEntity = this;
            
            // 独自の往復ロジックのためにカスタムデータを持たせる
            bObj.isReturning = false;
            bObj.distanceTraveled = 0;
            bObj.spinAngle = 0;
            
            // 特別なupdateを上書きして往復させる
            bObj.update = function(dt) {
                // スピン
                this.spinAngle += 5 * Math.PI * dt; // 回転速度を1/2に
                
                // 往復処理
                if (!this.isReturning) {
                    this.x += this.vx * dt; 
                    this.z += this.vz * dt; 
                    // 100(エクセル値)の速度は 5.0m/s。距離はそのままmで計算
                    this.distanceTraveled += 5.0 * dt;
                    if (this.distanceTraveled >= 16.0) {
                        this.isReturning = true;
                    }
                } else {
                    // 戻る速度200(エクセル値) = 10.0m/s
                    const dx = this.sourceEntity.x - this.x;
                    const dz = this.sourceEntity.z - this.z;
                    const dist = Math.sqrt(dx*dx + dz*dz) || 0.001;
                    
                    if (dist < 1.0) {
                        // 自身に接触して消滅
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
        } else if (this.charId === '005') {
            // 李乃果: 全体回復
            const totalHeal = 3.0 * this.maxHp;
            const alivePlayers = players.filter(p => !p.isDead);
            if (alivePlayers.length > 0) {
                const healPerPlayer = totalHeal / alivePlayers.length;
                for (const p of alivePlayers) {
                    p.hp = Math.min(p.maxHp, p.hp + healPerPlayer);
                    floatingTexts.push({ id: Math.random(), x: p.x, yOffset: 0, z: p.z, amount: Math.ceil(healPerPlayer), type: "heal", lifeTime: 1.0, maxLife: 1.0 });
                }
            }
        } else if (this.charId === '010') {
            // 白蓮 必殺技:
            // 消費SP: 10 + WLV, CD: 60 - WLV*2
            // 前方に秒速2mで進む直径1mのバリア弾。攻撃力0, ノックバック40, 敵弾丸を消す。
            // 15m進むと直径8mに拡大して破裂し、範囲内に基本攻撃力の (100 + 10 * WLV)% のダメージ！
            const spCost = Math.floor((10 + this.wlv) * spCostMultiplier);
            if (this.sp < spCost) return;
            this.sp -= spCost;

            const cdVal = Math.max(10, 60 - (this.wlv * 2));
            this.ultimateCooldown = cdVal;
            
            // 白蓮 (必殺技: 前方8m進んだ地点で直径8mの大爆発を発生。5秒+(WLV/2)秒間持続し、敵に毎秒(攻撃力の10%+WLV%)の継続ダメージを与え、敵弾を連続吸い込み消去する)
            const ultBullet = new Bullet(this.x, this.z, {
                owner: 'player', isPiercing: true,
                vx: 0, vz: 2.0, // 秒速2m前進
                damage: 0, knockback: 40, size: 2.5, lifeTime: 10.0, type: 'ultimate_010',
                erasesEnemyBullets: true
            });
            ultBullet.sourceEntity = this;
            ultBullet.travelDist = 0;

            const self = this;
            ultBullet.update = function(dt) {
                this.x += this.vx * dt;
                this.z += this.vz * dt;
                this.travelDist += 2.0 * dt;
                if (this.travelDist >= 8.0) {
                    // 8m進んだ地点で消滅し、持続型の爆発フィールドを生成！
                    this.isDead = true;
                    if (self.engine) {
                        const duration = 5.0 + (self.wlv / 2.0); // 5秒 + (WLV/2)秒 持続
                        const burstField = new Bullet(this.x, this.z, {
                            owner: 'player',
                            vx: 0, vz: 0,
                            damage: 0,
                            size: 8.0, // 直径8m (半径4m)
                            lifeTime: duration,
                            type: 'ultimate_burst_field_010',
                            erasesEnemyBullets: true
                        });
                        burstField.sourceEntity = self;
                        burstField.burstDuration = duration;

                        self.engine.bullets.push(burstField);
                        self.engine.effects.push(new EffectEntity(this.x, this.z, { type: 'ultimate_burst_010', radius: 4.0, lifeTime: duration }));
                    }
                }
            };

            if (this.engine) {
                this.engine.bullets.push(ultBullet);
            } else {
                bullets.push(ultBullet);
            }
            floatingTexts.push({ id: Math.random(), x: this.x, yOffset: 0, z: this.z, amount: "ULTIMATE!", type: "skill", lifeTime: 1.0, maxLife: 1.0 });
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
        // ベース位置の更新
        const targetX = this.lane * 2.0;
        // base X/Z を計算するが、this.x, this.z自体はベース+オフセットになるため、ベース位置を裏で保持・計算する
        // 簡単のため、this.x, this.z は実座標とし、baseX, baseZ を別に持たずに差分で動かすか？
        // いや、this.x += ... だと animOffset が乗った値から戻ろうとしてしまう。
        // よって baseX, baseZ を明示的に持つのが安全。
        if (this.baseX === undefined) {
            this.baseX = this.x;
            this.baseZ = this.z;
        }
        
        this.baseX += (targetX - this.baseX) * 10.0 * dt;
        this.baseZ += (this.targetZ - this.baseZ) * 5.0 * dt;

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

        // 最終座標の合成
        this.x = this.baseX + this.animOffsetX;
        this.z = this.baseZ + this.animOffsetZ;

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
        
        // (GlobalStateで一元管理するため、ここでのガチャ抽選処理は削除)
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

        // 基準速度100
        let baseSpeed = data.speed || 100;
        let atkFreq = data.atkFreq || 0.5;
        if (gs.enemySpeedHalf) {
            baseSpeed /= 2;
            atkFreq *= 2;
        }
        this.speed = baseSpeed * 0.03; // m/sに変換

        this.weight = data.weight || 5;
        this.debuffResist = data.debuffResist !== undefined ? data.debuffResist : 0;
        const baseSize = (data.size || 1.0) + Math.max(0, this.level - 1) * 0.1;

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
        this.atkPower = data.atkPower || 1;
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
        const level = data.level || 1;
        this.level = level;
        
        const hpTable = [
            9000,   // LV1
            15000,  // LV2
            21000,  // LV3
            27000,  // LV4
            33000,  // LV5
            42000,  // LV6
            51000,  // LV7
            60000,  // LV8
            69000,  // LV9
            78000,  // LV10
            100000, // LV11
            200000, // LV12
            300000  // LV13
        ];
        if (level <= hpTable.length) {
            this.hp = hpTable[level - 1];
        } else {
            this.hp = 300000 + (level - 13) * 100000;
        }
        this.maxHp = this.hp;

        
        this.atkPower = 15 + (level - 1) * 2;
        
        this.sp = 0;
        this.maxSp = 0;

        const gs = GlobalState.getInstance();
        this.baseSpeed = 40 - (level - 1) * 3; // レベルで徐々に下がる（LV1=40...LV8=18付近）
        if (gs.enemySpeedHalf) {
            this.baseSpeed /= 2;
        }
        this.speed = this.baseSpeed * 0.03; 
        this.weight = 500; // 重いのでノックバックしにくい
        this.debuffResist = data.debuffResist !== undefined ? data.debuffResist : 100; // 魔女ボスはデバフ抵抗100

        
        // エクセル準拠：大きさ
        this.size = 1.2 * Math.pow(1.3, level - 1) * (gs.debugEnemySizeMultiplier || 1.0); // 1.2, 1.6, 2.2, 3.0...
        if (this.size > 9.0) this.size = 9.0;
        
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
