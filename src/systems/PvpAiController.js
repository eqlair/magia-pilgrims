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

    /**
     * キャラクターごとのロールタイプを取得
     * F : 前衛・標準 (蒼樹 002, さくら 006, ななよ 007)
     * F2: 前衛・突進中央狙い (紅華 003)
     * M : 補助・自由位置 (紫苑 001)
     * M2: 補助・後衛中央狙い (黄蘭 004, 白蓮 011)
     * B : 後列攻撃型 (ノア 008, プロセル 010)
     * R : 後列攻撃・通常時 (リフィエル 009 通常時)
     * R2: 前衛化・変身中 (リフィエル 009 必殺技発動中)
     * H : 後列回復型 (李乃果 005)
     */
    getRoleType(member) {
        const charId = (typeof member === 'string') ? member : member.charId;
        if (charId === '009') {
            return (typeof member === 'object' && member.isUltimateActive) ? 'R2' : 'R';
        }
        if (charId === '002' || charId === '006' || charId === '007') {
            return 'F'; // 蒼樹(002), さくら(006), ななよ(007)
        }
        if (charId === '003') {
            return 'F2'; // 紅華(003)
        }
        if (charId === '001') {
            return 'M'; // 紫苑(001)
        }
        if (charId === '004' || charId === '011') {
            return 'M2'; // 黄蘭(004), 白蓮(011)
        }
        if (charId === '008' || charId === '010') {
            return 'B'; // ノア(008), プロセル(010)
        }
        if (charId === '005') {
            return 'H'; // 李乃果(005)
        }
        return 'F';
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

            if (member.stunTimer > 0) {
                continue;
            }

            if (!this.charTimers.has(member)) {
                this.charTimers.set(member, {
                    ultCheckTimer: 1.0 + Math.random() * 2.0,
                    posCheckTimer: 0.5 + Math.random() * 0.5
                });
            }

            const timer = this.charTimers.get(member);
            const role = this.getRoleType(member);

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
                if (!member.isMarching) {
                    this._updatePositionAndLane(member, role, myTeam, opponents, isPlayerTeam, now);
                }
            }
        }
    }

    /** 必殺技の発動条件判定 */
    _checkUltimateCondition(member, role, myTeam, now, isPlayerTeam) {
        // ゲージ（リロードタイム）が100%になっていなければ撃てない
        if (member.ultimateCooldown > 0) return false;

        // R2(変身中)はすでに必殺技発動中
        if (role === 'R2') return false;

        const teamKey = isPlayerTeam ? 'player' : 'enemy';
        const isPvp = this.engine.isPvpBattle;
        const isBoss = this.engine.isBossBattle || (this.engine.enemies && this.engine.enemies.some(e => e.isBoss));

        // チーム内連射制限: 6秒以内に他のメンバーが必殺技を撃っていたら撃たない（コンビネーション発動含む）
        // ※H（後列回復型: 李乃果）は緊急回復のため対象外（味方が撃った直後でも撃てる）
        if (role !== 'H') {
            if (now - this.teamLastUltTime[teamKey] < 6.0) {
                return false;
            }
        }

        // 1. H（後列回復型: 李乃果）特有の回復トリガー
        if (role === 'H') {
            const aliveAllies = myTeam.filter(m => !m.isDead && m.hp > 0);
            if (aliveAllies.length <= 1) {
                // 自陣が1人きりの場合: 自身がHPの5%以上を失っていればあがいて回復！
                if (member.hp > member.maxHp * 0.95) return false;
            } else {
                // 味方の2人以上がHPの5%以上を失っていれば撃つ
                const damagedCount = aliveAllies.filter(m => m.hp <= m.maxHp * 0.95).length;
                if (damagedCount < 2) return false;
            }
            return true;
        }

        // 2. その他の戦闘タイプごとの発動条件判定
        if (isPvp || isBoss) {
            // 魔女戦 / PvP戦: ゲージがたまれば撃つ
            return true;
        } else {
            // ※雑魚戦: Z <= 20.0 の手前に生存している敵が12匹以上いるときに撃つ
            if (!this.engine.enemies) return false;
            const inRangeEnemies = this.engine.enemies.filter(e => !e.isDead && !e.isDying && e.hp > 0 && e.z <= 20.0).length;
            return inRangeEnemies >= 12;
        }
    }

    /** 必殺技の発動と移動処理 */
    _executeUltimate(member, role, now, myTeam, opponents, isPlayerTeam) {
        const teamKey = isPlayerTeam ? 'player' : 'enemy';
        this.teamLastUltTime[teamKey] = now;

        // 雑魚戦等での必殺技発動位置取り
        // F2: 1/2で前衛中央に向かって移動して撃とうとする。1/2で移動せずそのまま撃つ。
        // M2, B: 1/2で後衛中央に向かって移動して撃とうとする。1/2で移動せずそのまま撃つ。
        // F, M, R, H: 必殺技を撃つときに発動場所にこだわらず、どこでも撃つ
        let shouldMove = false;
        let targetFront = false;

        if (role === 'F2') {
            if (Math.random() < 0.5) {
                shouldMove = true;
                targetFront = true;
            }
        } else if (role === 'M2' || role === 'B') {
            if (Math.random() < 0.5) {
                shouldMove = true;
                targetFront = false;
            }
        }

        if (shouldMove) {
            this._swapLane(member, 0, myTeam, now, teamKey);
            this._swapFrontBack(member, targetFront, myTeam, isPlayerTeam, now);
        }

        // 必殺技の実行（BattleEngine の共通処理を通して友好度連携判定を行う）
        if (typeof member.triggerUltimate === 'function') {
            this.engine.triggerUltimate(member, false);
        } else {
            this.engine.floatingTexts.push({
                id: Math.random(),
                x: member.x, yOffset: 0.5, z: member.z,
                amount: "ULTIMATE!", type: "skill", lifeTime: 1.5, maxLife: 1.5
            });
        }
    }

    /** 前後列の移動およびスワップ（入れ替え）処理 */
    _swapFrontBack(member, targetIsFront, myTeam, isPlayerTeam, now = 0) {
        if (!member || member.isFront === targetIsFront) return;

        const memberTimer = this.charTimers.get(member);
        // クールダウン判定（直近1.5秒以内に入れ替えまたは前後移動したキャラは連続移動しない）
        if (memberTimer && memberTimer.lastFrontBackTime && (now - memberTimer.lastFrontBackTime < 1.5)) {
            return;
        }

        const frontZ = isPlayerTeam ? 6.0 : 9.0;
        const rearZ = isPlayerTeam ? 1.0 : 14.0;
        const targetZ = targetIsFront ? frontZ : rearZ;
        const currentZ = member.isFront ? frontZ : rearZ;

        // 同じレーンで移動先の列にすでにいる味方がいる場合、前後を入れ替える
        const currentLane = member.lane !== undefined ? member.lane : 0;
        const occupant = myTeam.find(m => m !== member && !m.isDead && m.lane === currentLane && m.isFront === targetIsFront);
        if (occupant) {
            occupant.isFront = member.isFront;
            occupant.targetZ = currentZ;

            const occupantTimer = this.charTimers.get(occupant);
            if (occupantTimer) {
                occupantTimer.lastFrontBackTime = now;
            }
        }

        member.isFront = targetIsFront;
        member.targetZ = targetZ;

        if (memberTimer) {
            memberTimer.lastFrontBackTime = now;
        }
    }

    /** レーン移動およびスワップ（入れ替え）処理 - 必ず隣接レーン(±1)との1ステップ入れ替えに制限 */
    _swapLane(member, targetLane, myTeam, now, teamKey) {
        const currentLane = member.lane !== undefined ? member.lane : 0;
        if (targetLane === currentLane) return;

        // 隣接レーン（±1）への1ステップ移動に制限（離れたレーンとの瞬間スワップを禁止）
        const step = targetLane > currentLane ? 1 : -1;
        const nextLane = Math.max(-2, Math.min(2, currentLane + step));
        if (nextLane === currentLane) return;

        // チーム人数が5人以下の場合は、前後列(isFront)が違っていても移動先レーンにいるキャラと左右スワップする
        // （6人以上の場合はレーン数が足りないため同列同士のみスワップ）
        const aliveTeam = myTeam.filter(m => !m.isDead && m.hp > 0);
        const occupant = aliveTeam.length <= 5
            ? myTeam.find(m => m !== member && !m.isDead && m.lane === nextLane)
            : myTeam.find(m => m !== member && !m.isDead && m.lane === nextLane && m.isFront === member.isFront);

        if (occupant) {
            occupant.lane = currentLane;
        }

        member.lane = nextLane;
        this.teamLastLaneMoveTime[teamKey] = now;
    }

    /** ランダムで左右どちらかの隣接レーンを確認し、誰もいないとそちらに移動する */
    _tryMoveToAdjacentEmptyLane(member, myTeam, now, teamKey) {
        const currentLane = member.lane !== undefined ? member.lane : 0;
        const dirs = Math.random() < 0.5 ? [-1, 1] : [1, -1];
        const aliveTeam = myTeam.filter(m => !m.isDead && m.hp > 0);
        const mustBeCompletelyEmpty = (aliveTeam.length <= 5);

        for (const d of dirs) {
            const targetLane = currentLane + d;
            if (targetLane >= -2 && targetLane <= 2) {
                // 5人以下の場合は前後列に関わらず誰もいない完全な空きレーンかチェック
                // 6人以上の場合は同列に誰もいないかチェック
                const isOccupied = mustBeCompletelyEmpty
                    ? myTeam.some(m => m !== member && !m.isDead && m.lane === targetLane)
                    : myTeam.some(m => m !== member && !m.isDead && m.lane === targetLane && m.isFront === member.isFront);

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
        const aliveTeam = myTeam.filter(m => !m.isDead && m.hp > 0);
        if (aliveTeam.length === 0) return;

        // ── A. 前衛 / 後衛の判定 ──
        let targetIsFront = member.isFront;

        // 1. 後衛に下がる条件:
        // 「他にメンバーがいて、HPが半分以下かつ全メンバーの中で最もHPが低くなると後列に下がる」
        // 対象: F, F2, M, M2, B, R, R2 (H以外)
        let isLowHpFallback = false;
        if (role !== 'H' && aliveTeam.length > 1) {
            const isHpHalfOrLess = member.hp <= (member.maxHp * 0.5);
            const isLowestHp = aliveTeam.every(m => m.hp >= member.hp);
            if (isHpHalfOrLess && isLowestHp) {
                isLowHpFallback = true;
            }
        }

        if (isLowHpFallback) {
            targetIsFront = false;
        } else {
            // 2. 前衛に出る条件判定
            // 他に前衛に味方がいるかどうか
            const hasOtherFrontAlly = aliveTeam.some(m => m !== member && m.isFront);
            const rearCount = aliveTeam.filter(m => !m.isFront).length;
            const rearRatio = rearCount / aliveTeam.length;

            let wantFront = false;

            if (role === 'F' || role === 'F2' || role === 'R2') {
                // F, F2, R2:
                // ・誰も前衛にいないと前衛に出る
                // ・メンバーの半分以上(>=50%)が後列にいると前衛に出る
                // ・基本的な配置は前衛
                wantFront = true;
            } else if (role === 'M' || role === 'M2') {
                // M, M2:
                // ・誰も前衛にいないと前衛に出る（自分が前衛で他に前衛がいなければ前衛をキープ）
                // ・メンバーの60%以上(>=60%)が後列にいると前衛に出る
                // ・前後位置は隊列設定で決められた位置に従う
                if (!hasOtherFrontAlly || rearRatio >= 0.6) {
                    wantFront = true;
                } else {
                    const defaultFront = member.initialIsFront !== undefined ? member.initialIsFront : false;
                    wantFront = defaultFront;
                }
            } else if (role === 'B') {
                // B:
                // ・誰も前衛にいないと前衛に出る（他に前衛がいなければ前に出る、他に前衛がいれば後衛へ）
                // ・基本的な配置は後衛
                if (!hasOtherFrontAlly) {
                    wantFront = true;
                } else {
                    wantFront = false; // 基本配置: 後衛
                }
            } else if (role === 'R' || role === 'H') {
                // R, H:
                // ・他のメンバーがいない(1人のみ)と前衛に出る
                // ・基本的な配置は後衛
                if (aliveTeam.length <= 1) {
                    wantFront = true;
                } else {
                    wantFront = false; // 基本配置: 後衛
                }
            }

            targetIsFront = wantFront;
        }

        // 前後移動の実行
        if (member.isFront !== targetIsFront) {
            this._swapFrontBack(member, targetIsFront, myTeam, isPlayerTeam, now);
        }

        // ── B. レーン移動の判定 ──
        // 共通ルール: 他のメンバーが1秒以内にレーン移動していたら移動しない (全タイプ共通)
        const canMoveLane = (now - this.teamLastLaneMoveTime[teamKey] >= 1.0);
        if (!canMoveLane) return;

        const currentLane = member.lane !== undefined ? member.lane : 0;
        const facingOpponent = opponents.find(p => {
            if (p.lane !== undefined) return p.lane === currentLane;
            return Math.abs(p.x - currentLane * 1.8) < 1.0;
        });

        // ── 後列にいる場合のレーン移動 ──
        if (!member.isFront) {
            // B, R, H: 「後列から動かない。右端か左端近いほうにレーン移動しようとする。」
            if (role === 'B' || role === 'R' || role === 'H') {
                const distToLeft = Math.abs(currentLane - (-2));
                const distToRight = Math.abs(currentLane - 2);
                const preferredLane = (distToLeft <= distToRight) ? -2 : 2;

                if (preferredLane !== currentLane) {
                    const step = preferredLane > currentLane ? 1 : -1;
                    const nextLane = currentLane + step;
                    this._swapLane(member, nextLane, myTeam, now, teamKey);
                    return;
                }
            }
            // 後列にいるときは他のレーン移動は行わない
            return;
        }

        // ── 前衛にいる場合のレーン移動 ──
        // 1. 「前衛にいるとき自分の正面に自分の属性の防御力の高い(属性値100未満)キャラクターが来たらレーンを移動する」
        // 対象: F, F2, M, M2, B, R, R2 (H以外)
        if (role !== 'H' && facingOpponent) {
            const defAttr = facingOpponent.attribute || 'red';
            const atkAttr = member.attribute || 'red';
            const defValue = ATTR_DEF[defAttr]?.[atkAttr] !== undefined ? ATTR_DEF[defAttr][atkAttr] : 100;
            if (defValue < 100) {
                // 属性耐性持ちを回避
                if (!this._tryMoveToAdjacentEmptyLane(member, myTeam, now, teamKey)) {
                    const adjacentCandidates = [currentLane - 1, currentLane + 1].filter(l => l >= -2 && l <= 2);
                    if (adjacentCandidates.length > 0) {
                        const targetLane = adjacentCandidates[Math.floor(Math.random() * adjacentCandidates.length)];
                        this._swapLane(member, targetLane, myTeam, now, teamKey);
                    }
                }
                return;
            }
        }

        // 2. 「前衛にいるとき、目の前に誰か（敵）がいたら左右どちらかのレーンへ移動する」
        // 対象: M, M2, B, R (近接戦闘を避けるタイプ)
        if (role === 'M' || role === 'M2' || role === 'B' || role === 'R') {
            if (facingOpponent) {
                if (!this._tryMoveToAdjacentEmptyLane(member, myTeam, now, teamKey)) {
                    const adjacentCandidates = [currentLane - 1, currentLane + 1].filter(l => l >= -2 && l <= 2);
                    if (adjacentCandidates.length > 0) {
                        const targetLane = adjacentCandidates[Math.floor(Math.random() * adjacentCandidates.length)];
                        this._swapLane(member, targetLane, myTeam, now, teamKey);
                    }
                }
                return;
            }
        }

        // 3. 「前列にいるとき敵の前列にいるキャラクターが自分の属性の防御力の高い(属性値100未満)キャラクターでなければその正面に移動する」
        // 対象: F, F2, R2 (案AによりM, M2は除外)
        if (role === 'F' || role === 'F2' || role === 'R2') {
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
                    const step = targetLane > currentLane ? 1 : -1;
                    this._swapLane(member, currentLane + step, myTeam, now, teamKey);
                    return;
                }
            }

            // 4. 「ランダムで左右どちらかのレーンを確認し、誰もいないとそちらに移動する」
            // 対象: F, F2, R2
            if (Math.random() < 0.35) {
                this._tryMoveToAdjacentEmptyLane(member, myTeam, now, teamKey);
            }
        }
    }
}
