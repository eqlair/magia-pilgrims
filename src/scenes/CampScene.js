import Phaser from 'phaser';
import { GlobalState } from '../systems/GlobalState';
import { SaveManager } from '../systems/SaveManager';

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
        
        // 背景画像の表示
        if (this.textures.exists(this.bgKey)) {
            const bgImg = this.add.image(width / 2, height / 2, this.bgKey);
            // 画面全体をカバーするようにスケール
            const scaleX = width / bgImg.width;
            const scaleY = height / bgImg.height;
            const baseScale = Math.max(scaleX, scaleY);
            // マップでの見え方(縦0.8倍)に合わせるため、横幅を1.25倍に拡大して比率を合わせる
            bgImg.setScale(baseScale * 1.25, baseScale).setOrigin(0.5, 0.5);
            
            // 暗くするオーバーレイ
            if (this.isNight) {
                // 夜はより暗くする(60%)
                this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0, 0);
            } else {
                // 昼間でもステータス画面として見やすいように少し暗くする(30%)
                this.add.rectangle(0, 0, width, height, 0x000000, 0.3).setOrigin(0, 0);
            }
        } else {
            // デフォルトの黒半透明
            this.add.rectangle(0, 0, width, height, 0x111111, 0.9).setOrigin(0, 0);
        }

        // キャンプBGM再生
        this.sound.stopAll();
        if (this.cache.audio.exists('bgm_camp')) {
            this.sound.play('bgm_camp', { loop: true, volume: 0.5 });
        }

        const state = GlobalState.getInstance();
        this.globalState = state;

        // デバッグ用: Pキーで宝石ドロップフラグをトグル
        this.input.keyboard.on('keydown-P', () => {
            this.globalState.debugForceGemDrop = !this.globalState.debugForceGemDrop;
            const text = this.add.text(width / 2, 50, `[DEBUG] 宝石確定ドロップ: ${this.globalState.debugForceGemDrop ? 'ON' : 'OFF'}`, {
                fontSize: '20px', color: '#ff0000', backgroundColor: '#ffffff', padding: { x: 5, y: 5 }
        const { width, height } = this.scale;

        // 背景描画
        const bg = this.add.image(width / 2, height / 2, this.bgKey);
        const scaleX = width / bg.width;
        const scaleY = height / bg.height;
        const scale = Math.max(scaleX, scaleY);
        bg.setScale(scale);

        if (this.isNight) {
            this.add.rectangle(width / 2, height / 2, width, height, 0x000033, 0.4);
        }

        // メインビュー用コンテナ（キャラ一覧）
        this.mainViewContainer = this.add.container(0, 0);

        // 詳細ビュー用コンテナ（単一キャラ詳細）
        this.detailViewContainer = this.add.container(0, 0);
        this.detailViewContainer.setVisible(false);

        // メインビューを描画
        this.drawMainView(width, height);

        // レリクス装備画面から復帰した場合の再描画リスナー
        this.events.on('resume', () => {
            if (this.currentDetailCharId && this.detailViewContainer.visible) {
                this.showDetailView(this.currentDetailCharId, width, height);
            } else {
                this.drawMainView(width, height);
            }
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
            fontFamily: 'sans-serif', fontSize: '24px', color: '#ffaaaa', backgroundColor: '#333333'
        }).setInteractive().setPadding(10);
        backBtn.on('pointerdown', () => {
            this.scene.stop('CampScene');
            this.scene.resume('AdventureScene');
        });
        this.mainViewContainer.add(backBtn);

        // タイトル
        this.mainViewContainer.add(this.add.text(width * 0.5, height * 0.05, 'ステータス', {
            fontFamily: 'sans-serif', fontSize: '32px', color: '#ffffff', fontStyle: 'bold'
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

            // 顔アイコン
            const faceKey = `face_${charId}`;
            const face = this.add.image(width * 0.15, cy, faceKey).setDisplaySize(rowHeight * 0.8, rowHeight * 0.8).setInteractive({ useHandCursor: true });
            this.mainViewContainer.add(face);

            face.on('pointerdown', () => {
                this.showDetailView(charId, width, height);
            });

            const textX = width * 0.25;
            const barWidth = width * 0.6;

            // 名前 & Lv
            this.mainViewContainer.add(this.add.text(textX, cy - rowHeight * 0.3, `${charData.name} Lv.${charData.level}`, {
                fontFamily: 'sans-serif', fontSize: '20px', color: '#ffffff', fontStyle: 'bold'
            }).setOrigin(0, 0.5));

            // HPバー
            const hpRatio = charData.currentHp / stats.maxHp;
            this.mainViewContainer.add(this.add.rectangle(textX, cy - rowHeight * 0.1, barWidth, 12, 0x550000).setOrigin(0, 0.5));
            this.mainViewContainer.add(this.add.rectangle(textX, cy - rowHeight * 0.1, barWidth * hpRatio, 12, 0xff5555).setOrigin(0, 0.5));

            // EXPバー
            const expRatio = charData.exp / reqExp;
            this.mainViewContainer.add(this.add.rectangle(textX, cy + rowHeight * 0.1, barWidth, 12, 0x555500).setOrigin(0, 0.5));
            this.mainViewContainer.add(this.add.rectangle(textX, cy + rowHeight * 0.1, barWidth * Math.min(1, expRatio), 12, 0xffff55).setOrigin(0, 0.5));
        });

        // ストック経験値を右下に配置
        const stockExpText = this.add.text(width - 20, height - 20, `ストックSP: ${this.globalState.stockSp}　ストックEXP: ${this.globalState.stockExp}`, { stroke: '#000000', strokeThickness: 3, fontSize: '20px', color: '#ffffaa' }).setOrigin(1, 1);
        this.mainViewContainer.add(stockExpText);

        // 「影響」ボタンを左下に配置
        const effectBtn = this.add.text(20, height - 20, '影響', {
            fontSize: '20px', backgroundColor: '#333333', color: '#ffffff'
        }).setPadding(10).setOrigin(0, 1).setInteractive();

        effectBtn.on('pointerdown', () => {
            CharacterDetailHelper.showEffectView(this);
        });
        this.mainViewContainer.add(effectBtn);
    }

    showDetailView(charId, width, height) {
        this.currentDetailCharId = charId;
        this.mainViewContainer.setVisible(false);
        CharacterDetailHelper.showDetailView(this, charId, 'CampScene', this.detailViewContainer, () => {
            this.drawMainView(width, height);
            this.mainViewContainer.setVisible(true);
        });
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
}


