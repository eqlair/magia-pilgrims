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

        const players = this.engine.players.filter(p => !p.isDead && p.hp > 0);
        const now = this.engine.time || 0;

        for (const ep of pvpEnemies) {
            if (!this.charTimers.has(ep)) {
                this.charTimers.set(ep, {
                    ultCheckTimer: 2.0 + Math.random() * 3.0, // 5秒周期の判断タイマー（開幕少しズラす）
                    posCheckTimer: 0.5 + Math.random() * 0.5
                });
            }

            const timer = this.charTimers.get(ep);
            const role = this.getRoleType(ep.charId);

            // ── 1. 必殺技の判断（5秒に1回、1/2で撃とうとする） ──
            timer.ultCheckTimer -= dt;
            if (timer.ultCheckTimer <= 0) {
                timer.ultCheckTimer = 5.0; // 次の判断まで5秒

                const shouldCastUlt = Math.random() < 0.5; // 1/2で撃とうとする
                if (shouldCastUlt) {
                    let canCast = true;

                    // 近接型のみ: 6秒以内に他のメンバーが必殺技を撃っていたら撃たない
                    if (role === 'melee') {
                        if (now - this.teamLastUltTime < 6.0) {
                            canCast = false;
                        }
                    }

                    if (canCast) {
                        this._executeUltimate(ep, role, now);
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
    _executeUltimate(ep, role, now) {
        this.teamLastUltTime = now;

        // 移動するかどうかの判定
        let moveToCenter = false;
        if (role === 'melee' || role === 'ranged') {
            // 1/2で前衛中央に移動して撃とうとする。1/2で移動せずそのまま撃つ。
            if (Math.random() < 0.5) {
                moveToCenter = true;
            }
        } else if (role === 'support') {
            // 移動せず必殺技を撃つ
            moveToCenter = false;
        }

        if (moveToCenter) {
            ep.lane = 0;
            ep.isFront = true;
            ep.targetZ = 12.0;
            ep.x = 0;
            ep.z = 12.0;
            this.teamLastLaneMoveTime = now;
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

    /** 前後列とレーン移動の思考ルーチン */
    _updatePositionAndLane(ep, role, pvpEnemies, players, now) {
        const canMoveLane = (now - this.teamLastLaneMoveTime >= 1.0);

        // ── A. 前衛 / 後衛の判定 ──
        if (role === 'melee') {
            // 全メンバーの中で最もHPが低くなると後列に下がる。それ以外の場合前衛に出る
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
                ep.targetZ = 17.0;
            } else {
                // それ以外 -> 前衛に出る
                ep.isFront = true;
                ep.targetZ = 12.0;
            }
        } else if (role === 'ranged') {
            // 後列から動かない
            ep.isFront = false;
            ep.targetZ = 17.0;
        } else if (role === 'support') {
            // 前衛に誰かがいれば後列から動かない。前衛がいなくなると前に出ようとする。
            const hasFrontAlly = pvpEnemies.some(m => m !== ep && m.isFront);
            if (hasFrontAlly) {
                ep.isFront = false;
                ep.targetZ = 17.0;
            } else {
                ep.isFront = true;
                ep.targetZ = 12.0;
            }
        }

        // ── B. レーン移動の判定 ──
        if (!canMoveLane) return; // 他のキャラクターが1秒以内に移動していたら移動しない

        const currentLane = ep.lane !== undefined ? ep.lane : 0;
        const usedLanes = pvpEnemies.filter(m => m !== ep).map(m => m.lane);

        if (role === 'melee' || role === 'support') {
            // 自分の正面に自分の属性の防御力の高い(属性値100未満)キャラクターが来たらレーンを移動する
            const facingPlayer = players.find(p => p.lane === currentLane);
            if (facingPlayer) {
                const defAttr = facingPlayer.attribute || 'red';
                const atkAttr = ep.attribute || 'red';
                const defValue = ATTR_DEF[defAttr]?.[atkAttr] !== undefined ? ATTR_DEF[defAttr][atkAttr] : 100;

                if (defValue < 100) {
                    // 防御力が高い（相性が悪い）キャラクターが正面にいる！
                    // 空いている他のレーンを探して移動
                    const availableLanes = [-2, -1, 0, 1, 2].filter(l => !usedLanes.includes(l) && l !== currentLane);
                    if (availableLanes.length > 0) {
                        // 可能な限り相性が良い敵がいるレーン、または空いているレーンを選択
                        const targetLane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
                        ep.lane = targetLane;
                        ep.x = targetLane * 1.8;
                        this.teamLastLaneMoveTime = now;
                        return;
                    }
                }
            }
        }

        if (role === 'ranged') {
            // 右端か左端近いほうにレーン移動しようとする
            const distToLeft = Math.abs(currentLane - (-2));
            const distToRight = Math.abs(currentLane - 2);

            let preferredLane = (distToLeft <= distToRight) ? -2 : 2;
            if (usedLanes.includes(preferredLane)) {
                preferredLane = (preferredLane === -2) ? 2 : -2;
            }

            if (preferredLane !== currentLane && !usedLanes.includes(preferredLane)) {
                const step = preferredLane > currentLane ? 1 : -1;
                const nextLane = currentLane + step;
                if (!usedLanes.includes(nextLane)) {
                    ep.lane = nextLane;
                    ep.x = nextLane * 1.8;
                    this.teamLastLaneMoveTime = now;
                }
            }
        }
    }
}
