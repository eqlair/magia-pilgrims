import { BattleEntity, EffectEntity } from './BattleEntities';

/**
 * 巨大タコ魔女（クラーケン）ボス
 * 
 * - 本体: 一辺3m（画像ファイルの幅を基準3mとし、さらに大きいタコにも比例スケール）
 * - 開幕登場: NPC対戦のように Z=25 から前進して登場
 * - 定位置10箇所（5レーン × 前衛/後衛2列）を秒速1mでスライド移動
 * - 8本の脚:
 *   - 頭から半径4mの位置を中心とし、本体の周りを回ろうとする（公転）
 *   - 移動速度: 1.0m/s。脚が破壊されるごとに0.5m/s速くなる
 *   - 他の「足の生えている範囲」に近づくと反転する
 *   - 水面から出ている足の長さは4.5m
 *   - 多重波によるダイナミックな「ふにゃふにゃぶよぶよ」大うねりモーション
 * - 攻撃:
 *   - （12秒 - 破壊された足の数）ごとに一回、どれかの攻撃を行う（脚が減るほど激化）
 *   - 攻撃1: 前の2本の脚から16連弾幕（根元5m/s〜先端20m/s、威力5）× 3セット（セット毎にターゲット変更）
 *   - 攻撃2: 本体から角度ランダム8方向に秒間16連射 3秒
 *   - 攻撃3: 本体から角度ランダム8方向弾を秒間8連射 3秒（1発毎に5度回転）
 *   - 攻撃4: 脚から全節16発を真下±5度へ発射（2本ずつ同時に4セット、破壊脚はスキップ）
 */
export class KrakenBoss extends BattleEntity {
    constructor(x = 0, z = 25.0, data = {}) {
        super(x, z);
        this.name = data.name || '巨大タコ魔女クラーケン';
        this.isBoss = true;
        this.isKrakenBoss = true;
        this.level = data.level || 20;
        this.attribute = data.attribute || 'purple';

        // 耐久力（驚異のHP 222222）
        this.hp = data.hp || 222222;
        this.maxHp = this.hp;
        this.atkPower = data.atkPower || 40;

        // 比例スケール基準（基準本体幅: 3.0m）
        this.bodySize = data.bodySize || 3.0;
        this.scaleRatio = this.bodySize / 3.0;

        // ワールド当たり判定
        this.size = 1.5 * this.scaleRatio;
        this.weight = 25000 * this.scaleRatio;
        this.debuffResist = 85;

        // 脚の配置と長さ（大きさに比例）
        this.rootRadius = 4.0 * this.scaleRatio;     // 頭から半径4mの位置を中心
        this.tentacleLength = 4.5 * this.scaleRatio; // 水面から出ている足の長さ4.5m

        // 移動設定: 10箇所の定位置
        this.LANES_X = [-4.0, -2.0, 0.0, 2.0, 4.0];
        this.VANGUARD_Z = 12.5;   // 前衛ライン
        this.REARGUARD_Z = 15.5;  // 後衛ライン

        // 開幕登場進軍: Z=25から目標位置(Z=15.5)へ前進
        this.targetX = x;
        this.targetZ = 15.5;
        this.isMarching = true;
        this.marchSpeed = 4.0;

        this.moveSpeed = 1.2;
        this.isMoving = false;
        this.stayTimer = 5.0;

        // 微速漂流移動用（移動してきた角度そのままで0.5m/s移動を継続）
        this.moveDirX = 0;
        this.moveDirZ = -1; // 初期は手前奥方向
        this.driftSpeed = 0.5; // 秒速0.5m/s

        // 向き
        this.facingRight = false;

        // 8本の触手定義（16節）
        this.SEGMENTS = 16;
        this._initTentacles();

        // 攻撃管理ステートマシン
        // 弾丸の攻撃力（デフォルト10。データから変更可能）
        this.bulletDamage = data.bulletDamage !== undefined ? data.bulletDamage : 10;

        // 開幕は定位置到着後2.5秒で初撃、以降（8本で9秒、1本減るごとに0.5秒短縮）
        this.attackTimer = 2.5;
        this.currentAttack = null;

        // 死亡演出用
        this.isDying = false;
        this.deathTimer = 0;
        this.isDead = false;

        this.animTime = 0;
    }

    /**
     * 8本の触手の初期化（頭から半径4mの円周上を公転）
     */
    _initTentacles() {
        const count = 8;
        this.tentacles = [];

        for (let i = 0; i < count; i++) {
            // 初期角度: 8等分配置
            const initAngle = i * (Math.PI * 2 / count);
            // 初期回転方向: 交互（向かい合って接近・衝突反転しやすくする）
            const orbitDir = (i % 2 === 0) ? 1 : -1;

            const nodes = [];
            for (let s = 0; s < this.SEGMENTS; s++) {
                nodes.push({
                    x: this.x + Math.cos(initAngle) * this.rootRadius,
                    y: 0,
                    z: this.z + Math.sin(initAngle) * this.rootRadius,
                    screenX: 0,
                    screenY: 0,
                    scale: 1.0,
                    visible: true
                });
            }

            this.tentacles.push({
                id: i,
                hp: 44444,
                maxHp: 44444,
                isBroken: false,
                nodes,
                orbitAngle: initAngle,
                orbitDir: orbitDir,
                phase: i * 0.85,
                waveSpeed: 1.1 + (i % 3) * 0.1,
                currentRootX: this.x + Math.cos(initAngle) * this.rootRadius,
                currentRootZ: this.z + Math.sin(initAngle) * this.rootRadius,
                isKrakenTentacle: true,
                parentKraken: this,
                x: this.x + Math.cos(initAngle) * this.rootRadius,
                y: 0,
                z: this.z + Math.sin(initAngle) * this.rootRadius,
                size: 1.2 * this.scaleRatio,
                weight: 8000,
                owner: 'enemy',
                isBoss: false,
                isDead: false,
                takeDamage: (amount, type = 'normal') => {
                    return this.damageTentacle(i, amount, type);
                },
                applyKnockback: () => {},
                def: {
                    isBack: Math.sin(initAngle) > 0 // Z座標が本体より奥なら奥レイヤー
                }
            });
        }
    }

    /**
     * 次の移動目標を決定（同じ場所が選ばれることもある）
     */
    _pickNextDestination() {
        const laneX = this.LANES_X[Math.floor(Math.random() * this.LANES_X.length)];
        const laneZ = Math.random() < 0.5 ? this.VANGUARD_Z : this.REARGUARD_Z;

        this.targetX = laneX;
        this.targetZ = laneZ;
        const dx = this.targetX - this.x;
        const dz = this.targetZ - this.z;
        const dist = Math.hypot(dx, dz);

        if (dist > 0.3) {
            // 新しい目標へ舵を切る
            this.moveDirX = dx / dist;
            this.moveDirZ = dz / dist;
            this.isMoving = true;
        } else {
            // 同じ場所（近距離）が選ばれた場合: 向きはそのままで0.5m/s漂流を続け、一定時間後に再抽選
            this.isMoving = false;
            this.stayTimer = 3.0 + Math.random() * 3.0;
        }
    }

    /**
     * 毎フレームの更新
     */
    update(dt, engine) {
        if (this.isDead) return;
        this.engine = engine;

        this.animTime += dt;
        const time = this.animTime;

        // 死亡演出
        if (this.isDying) {
            this.deathTimer += dt;
            if (this.deathTimer >= 3.0) {
                this.isDead = true;
            }
            return;
        }

        // ── 1. 移動処理（開幕前進 または 定位置スライド移動 または 微速漂流） ──
        if (this.isMarching) {
            const dz = this.targetZ - this.z;
            const step = this.marchSpeed * dt;
            this.moveDirX = 0;
            this.moveDirZ = -1;
            if (Math.abs(dz) <= step) {
                this.z = this.targetZ;
                this.isMarching = false;
                this.stayTimer = 5.0;
                this.attackTimer = 4.0; // 到着後4秒で初撃
            } else {
                this.z += (dz > 0 ? 1 : -1) * step;
            }
        } else if (this.isMoving) {
            const dx = this.targetX - this.x;
            const dz = this.targetZ - this.z;
            const dist = Math.hypot(dx, dz);
            const step = this.moveSpeed * dt;
            if (dist > 0.001) {
                this.moveDirX = dx / dist;
                this.moveDirZ = dz / dist;
            }
            if (dist <= step) {
                this.x = this.targetX;
                this.z = this.targetZ;
                this.isMoving = false;
                this.stayTimer = 4.0 + Math.random() * 4.0;
            } else {
                this.x += this.moveDirX * step;
                this.z += this.moveDirZ * step;
            }
        } else {
            // 🌊 移動してきた角度そのままで0.5m/sでゆっくり微速移動（漂流）を継続！
            this.x += this.moveDirX * this.driftSpeed * dt;
            this.z += this.moveDirZ * this.driftSpeed * dt;

            // 戦闘エリアの端で跳ね返り（バウンド反転）して自然に漂流し続ける
            const minX = -4.2;
            const maxX = 4.2;
            const minZ = 11.0;
            const maxZ = 16.5;

            if (this.x < minX) {
                this.x = minX;
                this.moveDirX = Math.abs(this.moveDirX);
            } else if (this.x > maxX) {
                this.x = maxX;
                this.moveDirX = -Math.abs(this.moveDirX);
            }
            if (this.z < minZ) {
                this.z = minZ;
                this.moveDirZ = Math.abs(this.moveDirZ);
            } else if (this.z > maxZ) {
                this.z = maxZ;
                this.moveDirZ = -Math.abs(this.moveDirZ);
            }

            this.stayTimer -= dt;
            if (this.stayTimer <= 0) {
                this._pickNextDestination();
            }
        }

        // ── 2. 向き（反転）の判定 ──
        const allies = (engine && (engine.players || engine.allies)) ? (engine.players || engine.allies).filter(a => !a.isDead) : [];
        if (allies.length > 0) {
            let avgAllyX = 0;
            allies.forEach(a => { avgAllyX += a.x; });
            avgAllyX /= allies.length;
            this.facingRight = (avgAllyX > this.x);
        } else if (this.isMoving || this.isMarching) {
            this.facingRight = (this.targetX > this.x);
        }

        // ── 3. 脚の自律公転・衝突反転 ＆ 触手の3Dうねり計算 ──
        this._updateTentacleOrbits(dt);
        this._updateTentacles(time, allies);

        // ── 4. 攻撃サイクル・ステートマシン ──
        if (allies.length > 0 && !this.isMarching) {
            // 現在実行中の攻撃がなければクールダウンを消化
            if (!this.currentAttack) {
                this.attackTimer -= dt;
                if (this.attackTimer <= 0) {
                    // クールダウン: 8本の時は9秒、1本減るごとに0.5秒短縮 (8本: 9.0s 〜 0本: 5.0s)
                    const aliveCount = this.tentacles.filter(t => !t.isBroken).length;
                    const brokenCount = 8 - aliveCount;
                    const cooldown = Math.max(3.0, (9.0 - brokenCount * 0.5));
                    this.attackTimer = cooldown;
                    this._triggerRandomAttack(allies);
                }
            } else {
                // 攻撃進行
                this._processCurrentAttack(dt, engine, allies);
            }
        }
    }

    /**
     * 「脚の生えている位置」の自律旋回と接近反転
     */
    _updateTentacleOrbits(dt) {
        const scale = this.scaleRatio;
        const brokenCount = this.tentacles.filter(t => t.isBroken).length;
        // 基本1.0m/s、脚が破壊されるごとに0.5m/s加速
        const speed = (1.0 + brokenCount * 0.5) * scale;
        const omega = speed / this.rootRadius;
        const minSafeArcDist = 1.9 * scale; // 他の脚の範囲に近づく基準距離

        // ① 角度の更新
        for (let i = 0; i < this.tentacles.length; i++) {
            const t = this.tentacles[i];
            t.orbitAngle = (t.orbitAngle + t.orbitDir * omega * dt) % (Math.PI * 2);
            if (t.orbitAngle < 0) t.orbitAngle += Math.PI * 2;
        }

        // ② 他の脚との接近判定・反転
        for (let i = 0; i < this.tentacles.length; i++) {
            const tA = this.tentacles[i];
            if (tA.isBroken) continue;

            for (let j = i + 1; j < this.tentacles.length; j++) {
                const tB = this.tentacles[j];
                if (tB.isBroken) continue;

                let diff = tB.orbitAngle - tA.orbitAngle;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;

                const arcDist = Math.abs(diff) * this.rootRadius;
                if (arcDist < minSafeArcDist) {
                    // 互いに近づく方向に動いている場合に反転
                    const isApproaching = (diff > 0 && (tA.orbitDir > 0 || tB.orbitDir < 0)) ||
                                          (diff < 0 && (tA.orbitDir < 0 || tB.orbitDir > 0));
                    if (isApproaching) {
                        tA.orbitDir *= -1;
                        tB.orbitDir *= -1;
                    }
                }
            }
        }
    }

    /**
     * 触手8本のノード列を3Dワールド空間で計算
     * 水面から垂直4.5m立ち上がり、ふにゃふにゃぶよぶよ大うねりモーション
     */
    _updateTentacles(time, allies) {
        this.tentacles.forEach(t => {
            const { nodes } = t;

            // 根元の蠢き（直径約1.5m内での多重不規則振動）
            const swayRadius = 0.55 * this.scaleRatio;
            const swayX = Math.sin(time * t.waveSpeed + t.phase) * swayRadius
                        + Math.sin(time * 2.8 + t.phase * 2) * (swayRadius * 0.35);
            const swayZ = Math.cos(time * (t.waveSpeed * 0.8) + t.phase * 1.3) * swayRadius
                        + Math.cos(time * 3.2) * (swayRadius * 0.3);

            // 本体中心から半径4mの円周上の現在根元位置
            const rootX = this.x + Math.cos(t.orbitAngle) * this.rootRadius + swayX;
            const rootZ = this.z + Math.sin(t.orbitAngle) * this.rootRadius + swayZ;
            t.currentRootX = rootX;
            t.currentRootZ = rootZ;
            t.x = rootX;
            t.z = rootZ;
            t.isDead = t.isBroken;

            // 奥レイヤーか手前レイヤーかの動的判定
            t.def.isBack = (rootZ > this.z + 0.3);

            // 最も近い味方キャラを探索
            let closestAlly = null;
            let minDist = 9999;
            allies.forEach(a => {
                const d = Math.hypot(a.x - rootX, a.z - rootZ);
                if (d < minDist) {
                    minDist = d;
                    closestAlly = a;
                }
            });
            t.targetAlly = closestAlly;

            // 触手ノード列の生成（長さ 4.5m）
            for (let i = 0; i < this.SEGMENTS; i++) {
                const tVal = i / (this.SEGMENTS - 1); // 0.0(根元) 〜 1.0(先端)

                // 触手自体の弾力伸縮（ゼリー脈動）
                const jellyStretch = 1.0
                    + Math.sin(time * 2.2 + t.phase) * 0.07
                    + Math.cos(time * 3.8 - tVal * 4.5) * 0.05;
                const by = tVal * this.tentacleLength * jellyStretch;

                // 見下ろしカメラに対して画面上で天へ伸びるよう奥方向(+z)補正
                const spreadX = Math.cos(t.orbitAngle) * 0.45 * tVal * this.scaleRatio;
                const spreadZ = (Math.sin(t.orbitAngle) * 0.25 * (1.0 - tVal) + (tVal * 1.4)) * this.scaleRatio;

                // 🌊 ふにゃふにゃぶよぶよ大うねり（多重サイン波＋角度増強）
                const wave1 = Math.sin(time * 1.6 - tVal * 2.8 + t.phase) * 0.95;
                const wave2 = Math.sin(time * 3.2 - tVal * 5.2 + t.phase * 1.6) * 0.55;
                const wave3 = Math.sin(time * 5.2 - tVal * 8.8 + t.phase * 2.2) * 0.28;

                // 大きなうねり振幅
                const amp = Math.pow(tVal, 0.95) * (1.75 * this.scaleRatio);
                const waveX = (wave1 + wave2 + wave3) * amp;

                // Z軸（前後）の立体的なぶよぶよ波
                const waveZ1 = Math.cos(time * 1.9 - tVal * 3.2 + t.phase) * 0.60;
                const waveZ2 = Math.sin(time * 4.0 - tVal * 6.5 + t.phase * 1.3) * 0.35;
                const waveZ = (waveZ1 + waveZ2) * (amp * 0.5);

                nodes[i].x = rootX + spreadX + waveX;
                nodes[i].y = by;
                nodes[i].z = rootZ + spreadZ + waveZ;
            }
        });
    }

    /**
     * 動的に「現在もっとも手前（Z座標が小さい）にある2本の脚」を取得
     */
    _getFrontTentacles() {
        const alives = this.tentacles.filter(t => !t.isBroken);
        if (alives.length === 0) return [];
        // currentRootZ が小さい順（手前順）にソート
        alives.sort((a, b) => a.currentRootZ - b.currentRootZ);
        return alives.slice(0, 2);
    }

    /**
     * ランダム攻撃のトリガー
     */
    _triggerRandomAttack(allies) {
        if (!allies || allies.length === 0) return;

        const attacks = [
            'barrage_front_3set',       // 前の2本の脚 16連弾幕 × 3セット
            'body_radial_16',           // 本体から8方向 秒間16連射 3秒
            'body_spiral_8',            // 本体から8方向 秒間8連射 3秒（5度回転）
            'tentacles_waterfall_4set'  // 脚から真下±5度 16発 × 4セット
        ];

        const chosen = attacks[Math.floor(Math.random() * attacks.length)];
        console.log(`[KrakenBoss] 🐙 Triggering attack: ${chosen}`);

        if (chosen === 'barrage_front_3set') {
            this.currentAttack = {
                type: 'barrage_front_3set',
                setIndex: 0,
                maxSets: 3,
                step: 0,
                delayTimer: 0,
                interval: 0.05,
                waitTimer: 0,
                targetLeft: null,
                targetRight: null
            };
            this._prepareFrontBarrageSet(allies);
        } else if (chosen === 'body_radial_16') {
            this.currentAttack = {
                type: 'body_radial_16',
                baseAngle: Math.random() * Math.PI * 2,
                duration: 3.0,
                elapsed: 0.0,
                fireInterval: 1.0 / 16.0, // 秒間16連射
                fireTimer: 0.0
            };
        } else if (chosen === 'body_spiral_8') {
            this.currentAttack = {
                type: 'body_spiral_8',
                currentAngle: Math.random() * Math.PI * 2,
                rotateStep: (Math.random() < 0.5 ? 1 : -1) * (5.0 * Math.PI / 180.0), // 1発ごとに5度回転
                duration: 3.0,
                elapsed: 0.0,
                fireInterval: 1.0 / 8.0, // 秒間8連射
                fireTimer: 0.0
            };
        } else if (chosen === 'tentacles_waterfall_4set') {
            this.currentAttack = {
                type: 'tentacles_waterfall_4set',
                pairIndex: 0,
                maxPairs: 4,
                step: 0,
                delayTimer: 0,
                interval: 0.05,
                waitTimer: 0
            };
        }
    }

    /**
     * 前2本脚弾幕の各セットのターゲット選定
     */
    _prepareFrontBarrageSet(allies) {
        if (!this.currentAttack) return;
        const frontLegs = this._getFrontTentacles();
        if (frontLegs.length === 0) return;

        const tLeft = frontLegs[0];
        const tRight = frontLegs.length > 1 ? frontLegs[1] : frontLegs[0];

        // 生存味方からセットごとに異なるターゲットを選定
        const setIdx = this.currentAttack.setIndex;
        const aliveAllies = allies.filter(a => !a.isDead);
        if (aliveAllies.length === 0) return;

        const targetA = aliveAllies[setIdx % aliveAllies.length];
        const targetB = aliveAllies[(setIdx + 1) % aliveAllies.length];

        this.currentAttack.tLeft = tLeft;
        this.currentAttack.tRight = tRight;
        this.currentAttack.targetLeft = targetA;
        this.currentAttack.targetRight = targetB;
        this.currentAttack.step = 0;
        this.currentAttack.delayTimer = 0;
    }

    /**
     * 攻撃ステートマシンの毎フレーム進行
     */
    _processCurrentAttack(dt, engine, allies) {
        const atk = this.currentAttack;
        if (!atk) return;

        // ── 攻撃1: 前の2本の脚 16連弾幕 × 3セット ──
        if (atk.type === 'barrage_front_3set') {
            if (atk.waitTimer > 0) {
                atk.waitTimer -= dt;
                if (atk.waitTimer <= 0) {
                    this._prepareFrontBarrageSet(allies);
                }
                return;
            }

            atk.delayTimer -= dt;
            while (atk.delayTimer <= 0 && atk.step < this.SEGMENTS) {
                const s = atk.step;
                const speed = 5.0 + s * 1.0; // 根元5m/s 〜 先端20m/s
                const damage = this.bulletDamage;

                if (atk.tLeft && !atk.tLeft.isBroken && atk.targetLeft && !atk.targetLeft.isDead && engine.spawnKrakenBullet) {
                    const nodeL = atk.tLeft.nodes[s];
                    engine.spawnKrakenBullet(nodeL.x, nodeL.y, nodeL.z, atk.targetLeft, speed, damage);
                }

                if (atk.tRight && !atk.tRight.isBroken && atk.targetRight && !atk.targetRight.isDead && engine.spawnKrakenBullet) {
                    const nodeR = atk.tRight.nodes[s];
                    engine.spawnKrakenBullet(nodeR.x, nodeR.y, nodeR.z, atk.targetRight, speed, damage);
                }

                atk.step++;
                atk.delayTimer += atk.interval;
            }

            // 16発撃ち終えたら
            if (atk.step >= this.SEGMENTS) {
                atk.setIndex++;
                if (atk.setIndex >= atk.maxSets) {
                    this.currentAttack = null; // 3セット完了
                } else {
                    atk.waitTimer = 0.35; // セット間のインターバル
                }
            }
        }

        // ── 攻撃2: 本体から角度ランダム8方向 秒間16連射 3秒 ──
        else if (atk.type === 'body_radial_16') {
            atk.elapsed += dt;
            atk.fireTimer -= dt;

            while (atk.fireTimer <= 0 && atk.elapsed < atk.duration) {
                const numDirs = 8;
                for (let k = 0; k < numDirs; k++) {
                    const angle = atk.baseAngle + k * (Math.PI * 2 / numDirs);
                    const dirX = Math.cos(angle);
                    const dirZ = Math.sin(angle);
                    const dirY = -0.15; // やや斜め下水面へ
                    if (engine.spawnKrakenDirectionBullet) {
                        engine.spawnKrakenDirectionBullet(this.x, 1.2 * this.scaleRatio, this.z, dirX, dirY, dirZ, 8.0, this.bulletDamage);
                    }
                }
                atk.fireTimer += atk.fireInterval;
            }

            if (atk.elapsed >= atk.duration) {
                this.currentAttack = null;
            }
        }

        // ── 攻撃3: 本体から8方向 秒間8連射 3秒（1発毎に5度回転） ──
        else if (atk.type === 'body_spiral_8') {
            atk.elapsed += dt;
            atk.fireTimer -= dt;

            while (atk.fireTimer <= 0 && atk.elapsed < atk.duration) {
                const numDirs = 8;
                for (let k = 0; k < numDirs; k++) {
                    const angle = atk.currentAngle + k * (Math.PI * 2 / numDirs);
                    const dirX = Math.cos(angle);
                    const dirZ = Math.sin(angle);
                    const dirY = -0.12;
                    if (engine.spawnKrakenDirectionBullet) {
                        engine.spawnKrakenDirectionBullet(this.x, 1.2 * this.scaleRatio, this.z, dirX, dirY, dirZ, 7.2, this.bulletDamage);
                    }
                }
                atk.currentAngle += atk.rotateStep; // 1発ごとに5度回転
                atk.fireTimer += atk.fireInterval;
            }

            if (atk.elapsed >= atk.duration) {
                this.currentAttack = null;
            }
        }

        // ── 攻撃4: 脚から真下±5度 16発 × 4セット（2本ずつ同時、破壊脚スキップ） ──
        else if (atk.type === 'tentacles_waterfall_4set') {
            if (atk.waitTimer > 0) {
                atk.waitTimer -= dt;
                return;
            }

            // 現在のペア（例: pair 0 は脚0と脚1）
            const legIdxA = atk.pairIndex * 2;
            const legIdxB = atk.pairIndex * 2 + 1;
            const legA = this.tentacles[legIdxA];
            const legB = this.tentacles[legIdxB];

            // 両方破壊されていれば直ちにスキップ
            const canShootA = legA && !legA.isBroken;
            const canShootB = legB && !legB.isBroken;

            if (!canShootA && !canShootB) {
                atk.pairIndex++;
                atk.step = 0;
                if (atk.pairIndex >= atk.maxPairs) {
                    this.currentAttack = null;
                }
                return;
            }

            atk.delayTimer -= dt;
            while (atk.delayTimer <= 0 && atk.step < this.SEGMENTS) {
                const s = atk.step;
                const speed = 5.0 + s * 1.0; // 根元5m/s 〜 先端20m/s
                const damage = this.bulletDamage;

                // 真下（手前 -Z方向）ランダム±5度
                const spreadRad = 5.0 * (Math.PI / 180.0);

                if (canShootA && engine.spawnKrakenDirectionBullet) {
                    const nodeA = legA.nodes[s];
                    const angleA = -Math.PI / 2 + (Math.random() - 0.5) * 2 * spreadRad;
                    const dirX = Math.cos(angleA);
                    const dirZ = Math.sin(angleA);
                    const dirY = (0.5 - nodeA.y) * 0.4;
                    engine.spawnKrakenDirectionBullet(nodeA.x, nodeA.y, nodeA.z, dirX, dirY, dirZ, speed, damage);
                }

                if (canShootB && engine.spawnKrakenDirectionBullet) {
                    const nodeB = legB.nodes[s];
                    const angleB = -Math.PI / 2 + (Math.random() - 0.5) * 2 * spreadRad;
                    const dirX = Math.cos(angleB);
                    const dirZ = Math.sin(angleB);
                    const dirY = (0.5 - nodeB.y) * 0.4;
                    engine.spawnKrakenDirectionBullet(nodeB.x, nodeB.y, nodeB.z, dirX, dirY, dirZ, speed, damage);
                }

                atk.step++;
                atk.delayTimer += atk.interval;
            }

            if (atk.step >= this.SEGMENTS) {
                atk.pairIndex++;
                atk.step = 0;
                if (atk.pairIndex >= atk.maxPairs) {
                    this.currentAttack = null; // 4セット完了
                } else {
                    atk.waitTimer = 0.25; // 次のペアへのウェイト
                }
            }
        }
    }

    damageTentacle(tentacleIndex, amount, type = 'normal', hitNode = null) {
        const t = this.tentacles[tentacleIndex];
        if (!t || t.isBroken) return 0;
        t.hp = Math.max(0, t.hp - amount);

        if (this.engine && this.engine.floatingTexts) {
            this.engine.floatingTexts.push({
                id: ++this.engine.floatingTextIdCounter,
                x: t.currentRootX,
                y: 0,
                yOffset: 0.5,
                z: t.currentRootZ,
                amount: Math.round(amount),
                type: type,
                lifeTime: 0.6,
                maxLife: 0.6
            });
        }

        if (t.hp <= 0) {
            t.isBroken = true;
            t.isDead = true;
            if (this.engine && this.engine.effects) {
                this.engine.effects.push(new EffectEntity(t.currentRootX, t.currentRootZ, {
                    type: 'grenade_explosion',
                    radius: 2.0,
                    lifeTime: 0.6
                }));
            }
        }
        return amount;
    }

    takeDamage(amount) {
        if (this.isDead || this.isDying) return 0;
        this.hp = Math.max(0, this.hp - amount);
        if (this.hp <= 0) {
            this.isDying = true;
            this.deathTimer = 0;
        }
        return amount;
    }
}
