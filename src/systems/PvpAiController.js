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
        this.teamLastLaneMoveTime = { player: -999, enemy: -999 };
        this.teamLastUltTime = { player: -999, enemy: -999 };

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
        const now = this.engine.time || 0;

        // 1. 敵側チーム（PVP戦）のAI更新
        if (this.engine.isPvpBattle && this.engine.pvpEnemies) {
            const pvpEnemies = this.engine.pvpEnemies.filter(e => !e.isDead && e.hp > 0);
            const players = this.engine.players.filter(p => !p.isDead && p.hp > 0 && p.sp > 0);
            if (pvpEnemies.length > 0) {
                this._updateTeamAi(pvpEnemies, players, false, dt, now);
            }
        }

        // 2. プレイヤー側チームのAI更新（雑魚戦・魔女戦・PVP戦）
        if (this.engine.players) {
            const players = this.engine.players.filter(p => !p.isDead && p.hp > 0 && p.sp > 0);
            if (players.length > 0) {
                let opponents = [];
                if (this.engine.isPvpBattle && this.engine.pvpEnemies) {
                    opponents = this.engine.pvpEnemies.filter(e => !e.isDead && e.hp > 0);
                } else if (this.engine.enemies) {
                    opponents = this.engine.enemies.filter(e => !e.isDead && !e.isDying && e.hp > 0);
                }
                this._updateTeamAi(players, opponents, true, dt, now);
            }
        }
    }

    /** 各チーム（プレイヤー側 / 敵側）の思考更新 */
    _updateTeamAi(myTeam, opponents, isPlayerTeam, dt, now) {
        // プレイヤー側の場合、戦闘中AUTOマスターボタンがOFFなら全キャラ手動（AIスキップ）
        if (isPlayerTeam && this.engine.isBattleAutoEnabled === false) {
            return;
        }

        for (const member of myTeam) {
            // プレイヤー側の場合、開幕配置でAUTOがONだったキャラのみ自律行動（戦闘中のレーン移動によらずキャラ単位で固定）
            if (isPlayerTeam && !member.isAuto) {
                continue; // 隊列設定でAUTOがOFFだったキャラはずっと手動操作のまま
            }

            if (!this.charTimers.has(member)) {
                this.charTimers.set(member, {
                    ultCheckTimer: 1.0 + Math.random() * 2.0,
                    posCheckTimer: 0.5 + Math.random() * 0.5
                });
            }

            const timer = this.charTimers.get(member);
            const role = this.getRoleType(member.charId);

            // ── 1. 必殺技の判断 ──
            timer.ultCheckTimer -= dt;
            if (timer.ultCheckTimer <= 0) {
                timer.ultCheckTimer = 1.5;

                const canCast = this._checkUltimateCondition(member, role, myTeam, now, isPlayerTeam);
                if (canCast) {
                    this._executeUltimate(member, role, now, myTeam, opponents, isPlayerTeam);
                }
            }

            // ── 2. ポジショニング＆レーン移動の判断 ──
            timer.posCheckTimer -= dt;
            if (timer.posCheckTimer <= 0) {
                timer.posCheckTimer = 0.5;
                this._updatePositionAndLane(member, role, myTeam, opponents, isPlayerTeam, now);
            }
        }
    }

    /** 必殺技の発動条件判定 */
    _checkUltimateCondition(member, role, myTeam, now, isPlayerTeam) {
        // ゲージがたまっていなければ撃てない
        if (member.ultimateCooldown > 0) return false;

        const teamKey = isPlayerTeam ? 'player' : 'enemy';
        const isPvp = this.engine.isPvpBattle;
        const isBoss = this.engine.isBossBattle || (this.engine.enemies && this.engine.enemies.some(e => e.isBoss));

        // 1. 戦闘タイプごとの発動条件判定
        let battleConditionMet = false;
        if (isPvp || isBoss) {
            // ※魔女戦 / PvP戦: ゲージがたまれば撃つ
            battleConditionMet = true;
        } else {
            // ※雑魚戦: 雑魚敵が画面に20匹以上、敵の残り数がまだ半分より多ければ必殺技を撃つ
            const aliveEnemies = this.engine.enemies ? this.engine.enemies.filter(e => !e.isDead && !e.isDying && e.hp > 0).length : 0;
            const totalEnemies = this.engine.enemyCountPerWave || 0;
            const remainingEnemies = aliveEnemies + Math.max(0, (this.engine.enemyCountPerWave || 0) - (this.engine.spawnedInWave || 0));

            if (aliveEnemies >= 20 && (totalEnemies === 0 || remainingEnemies > (totalEnemies / 2))) {
                battleConditionMet = true;
            }
        }

        if (!battleConditionMet) return false;

        // 2. ロール別の条件
        if (role === 'melee') {
            // 6秒以内に他のメンバーが必殺技を撃っていたら撃たない
            if (now - this.teamLastUltTime[teamKey] < 6.0) {
                return false;
            }
        } else if (role === 'ranged') {
            // 味方の2人以上がHPの5%以上を失っていれば撃つ
            const damagedCount = myTeam.filter(m => {
                if (m.maxHp <= 0) return false;
                return (m.maxHp - m.hp) >= (m.maxHp * 0.05);
            }).length;
            if (damagedCount < 2) {
                return false;
            }
        } else if (role === 'support') {
            // 支援型: 基本条件を満たしていれば撃つ
        }

        return true;
    }

    /** 必殺技の発動と移動処理 */
    _executeUltimate(member, role, now, myTeam, opponents, isPlayerTeam) {
        const teamKey = isPlayerTeam ? 'player' : 'enemy';
        this.teamLastUltTime[teamKey] = now;

        // 移動するかどうかの判定
        // 【近接攻撃型】: 1/2で前衛中央に向かって移動して撃とうとする。1/2で移動せずそのまま撃つ。
        // 【後衛型】: 1/2で後衛中央に向かって移動して撃とうとする。1/2で移動せずそのまま撃つ。
        // 【支援型】: 1/2で後衛中央に向かって移動して撃とうとする。1/2で移動せずそのまま撃つ。
        const shouldMove = Math.random() < 0.5;

        if (shouldMove) {
            this._swapLane(member, 0, myTeam, now, teamKey);
            if (role === 'melee') {
                // 前衛中央へ
                member.isFront = true;
                member.targetZ = isPlayerTeam ? 6.0 : 9.0;
            } else {
                // 後衛中央へ
                member.isFront = false;
                member.targetZ = isPlayerTeam ? 1.0 : 14.0;
            }
        }

        // 必殺技の実行
        if (typeof member.triggerUltimate === 'function') {
            if (isPlayerTeam) {
                member.triggerUltimate(
                    this.engine.players,
                    opponents,
                    this.engine.bullets,
                    this.engine.effects,
                    this.engine.floatingTexts
                );
            } else {
                member.triggerUltimate(
                    this.engine.pvpEnemies,
                    this.engine.players,
                    this.engine.bullets,
                    this.engine.effects,
                    this.engine.floatingTexts
                );
            }
        } else {
            this.engine.floatingTexts.push({
                id: Math.random(),
                x: member.x, yOffset: 0.5, z: member.z,
                amount: "ULTIMATE!", type: "skill", lifeTime: 1.5, maxLife: 1.5
            });
        }
    }

    /** レーン移動およびスワップ（入れ替え）処理 */
    _swapLane(member, targetLane, myTeam, now, teamKey) {
        if (member.lane === targetLane) return;

        const oldLane = member.lane !== undefined ? member.lane : 0;
        const occupant = myTeam.find(m => m !== member && m.lane === targetLane);

        if (occupant) {
            occupant.lane = oldLane;
        }

        member.lane = targetLane;
        this.teamLastLaneMoveTime[teamKey] = now;
    }

    /** ランダムで左右どちらかのレーンを確認し、誰もいないとそちらに移動する */
    _tryMoveToAdjacentEmptyLane(member, myTeam, now, teamKey) {
        const currentLane = member.lane !== undefined ? member.lane : 0;
        const dirs = Math.random() < 0.5 ? [-1, 1] : [1, -1];
        for (const d of dirs) {
            const targetLane = currentLane + d;
            if (targetLane >= -2 && targetLane <= 2) {
                const isOccupied = myTeam.some(m => m !== member && m.lane === targetLane);
                if (!isOccupied) {
                    this._swapLane(member, targetLane, myTeam, now, teamKey);
                    return true;
                }
            }
        }
        return false;
    }

    /** 前後列とレーン移動の思考ルーチン */
    _updatePositionAndLane(member, role, myTeam, opponents, isPlayerTeam, now) {
        const teamKey = isPlayerTeam ? 'player' : 'enemy';
        const frontZ = isPlayerTeam ? 6.0 : 9.0;
        const rearZ = isPlayerTeam ? 1.0 : 14.0;

        // ── A. 前衛 / 後衛の判定 ──
        // 共通ルール: 誰も前衛にいないと前衛に出る
        const hasAnyFrontAlly = myTeam.some(m => m !== member && m.isFront);

        if (!hasAnyFrontAlly) {
            // 誰も前衛にいない -> 前衛に出る
            member.isFront = true;
            member.targetZ = frontZ;
        } else if (role === 'melee') {
            // 【近接攻撃型】 全メンバーの中で最もHPが低くなると後列に下がる。それ以外の場合前衛に出る
            let lowestHp = Infinity;
            let lowestMember = null;
            for (const m of myTeam) {
                if (m.hp < lowestHp) {
                    lowestHp = m.hp;
                    lowestMember = m;
                }
            }

            if (lowestMember === member && myTeam.length > 1) {
                // 最もHPが低い -> 後列に下がる
                member.isFront = false;
                member.targetZ = rearZ;
            } else {
                // それ以外 -> 前衛に出る
                member.isFront = true;
                member.targetZ = frontZ;
            }
        } else if (role === 'ranged') {
            // 【後衛型】 後列から動かない
            member.isFront = false;
            member.targetZ = rearZ;
        } else if (role === 'support') {
            // 【支援型】 前衛に誰かがいれば後列から動かない。前衛がいなくなると前に出ようとする。
            member.isFront = false;
            member.targetZ = rearZ;
        }

        // ── B. レーン移動の判定 ──
        // 共通ルール: 他のキャラクターが1秒以内にレーン移動していたら移動しない
        const canMoveLane = (now - this.teamLastLaneMoveTime[teamKey] >= 1.0);
        if (!canMoveLane) return;

        const currentLane = member.lane !== undefined ? member.lane : 0;
        const facingOpponent = opponents.find(p => {
            if (p.lane !== undefined) return p.lane === currentLane;
            return Math.abs(p.x - currentLane * 1.8) < 1.0;
        });

        if (role === 'melee') {
            // 【近接攻撃型】
            // ① 自分の正面に自分の属性の防御力の高い(属性値100未満)キャラクターが来たらレーンを移動する
            let facingHighDef = false;
            if (facingOpponent) {
                const defAttr = facingOpponent.attribute || 'red';
                const atkAttr = member.attribute || 'red';
                const defValue = ATTR_DEF[defAttr]?.[atkAttr] !== undefined ? ATTR_DEF[defAttr][atkAttr] : 100;
                if (defValue < 100) {
                    facingHighDef = true;
                }
            }

            if (facingHighDef) {
                if (!this._tryMoveToAdjacentEmptyLane(member, myTeam, now, teamKey)) {
                    const candidates = [-2, -1, 0, 1, 2].filter(l => l !== currentLane);
                    if (candidates.length > 0) {
                        const targetLane = candidates[Math.floor(Math.random() * candidates.length)];
                        this._swapLane(member, targetLane, myTeam, now, teamKey);
                    }
                }
                return;
            }

            // ② 敵の前列にいるキャラクターが自分の属性の防御力の高い(属性値100未満)キャラクターでなければその正面に移動する
            const validFrontOpponents = opponents.filter(p => {
                const isFrontOpp = p.isFront !== undefined ? p.isFront : (p.z < 15.0);
                if (!isFrontOpp) return false;
                const defAttr = p.attribute || 'red';
                const atkAttr = member.attribute || 'red';
                const defValue = ATTR_DEF[defAttr]?.[atkAttr] !== undefined ? ATTR_DEF[defAttr][atkAttr] : 100;
                return defValue >= 100;
            });

            if (validFrontOpponents.length > 0) {
                const alreadyFacing = validFrontOpponents.some(p => {
                    const oLane = p.lane !== undefined ? p.lane : Math.round(p.x / 1.8);
                    return oLane === currentLane;
                });
                if (!alreadyFacing) {
                    const targetOpp = validFrontOpponents[Math.floor(Math.random() * validFrontOpponents.length)];
                    const targetLane = targetOpp.lane !== undefined ? targetOpp.lane : Math.max(-2, Math.min(2, Math.round(targetOpp.x / 1.8)));
                    this._swapLane(member, targetLane, myTeam, now, teamKey);
                    return;
                }
            }

            // ③ ランダムで左右どちらかのレーンを確認し、誰もいないとそちらに移動する
            if (Math.random() < 0.35) {
                this._tryMoveToAdjacentEmptyLane(member, myTeam, now, teamKey);
            }
        } else if (role === 'ranged') {
            // 【後衛型】
            // ① 前衛にいるとき、目の前に誰かがいたら左右どちらかのレーンへ移動する
            if (member.isFront && facingOpponent) {
                if (!this._tryMoveToAdjacentEmptyLane(member, myTeam, now, teamKey)) {
                    const candidates = [-2, -1, 0, 1, 2].filter(l => l !== currentLane);
                    if (candidates.length > 0) {
                        const targetLane = candidates[Math.floor(Math.random() * candidates.length)];
                        this._swapLane(member, targetLane, myTeam, now, teamKey);
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
                this._swapLane(member, nextLane, myTeam, now, teamKey);
            } else {
                // ③ ランダムで左右どちらかのレーンを確認し、誰もいないとそちらに移動する
                if (Math.random() < 0.35) {
                    this._tryMoveToAdjacentEmptyLane(member, myTeam, now, teamKey);
                }
            }
        } else if (role === 'support') {
            // 【支援型】
            // ① 前衛にいるとき、目の前に誰かがいたら左右どちらかのレーンへ移動する
            if (member.isFront && facingOpponent) {
                if (!this._tryMoveToAdjacentEmptyLane(member, myTeam, now, teamKey)) {
                    const candidates = [-2, -1, 0, 1, 2].filter(l => l !== currentLane);
                    if (candidates.length > 0) {
                        const targetLane = candidates[Math.floor(Math.random() * candidates.length)];
                        this._swapLane(member, targetLane, myTeam, now, teamKey);
                    }
                }
                return;
            }

            // ② 自分の正面に自分の属性の防御力の高い(属性値100未満)キャラクターが来たらレーンを移動する
            let facingHighDef = false;
            if (facingOpponent) {
                const defAttr = facingOpponent.attribute || 'red';
                const atkAttr = member.attribute || 'red';
                const defValue = ATTR_DEF[defAttr]?.[atkAttr] !== undefined ? ATTR_DEF[defAttr][atkAttr] : 100;
                if (defValue < 100) {
                    facingHighDef = true;
                }
            }

            if (facingHighDef) {
                if (!this._tryMoveToAdjacentEmptyLane(member, myTeam, now, teamKey)) {
                    const candidates = [-2, -1, 0, 1, 2].filter(l => l !== currentLane);
                    if (candidates.length > 0) {
                        const targetLane = candidates[Math.floor(Math.random() * candidates.length)];
                        this._swapLane(member, targetLane, myTeam, now, teamKey);
                    }
                }
                return;
            }

            // ③ ランダムで左右どちらかのレーンを確認し、誰もいないとそちらに移動する
            if (Math.random() < 0.35) {
                this._tryMoveToAdjacentEmptyLane(member, myTeam, now, teamKey);
            }
        }
    }
}
