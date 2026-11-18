/**
 * FairyTradeManager.js
 * 🧚‍♀️ 妖精リフィエルとの異次元取引（リワード広告）モーダル
 * - 各取引は12時間に1回のみ利用可能
 */
import { GlobalState } from './GlobalState.js';
import { SaveManager } from './SaveManager.js';
import { RewardService } from './RewardService.js';
import { AchievementManager } from './AchievementManager.js';

export const FAIRY_TRADE_COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12時間

export class FairyTradeManager {
    /**
     * 日本時間 (JST, UTC+9) の現在日付文字列 (YYYY-MM-DD) を取得
     */
    static getTodayKeyJST() {
        const now = new Date();
        const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
        const y = jst.getUTCFullYear();
        const m = String(jst.getUTCMonth() + 1).padStart(2, '0');
        const d = String(jst.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    /**
     * 日本時間 (JST) の次の午前0時までの残りミリ秒を取得
     */
    static getMsUntilNextMidnightJST() {
        const now = new Date();
        const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
        const nextMidnight = new Date(Date.UTC(
            jst.getUTCFullYear(),
            jst.getUTCMonth(),
            jst.getUTCDate() + 1,
            0, 0, 0
        ));
        return Math.max(0, nextMidnight.getTime() - jst.getTime());
    }

    /**
     * 本日 (JST 0:00基準) すでに利用済みかどうか判定
     */
    static isTradeUsedToday(key) {
        const gs = GlobalState.getInstance();
        if (!gs.fairyTradeUsage) gs.fairyTradeUsage = {};
        const today = this.getTodayKeyJST();
        return gs.fairyTradeUsage[key] === today;
    }

    /**
     * 残りクールタイム（ミリ秒）を取得（利用済みなら次の0時までの時間）
     */
    static getTradeRemainingMs(key) {
        if (!this.isTradeUsedToday(key)) return 0;
        return this.getMsUntilNextMidnightJST();
    }

    /**
     * 取引利用を記録 (本日利用済みにする)
     */
    static recordTrade(key) {
        const gs = GlobalState.getInstance();
        if (!gs.fairyTradeUsage) gs.fairyTradeUsage = {};
        gs.fairyTradeUsage[key] = this.getTodayKeyJST();
        try {
            SaveManager.saveGame();
        } catch (e) {}
    }

    /**
     * 残り時間のフォーマット表示 (例: "あと 11h24m")
     */
    static formatRemainingTime(ms) {
        const totalSec = Math.ceil(ms / 1000);
        const hours = Math.floor(totalSec / 3600);
        const mins = Math.floor((totalSec % 3600) / 60);
        return `あと ${hours}h${String(mins).padStart(2, '0')}m`;
    }

    /**
     * 取引モーダルを表示
     */
    static showTradeModal(scene) {
        const { width, height } = scene.scale;

        const container = scene.add.container(0, 0).setDepth(21000).setScrollFactor(0);

        // 背景暗幕
        const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.82)
            .setInteractive();
        container.add(overlay);

        // モーダル枠 (縦幅を広げて全5項目+VIP案内を収める)
        const modalW = 460;
        const modalH = 720;
        const bg = scene.add.graphics();
        bg.fillStyle(0x121526, 0.98);
        bg.fillRoundedRect(width / 2 - modalW / 2, height / 2 - modalH / 2, modalW, modalH, 18);
        bg.lineStyle(2.5, 0x88bbff, 0.9);
        bg.strokeRoundedRect(width / 2 - modalW / 2, height / 2 - modalH / 2, modalW, modalH, 18);
        container.add(bg);

        // リフィエルアイコン (fairyS.png)
        if (scene.textures.exists('chr_fairy_s')) {
            const icon = scene.add.image(width / 2, height / 2 - 275, 'chr_fairy_s')
                .setScale(0.60);
            container.add(icon);
        }

        // タイトル
        const title = scene.add.text(width / 2, height / 2 - 215, '🧚‍♀️ 妖精リフィエルとの取引', {
            fontFamily: 'sans-serif', fontSize: '21px', fontStyle: 'bold', color: '#ffee88'
        }).setOrigin(0.5);
        container.add(title);

        const subTitle = scene.add.text(width / 2, height / 2 - 188, '「ほんの少し、世界の法則をお借りしますね（0時更新・各1日1回）」', {
            fontFamily: 'sans-serif', fontSize: '12px', color: '#aaccff'
        }).setOrigin(0.5);
        container.add(subTitle);

        const gs = GlobalState.getInstance();
        const hasVIP = !!(gs && gs.hasNoAdsPass);

        // 取引ボタン作成ヘルパー
        const createTradeBtn = (y, tradeKey, label, desc, onClick) => {
            const isCooldown = this.isTradeUsedToday(tradeKey);
            const remainingMs = isCooldown ? this.getMsUntilNextMidnightJST() : 0;

            const btnContainer = scene.add.container(width / 2, y);

            const btnBg = scene.add.rectangle(0, 0, modalW - 50, 60, isCooldown ? 0x1c1e2e : 0x243258, 0.95)
                .setStrokeStyle(1.5, isCooldown ? 0x3d4458 : (hasVIP ? 0xffcc44 : 0x6699ff))
                .setInteractive({ useHandCursor: !isCooldown });

            const btnLabel = scene.add.text(-modalW / 2 + 40, -11, label, {
                fontFamily: 'sans-serif', fontSize: '15px', fontStyle: 'bold',
                color: isCooldown ? '#777788' : '#ffeeaa'
            }).setOrigin(0, 0.5);

            const btnDesc = scene.add.text(-modalW / 2 + 40, 12, desc, {
                fontFamily: 'sans-serif', fontSize: '11px',
                color: isCooldown ? '#555566' : '#bbccdd'
            }).setOrigin(0, 0.5);

            let badgeText = '🎬 広告';
            let badgeColor = '#ffea00';
            let badgeBg = '#443300aa';

            if (isCooldown) {
                badgeText = this.formatRemainingTime(remainingMs);
                badgeColor = '#888899';
                badgeBg = '#1a1a24';
            } else if (hasVIP) {
                badgeText = '✨ VIP即時';
                badgeColor = '#ffffff';
                badgeBg = '#886600cc';
            }

            const adBadge = scene.add.text(modalW / 2 - 50, 0, badgeText, {
                fontFamily: 'sans-serif', fontSize: isCooldown ? '12px' : '13px', fontStyle: 'bold',
                color: badgeColor,
                backgroundColor: badgeBg,
                padding: { x: 7, y: 3 }
            }).setOrigin(0.5);

            if (!isCooldown) {
                btnBg.on('pointerdown', () => {
                    container.destroy();
                    onClick();
                });
            }

            btnContainer.add([btnBg, btnLabel, btnDesc, adBadge]);
            container.add(btnContainer);
        };

        const startBtnY = height / 2 - 135;
        const btnSpacing = 68;

        // 1. WLVをひとつ上げる
        createTradeBtn(
            startBtnY,
            'wlv',
            '⚔️ 武器熟練度(WLV)をひとつ上げる',
            '任意の仲間の近接または遠隔熟練度を+1',
            () => this._selectCharForWlv(scene)
        );

        // 2. レベルをひとつあげる
        createTradeBtn(
            startBtnY + btnSpacing,
            'level',
            '⭐ レベルをひとつ上げる',
            '任意の仲間を直接1レベルアップ',
            () => this._selectCharForLevel(scene)
        );

        // 3. デイリーガチャをもう一回引く
        createTradeBtn(
            startBtnY + btnSpacing * 2,
            'gacha',
            '🎁 デイリーガチャをもう1回引く',
            'デイリー報酬ルーレットの挑戦権を+1',
            () => this._tradeDailyGacha(scene)
        );

        // 4. マップ上のすべての敵、魔女レベルを1上げる
        createTradeBtn(
            startBtnY + btnSpacing * 3,
            'boostEnemies',
            '😈 敵と魔女のレベルを1上げる',
            '「そんなことすると地上が地獄になっちゃいますよ！ほんとに⁉」',
            () => this._tradeBoostEnemies(scene)
        );

        // 5. 食料を140にする
        createTradeBtn(
            startBtnY + btnSpacing * 4,
            'refillFood',
            '🍞 食料を140にする',
            '夜の食料切れやガチ周回に。食料を満タン(140)まで完全補給',
            () => this._tradeRefillFood(scene)
        );

        // ✨ 妖精の祝福（広告スキップ永年パス）エリア
        const vipY = startBtnY + btnSpacing * 5 - 4;
        const vipBg = scene.add.rectangle(width / 2, vipY, modalW - 50, 52, hasVIP ? 0x221c38 : 0x1a2638, 0.95)
            .setStrokeStyle(1.5, hasVIP ? 0xffdd66 : 0x4488ff)
            .setInteractive({ useHandCursor: true });

        const vipTitle = scene.add.text(width / 2 - modalW / 2 + 40, vipY - 10,
            hasVIP ? '✨ 妖精の祝福：発動中（広告全スキップ）' : '✨ 妖精の祝福：広告スキップ永年パス', {
            fontFamily: 'sans-serif', fontSize: '14px', fontStyle: 'bold',
            color: hasVIP ? '#ffe588' : '#88ddff'
        }).setOrigin(0, 0.5);

        const vipDesc = scene.add.text(width / 2 - modalW / 2 + 40, vipY + 11,
            hasVIP ? 'タロット・合成引き直し含む全特典を広告なしで即時受取（各1日1回）' : '￥500（買い切り）で全取引の広告視聴を永久スキップ', {
            fontFamily: 'sans-serif', fontSize: '10px',
            color: hasVIP ? '#bbcc99' : '#99bbdd'
        }).setOrigin(0, 0.5);

        const vipActionText = hasVIP ? '解除(TEST)' : '有効化(TEST)';
        const vipActionBadge = scene.add.text(width / 2 + modalW / 2 - 50, vipY, vipActionText, {
            fontFamily: 'sans-serif', fontSize: '11px', fontStyle: 'bold',
            color: hasVIP ? '#888899' : '#ffee44',
            backgroundColor: hasVIP ? '#111122' : '#223355',
            padding: { x: 6, y: 3 }
        }).setOrigin(0.5);

        vipBg.on('pointerdown', () => {
            gs.hasNoAdsPass = !gs.hasNoAdsPass;
            try { SaveManager.saveGame(); } catch (e) {}
            container.destroy();
            this.showTradeModal(scene);
        });

        container.add([vipBg, vipTitle, vipDesc, vipActionBadge]);

        // 補足説明
        const noteText = scene.add.text(width / 2, height / 2 + modalH / 2 - 62,
            '※タロット選び直し・レリクス合成引き直しも1日1回ご利益を受けられます', {
            fontFamily: 'sans-serif', fontSize: '11px', color: '#778899'
        }).setOrigin(0.5);
        container.add(noteText);

        // 閉じるボタン
        const closeBtn = scene.add.text(width / 2, height / 2 + modalH / 2 - 28, '閉じる', {
            fontFamily: 'sans-serif', fontSize: '15px', color: '#aaaaaa',
            backgroundColor: '#222233', padding: { x: 28, y: 6 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        closeBtn.on('pointerdown', () => container.destroy());
        container.add(closeBtn);
    }

    /**
     * WLVアップ対象のキャラ選択モーダル
     */
    static _selectCharForWlv(scene) {
        this._showCharSelectModal(scene, '熟練度を上げるキャラクターを選択', (charId) => {
            const gs = GlobalState.getInstance();
            const char = gs.characters[charId];
            if (!char) return;

            RewardService.showRewardAd(scene, {
                title: 'WLV上昇の儀式',
                rewardDescription: `${char.name} の武器熟練度(WLV) +1`,
                onReward: () => {
                    this.recordTrade('wlv');

                    // 近接か遠隔の低い方を上げる（同じなら近接優先）
                    if ((char.meleeLevel || 1) <= (char.rangedLevel || 1)) {
                        char.meleeLevel = Math.min(7, (char.meleeLevel || 1) + 1);
                    } else {
                        char.rangedLevel = Math.min(7, (char.rangedLevel || 1) + 1);
                    }

                    AchievementManager.checkCharacterAchievements(scene);
                    SaveManager.saveGame();
                    if (scene.showToast) {
                        scene.showToast(`✨ ${char.name}の熟練度が上昇！ (近接:Lv${char.meleeLevel} / 遠隔:Lv${char.rangedLevel})`);
                    }
                }
            });
        });
    }

    /**
     * レベルアップ対象のキャラ選択モーダル
     */
    static _selectCharForLevel(scene) {
        this._showCharSelectModal(scene, 'レベルを上げるキャラクターを選択', (charId) => {
            const gs = GlobalState.getInstance();
            const char = gs.characters[charId];
            if (!char) return;

            RewardService.showRewardAd(scene, {
                title: '成長の奇跡',
                rewardDescription: `${char.name} のレベル +1`,
                onReward: () => {
                    this.recordTrade('level');

                    const oldStats = gs.calcStats(charId);
                    char.level = (char.level || 1) + 1;
                    const newStats = gs.calcStats(charId);

                    if (newStats && oldStats) {
                        char.currentHp += Math.max(0, newStats.maxHp - oldStats.maxHp);
                        char.currentSp += Math.max(0, newStats.maxSp - oldStats.maxSp);
                    }

                    AchievementManager.checkCharacterAchievements(scene);
                    SaveManager.saveGame();
                    if (scene.showToast) {
                        scene.showToast(`🎉 ${char.name}がレベルアップ！ (Lv.${char.level})`);
                    }
                }
            });
        });
    }

    /**
     * デイリーガチャ+1
     */
    static _tradeDailyGacha(scene) {
        RewardService.showRewardAd(scene, {
            title: '運命の再抽選',
            rewardDescription: 'デイリーガチャの挑戦回数 +1',
            onReward: () => {
                const gs = GlobalState.getInstance();
                this.recordTrade('gacha');
                gs.extraDailyGachaCount = (gs.extraDailyGachaCount || 0) + 1;
                SaveManager.saveGame();
                if (scene.showToast) {
                    scene.showToast('🎁 デイリーガチャの追加権利を獲得しました！');
                }
                if (scene.dailyRewardBtn && scene.dailyRewardBtn.updateStatus) {
                    scene.dailyRewardBtn.updateStatus();
                }
            }
        });
    }

    /**
     * 😈 マップ上のすべての敵・魔女レベルを+1
     */
    static _tradeBoostEnemies(scene) {
        RewardService.showRewardAd(scene, {
            title: '狂気の世界変革',
            rewardDescription: 'マップ上の全エネミー＆魔女レベル +1',
            onReward: () => {
                this.recordTrade('boostEnemies');

                // 敵のベースレベル上昇
                if (scene.globalEnemyLevel !== undefined) {
                    scene.globalEnemyLevel += 1;
                }

                // マップ上の全ヘクスに存在する敵・魔女のレベルを加算
                let boostedCount = 0;
                if (scene.grid && Array.isArray(scene.grid)) {
                    for (const row of scene.grid) {
                        if (!row) continue;
                        for (const hex of row) {
                            if (hex && hex.cellData) {
                                if (hex.cellData.enemyLevel > 0) {
                                    hex.cellData.enemyLevel += 1;
                                    boostedCount++;
                                }
                                if (hex.cellData.witchLevel > 0) {
                                    hex.cellData.witchLevel += 1;
                                }
                            }
                        }
                    }
                }

                // マップ上の敵レベル表示・状態を更新
                if (typeof scene.updateVisibility === 'function') {
                    scene.updateVisibility();
                }

                SaveManager.saveGame();
                if (scene.showToast) {
                    scene.showToast('😈 世界の敵と魔女のレベルが+1された！地獄の始まりです…！');
                }
            }
        });
    }

    /**
     * 🍞 食料を140満タンにする
     */
    static _tradeRefillFood(scene) {
        RewardService.showRewardAd(scene, {
            title: '奇跡の食料補給',
            rewardDescription: '食料を140（最大値）まで完全補給',
            onReward: () => {
                const gs = GlobalState.getInstance();
                this.recordTrade('refillFood');

                gs.food = 140;

                if (typeof scene._updateFoodDisplay === 'function') {
                    scene._updateFoodDisplay();
                }

                SaveManager.saveGame();
                if (scene.showToast) {
                    scene.showToast('🍞 異次元から食料が届いた！(食料: 140)');
                }
            }
        });
    }

    /**
     * キャラクター選択汎用モーダル
     */
    static _showCharSelectModal(scene, titleText, onSelected) {
        const gs = GlobalState.getInstance();
        const { width, height } = scene.scale;

        const container = scene.add.container(0, 0).setDepth(22000).setScrollFactor(0);

        const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8)
            .setInteractive();
        container.add(overlay);

        // 現在パーティに編成されている（同行中の）キャラクターのみを抽出（未遭遇・未加入キャラは除外）
        let partyIds = [];
        if (scene && Array.isArray(scene.party) && scene.party.length > 0) {
            partyIds = scene.party;
        } else if (gs.savedFormation && Object.keys(gs.savedFormation).length > 0) {
            partyIds = Object.keys(gs.savedFormation);
        } else if (Array.isArray(gs.normalParty) && gs.normalParty.length > 0) {
            partyIds = gs.normalParty;
        } else {
            partyIds = ['001'];
        }

        const charIds = partyIds
            .map(id => gs.normalizeCharId ? gs.normalizeCharId(id) : id)
            .filter((id, index, self) => self.indexOf(id) === index) // 重複除外
            .filter(id => {
                const char = gs.characters[id];
                if (!char || char.isLost) return false;
                // パーティに編成中なので同行・加入フラグを保証
                char.hasAccompanied = true;
                char.isJoined = true;
                return true;
            });

        // 万が一パーティが空だった場合のフォールバック（紫苑）
        if (charIds.length === 0 && gs.characters['001']) {
            charIds.push('001');
        }

        const itemH = 55;
        const modalW = 440;
        const modalH = Math.max(220, Math.min(500, 130 + charIds.length * itemH));

        const bg = scene.add.graphics();
        bg.fillStyle(0x16182a, 0.98);
        bg.fillRoundedRect(width / 2 - modalW / 2, height / 2 - modalH / 2, modalW, modalH, 16);
        bg.lineStyle(2, 0x88aaff, 0.9);
        bg.strokeRoundedRect(width / 2 - modalW / 2, height / 2 - modalH / 2, modalW, modalH, 16);
        container.add(bg);

        const title = scene.add.text(width / 2, height / 2 - modalH / 2 + 32, titleText, {
            fontFamily: 'sans-serif', fontSize: '18px', fontStyle: 'bold', color: '#ffea00'
        }).setOrigin(0.5);
        container.add(title);

        const startY = height / 2 - modalH / 2 + 75;

        charIds.forEach((id, idx) => {
            const char = gs.characters[id];
            const y = startY + idx * itemH;

            const rowBg = scene.add.rectangle(width / 2, y, modalW - 50, itemH - 8, 0x222840, 0.9)
                .setStrokeStyle(1, 0x556688)
                .setInteractive({ useHandCursor: true });

            if (scene.textures.exists(`face_${id}`)) {
                const face = scene.add.image(width / 2 - modalW / 2 + 55, y, `face_${id}`)
                    .setDisplaySize(38, 38);
                container.add(face);
            }

            const stats = gs.calcStats ? gs.calcStats(id, partyIds) : null;
            const charLvlBonus = stats ? (stats.charLevelBonus || 0) : 0;
            const effectiveLvl = (char.level || 1) + charLvlBonus;
            const lvlText = charLvlBonus > 0 ? `Lv.${effectiveLvl}(+${charLvlBonus})` : `Lv.${char.level || 1}`;

            const name = scene.add.text(width / 2 - modalW / 2 + 90, y, `${char.name} (${lvlText})`, {
                fontFamily: 'sans-serif', fontSize: '15px', color: '#ffffff', fontStyle: 'bold'
            }).setOrigin(0, 0.5);

            const info = scene.add.text(width / 2 + modalW / 2 - 50, y, `WLV: ${char.meleeLevel || 1}/${char.rangedLevel || 1}`, {
                fontFamily: 'sans-serif', fontSize: '14px', color: '#aaccff'
            }).setOrigin(1, 0.5);

            rowBg.on('pointerdown', () => {
                container.destroy();
                onSelected(id);
            });

            container.add([rowBg, name, info]);
        });

        const cancelBtn = scene.add.text(width / 2, height / 2 + modalH / 2 - 30, 'キャンセル', {
            fontFamily: 'sans-serif', fontSize: '15px', color: '#aaaaaa',
            backgroundColor: '#222233', padding: { x: 20, y: 6 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        cancelBtn.on('pointerdown', () => container.destroy());
        container.add(cancelBtn);
    }
}
