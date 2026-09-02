import Phaser from 'phaser';
import { GlobalState } from '../systems/GlobalState';
import { SaveManager } from '../systems/SaveManager';
import { TransitionManager } from '../systems/TransitionManager';
import { FONT_MAIN } from '../config/GameFont';
import { DOJO_SUBJECTS, initCharacterDojo, getDojoTrainCost, performDojoTraining } from '../data/dojoData';

/** 漢数字の段位名ヘルパー */
function getDanName(stage) {
    const danMap = { 1: '初段', 2: '二段', 3: '三段', 4: '四段', 5: '五段' };
    return danMap[stage] || `${stage}段`;
}

/**
 * 魔法少女強化プログラム (道場画面)
 */
export default class DojoScene extends Phaser.Scene {
    constructor() {
        super('DojoScene');
        this.selectedCharId = null;
        this.selectedDept = 'A';
    }

    init(data) {
        this.selectedCharId = (data && data.charId) ? data.charId : null;
        this.selectedDept = 'A';
    }

    create() {
        TransitionManager.fadeIn(this);
        const { width, height } = this.scale;
        const gs = GlobalState.getInstance();

        // 1. 全面暗色背景
        this.add.rectangle(0, 0, width, height, 0x121016).setOrigin(0, 0);

        // 2. メインコンテナ
        this.mainContainer = this.add.container(0, 0);

        // 3. デバッグキー (Lキー: EXP 50000 + SP 50000)
        if (GlobalState.IS_DEBUG_MODE) {
            this.input.keyboard.on('keydown-L', () => {
                const addedExp = gs.addDirectStockExp(50000);
                gs.stockSp = (gs.stockSp || 0) + 50000;
                SaveManager.saveGame(this);
                const toast = this.add.text(width / 2, 50, `[DEBUG] 経験値 +${addedExp.toLocaleString()} / SP +50,000 付与！`, {
                    fontFamily: FONT_MAIN,
                    fontSize: '16px',
                    fontStyle: 'bold',
                    color: '#ffffaa',
                    backgroundColor: '#000000dd',
                    padding: { x: 12, y: 6 }
                }).setOrigin(0.5).setDepth(99999);
                this.time.delayedCall(2000, () => toast.destroy());
                this.drawScene();
            });
        }

        this.drawScene();
    }

    drawScene() {
        this.mainContainer.removeAll(true);
        const { width, height } = this.scale;
        const gs = GlobalState.getInstance();

        // ── 上部バナー (dojo.jpg: 道着プロセル) ──
        const bannerH = this.selectedCharId ? Math.min(height * 0.14, 115) : Math.min(height * 0.22, 170);
        const banner = this.add.image(width / 2, bannerH / 2, 'dojo_banner').setOrigin(0.5, 0.5);
        const bannerScale = Math.max(width / banner.width, bannerH / banner.height);
        banner.setScale(bannerScale);
        this.mainContainer.add(banner);

        // バナー下部のグラデーション影
        const shadow = this.add.rectangle(width / 2, bannerH - 8, width, 16, 0x000000, 0.8).setOrigin(0.5, 0.5);
        this.mainContainer.add(shadow);

        // ── ヘッダーバー（所持SP ＆ 戻るボタン） ──
        const headerY = 24;

        // 戻るボタン
        const backBtn = this.add.text(14, headerY, '◀ 戻る', {
            fontFamily: FONT_MAIN,
            fontSize: '16px',
            color: '#ffffff',
            backgroundColor: '#00000099',
            padding: { x: 12, y: 6 }
        }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

        backBtn.on('pointerdown', () => {
            if (this.selectedCharId) {
                this.selectedCharId = null;
                this.drawScene();
            } else {
                TransitionManager.transitionTo(this, 'AdventureScene', {
                    isTower: gs.isTowerMode || false
                });
            }
        });
        this.mainContainer.add(backBtn);

        // 所持SP ＆ 周回時喪失SP 表示
        const spContainer = this.add.container(width - 14, headerY);
        const spText = this.add.text(0, -10, `所持SP: ${Math.floor(gs.stockSp || 0).toLocaleString()}`, {
            fontFamily: FONT_MAIN,
            fontSize: '13px',
            color: '#00ffff',
            fontStyle: 'bold',
            backgroundColor: '#00000099',
            padding: { x: 8, y: 3 }
        }).setOrigin(1, 0.5);

        const lostSpText = this.add.text(0, 12, `周回時喪失SP: ${Math.floor(gs.devilStockSp || 0).toLocaleString()}`, {
            fontFamily: FONT_MAIN,
            fontSize: '13px',
            color: '#ff99cc',
            fontStyle: 'bold',
            backgroundColor: '#00000099',
            padding: { x: 8, y: 3 }
        }).setOrigin(1, 0.5);

        spContainer.add([spText, lostSpText]);
        this.mainContainer.add(spContainer);

        // ── 画面の描画（キャラ選択 or 個別訓練メニュー） ──
        if (!this.selectedCharId) {
            this.drawCharacterSelect(bannerH);
        } else {
            this.drawTrainingMenu(bannerH);
        }
    }

    /**
     * ① キャラクター選択ビュー
     */
    drawCharacterSelect(topY) {
        const { width, height } = this.scale;
        const gs = GlobalState.getInstance();

        // タイトル見出し（バナーの下にしっかり余白を取って配置）
        const titleY = topY + 28;
        const titleText = this.add.text(width / 2, titleY, '誰を強化する？', {
            fontFamily: FONT_MAIN,
            fontSize: '22px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4,
            shadow: { offsetX: 1, offsetY: 2, color: '#000000', blur: 4, fill: true }
        }).setOrigin(0.5, 0.5);
        this.mainContainer.add(titleText);

        // 出会ったことのある全キャラを取得
        const eligibleCharIds = ['001', '002', '003', '004', '005', '007', '008', '009', '010', '011'];
        const availableChars = [];
        for (const cid of eligibleCharIds) {
            const c = gs.characters[cid];
            if (c && (c.hasAccompanied || c.isJoined || (c.metCharacters && c.metCharacters.length > 0) || cid === '001' || GlobalState.IS_DEBUG_MODE)) {
                availableChars.push(c);
            }
        }

        // キャラグリッド描画 (横4枚並び、画面幅の1/5サイズ)
        const cols = 4;
        const faceTargetSize = width / 5; // 画面横幅の 1/5 の大きさ (約108px)
        const colWidth = width / cols;   // 1列の幅
        const cellH = faceTargetSize + 48; // 顔画像 + 名前 + 訓練回数
        const startY = titleY + 36 + faceTargetSize / 2;

        availableChars.forEach((c, idx) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const x = colWidth * col + colWidth / 2;
            const y = startY + row * cellH;

            const charContainer = this.add.container(x, y);

            // 背景パネル枠
            const bgBoxW = colWidth - 8;
            const bgBoxH = cellH - 6;
            const bg = this.add.rectangle(0, 0, bgBoxW, bgBoxH, 0x1d1929, 0.9)
                .setStrokeStyle(1.5, 0x48415c)
                .setInteractive({ useHandCursor: true });
            charContainer.add(bg);

            // 顔画像（横幅の 1/5 サイズに縮小）
            const faceKey = `face_${c.id}`;
            if (this.textures.exists(faceKey)) {
                const face = this.add.image(0, -20, faceKey);
                const scale = (faceTargetSize * 0.85) / Math.max(face.width, face.height);
                face.setScale(scale);
                charContainer.add(face);
            }

            // キャラ名（影付き＆縁取り）
            const nameText = this.add.text(0, (faceTargetSize * 0.85) / 2 - 14, c.name, {
                fontFamily: FONT_MAIN,
                fontSize: '13px',
                color: '#ffffff',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3,
                shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 3, fill: true }
            }).setOrigin(0.5, 0.5);
            charContainer.add(nameText);

            // 訓練回数
            const dojo = initCharacterDojo(c);
            const trainInfo = this.add.text(0, (faceTargetSize * 0.85) / 2 + 5, `訓練: ${dojo.totalTrainCount}回`, {
                fontFamily: FONT_MAIN,
                fontSize: '11px',
                color: '#ffcc66',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0.5, 0.5);
            charContainer.add(trainInfo);

            bg.on('pointerdown', () => {
                this.selectedCharId = c.id;
                this.drawScene();
            });

            bg.on('pointerover', () => bg.setStrokeStyle(2, 0x00ffff));
            bg.on('pointerout', () => bg.setStrokeStyle(1.5, 0x48415c));

            this.mainContainer.add(charContainer);
        });
    }

    /**
     * ② 個別訓練メニュー
     */
    drawTrainingMenu(topY) {
        const { width, height } = this.scale;
        const gs = GlobalState.getInstance();
        const charData = gs.characters[this.selectedCharId];
        if (!charData) return;

        const dojo = initCharacterDojo(charData);
        const cost = getDojoTrainCost(charData);

        // ── キャラヘッダー ──
        const charHeaderY = topY + 20;
        const faceKey = `face_${charData.id}`;
        if (this.textures.exists(faceKey)) {
            const face = this.add.image(42, charHeaderY, faceKey).setScale(0.36).setOrigin(0.5, 0.5);
            this.mainContainer.add(face);
        }

        const charTitle = this.add.text(78, charHeaderY - 9, `${charData.name}`, {
            fontFamily: FONT_MAIN,
            fontSize: '18px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0, 0.5);
        this.mainContainer.add(charTitle);

        const trainCountText = this.add.text(78, charHeaderY + 11, `累計訓練: ${dojo.totalTrainCount}回  (次回費用: ${cost} SP)`, {
            fontFamily: FONT_MAIN,
            fontSize: '13px',
            color: '#ffcc00',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0, 0.5);
        this.mainContainer.add(trainCountText);

        // 問いかけ見出し（特大サイズ: 22px）
        const promptY = charHeaderY + 34;
        const promptText = this.add.text(width / 2, promptY, 'どの学科の訓練をする？', {
            fontFamily: FONT_MAIN,
            fontSize: '22px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4,
            shadow: { offsetX: 1, offsetY: 2, color: '#000000', blur: 4, fill: true }
        }).setOrigin(0.5, 0.5);
        this.mainContainer.add(promptText);

        // ── 学科パネル（2列2行・シンプル特大表記「WAZA 初段」） ──
        const deptKeys = ['A', 'B', 'C', 'D'];
        const gridW = (width - 24) / 2; // 2列の幅 (約258px)
        const gridH = 48;
        const gridStartY = promptY + 26;

        deptKeys.forEach((key, idx) => {
            const dept = DOJO_SUBJECTS[key];
            const deptState = dojo.subjects[key];
            const isSelected = (this.selectedDept === key);
            const isLocked = (key !== 'A' && !dojo.kisoCompleted);

            const col = idx % 2;
            const row = Math.floor(idx / 2);
            const btnX = 12 + col * gridW + gridW / 2;
            const btnY = gridStartY + row * (gridH + 6) + gridH / 2;

            let bgColor = isSelected ? 0x552885 : (isLocked ? 0x161622 : 0x27243a);
            let strokeColor = isSelected ? 0x00ffff : (isLocked ? 0x333344 : 0x5e567a);

            const tabBg = this.add.rectangle(btnX, btnY, gridW - 6, gridH, bgColor, 0.95)
                .setStrokeStyle(isSelected ? 2.5 : 1, strokeColor)
                .setInteractive({ useHandCursor: !isLocked });

            // 短縮学科名 (KISO, WAZA, KOKORO, KARADA)
            const shortName = dept.name.replace('学科', '');

            // 表示ラベル（例:「WAZA 初段 (2/5)」「KISO 修了」「WAZA 皆伝」）
            let mainLabel = '';
            let progressLabel = '';
            if (key === 'A') {
                mainLabel = dojo.kisoCompleted ? `${shortName} 修了` : `${shortName} 初段`;
                progressLabel = dojo.kisoCompleted ? '✔' : `(${deptState.learned.length}/5)`;
            } else {
                if (isLocked) {
                    mainLabel = `${shortName} 🔒`;
                    progressLabel = '封印';
                } else if (deptState.stage > dept.maxStage) {
                    mainLabel = `${shortName} 皆伝`;
                    progressLabel = '★';
                } else {
                    mainLabel = `${shortName} ${getDanName(deptState.stage)}`;
                    progressLabel = `(${deptState.learned.length}/5)`;
                }
            }

            // 学科名＋段位（特大フォント 18px）
            const tabText = this.add.text(btnX - 16, btnY, mainLabel, {
                fontFamily: FONT_MAIN,
                fontSize: '18px',
                color: isSelected ? '#ffffff' : (isLocked ? '#666677' : '#f0f0f0'),
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5, 0.5);

            // 進捗状況 (13px)
            const tabSub = this.add.text(btnX + gridW / 2 - 16, btnY, progressLabel, {
                fontFamily: FONT_MAIN,
                fontSize: '13px',
                color: isSelected ? '#00ffff' : (isLocked ? '#555566' : '#ffcc00'),
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(1, 0.5);

            if (!isLocked) {
                tabBg.on('pointerdown', () => {
                    this.selectedDept = key;
                    this.drawScene();
                });
            }

            this.mainContainer.add([tabBg, tabText, tabSub]);
        });

        const selectedDeptDef = DOJO_SUBJECTS[this.selectedDept];
        const selectedDeptState = dojo.subjects[this.selectedDept];
        const isCurrentLocked = (this.selectedDept !== 'A' && !dojo.kisoCompleted);
        const isMaxStage = (this.selectedDept !== 'A' && selectedDeptState.stage > selectedDeptDef.maxStage);
        const isACompleted = (this.selectedDept === 'A' && dojo.kisoCompleted);
        const totalAvailableSp = (gs.stockSp || 0) + (gs.devilStockSp || 0);
        const canTrain = !isCurrentLocked && !isMaxStage && !isACompleted && (totalAvailableSp >= cost);

        const listStartY = gridStartY + (gridH + 6) * 2 + 10;
        const rowH = 84; // さらに縦に広げた高さ (84px)

        selectedDeptDef.subjects.forEach((subj, idx) => {
            const rowY = listStartY + idx * rowH + rowH / 2;
            const isLearned = selectedDeptState.learned.includes(subj.id);

            const rowBg = this.add.rectangle(width / 2, rowY, width - 24, rowH - 8, isLearned ? 0x16151f : 0x2b2740, isLearned ? 0.35 : 0.95)
                .setStrokeStyle(1.5, isLearned ? 0x2e2c3d : 0x605882)
                .setInteractive({ useHandCursor: canTrain });

            this.mainContainer.add(rowBg);

            // 科目名 (特大表示: 19px)
            const subjName = this.add.text(26, rowY - 16, subj.name, {
                fontFamily: FONT_MAIN,
                fontSize: '19px',
                color: isLearned ? '#666677' : '#ffffff',
                fontStyle: isLearned ? 'normal' : 'bold',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0, 0.5);
            this.mainContainer.add(subjName);

            // 効果説明 (特大表示: 15px)
            const subjDesc = this.add.text(26, rowY + 16, subj.desc, {
                fontFamily: FONT_MAIN,
                fontSize: '15px',
                color: isLearned ? '#555566' : '#00ffff',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0, 0.5);
            this.mainContainer.add(subjDesc);

            // 状態マーク (特大表示: 16px)
            const statusLabel = isLearned ? '✔ 履修済' : '未履修';
            const statusColor = isLearned ? '#557755' : '#ffaa00';
            const statusText = this.add.text(width - 26, rowY, statusLabel, {
                fontFamily: FONT_MAIN,
                fontSize: '16px',
                color: statusColor,
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(1, 0.5);
            this.mainContainer.add(statusText);

            // 科目枠タップでも直接確認ダイアログへ！
            if (canTrain) {
                rowBg.on('pointerdown', () => {
                    this.showConfirmDialog(charData, selectedDeptDef, cost);
                });
                rowBg.on('pointerover', () => rowBg.setStrokeStyle(2.5, 0x00ffff));
                rowBg.on('pointerout', () => rowBg.setStrokeStyle(1.5, isLearned ? 0x2e2c3d : 0x605882));
            }
        });

        // ── 最下部: 訓練ボタン ──
        const btnY = height - 36;

        let btnColor = canTrain ? 0x882222 : 0x333344;
        let btnTextColor = canTrain ? '#ffffff' : '#777788';
        let btnLabel = `🥋 ${selectedDeptDef.name}を訓練する (SP: ${cost})`;

        if (isACompleted) {
            btnLabel = '【KISO学科 履修完了】';
        } else if (isMaxStage) {
            btnLabel = '【この学科は免許皆伝まで満了】';
        } else if (totalAvailableSp < cost) {
            btnLabel = `SP不足 (必要: ${cost} SP)`;
        }

        const trainBtn = this.add.rectangle(width / 2, btnY, width - 36, 48, btnColor, 0.95)
            .setStrokeStyle(1.5, canTrain ? 0xff5555 : 0x444455)
            .setInteractive({ useHandCursor: canTrain });

        const trainBtnText = this.add.text(width / 2, btnY, btnLabel, {
            fontFamily: FONT_MAIN,
            fontSize: '17px',
            color: btnTextColor,
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5, 0.5);

        this.mainContainer.add([trainBtn, trainBtnText]);

        if (canTrain) {
            trainBtn.on('pointerdown', () => {
                this.showConfirmDialog(charData, selectedDeptDef, cost);
            });
        }
    }

    /**
     * 訓練確認ダイアログ
     */
    showConfirmDialog(charData, deptDef, cost) {
        const { width, height } = this.scale;
        const gs = GlobalState.getInstance();

        const dialogContainer = this.add.container(0, 0).setDepth(20000);

        // 遮断暗幕
        const curtain = this.add.rectangle(0, 0, width, height, 0x000000, 0.8)
            .setOrigin(0, 0).setInteractive();
        dialogContainer.add(curtain);

        // パネル
        const panelW = Math.min(width * 0.88, 460);
        const panelH = 220;
        const panel = this.add.rectangle(width / 2, height / 2, panelW, panelH, 0x1b1424, 0.98)
            .setStrokeStyle(2, 0xaa4466);
        dialogContainer.add(panel);

        // メッセージ
        const msg = this.add.text(width / 2, height / 2 - 35,
            `${deptDef.name}を訓練するのか？\n(消費SP: ${cost})`, {
            fontFamily: FONT_MAIN,
            fontSize: '19px',
            color: '#ffffff',
            align: 'center',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3,
            lineSpacing: 8
        }).setOrigin(0.5, 0.5);
        dialogContainer.add(msg);

        // ボタンY
        const bY = height / 2 + 45;

        // 「いいえ」ボタン
        const noBtn = this.add.text(width / 2 + 75, bY, 'いいえ', {
            fontFamily: FONT_MAIN,
            fontSize: '18px',
            color: '#ffffff',
            backgroundColor: '#444455',
            padding: { x: 24, y: 8 }
        }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
        noBtn.on('pointerdown', () => dialogContainer.destroy());
        dialogContainer.add(noBtn);

        // 「はい」ボタン
        const yesBtn = this.add.text(width / 2 - 75, bY, 'はい', {
            fontFamily: FONT_MAIN,
            fontSize: '18px',
            color: '#ffffff',
            backgroundColor: '#882233',
            padding: { x: 24, y: 8 }
        }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

        yesBtn.on('pointerdown', () => {
            dialogContainer.destroy();
            this.executeTraining(charData, deptDef.id, cost);
        });
        dialogContainer.add(yesBtn);
    }

    /**
     * 訓練の実行と習得演出
     */
    executeTraining(charData, deptKey, cost) {
        const gs = GlobalState.getInstance();
        const totalAvailableSp = (gs.stockSp || 0) + (gs.devilStockSp || 0);
        if (totalAvailableSp < cost) return;

        // SP消費: 周回時喪失SP(devilStockSp)から優先消費！
        let remainingCost = cost;
        if ((gs.devilStockSp || 0) > 0) {
            const fromDevil = Math.min(gs.devilStockSp, remainingCost);
            gs.devilStockSp -= fromDevil;
            remainingCost -= fromDevil;
        }
        if (remainingCost > 0) {
            gs.stockSp = Math.max(0, (gs.stockSp || 0) - remainingCost);
        }

        // ランダム履修
        const learnedSubject = performDojoTraining(charData, deptKey);
        if (!learnedSubject) return;

        // 最新ステータスに同期
        const newStats = gs.calcStats(charData.id);
        if (newStats) {
            charData.currentHp = Math.min(newStats.maxHp, (charData.currentHp || newStats.maxHp) + (learnedSubject.id.includes('1') ? 100 : 0));
        }

        // オートセーブ
        SaveManager.saveGame();

        // 習得ポップアップ演出
        this.showLearnedPopup(charData, learnedSubject);
    }

    /**
     * 習得ポップアップ演出
     */
    showLearnedPopup(charData, subject) {
        const { width, height } = this.scale;
        const popupContainer = this.add.container(0, 0).setDepth(30000);

        const curtain = this.add.rectangle(0, 0, width, height, 0x000000, 0.85)
            .setOrigin(0, 0).setInteractive();
        popupContainer.add(curtain);

        const panel = this.add.rectangle(width / 2, height / 2, Math.min(width * 0.85, 420), 240, 0x1f1226, 0.98)
            .setStrokeStyle(2, 0xffcc00);
        popupContainer.add(panel);

        const header = this.add.text(width / 2, height / 2 - 65, '✨ 訓練完了！ ✨', {
            fontFamily: FONT_MAIN,
            fontSize: '20px',
            color: '#ffcc00',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5, 0.5);

        const name = this.add.text(width / 2, height / 2 - 18, `『${subject.name}』を履修！`, {
            fontFamily: FONT_MAIN,
            fontSize: '20px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5, 0.5);

        const desc = this.add.text(width / 2, height / 2 + 20, subject.desc, {
            fontFamily: FONT_MAIN,
            fontSize: '15px',
            color: '#00ffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5, 0.5);

        const closeBtn = this.add.text(width / 2, height / 2 + 72, '閉じる', {
            fontFamily: FONT_MAIN,
            fontSize: '16px',
            color: '#ffffff',
            backgroundColor: '#553366',
            padding: { x: 26, y: 8 }
        }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

        closeBtn.on('pointerdown', () => {
            popupContainer.destroy();
            this.drawScene();
        });

        popupContainer.add([header, name, desc, closeBtn]);
    }
}
