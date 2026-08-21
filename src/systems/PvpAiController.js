// 防御側から見た属性防御力（例: 赤(防御)は紫(攻撃)から75%ダメージを受ける -> 100未満なら防御力が高い）
const ATTR_DEF = {
    'red':    { 'red': 100, 'purple': 75,  'green': 100, 'yellow': 100, 'blue': 125 },
    'purple': { 'red': 125, 'purple': 100, 'green': 75,  'yellow': 100, 'blue': 100 },
    'green':  { 'red': 100, 'purple': 125, 'green': 100, 'yellow': 75,  'blue': 100 },
    'yellow': { 'red': 100, 'purple': 100, 'green': 125, 'yellow': 100, 'blue': 75  },
    'blue':   { 'red': 75,  'purple': 100, 'green': 100, 'yellow': 125, 'blue': 100 }
};

export class PvpAiController {
    constructor(engine) {
        this.engine = engine;
        this.teamLastLaneMoveTime = -999;
        this.teamLastUltTime = -999;

        // キャラクターごとのタイマー初期化
        this.charTimers = new Map();
    }

    /** キャラクターごとのロールタイプを取得 */
    getRoleType(charId) {
        if (charId === '002' || charId === '003') {
            return 'melee'; // 【近接攻撃型】 蒼樹(002), 紅華(003)
        } else if (charId === '005' || charId === '010') {
            return 'ranged'; // 【後衛型】 李乃果(005), 白蓮(010)
        } else {
            return 'support'; // 【支援型】 紫苑(001), 黄蘭(004)
        }
    }

    /** 毎フレームのAI思考更新 */
    update(dt) {
        if (!this.engine.isPvpBattle || !this.engine.pvpEnemies) return;

        const pvpEnemies = this.engine.pvpEnemies.filter(e => !e.isDead && e.hp > 0);
        if (pvpEnemies.length === 0) return;

        const players = this.engine.players.filter(p => !p.isDead && p.hp > 0 && p.sp > 0);
        const now = this.engine.time || 0;

        for (const ep of pvpEnemies) {
            if (!this.charTimers.has(ep)) {
                this.charTimers.set(ep, {
                    ultCheckTimer: 1.0 + Math.random() * 2.0,
                    posCheckTimer: 0.5 + Math.random() * 0.5
                });
            }

            const timer = this.charTimers.get(ep);
            const role = this.getRoleType(ep.charId);

            // ── 1. 必殺技の判断（ゲージがたまれば撃つ） ──
            timer.ultCheckTimer -= dt;
            if (timer.ultCheckTimer <= 0) {
                timer.ultCheckTimer = 2.0; // 2秒ごとに必殺技可能かチェック

                if (ep.ultimateCooldown <= 0) {
                    let canCast = true;

                    // 近接型のみ: 6秒以内に他のメンバーが必殺技を撃っていたら撃たない
                    if (role === 'melee') {
                        if (now - this.teamLastUltTime < 6.0) {
                            canCast = false;
                        }
                    }

                    if (canCast) {
                        this._executeUltimate(ep, role, now, pvpEnemies);
                    }
                }
            }

            // ── 2. ポジショニング＆レーン移動の判断 ──
            timer.posCheckTimer -= dt;
            if (timer.posCheckTimer <= 0) {
                timer.posCheckTimer = 0.5; // 0.5秒ごとに位置・レーン判定
                this._updatePositionAndLane(ep, role, pvpEnemies, players, now);
            }
        }
    }

    /** 必殺技の発動と移動処理 */
    _executeUltimate(ep, role, now, pvpEnemies) {
        this.teamLastUltTime = now;

        // 移動するかどうかの判定
        let moveToCenter = false;
        if (role === 'melee' || role === 'ranged') {
            // 1/2で前衛中央に移動して撃とうとする。1/2で移動せずそのまま撃つ。
            if (Math.random() < 0.5) {
                moveToCenter = true;
            }
        } else if (role === 'support') {
            // 支援型: 移動せず必殺技を撃つ
            moveToCenter = false;
        }

        if (moveToCenter) {
            this._swapLane(ep, 0, pvpEnemies, now);
            ep.isFront = true;
            ep.targetZ = 9.0;
        }

        // 必殺技の実行
        ep.isUltimateActive = true;
        if (typeof ep.triggerUltimate === 'function') {
            ep.triggerUltimate(
                this.engine.pvpEnemies,
                this.engine.players,
                this.engine.bullets,
                this.engine.effects,
                this.engine.floatingTexts
            );
        } else {
            this.engine.floatingTexts.push({
                id: Math.random(),
                x: ep.x, yOffset: 0.5, z: ep.z,
                amount: "ULTIMATE!", type: "skill", lifeTime: 1.5, maxLife: 1.5
            });
        }
    }

    /** レーン移動およびスワップ（入れ替え）処理 */
    _swapLane(ep, targetLane, pvpEnemies, now) {
        if (ep.lane === targetLane) return;

        const oldLane = ep.lane !== undefined ? ep.lane : 0;
        const occupant = pvpEnemies.find(m => m !== ep && m.lane === targetLane);

        if (occupant) {
            occupant.lane = oldLane;
        }

        ep.lane = targetLane;
        this.teamLastLaneMoveTime = now;
    }

    /** ランダムで左右どちらかのレーンを確認し、誰もいないとそちらに移動する */
    _tryMoveToAdjacentEmptyLane(ep, pvpEnemies, now) {
        const currentLane = ep.lane !== undefined ? ep.lane : 0;
        const dirs = Math.random() < 0.5 ? [-1, 1] : [1, -1];
        for (const d of dirs) {
            const targetLane = currentLane + d;
            if (targetLane >= -2 && targetLane <= 2) {
                const isOccupied = pvpEnemies.some(m => m !== ep && m.lane === targetLane);
                if (!isOccupied) {
                    this._swapLane(ep, targetLane, pvpEnemies, now);
                    return true;
                }
            }
        }
        return false;
    }

    /** 前後列とレーン移動の思考ルーチン */
    _updatePositionAndLane(ep, role, pvpEnemies, players, now) {
        // ── A. 前衛 / 後衛の判定 ──
        // 共通ルール: 誰も前衛にいないと前衛に出る
        const hasAnyFrontAlly = pvpEnemies.some(m => m !== ep && m.isFront);

        if (!hasAnyFrontAlly) {
            // 誰も前衛にいない -> 前衛に出る
            ep.isFront = true;
            ep.targetZ = 9.0;
        } else if (role === 'melee') {
            // 【近接攻撃型】 全メンバーの中で最もHPが低くなると後列に下がる。それ以外の場合前衛に出る
            let lowestHp = Infinity;
            let lowestMember = null;
            for (const m of pvpEnemies) {
                if (m.hp < lowestHp) {
                    lowestHp = m.hp;
                    lowestMember = m;
                }
            }

            if (lowestMember === ep && pvpEnemies.length > 1) {
                // 最もHPが低い -> 後列に下がる
                ep.isFront = false;
                ep.targetZ = 14.0;
            } else {
                // それ以外 -> 前衛に出る
                ep.isFront = true;
                ep.targetZ = 9.0;
            }
        } else if (role === 'ranged') {
            // 【後衛型】 後列から動かない
            ep.isFront = false;
            ep.targetZ = 14.0;
        } else if (role === 'support') {
            // 【支援型】 前衛に誰かがいれば後列から動かない。前衛がいなくなると前に出ようとする。
            ep.isFront = false;
            ep.targetZ = 14.0;
        }

        // ── B. レーン移動の判定 ──
        // 共通ルール: 他のキャラクターが1秒以内にレーン移動していたら移動しない
        const canMoveLane = (now - this.teamLastLaneMoveTime >= 1.0);
        if (!canMoveLane) return;

        const currentLane = ep.lane !== undefined ? ep.lane : 0;
        const facingPlayer = players.find(p => p.lane === currentLane);

        if (role === 'melee') {
            // 【近接攻撃型】
            // ① 自分の正面に自分の属性の防御力の高い(属性値100未満)キャラクターが来たらレーンを移動する
            let facingHighDef = false;
            if (facingPlayer) {
                const defAttr = facingPlayer.attribute || 'red';
                const atkAttr = ep.attribute || 'red';
                const defValue = ATTR_DEF[defAttr]?.[atkAttr] !== undefined ? ATTR_DEF[defAttr][atkAttr] : 100;
                if (defValue < 100) {
                    facingHighDef = true;
                }
            }

            if (facingHighDef) {
                if (!this._tryMoveToAdjacentEmptyLane(ep, pvpEnemies, now)) {
                    const candidates = [-2, -1, 0, 1, 2].filter(l => l !== currentLane);
                    if (candidates.length > 0) {
                        const targetLane = candidates[Math.floor(Math.random() * candidates.length)];
                        this._swapLane(ep, targetLane, pvpEnemies, now);
                    }
                }
                return;
            }

            // ② 敵の前列にいるキャラクターが自分の属性の防御力の高い(属性値100未満)キャラクターでなければその正面に移動する
            const validFrontPlayers = players.filter(p => {
                if (!p.isFront) return false;
                const defAttr = p.attribute || 'red';
                const atkAttr = ep.attribute || 'red';
                const defValue = ATTR_DEF[defAttr]?.[atkAttr] !== undefined ? ATTR_DEF[defAttr][atkAttr] : 100;
                return defValue >= 100;
            });

            if (validFrontPlayers.length > 0) {
                const alreadyFacing = validFrontPlayers.some(p => p.lane === currentLane);
                if (!alreadyFacing) {
                    const targetP = validFrontPlayers[Math.floor(Math.random() * validFrontPlayers.length)];
                    this._swapLane(ep, targetP.lane, pvpEnemies, now);
                    return;
                }
            }

            // ③ ランダムで左右どちらかのレーンを確認し、誰もいないとそちらに移動する
            if (Math.random() < 0.35) {
                this._tryMoveToAdjacentEmptyLane(ep, pvpEnemies, now);
            }
        } else if (role === 'ranged') {
            // 【後衛型】
            // ① 前衛にいるとき、目の前に誰かがいたら左右どちらかのレーンへ移動する
            if (ep.isFront && facingPlayer) {
                if (!this._tryMoveToAdjacentEmptyLane(ep, pvpEnemies, now)) {
                    const candidates = [-2, -1, 0, 1, 2].filter(l => l !== currentLane);
                    if (candidates.length > 0) {
                        const targetLane = candidates[Math.floor(Math.random() * candidates.length)];
                        this._swapLane(ep, targetLane, pvpEnemies, now);
                    }
                }
                return;
            }

            // ② 後列から動かない。右端か左端近いほうにレーン移動しようとする
            const distToLeft = Math.abs(currentLane - (-2));
            const distToRight = Math.abs(currentLane - 2);
            const preferredLane = (distToLeft <= distToRight) ? -2 : 2;

            if (preferredLane !== currentLane) {
                const step = preferredLane > currentLane ? 1 : -1;
                const nextLane = currentLane + step;
                this._swapLane(ep, nextLane, pvpEnemies, now);
            } else {
                // ③ ランダムで左右どちらかのレーンを確認し、誰もいないとそちらに移動する
                if (Math.random() < 0.35) {
                    this._tryMoveToAdjacentEmptyLane(ep, pvpEnemies, now);
                }
            }
        } else if (role === 'support') {
            // 【支援型】
            // ① 前衛にいるとき、目の前に誰かがいたら左右どちらかのレーンへ移動する
            if (ep.isFront && facingPlayer) {
                if (!this._tryMoveToAdjacentEmptyLane(ep, pvpEnemies, now)) {
                    const candidates = [-2, -1, 0, 1, 2].filter(l => l !== currentLane);
                    if (candidates.length > 0) {
                        const targetLane = candidates[Math.floor(Math.random() * candidates.length)];
                        this._swapLane(ep, targetLane, pvpEnemies, now);
                    }
                }
                return;
            }

            // ② 自分の正面に自分の属性の防御力の高い(属性値100未満)キャラクターが来たらレーンを移動する
            let facingHighDef = false;
            if (facingPlayer) {
                const defAttr = facingPlayer.attribute || 'red';
                const atkAttr = ep.attribute || 'red';
                const defValue = ATTR_DEF[defAttr]?.[atkAttr] !== undefined ? ATTR_DEF[defAttr][atkAttr] : 100;
                if (defValue < 100) {
                    facingHighDef = true;
                }
            }

            if (facingHighDef) {
                if (!this._tryMoveToAdjacentEmptyLane(ep, pvpEnemies, now)) {
                    const candidates = [-2, -1, 0, 1, 2].filter(l => l !== currentLane);
                    if (candidates.length > 0) {
                        const targetLane = candidates[Math.floor(Math.random() * candidates.length)];
                        this._swapLane(ep, targetLane, pvpEnemies, now);
                    }
                }
                return;
            }

            // ③ ランダムで左右どちらかのレーンを確認し、誰もいないとそちらに移動する
            if (Math.random() < 0.35) {
                this._tryMoveToAdjacentEmptyLane(ep, pvpEnemies, now);
            }
        }
    }
}
