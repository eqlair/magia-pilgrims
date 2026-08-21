import Phaser from 'phaser';
import { GlobalState } from '../systems/GlobalState';
import { SaveManager } from '../systems/SaveManager';
import { CharacterDetailHelper } from '../components/CharacterDetailHelper';

import { TimeReporter } from '../systems/TimeReporter';

import { fontSize, FONT_MAIN } from '../config/GameFont';
import { EventEngine } from '../systems/EventEngine';
import { CharacterLossManager } from '../systems/CharacterLossManager';

export default class RestScene extends Phaser.Scene {

    constructor() {
        super('RestScene');
    }

    init(data) {
        this.party = data.party || ['001'];
        this.timeOfDay = data.timeOfDay || '昼';
    }

    create() {
        this.cameras.main.fadeIn(300, 0, 0, 0);
        
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        const bgKey = (this.timeOfDay === '夜') ? 'ev_camp' : 'ev_daycamp';
        // 背景レイヤー (depth 0)
        this.bgContainer = this.add.container(0, 0).setDepth(0);
        if (this.textures.exists(bgKey)) {
            const bg = this.add.image(width / 2, height / 2, bgKey);
            const scaleY = height / bg.height;
            bg.setScale(scaleY);
            this.bgContainer.add(bg);
        } else {
            const defaultBg = this.add.rectangle(width / 2, height / 2, width, height, 0x111122);
            this.bgContainer.add(defaultBg);
        }
        const darkOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);
        this.bgContainer.add(darkOverlay);

        this.sound.stopAll();
        if (this.cache.audio.exists('bgm_camp')) {
            this.bgm = this.sound.add('bgm_camp', { loop: true, volume: 0 });
            this.bgm.play();
            this.tweens.add({
                targets: this.bgm,
                volume: 0.5,
                duration: 1000
            });
        }

        const state = GlobalState.getInstance();
        this.globalState = state;

        // UIコンテナ
        this.mainViewContainer = this.add.container(0, 0).setDepth(10);
        this.detailViewContainer = this.add.container(0, 0).setDepth(100);
        this.detailViewContainer.setVisible(false);



        // --- 共通の戻るボタン機能 ---
        // 画面の左上に配置する
        
        // シーン復帰時の再描画
        this.events.on('resume', () => {
            if (this.currentDetailCharId && this.detailViewContainer && this.detailViewContainer.visible) {
                this.showDetailView(this.currentDetailCharId, width, height);
            } else {
                this.drawMainView(width, height);
            }
        });

        
        this.drawMainView(width, height);
        this.checkRestTutorial();
    }


    
    getRankColor(rank) {
        switch (rank) {
            case 1: return '#aaaaff'; // N (水色)
            case 2: return '#ffaaff'; // R (紫)
            case 3: return '#ffffaa'; // SR (黄色)
            case 4: return '#ff5555'; // SSR (赤)
            case 5: return '#aaffaa'; // UR (緑)
            case 6: return '#ffaa00'; // LR (オレンジ)
            case 7: return '#cccccc'; // MR (灰)
            case 8: return '#00ffff'; // EX (シアン)
            default: return '#ffffff';
        }
    }
    
    getRankString(rank) {
        switch (rank) {
            case 1: return 'N';
            case 2: return 'R';
            case 3: return 'SR';
            case 4: return 'SSR';
            case 5: return 'UR';
            case 6: return 'LR';
            case 7: return 'MR';
            case 8: return 'EX';
            default: return 'N';
        }
    }
    
    getTraitRank(level) {
        return level;
    }

    drawMainView(width, height) {
        this.mainViewContainer.removeAll(true);

        // タイトル
        this.mainViewContainer.add(this.add.text(width / 2, height * 0.04, '休息', {
            fontFamily: 'sans-serif', fontSize: '28px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5, 0.5));

        // ストック経験値 & 所持SP（左詰め2行で表示）
        this.mainViewContainer.add(this.add.text(10, height * 0.01, `ストックEXP: ${this.globalState.stockExp}`, {
            fontFamily: 'sans-serif', fontSize: '18px', color: '#ffffaa', backgroundColor: 'rgba(0,0,0,0.5)', padding: { x: 8, y: 3 }
        }).setOrigin(0, 0));
        this.mainViewContainer.add(this.add.text(10, height * 0.06, `所持SP: ${this.globalState.stockSp}`, {
            fontFamily: 'sans-serif', fontSize: '18px', color: '#aaaaff', backgroundColor: 'rgba(0,0,0,0.5)', padding: { x: 8, y: 3 }
        }).setOrigin(0, 0));

        // 隊列設定（配置変更）ボタン（右上）
        const formationBtn = this.add.text(width * 0.95, height * 0.02, '⚔️ 隊列設定', {
            stroke: '#000000', strokeThickness: 3, fontFamily: 'sans-serif', fontSize: '24px', color: '#aaffaa', backgroundColor: '#335533'
        }).setInteractive().setPadding(10).setOrigin(1, 0);

        if (!this.globalState.guideTappedFormationBtn) {
            this.tweens.add({
                targets: formationBtn,
                alpha: 0.35,
                duration: 600,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }

        formationBtn.on('pointerdown', () => {
            if (!this.globalState.guideTappedFormationBtn) {
                this.globalState.guideTappedFormationBtn = true;
                this.tweens.killTweensOf(formationBtn);
                formationBtn.setAlpha(1.0);
                SaveManager.saveGame(this);
            }
            this.scene.pause('RestScene');
            this.scene.launch('FormationScene', { party: this.party, returnScene: 'RestScene' });
        });
        this.mainViewContainer.add(formationBtn);

        const charIds = this.party;
        const startY = height * 0.15;
        const rowHeight = height * 0.15;


        charIds.forEach((charId, index) => {
            const charData = this.globalState.characters[charId];
            if (!charData) return;

            const stats = this.globalState.calcStats(charId, this.party);
            const reqExp = this.globalState.getRequiredExp(charData.level);
            const cy = startY + index * rowHeight;
            const textX = width * 0.35;
            const barWidth = width * 0.39;

            // 行全体のタップ領域（回復ボタン以外をタップすると詳細が開く）
            const rowHitZone = this.add.rectangle(textX, cy, width * 0.35, rowHeight * 0.8, 0x000000, 0.001).setInteractive({ useHandCursor: true });
            this.mainViewContainer.add(rowHitZone);
            rowHitZone.on('pointerdown', () => {
                this.showDetailView(charId, width, height);
            });

            // 顔アイコン
            const faceKey = `face_${charId}`;
            const face = this.add.image(width * 0.15, cy, faceKey).setDisplaySize(rowHeight * 0.8, rowHeight * 0.8).setInteractive({ useHandCursor: true });
            this.mainViewContainer.add(face);
            face.on('pointerdown', () => {
                this.showDetailView(charId, width, height);
            });

            // 名前 & Lv
            const nameText = this.add.text(textX, cy - rowHeight * 0.25, `${charData.name} Lv.${charData.level}`, {
                fontFamily: 'sans-serif', fontSize: '24px', color: '#ffffff', fontStyle: 'bold'
            }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
            this.mainViewContainer.add(nameText);
            nameText.on('pointerdown', () => {
                this.showDetailView(charId, width, height);
            });



            // HPバーとテキスト
            const hpY = cy - rowHeight * 0.05;
            const hpRatio = charData.currentHp / stats.maxHp;
            const hpWidth = Math.max(0, Math.min(barWidth, barWidth * hpRatio));
            this.mainViewContainer.add(this.add.rectangle(textX, hpY, barWidth, 18, 0x550000).setOrigin(0, 0.5));
            this.mainViewContainer.add(this.add.rectangle(textX, hpY, hpWidth, 18, 0xff5555).setOrigin(0, 0.5));
            this.mainViewContainer.add(this.add.text(textX + 5, hpY, `生命力 ${Math.floor(charData.currentHp)}/${stats.maxHp}`, { stroke: '#000000', strokeThickness: 3, fontSize: '16px' }).setOrigin(0, 0.5));

            // SPバーとテキスト
            const spY = cy + rowHeight * 0.15;
            const spRatio = charData.currentSp / stats.maxSp;
            const spWidth = Math.max(0, Math.min(barWidth, barWidth * spRatio));
            this.mainViewContainer.add(this.add.rectangle(textX, spY, barWidth, 18, 0x000055).setOrigin(0, 0.5));
            this.mainViewContainer.add(this.add.rectangle(textX, spY, spWidth, 18, 0x5555ff).setOrigin(0, 0.5));
            this.mainViewContainer.add(this.add.text(textX + 5, spY, `精神力 ${Math.floor(charData.currentSp)}/${stats.maxSp}`, { stroke: '#000000', strokeThickness: 3, fontSize: '16px' }).setOrigin(0, 0.5));

            // EXPバーとテキスト
            const expY = cy + rowHeight * 0.35;
            const expRatio = charData.exp / reqExp;
            const expBonus = stats.expBonus || 0;
            const expBonusStr = expBonus > 0 ? ` (+${expBonus}%)` : '';
            this.mainViewContainer.add(this.add.rectangle(textX, expY, barWidth, 18, 0x555500).setOrigin(0, 0.5));
            this.mainViewContainer.add(this.add.rectangle(textX, expY, barWidth * Math.min(1, expRatio), 18, 0xffff55).setOrigin(0, 0.5));
            this.mainViewContainer.add(this.add.text(textX + 5, expY, `EXP ${charData.exp}/${reqExp}${expBonusStr}`, {
                stroke: '#000000', strokeThickness: 3, fontSize: '16px',
                color: expBonus > 0 ? '#ff9900' : '#aaaaaa'
            }).setOrigin(0, 0.5));

            // HP回復ボタン
            const canHealHp = (charData.currentHp < stats.maxHp) && (charData.currentSp > 0);
            const hpBtnColor = canHealHp ? '#228822' : '#333333';
            const hpTextColor = canHealHp ? '#ffffff' : '#777777';
            const hpBtn = this.add.text(textX + barWidth + 15, hpY, '回復', {
                fontFamily: 'sans-serif', fontSize: '16px', color: hpTextColor, backgroundColor: hpBtnColor, padding: { x: 10, y: 3 }
            }).setOrigin(0, 0.5);
            if (canHealHp) {
                hpBtn.setInteractive({ useHandCursor: true });
                hpBtn.on('pointerdown', () => this.healHp(charId, stats.maxHp));
            }
            this.mainViewContainer.add(hpBtn);

            // SP回復ボタン
            const canHealSp = (charData.currentSp < stats.maxSp) && (this.globalState.stockSp > 0);
            const spBtnColor = canHealSp ? '#2255aa' : '#333333';
            const spTextColor = canHealSp ? '#ffffff' : '#777777';
            const spBtn = this.add.text(textX + barWidth + 15, spY, '回復', {
                fontFamily: 'sans-serif', fontSize: '16px', color: spTextColor, backgroundColor: spBtnColor, padding: { x: 10, y: 3 }
            }).setOrigin(0, 0.5);
            if (canHealSp) {
                spBtn.setInteractive({ useHandCursor: true });
                spBtn.on('pointerdown', () => this.confirmHealSp(charId, stats.maxSp));
            }
            this.mainViewContainer.add(spBtn);

        });

        // 最下部「休息を終える」ボタン
        const finishBtn = this.add.text(width / 2, height - 25, '休息を終える', {
            fontFamily: 'sans-serif', fontSize: '22px', color: '#ffffff', backgroundColor: '#883333', padding: { x: 25, y: 8 }
        }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
        finishBtn.on('pointerdown', () => this.confirmFinishRest());
        this.mainViewContainer.add(finishBtn);
    }

    showDetailView(charId, width, height, slideDir = null) {
        const w = width || this.scale.width;
        const h = height || this.scale.height;
        this.currentDetailCharId = charId;
        this.mainViewContainer.setVisible(false);
        CharacterDetailHelper.showDetailView(this, charId, 'RestScene', this.detailViewContainer, () => {
            this.drawMainView(w, h);
            this.mainViewContainer.setVisible(true);
        }, slideDir);
    }


    showFriendshipView(charId, width, height) {
        CharacterDetailHelper.showFriendshipView(this, charId, 'RestScene', this.detailViewContainer, () => {
            this.showDetailView(charId, width, height);
        });
    }

    showElementResistanceView(charId, width, height) {
        CharacterDetailHelper.showElementResistanceView(this, charId, 'RestScene', this.detailViewContainer, () => {
            this.showDetailView(charId, width, height);
        });
    }

    showEffectView(width, height) {
        CharacterDetailHelper.showEffectView(this);
    }

    healHp(charId, maxHp) {
        const charData = this.globalState.characters[charId];
        if (!charData) return;
        const neededHp = maxHp - charData.currentHp;
        const neededSp = Math.ceil(neededHp / 30);
        const useSp = Math.min(charData.currentSp, neededSp);
        const healAmount = useSp * 30;
        charData.currentHp = Math.min(maxHp, charData.currentHp + healAmount);
        charData.currentSp = Math.max(0, charData.currentSp - useSp);
        SaveManager.saveGame();
        this.drawMainView(this.cameras.main.width, this.cameras.main.height);
    }

    confirmHealSp(charId, maxSp) {
        const charData = this.globalState.characters[charId];
        if (!charData) return;
        const neededSp = maxSp - charData.currentSp;
        const spToUse = Math.min(neededSp, this.globalState.stockSp);
        if (spToUse <= 0) return;
        this.showDialog(`精神力の回復にSP ${spToUse} 点が必要です。\n回復しますか？`, () => {
            this.globalState.stockSp -= spToUse;
            charData.currentSp += spToUse;
            SaveManager.saveGame();
            this.drawMainView(this.cameras.main.width, this.cameras.main.height);
        });
    }


    confirmFinishRest() {
        this.showDialog('休息を終えると時間が進みます。\nよろしいですか？', () => this.finishRest());
    }

    finishRest() {
        const isFoodEmpty = this.globalState.food <= 0;
        if (isFoodEmpty) {
            this.party.forEach(id => {
                const c = this.globalState.characters[id];
                if (c) c.currentSp = Math.max(1, Math.floor(c.currentSp * 0.95));
            });
        }
        this.party.forEach(charId => {
            const charData = this.globalState.characters[charId];
            if (!charData) return;
            this.party.forEach(otherId => {
                if (charId === otherId) return;
                const otherData = this.globalState.characters[otherId];
                if (!otherData) return;
                const myFriendshipToOther = charData.friendships?.[otherId] || 0;
                if (myFriendshipToOther < 0) {
                    otherData.currentSp = Math.max(1, Math.floor(otherData.currentSp * 0.98));
                }
                const otherFriendshipToMe = otherData.friendships?.[charId] || 0;
                if (otherFriendshipToMe < 0) {
                    charData.currentSp = Math.max(1, Math.floor(charData.currentSp * 0.98));
                }
            });
        });
        // 休息終了時にチュートリアルモード(操作制限)を完全終了
        this.globalState.isTutorialMode = false;
        SaveManager.saveGame();

        const proceedToAdventure = () => {
            if (this.bgm && this.bgm.isPlaying) {
                this.tweens.add({
                    targets: this.bgm,
                    volume: 0,
                    duration: 1000,
                    onComplete: () => {
                        this.bgm.stop();
                        this.scene.stop('RestScene');
                        this.scene.resume('AdventureScene', { fromRest: true });
                    }
                });
            } else {
                this.scene.stop('RestScene');
                this.scene.resume('AdventureScene', { fromRest: true });
            }
        };

        // 精神力1/5以下のキャラがいるかチェック
        CharacterLossManager.checkAndTriggerLoss(this, this.party, () => {
            proceedToAdventure();
        });
    }


    showDialog(message, onYes) {
        const { width, height } = this.scale;
        const dialogContainer = this.add.container(0, 0).setDepth(2000);
        const backdrop = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6).setInteractive();
        const box = this.add.rectangle(width / 2, height / 2, 440, 200, 0x222233, 0.95).setStrokeStyle(2, 0x8888aa);
        const msgText = this.add.text(width / 2, height / 2 - 35, message, {
            fontFamily: 'sans-serif', fontSize: '18px', color: '#ffffff', align: 'center', wordWrap: { width: 400 }
        }).setOrigin(0.5, 0.5);
        const yesBtn = this.add.text(width / 2 - 70, height / 2 + 45, 'はい', {
            fontFamily: 'sans-serif', fontSize: '20px', color: '#ffffff', backgroundColor: '#338833', padding: { x: 25, y: 8 }
        }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
        yesBtn.on('pointerdown', () => {
            dialogContainer.destroy();
            onYes();
        });
        const noBtn = this.add.text(width / 2 + 70, height / 2 + 45, 'いいえ', {
            fontFamily: 'sans-serif', fontSize: '20px', color: '#ffffff', backgroundColor: '#555555', padding: { x: 25, y: 8 }
        }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
        noBtn.on('pointerdown', () => {
            dialogContainer.destroy();
        });
        dialogContainer.add([backdrop, box, msgText, yesBtn, noBtn]);
    }

    /** 休息画面に入った時の「チュートリアル(休息)」会話再生 */
    checkRestTutorial() {
        const gs = GlobalState.getInstance();
        if (gs.isTutorialMode && !gs.tutorialRestSeen) {
            gs.tutorialRestSeen = true;
            SaveManager.saveGame();

            let eventData = this.cache.json.get('tutorial_rest');
            if (!eventData) {
                const talkSion = this.cache.json.get('talk_001');
                const restLines = (talkSion && talkSion['チュートリアル(休息)']) ? talkSion['チュートリアル(休息)'] : [
                    "そういえば東京駅で化け物の親玉？が何か落としていたな",
                    "黒いガラス玉みたいな…",
                    "(休息中には精神力を消費して\n生命力を回復できます。)",
                    "(精神力は化け物の親玉のようなものが落とすスピリットポッドを使って回復できます。)"
                ];

                eventData = [
                    { cmd: "chara", key: "portrait_001", pos: "right" }
                ];
                for (let i = 0; i < restLines.length; i++) {
                    const text = restLines[i];
                    const isSystem = text.startsWith('(') && text.endsWith(')');
                    eventData.push({
                        cmd: "text",
                        name: isSystem ? "" : "紫苑",
                        body: text
                    });
                }
                eventData.push({ cmd: "clearText" });
                eventData.push({ cmd: "end" });
            }

            this.eventEngine = new EventEngine(this, eventData, () => {
                if (this.eventEngine) {
                    this.eventEngine.cleanup();
                    this.eventEngine = null;
                }
                // チュートリアル休息完了 ➔ 操作禁止タイプの全チュートリアルが完全に完了！
                gs.isTutorialMode = false;
                SaveManager.saveGame();
            });
            this.eventEngine.start();
        }
    }
}


