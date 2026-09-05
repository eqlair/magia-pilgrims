import Phaser from 'phaser';
import { GlobalState } from '../systems/GlobalState';
import { SaveManager } from '../systems/SaveManager';
import { CharacterDetailHelper } from '../components/CharacterDetailHelper';
import { RelicGenerator } from '../systems/RelicGenerator';

import { fontSize, FONT_MAIN } from '../config/GameFont';


export default class CampScene extends Phaser.Scene {
    constructor() {
        super('CampScene');
    }

    init(data) {
        this.party = data.party || ['001'];
        this.bgKey = data.bgKey || 'bg_img_woods.jpg';
        this.isNight = data.isNight || false;
    }

    create() {
        this.cameras.main.fadeIn(300, 0, 0, 0);
        
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // 背景レイヤー (depth 0)
        this.bgContainer = this.add.container(0, 0).setDepth(0);
        if (this.textures.exists(this.bgKey)) {
            const bgImg = this.add.image(width / 2, height / 2, this.bgKey);
            const scaleX = width / bgImg.width;
            const scaleY = height / bgImg.height;
            const baseScale = Math.max(scaleX, scaleY);
            bgImg.setScale(baseScale * 1.25, baseScale).setOrigin(0.5, 0.5);
            this.bgContainer.add(bgImg);
            
            const overlayAlpha = this.isNight ? 0.6 : 0.3;
            const darkOverlay = this.add.rectangle(0, 0, width, height, 0x000000, overlayAlpha).setOrigin(0, 0);
            this.bgContainer.add(darkOverlay);
        } else {
            const defaultBg = this.add.rectangle(0, 0, width, height, 0x111111, 0.9).setOrigin(0, 0);
            this.bgContainer.add(defaultBg);
        }

        // キャンプBGM再生
        this.sound.stopAll();
        if (this.cache.audio.exists('bgm_camp')) {
            this.sound.play('bgm_camp', { loop: true, volume: 0.5 });
        }

        const state = GlobalState.getInstance();
        this.globalState = state;

        // デバッグ用キーバインド (デバッグモード時のみ)
        if (GlobalState.IS_DEBUG_MODE) {
            // Jキー: 全員の攻撃レベル（近接・遠隔）をALL 7にするチート
            this.input.keyboard.on('keydown-J', () => {
                this.applyAllAttackLevel7();
            });

            // Pキー: 宝石ドロップフラグ
            this.input.keyboard.on('keydown-P', () => {
                this.globalState.debugForceGemDrop = !this.globalState.debugForceGemDrop;
                this.showDebugToast(`[DEBUG] 宝石確定ドロップ: ${this.globalState.debugForceGemDrop ? 'ON' : 'OFF'}`);
            });

            // Lキー: ストック経験値 50,000 点 ＆ SP 50,000 点付与
            this.input.keyboard.on('keydown-L', () => {
                const addedExp = this.globalState.addDirectStockExp(50000);
                this.globalState.stockSp = (this.globalState.stockSp || 0) + 50000;
                SaveManager.saveGame(this);
                this.showDebugToast(`[DEBUG] 経験値 +${addedExp.toLocaleString()} / SP +50,000 (SP: ${this.globalState.stockSp.toLocaleString()})`);
                this.refreshCurrentView();
            });

            // Kキー: レリクス (SSR:10, UR:2, MR:1) ＆ 宝石 1個 を生成
            this.input.keyboard.on('keydown-K', () => {
                if (!this.globalState.inventory) {
                    this.globalState.inventory = { relics: [], gems: [] };
                }
                if (!this.globalState.inventory.relics) this.globalState.inventory.relics = [];
                if (!this.globalState.inventory.gems) this.globalState.inventory.gems = [];

                // SSR (Rank 4) × 10
                for (let i = 0; i < 10; i++) {
                    this.globalState.inventory.relics.push(RelicGenerator.generateRelic(4));
                }
                // UR (Rank 5) × 2
                for (let i = 0; i < 2; i++) {
                    this.globalState.inventory.relics.push(RelicGenerator.generateRelic(5));
                }
                // MR (Rank 7) × 1
                this.globalState.inventory.relics.push(RelicGenerator.generateRelic(7));
                // 宝石 × 1
                this.globalState.inventory.gems.push(RelicGenerator.generateGem());

                SaveManager.saveGame(this);
                this.showDebugToast('[DEBUG] レリクス(SSR:10, UR:2, MR:1) ＆ 宝石(1) を生成しました！');
                this.refreshCurrentView();
            });
        }

        // メインビュー用コンテナ（キャラ一覧） depth: 10
        this.mainViewContainer = this.add.container(0, 0).setDepth(10);

        // 詳細ビュー用コンテナ（単一キャラ詳細） depth: 100
        this.detailViewContainer = this.add.container(0, 0).setDepth(100);
        this.detailViewContainer.setVisible(false);

        // メインビューを描画
        this.drawMainView(width, height);

        // レリクス・宝石装備画面から復帰した場合の再描画リスナー
        this.events.on('resume', () => {
            if (this.currentDetailCharId && this.detailViewContainer && this.detailViewContainer.visible) {
                this.showDetailView(this.currentDetailCharId, width, height);
            } else {
                this.drawMainView(width, height);
            }
        });

        this.events.on('shutdown', () => {
            if (this.sound) this.sound.stopAll();
        });
    }

    getRankColor(rank) {
        return CharacterDetailHelper.getRankColor(rank);
    }

    getRankString(rank) {
        return CharacterDetailHelper.getRankString(rank);
    }

    drawMainView(width, height) {
        this.mainViewContainer.removeAll(true);

        // 戻るボタン
        const backBtn = this.add.text(width * 0.05, height * 0.02, '◀ 戻る', {
            stroke: '#000000', strokeThickness: 3, fontFamily: 'sans-serif', fontSize: '24px', color: '#ffaaaa', backgroundColor: '#333333'
        }).setInteractive().setPadding(10);
        backBtn.on('pointerdown', () => {
            if (this.sound) this.sound.stopAll();
            this.scene.stop('CampScene');
            this.scene.resume('AdventureScene');
        });
        this.mainViewContainer.add(backBtn);

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
            this.scene.pause('CampScene');
            this.scene.launch('FormationScene', { party: this.party, returnScene: 'CampScene' });
        });
        this.mainViewContainer.add(formationBtn);


        // タイトル
        this.mainViewContainer.add(this.add.text(width * 0.5, height * 0.05, 'ステータス', {
            stroke: '#000000', strokeThickness: 3, fontFamily: 'sans-serif', fontSize: '32px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5, 0.5));

        const charIds = this.party;
        const startY = height * 0.15;
        const rowHeight = height * 0.15;

        charIds.forEach((charId, index) => {
            const charData = this.globalState.characters[charId];
            if (!charData) return;

            const stats = this.globalState.calcStats(charId, this.party);
            const reqExp = this.globalState.getRequiredExp(charData.level);
            const cy = startY + index * rowHeight;

            // 行全体のタップ領域（顔や名前、バー周辺どこをタップしても詳細が開く）
            const rowHitZone = this.add.rectangle(width * 0.5, cy, width * 0.9, rowHeight * 0.9, 0x000000, 0.001).setInteractive({ useHandCursor: true });
            this.mainViewContainer.add(rowHitZone);
            rowHitZone.on('pointerdown', () => {
                this.showDetailView(charId, width, height);
            });

            // 顔アイコン
            const faceKey = `face_${charId}`;
            const face = this.add.image(width * 0.15, cy, faceKey).setDisplaySize(rowHeight * 0.8, rowHeight * 0.8).setInteractive({ useHandCursor: true });
            
            if (charId === '001' && !this.globalState.guideTappedSionFace) {
                this.tweens.add({
                    targets: face,
                    alpha: 0.35,
                    duration: 600,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }

            this.mainViewContainer.add(face);
            face.on('pointerdown', () => {
                if (charId === '001' && !this.globalState.guideTappedSionFace) {
                    this.globalState.guideTappedSionFace = true;
                    this.tweens.killTweensOf(face);
                    face.setAlpha(1.0);
                    SaveManager.saveGame(this);
                }
                this.showDetailView(charId, width, height);
            });

            const textX = width * 0.32;
            const barWidth = width * 0.50;



            // 名前 & Lv
            const nameText = this.add.text(textX, cy - rowHeight * 0.25, `${charData.name} Lv.${charData.level}`, {
                stroke: '#000000', strokeThickness: 3, fontFamily: 'sans-serif', fontSize: '24px', color: '#ffffff', fontStyle: 'bold'
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

            // SPバーとテキスト (精神力・青バー)
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
        });

        // ストック経験値を右下に配置
        const stockExpText = this.add.text(width - 20, height - 20, `ストックSP: ${this.globalState.stockSp}　ストックEXP: ${this.globalState.stockExp}`, { stroke: '#000000', strokeThickness: 3, fontSize: '20px', color: '#ffffaa' }).setOrigin(1, 1);
        this.mainViewContainer.add(stockExpText);

        // 「影響」ボタンを左下に配置
        const effectBtn = this.add.text(20, height - 20, '影響', {
            fontSize: '20px', backgroundColor: '#333333', color: '#ffffff'
        }).setPadding(10).setOrigin(0, 1).setInteractive();

        if (!this.globalState.guideTappedEffectBtn) {
            this.tweens.add({
                targets: effectBtn,
                alpha: 0.35,
                duration: 600,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }

        effectBtn.on('pointerdown', () => {
            if (!this.globalState.guideTappedEffectBtn) {
                this.globalState.guideTappedEffectBtn = true;
                this.tweens.killTweensOf(effectBtn);
                effectBtn.setAlpha(1.0);
                SaveManager.saveGame(this);
            }
            CharacterDetailHelper.showEffectView(this);
        });
        this.mainViewContainer.add(effectBtn);
    }


    showDetailView(charId, width, height, slideDir = null) {
        const w = width || this.scale.width;
        const h = height || this.scale.height;
        this.currentDetailCharId = charId;
        this.mainViewContainer.setVisible(false);
        CharacterDetailHelper.showDetailView(this, charId, 'CampScene', this.detailViewContainer, () => {
            this.drawMainView(w, h);
            this.mainViewContainer.setVisible(true);
        }, slideDir);
    }


    showFriendshipView(charId, width, height) {
        CharacterDetailHelper.showFriendshipView(this, charId, 'CampScene', this.detailViewContainer, () => {
            this.showDetailView(charId, width, height);
        });
    }

    showElementResistanceView(charId, width, height) {
        CharacterDetailHelper.showElementResistanceView(this, charId, 'CampScene', this.detailViewContainer, () => {
            this.showDetailView(charId, width, height);
        });
    }

    showEffectView(width, height) {
        CharacterDetailHelper.showEffectView(this);
    }

    refreshCurrentView() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        if (this.currentDetailCharId && this.detailViewContainer && this.detailViewContainer.visible) {
            this.showDetailView(this.currentDetailCharId, width, height);
        } else {
            this.drawMainView(width, height);
        }
    }

    showDebugToast(message) {
        const width = this.cameras.main.width;
        const text = this.add.text(width / 2, 50, message, {
            fontFamily: 'sans-serif',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#ffffaa',
            backgroundColor: '#000000dd',
            padding: { x: 14, y: 8 },
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(9999);
        this.time.delayedCall(2200, () => text.destroy());
    }

    /**
     * チート機能: 全キャラクターの近接・遠隔攻撃レベルをすべて 7 に設定
     */
    applyAllAttackLevel7() {
        if (this.globalState.characters) {
            for (const cid in this.globalState.characters) {
                const c = this.globalState.characters[cid];
                if (c) {
                    c.meleeLevel = 7;
                    c.rangedLevel = 7;
                }
            }
        }
        SaveManager.saveGame(this);
        this.showDebugToast('[DEBUG] みんなの攻撃レベルを全部7にしました！(近接7 / 遠隔7)');
        this.refreshCurrentView();
    }
}


