import { BattleEntity, Bullet, EffectEntity } from './BattleEntities';

/**
 * 蛇型ボス（海竜・ウツボ型魔女）
 * 10箇所の定位置スライド移動、奥でのしっぽ自律遊泳＆Z軸シンクロ、
 * 1.5倍の巨大サイズ、狙っているキャラを見つめ発射1秒前に方向固定する突進予兆を実装。
 */
export class SnakeBoss extends BattleEntity {
    constructor(x, z, data = {}) {
        super(x, z);
        this.name = data.name || '海竜ウツボ魔女';
        this.isBoss = true;
        this.isSnakeBoss = true;
        this.level = data.level || 15;
        this.attribute = data.attribute || 'blue';
        this.hp = data.hp || 35000;
        this.maxHp = this.hp;
        this.atkPower = data.atkPower || 25;
        this.size = 3.75; // 1.5倍に拡大 (旧2.5)
        this.weight = 12000;
        this.debuffResist = 80;

        // 背骨ノード設定（0: 尻尾、SEGMENTS-1: 頭）
        this.SEGMENTS = 28;
        this.segDist = 0.80; // 1.5倍に拡大 (旧0.55) -> 全長約 22m
        this.nodes = [];
        
        // 定位置（10箇所）：5レーン × 2列（前衛・後衛）
        this.LANES_X = [-4.0, -2.0, 0.0, 2.0, 4.0];
        this.VANGUARD_Z = 12.5;   // 前衛ライン
        this.REARGUARD_Z = 15.5;  // 後衛ライン
        this.BASE_TAIL_Z = 28.0;  // しっぽ先端のY(Z)座標を28に設定！

        // 移動目標
        this.targetHeadX = 0;
        this.targetHeadZ = this.VANGUARD_Z;
        this.headMoveTimer = 2.0;

        // しっぽ遊泳パラメータ
        this.tailTimer = 0;
        this.tailX = 0;
        this.tailZ = this.BASE_TAIL_Z;

        // 初期配置：画面最奥外 (z=28〜50)
        const startZ = z || 28.0;
        for (let i = 0; i < this.SEGMENTS; i++) {
            const distFromHead = (this.SEGMENTS - 1 - i) * this.segDist;
            this.nodes.push({
                x: x || 0,
                z: startZ + distFromHead,
                screenX: 0,
                screenY: 0,
                scale: 1.0,
                visible: false
            });
        }

        // ステートマシン
        // 'appear' -> 'idle' -> 'charge_aim' -> 'charge_dash' -> 'submerged' -> 'appear'
        this.state = 'appear';
        this.stateTimer = 0;

        // 突進・照準パラメータ
        this.AIM_DURATION = 2.4; // 照準全体の溜め時間
        this.isDirLocked = false; // 発射1秒前に方向を固定するフラグ
        this.chargeTarget = null;
        this.chargeDirX = 0;
        this.chargeDirZ = 0;
        this.chargeSpeed = 20.0; // 突進速度 (m/s)

        // 行動用パラメータ
        this.swimTimer = 0;
        this.bulletCooldown = 1.8;

        // 死亡演出用
        this.isDying = false;
        this.deathTimer = 0;
        this.deathPhase = 0;
        this.isDead = false;

        // ダメージクールダウン
        this.ramHitCooldowns = new Map();
    }

    get head() {
        return this.nodes[this.SEGMENTS - 1];
    }

    get tail() {
        return this.nodes[0];
    }

    update(dt, engine) {
        if (this.isDead) return;

        // 死亡演出
        if (this.isDying) {
            this.deathTimer += dt;
            if (this.deathPhase === 0 && this.deathTimer >= 0.5) {
                this.deathPhase = 1;
                for (let i = 0; i < this.SEGMENTS; i += 2) {
                    setTimeout(() => {
                        if (this.isDead) return;
                        const n = this.nodes[i];
                        if (n && engine) {
                            engine.effects.push(new EffectEntity(n.x, n.z, {
                                type: 'majo_death_2',
                                radius: 3.0,
                                lifeTime: 0.6
                            }));
                        }
                    }, i * 80);
                }
            } else if (this.deathPhase === 1 && this.deathTimer >= 3.0) {
                this.deathPhase = 2;
                if (engine) {
                    engine.effects.push(new EffectEntity(this.head.x, this.head.z, {
                        type: 'majo_death_3',
                        radius: 20.0,
                        lifeTime: 1.2
                    }));
                }
            } else if (this.deathPhase === 2 && this.deathTimer >= 4.0) {
                this.isDead = true;
            }
            return;
        }

        // ステート更新
        this.stateTimer += dt;

        switch (this.state) {
            case 'appear':
                this._updateAppear(dt, engine);
                break;
            case 'idle':
                this._updateIdle(dt, engine);
                break;
            case 'charge_aim':
                this._updateChargeAim(dt, engine);
                break;
            case 'charge_dash':
                this._updateChargeDash(dt, engine);
                break;
            case 'submerged':
                this._updateSubmerged(dt, engine);
                break;
        }

        // 背骨ノードの形状計算
        this._updateSpine(dt);

        // 代表座標 (this.x, this.z) を頭部座標に同期（当たり判定やHPバー用）
        this.x = this.head.x;
        this.z = this.head.z;
    }

    _updateAppear(dt, engine) {
        const speed = 4.5;
        this.head.z -= speed * dt;
        
        this.swimTimer += dt * 2.5;
        this.head.x += Math.sin(this.swimTimer) * 0.05;

        this.tailX = this.head.x * 0.5;
        this.tailZ = this.head.z + 14.0;

        if (this.head.z <= this.VANGUARD_Z + 1.0) {
            this.state = 'idle';
            this.stateTimer = 0;
            this.bulletCooldown = 1.2;
            this.targetHeadX = 0;
            this.targetHeadZ = this.VANGUARD_Z;
            this.headMoveTimer = 2.0;
        }
    }

    _updateIdle(dt, engine) {
        // 1. 頭部の10箇所ランダムスライド目標決定
        this.headMoveTimer -= dt;
        if (this.headMoveTimer <= 0) {
            this.headMoveTimer = 2.5 + Math.random() * 1.5;
            
            const laneIdx = Math.floor(Math.random() * this.LANES_X.length);
            this.targetHeadX = this.LANES_X[laneIdx];
            
            const isRear = Math.random() < 0.35;
            this.targetHeadZ = isRear ? this.REARGUARD_Z : this.VANGUARD_Z;
        }

        const slideSpeed = 2.4;
        this.head.x += (this.targetHeadX - this.head.x) * Math.min(1.0, dt * slideSpeed);
        this.head.z += (this.targetHeadZ - this.head.z) * Math.min(1.0, dt * slideSpeed);

        // 2. しっぽの緩慢な遊泳 ＆ 頭とのZ軸シンクロ
        this.tailTimer += dt * 0.7;
        this.tailX = Math.sin(this.tailTimer) * 4.0 + Math.cos(this.tailTimer * 0.38) * 1.5;

        const headZOffset = this.head.z - this.VANGUARD_Z;
        this.tailZ = this.BASE_TAIL_Z + headZOffset;

        // 3. 周期的な弾幕発射
        this.bulletCooldown -= dt;
        if (this.bulletCooldown <= 0 && engine) {
            this.bulletCooldown = 2.5;
            this._fireBullets(engine);
        }

        // 8.5秒遊泳したら突進照準へ移行
        if (this.stateTimer >= 8.5) {
            this.state = 'charge_aim';
            this.stateTimer = 0;
            this.isDirLocked = false;
            this._selectChargeTarget(engine);
        }
    }

    _selectChargeTarget(engine) {
        if (!engine || !engine.players) return;
        const alivePlayers = engine.players.filter(p => !p.isDead && p.hp > 0);
        if (alivePlayers.length > 0) {
            this.chargeTarget = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
            const dx = this.chargeTarget.x - this.head.x;
            const dz = this.chargeTarget.z - this.head.z;
            const dist = Math.hypot(dx, dz) || 1.0;
            this.chargeDirX = dx / dist;
            this.chargeDirZ = dz / dist;
            
            if (engine.floatingTexts) {
                engine.floatingTexts.push({
                    id: ++engine.floatingTextIdCounter,
                    x: this.chargeTarget.x,
                    yOffset: 2.0,
                    z: this.chargeTarget.z,
                    amount: 'TARGETED!',
                    type: 'miss',
                    lifeTime: 1.2,
                    maxLife: 1.2
                });
            }
        } else {
            this.chargeTarget = null;
            this.chargeDirX = 0;
            this.chargeDirZ = -1.0;
        }
    }

    _updateChargeAim(dt, engine) {
        const timeLeft = this.AIM_DURATION - this.stateTimer;

        // 身体をとぐろを巻くように少し後ろ（Z奥方向）に引き絞る
        const pullSpeed = 1.6;
        this.head.z += pullSpeed * dt;
        this.tailZ += pullSpeed * dt;

        // 【発射1秒前まで】ターゲットを見つめ続ける（方向を追従更新）
        if (timeLeft > 1.0) {
            this.isDirLocked = false;
            if (this.chargeTarget && !this.chargeTarget.isDead) {
                const dx = this.chargeTarget.x - this.head.x;
                const dz = this.chargeTarget.z - this.head.z;
                const dist = Math.hypot(dx, dz) || 1.0;
                this.chargeDirX = dx / dist;
                this.chargeDirZ = dz / dist;
            }
        } else {
            // 【発射1秒前】：発射方向を固定（ロックオン完了！）
            if (!this.isDirLocked) {
                this.isDirLocked = true;
                // ロックオン通知と予兆エフェクト
                if (engine && engine.floatingTexts && this.chargeTarget) {
                    engine.floatingTexts.push({
                        id: ++engine.floatingTextIdCounter,
                        x: this.head.x,
                        yOffset: 2.5,
                        z: this.head.z,
                        amount: 'LOCK ON!',
                        type: 'critical',
                        lifeTime: 1.0,
                        maxLife: 1.0
                    });
                }
                if (engine) {
                    // 頭部にチャージ発光エフェクト
                    engine.effects.push(new EffectEntity(this.head.x, this.head.z, {
                        type: 'element_hit_1',
                        radius: 2.5,
                        lifeTime: 0.8
                    }));
                }
            }
            // ターゲットが移動しても chargeDirX, chargeDirZ は更新しない！
        }

        // 溜め時間終了で猛突進へ！
        if (this.stateTimer >= this.AIM_DURATION) {
            this.state = 'charge_dash';
            this.stateTimer = 0;
            if (engine) {
                engine.effects.push(new EffectEntity(this.head.x, this.head.z, {
                    type: 'kick_hit',
                    radius: 4.5,
                    lifeTime: 0.6
                }));
            }
        }
    }

    _updateChargeDash(dt, engine) {
        // 固定された方向へ超スピード突進！
        this.head.x += this.chargeDirX * this.chargeSpeed * dt;
        this.head.z += this.chargeDirZ * this.chargeSpeed * dt;

        if (engine && engine.players) {
            for (const p of engine.players) {
                if (p.isDead || p.hp <= 0) continue;
                const dist = Math.hypot(p.x - this.head.x, p.z - this.head.z);
                if (dist < 2.0) { // 判定サイズも拡大
                    const lastHit = this.ramHitCooldowns.get(p) || -999;
                    if (engine.time - lastHit >= 1.0) {
                        this.ramHitCooldowns.set(p, engine.time);
                        const dmg = Math.floor(this.atkPower * 5);
                        engine.applyDamage(this, p, dmg, 'normal', 0, this.head.x, this.head.z, true);
                        p.applyKnockback(this.chargeDirX * 350, this.chargeDirZ * 350);
                        
                        engine.floatingTexts.push({
                            id: ++engine.floatingTextIdCounter,
                            x: p.x, yOffset: 1.0, z: p.z,
                            amount: 'HEAVY CRUSH!', type: 'critical', lifeTime: 1.5, maxLife: 1.5
                        });
                    }
                }
            }
        }

        if (this.tail.z < -2.0 && this.head.z < -2.0) {
            this.state = 'submerged';
            this.stateTimer = 0;
        }
    }

    _updateSubmerged(dt, engine) {
        if (this.stateTimer >= 1.4) {
            const spawnX = (Math.random() - 0.5) * 6.0;
            const startZ = this.BASE_TAIL_Z;

            for (let i = 0; i < this.SEGMENTS; i++) {
                const distFromHead = (this.SEGMENTS - 1 - i) * this.segDist;
                this.nodes[i].x = spawnX;
                this.nodes[i].z = startZ + distFromHead;
            }

            this.state = 'appear';
            this.stateTimer = 0;
            this.swimTimer = Math.random() * Math.PI * 2;
        }
    }

    _updateSpine(dt) {
        if (this.state === 'charge_dash') {
            // 突進中は頭の直進に後ろのノードがIKで一直線に追従
            for (let i = this.SEGMENTS - 2; i >= 0; i--) {
                const current = this.nodes[i];
                const leader = this.nodes[i + 1];
                const dx = current.x - leader.x;
                const dz = current.z - leader.z;
                const dist = Math.hypot(dx, dz);

                if (dist > 0.0001) {
                    current.x = leader.x + (dx / dist) * this.segDist;
                    current.z = leader.z + (dz / dist) * this.segDist;
                } else {
                    current.x = leader.x;
                    current.z = leader.z + this.segDist;
                }
            }
            return;
        }

        const p0 = { x: this.tailX, z: this.tailZ };
        const p3 = { x: this.head.x, z: this.head.z };

        if (this.state === 'charge_aim') {
            // 【照準中】：頭部（SEGMENTS-1）と首（SEGMENTS-2, SEGMENTS-3）を、狙っている方向 (chargeDirX, chargeDirZ) に向ける！
            // ターゲットを睨みつける視覚演出
            const neckLen = this.segDist;
            this.nodes[this.SEGMENTS - 1].x = p3.x;
            this.nodes[this.SEGMENTS - 1].z = p3.z;
            this.nodes[this.SEGMENTS - 2].x = p3.x - this.chargeDirX * neckLen;
            this.nodes[this.SEGMENTS - 2].z = p3.z - this.chargeDirZ * neckLen;
            this.nodes[this.SEGMENTS - 3].x = p3.x - this.chargeDirX * (neckLen * 1.9);
            this.nodes[this.SEGMENTS - 3].z = p3.z - this.chargeDirZ * (neckLen * 1.9);

            // 残りの胴体（0 〜 SEGMENTS-4）はしっぽから首へ滑らかに繋ぐ
            const pHead = this.nodes[this.SEGMENTS - 3];
            const dzAim = p0.z - pHead.z;
            const p1Aim = { x: p0.x, z: p0.z - dzAim * 0.35 };
            const p2Aim = { x: pHead.x, z: pHead.z + dzAim * 0.35 };

            this.swimTimer += dt * 3.5;
            for (let i = 0; i <= this.SEGMENTS - 4; i++) {
                const t = i / (this.SEGMENTS - 4);
                const omt = 1.0 - t;
                const bzX = omt * omt * omt * p0.x + 3 * omt * omt * t * p1Aim.x + 3 * omt * t * t * p2Aim.x + t * t * t * pHead.x;
                const bzZ = omt * omt * omt * p0.z + 3 * omt * omt * t * p1Aim.z + 3 * omt * t * t * p2Aim.z + t * t * t * pHead.z;

                const waveAmp = Math.sin(t * Math.PI) * 0.45;
                const waveOffset = Math.sin(this.swimTimer - t * Math.PI * 2.0) * waveAmp;
                this.nodes[i].x = bzX + waveOffset;
                this.nodes[i].z = bzZ;
            }
            return;
        }

        // 通常時（idle / appear）：
        this.swimTimer += dt * 2.8;

        const dz = p0.z - p3.z;
        const p1 = { x: p0.x, z: p0.z - dz * 0.35 };
        const p2 = { x: p3.x, z: p3.z + dz * 0.35 };

        for (let i = 0; i < this.SEGMENTS; i++) {
            const t = i / (this.SEGMENTS - 1);
            const omt = 1.0 - t;

            const bzX = omt * omt * omt * p0.x +
                        3 * omt * omt * t * p1.x +
                        3 * omt * t * t * p2.x +
                        t * t * t * p3.x;

            const bzZ = omt * omt * omt * p0.z +
                        3 * omt * omt * t * p1.z +
                        3 * omt * t * t * p2.z +
                        t * t * t * p3.z;

            const waveAmp = Math.sin(t * Math.PI) * 1.1; // 1.5倍に合わせてうねり幅も少し拡大
            const waveOffset = Math.sin(this.swimTimer - t * Math.PI * 2.2) * waveAmp;

            this.nodes[i].x = bzX + waveOffset;
            this.nodes[i].z = bzZ;
        }
    }

    _fireBullets(engine) {
        const count = 5;
        const spreadDeg = 36;
        const baseAngle = Math.atan2(-1.0, 0);
        const speed = 7.0;
        const damage = Math.floor(this.atkPower * 0.8);

        for (let i = 0; i < count; i++) {
            const offset = (i - (count - 1) / 2) * (spreadDeg / (count - 1));
            const rad = baseAngle + (offset * Math.PI / 180);

            const vx = Math.cos(rad) * speed;
            const vz = Math.sin(rad) * speed;

            const b = new Bullet(this.head.x, this.head.z, {
                vx: vx,
                vz: vz,
                damage: damage,
                owner: 'enemy',
                size: 0.8,
                type: 'enemy_bullet',
                textureKey: 'enemy_bullet',
                targetDist: 25.0,
                lifeTime: 4.5
            });
            b.sourceEntity = this;
            engine.bullets.push(b);
        }

        engine.effects.push(new EffectEntity(this.head.x, this.head.z, {
            type: 'element_hit_5',
            radius: 2.0,
            lifeTime: 0.4
        }));
    }
}
