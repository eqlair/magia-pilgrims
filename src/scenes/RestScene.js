import Phaser from 'phaser';
import { GlobalState } from '../systems/GlobalState';
import { SaveManager } from '../systems/SaveManager';

import { TimeReporter } from '../systems/TimeReporter';
import { fontSize, FONT_MAIN } from '../config/GameFont';

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
        if (this.textures.exists(bgKey)) {
            const bg = this.add.image(width / 2, height / 2, bgKey);
            const scaleY = height / bg.height;
            bg.setScale(scaleY);
        } else {
            this.add.rectangle(width / 2, height / 2, width, height, 0x111122);
        }
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);

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
        this.mainViewContainer = this.add.container(0, 0);
        this.detailViewContainer = this.add.container(0, 0);
        this.detailViewContainer.setVisible(false);
        this.elementResistContainer = this.add.container(0, 0);
        this.elementResistContainer.setVisible(false);
        this.elementResistContainer.setDepth(50); // Make sure it is above detail view

        // --- 共通の戻るボタン機能 ---
        // 画面の左上に配置する
        
        // シーン復帰時の再描画
        this.events.on('resume', () => {
            if (this.currentDetailCharId) {
                this.showDetailView(this.currentDetailCharId, width, height);
            }
        });
        
        this.drawMainView(width, height);
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

        // 隊列編成ボタン
        const formationBtn = this.add.text(width / 2 + 180, height * 0.04, '隊列編成', {
            fontFamily: 'sans-serif', fontSize: '20px', color: '#ffffff', backgroundColor: '#555555', padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setInteractive();
        formationBtn.on('pointerdown', () => {
            this.scene.pause();
            this.scene.launch('FormationScene', { party: this.party, returnScene: this.scene.key });
        });
        this.mainViewContainer.add(formationBtn);

        // キャラクター一覧を縦に並べる
        // 画面高さを12分割 (1枠 = height / 12)
        // 上1枠はヘッダ、下1枠はフッタ
        // 残り10枠を5人で分ける -> 1人あたり 2枠 (height / 6)
        const rowHeight = height / 6;
        const startY = height / 12 + (rowHeight / 2); // 最初のキャラの中心Y

        this.party.forEach((charId, index) => {
            const charData = this.globalState.characters[charId];
            if (!charData) return;
            
            const stats = this.globalState.calcStats(charId, this.party);
            const reqExp = this.globalState.getRequiredExp(charData.level);
            
            const cy = startY + (index * rowHeight);
            
            // 顔画像（高さの約80%のサイズにする）
            const faceSize = rowHeight * 0.8;
            const face = this.add.image(width * 0.15, cy, `face_${charId}`).setInteractive();
            face.setDisplaySize(faceSize, faceSize);
            this.mainViewContainer.add(face);

            face.on('pointerdown', () => {
                this.showDetailView(charId, width, height);
            });

            const textX = width * 0.35;
            const barWidth = width * 0.44; // 画面幅の約4割（20%縮小）

            // 名前 & Lv
            this.mainViewContainer.add(this.add.text(textX, cy - rowHeight * 0.25, `${charData.name} Lv.${charData.level}`, {
                fontFamily: 'sans-serif', fontSize: '24px', color: '#ffffff', fontStyle: 'bold'
            }).setOrigin(0, 0.5));

            // HPバーとテキスト
            const hpY = cy - rowHeight * 0.05;
            const hpRatio = charData.currentHp / stats.maxHp;
            const hpWidth = Math.max(0, Math.min(barWidth, barWidth * hpRatio));
            this.mainViewContainer.add(this.add.rectangle(textX, hpY, barWidth, 18, 0x550000).setOrigin(0, 0.5));
            this.mainViewContainer.add(this.add.rectangle(textX, hpY, hpWidth, 18, 0xff5555).setOrigin(0, 0.5));
            this.mainViewContainer.add(this.add.text(textX + 5, hpY, `生命力 ${Math.floor(charData.currentHp)}/${stats.maxHp}`, { fontSize: '16px' }).setOrigin(0, 0.5));

            // SPバーとテキスト
            const spY = cy + rowHeight * 0.15;
            const spRatio = charData.currentSp / stats.maxSp;
            const spWidth = Math.max(0, Math.min(barWidth, barWidth * spRatio));
            this.mainViewContainer.add(this.add.rectangle(textX, spY, barWidth, 18, 0x000055).setOrigin(0, 0.5));
            this.mainViewContainer.add(this.add.rectangle(textX, spY, spWidth, 18, 0x5555ff).setOrigin(0, 0.5));
            this.mainViewContainer.add(this.add.text(textX + 5, spY, `精神力 ${Math.floor(charData.currentSp)}/${stats.maxSp}`, { fontSize: '16px' }).setOrigin(0, 0.5));

            // EXPバーとテキスト
            const expY = cy + rowHeight * 0.35;
            const expRatio = charData.exp / reqExp;
            this.mainViewContainer.add(this.add.rectangle(textX, expY, barWidth, 18, 0x555500).setOrigin(0, 0.5));
            this.mainViewContainer.add(this.add.rectangle(textX, expY, barWidth * Math.min(1, expRatio), 18, 0xffff55).setOrigin(0, 0.5));
            this.mainViewContainer.add(this.add.text(textX + 5, expY, `EXP ${charData.exp}/${reqExp}`, { fontSize: '16px', color: '#aaaaaa' }).setOrigin(0, 0.5));

            // HP回復ボタン
            const canHealHp = (charData.currentHp < stats.maxHp) && (charData.currentSp > 0);
            const hpBtnColor = canHealHp ? '#228822' : '#333333';
            const hpTextColor = canHealHp ? '#ffffff' : '#777777';
            const hpBtn = this.add.text(textX + barWidth - 10, hpY, '回復', {
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
            const spBtn = this.add.text(textX + barWidth - 10, spY, '回復', {
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

    showFriendshipView(charId, width, height) {
        this.detailViewContainer.setVisible(false);
        if (this.friendshipViewContainer) {
            this.friendshipViewContainer.destroy();
        }
        this.friendshipViewContainer = this.add.container(0, 0);
        
        const charData = this.globalState.characters[charId];
        
        // 戻るボタン
        const backBtn = this.add.text(width * 0.05, height * 0.02, '◀ 戻る', {
            fontSize: '24px', backgroundColor: '#333333', padding: 8
        }).setInteractive();
        backBtn.on('pointerdown', () => {
            this.friendshipViewContainer.setVisible(false);
            this.showDetailView(charId, width, height); // 再描画して最新のステータスを反映
            this.detailViewContainer.setVisible(true);
        });
        this.friendshipViewContainer.add(backBtn);

        let ry = height * 0.12;
        this.friendshipViewContainer.add(this.add.text(width * 0.1, ry, `${charData.name} の友好度`, { fontSize: '28px', fontStyle: 'bold' }));
        ry += 40;
        
        // 友好度ボーナス
        const bonusText = this.add.text(width * 0.1, ry, `友好度ボーナスポイント: ${charData.friendshipPoints || 0}`, { fontSize: '20px', color: '#ffffaa' });
        this.friendshipViewContainer.add(bonusText);
        ry += 50;

        // リスト描画
        const metChars = charData.metCharacters || [];
        if (metChars.length === 0) {
            this.friendshipViewContainer.add(this.add.text(width * 0.1, ry, '一緒に編成したキャラクターがいません', { fontSize: '18px', color: '#aaaaaa' }));
        } else {
            for (const otherId of metChars) {
                if (otherId === charId) continue;
                const otherChar = this.globalState.characters[otherId];
                if (!otherChar) continue;

                const fVal = (charData.friendships && charData.friendships[otherId]) ? charData.friendships[otherId] : 0;
                
                // 顔アイコンの代わりに名前
                const rowText = this.add.text(width * 0.1, ry, `${otherChar.name}  友好度: ${fVal}`, { fontSize: '22px' });
                this.friendshipViewContainer.add(rowText);

                // ハートボタン
                const heartBtn = this.add.text(width * 0.6, ry, '❤️', { fontSize: '24px' }).setInteractive();
                heartBtn.on('pointerdown', () => {
                    if ((charData.friendshipPoints || 0) > 0 && fVal < 25) {
                        charData.friendshipPoints--;
                        if (!charData.friendships) charData.friendships = {};
                        charData.friendships[otherId] = fVal + 1;
                        this.showFriendshipView(charId, width, height); // 再描画
                    }
                });
                // ポイントがない、または最大値なら暗くする
                if ((charData.friendshipPoints || 0) <= 0 || fVal >= 25) {
                    heartBtn.setAlpha(0.3);
                }
                this.friendshipViewContainer.add(heartBtn);

                ry += 40;
            }
        }
    }

    getElementImage(id) {
        switch(id) {
            case '001': return 'em_2'; // 混沌
            case '002': return 'em_5'; // 統制
            case '003': return 'em_1'; // 情熱
            case '004': return 'em_4'; // 犠牲
            case '005': return 'em_3'; // 調和
            default: return 'em_1';
        }
    }

    showElementResistanceView(charId, width, height) {
        this.detailViewContainer.setVisible(false);
        this.elementResistContainer.removeAll(true);
        this.elementResistContainer.setVisible(true);

        const charData = this.globalState.characters[charId];
        
        const backBtn = this.add.text(width * 0.05, height * 0.02, '◀ 戻る', {
            stroke: '#000000', strokeThickness: 3, fontFamily: 'sans-serif', fontSize: '24px', color: '#ffaaaa', backgroundColor: '#333333'
        }).setInteractive().setPadding(10);
        backBtn.on('pointerdown', () => {
            this.elementResistContainer.setVisible(false);
            this.detailViewContainer.setVisible(true);
        });
        this.elementResistContainer.add(backBtn);

        const headerText = this.add.text(width * 0.5, height * 0.1, `${charData.name} の属性・耐性情報`, {
            stroke: '#000000', strokeThickness: 3, fontSize: '32px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5, 0.5);
        this.elementResistContainer.add(headerText);

        const stats = this.globalState.calcStats(charId, this.party);
        const elemMods = stats.elemMods || { red: 0, blue: 0, green: 0, yellow: 0, purple: 0 };
        
        const charElementBase = {
            '001': { strong: 'green', weak: 'red' },
            '002': { strong: 'red', weak: 'yellow' },
            '003': { strong: 'purple', weak: 'blue' },
            '004': { strong: 'blue', weak: 'green' },
            '005': { strong: 'yellow', weak: 'purple' }
        };

        const elements = [
            { id: 'red', name: '情熱', icon: 'em_1' },
            { id: 'purple', name: '混沌', icon: 'em_2' },
            { id: 'green', name: '調和', icon: 'em_3' },
            { id: 'yellow', name: '犠牲', icon: 'em_4' },
            { id: 'blue', name: '統制', icon: 'em_5' }
        ];

        const getDef = (targetElem) => {
            const rel = charElementBase[charId];
            let base = 100;
            if (rel && rel.strong === targetElem) base = 75;
            if (rel && rel.weak === targetElem) base = 125;
            const mod = elemMods[targetElem] || 0;
            return Math.max(1, base - mod);
        };

        let ry = height * 0.2;
        this.elementResistContainer.add(this.add.text(width * 0.1, ry, '【属性別防御力】', { stroke: '#000000', strokeThickness: 2, fontSize: '24px', color: '#aaffaa' }));
        let dry = height * 0.2;
        this.elementResistContainer.add(this.add.text(width * 0.4, dry, '【属性別デバフ抵抗力】', { stroke: '#000000', strokeThickness: 2, fontSize: '24px', color: '#ffaaaa' }));

        ry += 40;
        dry += 40;
        elements.forEach(e => {
            const defVal = getDef(e.id);
            this.elementResistContainer.add(this.add.image(width * 0.1, ry + 12, e.icon).setScale(0.15));
            this.elementResistContainer.add(this.add.text(width * 0.15, ry, `${e.name}: ${defVal}%`, { fontSize: '22px' }));
            
            this.elementResistContainer.add(this.add.image(width * 0.4, dry + 12, e.icon).setScale(0.15));
            this.elementResistContainer.add(this.add.text(width * 0.45, dry, `${e.name}: ${defVal}%`, { fontSize: '22px' }));
            
            ry += 35;
            dry += 35;
        });

        const embImage = this.add.image(width * 0.2, height * 0.75, 'emb_0');
        const scale = (height * 0.3) / embImage.height;
        embImage.setScale(scale);
        this.elementResistContainer.add(embImage);

        const relText = '情熱は混沌に強く統制に弱い。\n混沌は調和に強く情熱に弱い。\n調和は犠牲に強く混沌に弱い。\n犠牲は統制に強く調和に弱い。\n統制は情熱に強く犠牲に弱い。';
        const relObj = this.add.text(width * 0.35, height * 0.75, relText, {
            stroke: '#000000', strokeThickness: 3, fontSize: '22px', lineSpacing: 10
        }).setOrigin(0, 0.5);
        this.elementResistContainer.add(relObj);
    }

    showDetailView(charId, width, height) {
        this.currentDetailCharId = charId;
        this.mainViewContainer.setVisible(false);
        this.detailViewContainer.removeAll(true);
        this.detailViewContainer.setVisible(true);

        const charData = this.globalState.characters[charId];
        const stats = this.globalState.calcStats(charId, this.party);
        const baseStats = this.globalState.calcBaseStats(charId, this.party);
        const reqExp = this.globalState.getRequiredExp(charData.level);

        // 戻るボタン (詳細 -> メイン)
        const backBtn = this.add.text(width * 0.05, height * 0.02, '◀ 戻る', {
            fontFamily: 'sans-serif', fontSize: '24px', color: '#ffaaaa', backgroundColor: '#333333'
        }).setInteractive().setPadding(10);
        backBtn.on('pointerdown', () => {
            this.detailViewContainer.setVisible(false);
            this.drawMainView(width, height);
            this.mainViewContainer.setVisible(true);
        });
        this.detailViewContainer.add(backBtn);

        // 左半分：立ち絵
        const portrait = this.add.image(width * 0.25, height * 0.6, `portrait_${charId}`);
        // 画面高さに合わせてスケールを調整（画面高さの80%くらいに収める）
        const scale = (height * 0.8) / portrait.height;
        portrait.setScale(scale);
        this.detailViewContainer.add(portrait);

        // 右半分：詳細データ表示基準位置
        const rx = width * 0.5;
        let ry = height * 0.12;
        const lineSpacing = height * 0.055; // 約50px

        // 1行目: 属性アイコン・名前・レベル
        const elementIcon = this.add.image(rx - 25, ry + 16, this.getElementImage(charId)).setScale(0.15).setInteractive({ useHandCursor: true });
        this.detailViewContainer.add(elementIcon);
        elementIcon.on('pointerdown', () => {
            this.showElementResistanceView(charId, width, height);
        });

        this.detailViewContainer.add(this.add.text(rx, ry, `${charData.name}`, { fontSize: '32px', color: '#ffffff', fontStyle: 'bold' }));
        this.detailViewContainer.add(this.add.text(rx + 150, ry + 6, `Lv.${charData.level}`, { fontSize: '24px', color: '#aaffaa' }));
        ry += lineSpacing * 1.2;

        // 2行目: 経験値・ストック経験値
        this.detailViewContainer.add(this.add.text(rx, ry, `EXP: ${charData.exp}/${reqExp}`, { fontSize: '18px', padding: { top: 4, bottom: 4 } }));
        ry += lineSpacing * 0.7;
        this.detailViewContainer.add(this.add.text(rx, ry, `ストックEXP: ${this.globalState.stockExp}`, { fontSize: '18px', color: '#ffffaa', padding: { top: 4, bottom: 4 } }));
        ry += lineSpacing * 0.8;

        // 4行目: レベルを上げるボタン
        const canLevelUp = (charData.exp + this.globalState.stockExp) >= reqExp;
        const btnBg = canLevelUp ? '#aa0000' : '#444444';
        const btnColor = canLevelUp ? '#ffffff' : '#aaaaaa';
        const levelUpBtn = this.add.text(rx, ry, 'レベルを上げる', {
            fontSize: '22px', backgroundColor: btnBg, color: btnColor
        }).setPadding(10).setInteractive();
        
        levelUpBtn.on('pointerdown', () => {
            if (canLevelUp) {
                if (this.globalState.levelUp(charId)) {
                    this.showDetailView(charId, width, height); // 再描画
                }
            }
        });
        this.detailViewContainer.add(levelUpBtn);
        ry += lineSpacing * 1.2;

        // 4行目: 親愛度・友好度ボタン
        const affectionValue = stats.affection || 0;
        this.detailViewContainer.add(this.add.text(rx, ry + 5, `親愛度: ${affectionValue}`, { fontSize: '18px' }));
        const friendshipBtn = this.add.text(rx + 120, ry, '友好度をみる', {
            fontSize: '18px', backgroundColor: '#3333aa', color: '#ffffff'
        }).setPadding(6).setInteractive();
        friendshipBtn.on('pointerdown', () => {
            this.showFriendshipView(charId, width, height);
        });
        this.detailViewContainer.add(friendshipBtn);
        ry += lineSpacing * 1.2;

        const hpDiff = stats.maxHp - baseStats.maxHp;
        const spDiff = stats.maxSp - baseStats.maxSp;
        const atkDiff = stats.atk - baseStats.atk;
        const reloadDiff = stats.reload - baseStats.reload;
        const formatDiff = (d) => d === 0 ? '' : ` (${d>0?'+':''}${d})`;

        // 5行目: 各種ステータス1 (生命力 / 精神力)
        this.detailViewContainer.add(this.add.text(rx, ry, `生命力: ${Math.floor(charData.currentHp)}/${stats.maxHp}${formatDiff(hpDiff)}`, { fontSize: '18px', padding: { top: 4, bottom: 4 } }));
        ry += lineSpacing * 0.7;
        this.detailViewContainer.add(this.add.text(rx, ry, `精神力: ${Math.floor(charData.currentSp)}/${stats.maxSp}${formatDiff(spDiff)}`, { fontSize: '18px', padding: { top: 4, bottom: 4 } }));
        ry += lineSpacing * 0.7;

        // 6行目: 各種ステータス2 (攻撃力 / リロード)
        this.detailViewContainer.add(this.add.text(rx, ry, `攻撃力: ${stats.atk}${formatDiff(atkDiff)}`, { fontSize: '18px', padding: { top: 4, bottom: 4 } }));
        ry += lineSpacing * 0.7;
        this.detailViewContainer.add(this.add.text(rx, ry, `リロード速度: ${stats.reload}${formatDiff(reloadDiff)}`, { fontSize: '18px', padding: { top: 4, bottom: 4 } }));
        ry += lineSpacing * 0.7;

        // 7行目: 各種ステータス3 (近接 / 遠隔)
        this.detailViewContainer.add(this.add.text(rx, ry, `近接: Lv${charData.meleeLevel}`, { fontSize: '18px', padding: { top: 4, bottom: 4 } }));
        this.detailViewContainer.add(this.add.text(rx + 130, ry, `遠隔: Lv${charData.rangedLevel}`, { fontSize: '18px', padding: { top: 4, bottom: 4 } }));
        ry += lineSpacing * 1.0;

        // 8行目: 宝石
        this.detailViewContainer.add(this.add.text(rx, ry, '装備中の宝石', { fontSize: '18px', color: '#aaaaaa' }));
        ry += 25;

        let gemText = '装備なし';
        let gemColor = '#777777';
        let gemBgHeight = 30;
        
        if (charData.equipGem) {
            gemColor = this.getRankColor(charData.equipGem.rank);
            const rankStr = this.getRankString(charData.equipGem.rank);
            gemText = `[${rankStr}] ${charData.equipGem.name}`;
        }
        
        const gemBg = this.add.rectangle(rx, ry, width * 0.45, gemBgHeight, 0x222222).setOrigin(0, 0).setInteractive();
        gemBg.on('pointerdown', () => {
            this.scene.pause();
            this.scene.launch('EquipmentScene', { charId, itemType: 'gem', slotIndex: 0, parentScene: 'RestScene' });
            this.scene.bringToTop('EquipmentScene');
        });
        
        this.detailViewContainer.add(gemBg);
        
        const gemNameText = this.add.text(rx + 10, ry + 5, gemText, { fontSize: '18px', color: gemColor, padding: { top: 4, bottom: 4 } }).setInteractive();
        gemNameText.on('pointerdown', () => gemBg.emit('pointerdown'));
        this.detailViewContainer.add(gemNameText);
        
        ry += 40;

        // 9行目: レリクス
        this.detailViewContainer.add(this.add.text(rx, ry, 'レリクス', { fontSize: '18px' }));
        ry += 30;
        
        // 画面左端から右端まで使う
        const relicStartX = width * 0.05;
        const relicWidth = width * 0.9;
        
        for (let i = 0; i < 5; i++) {
            const requiredLevel = 1 + i * 4;
            const isUnlocked = (charData.level >= requiredLevel);

            const relicBg = this.add.rectangle(relicStartX, ry, relicWidth, 30, 0x111111, 0.8).setOrigin(0, 0);
            if (isUnlocked) {
                relicBg.setInteractive();
                relicBg.on('pointerdown', () => {
                    this.scene.pause();
                    this.scene.launch('EquipmentScene', { charId, itemType: 'relic', slotIndex: i, parentScene: 'RestScene' });
                    this.scene.bringToTop('EquipmentScene');
                });
            }
            this.detailViewContainer.add(relicBg);
            
            let relicText = `${i+1}. 装備なし`;
            let rColor = '#777777';

            if (!isUnlocked) {
                relicText = `${i+1}. レベル${requiredLevel}で装備可能`;
                rColor = '#ffffff';
                const rEmptyText = this.add.text(relicStartX + 10, ry + 5, relicText, { fontFamily: FONT_MAIN, fontSize: fontSize.body(width), color: rColor });
                this.detailViewContainer.add(rEmptyText);
            } else if (charData.equipRelics && charData.equipRelics[i]) {
                const r = charData.equipRelics[i];
                rColor = this.getRankColor(r.rank);
                
                const rName = r.name || 'Unknown';
                const rankStr = this.getRankString(r.rank || 1);
                const rNameText = this.add.text(relicStartX + 10, ry + 5, `[${rankStr}] ${rName}`, { fontFamily: FONT_MAIN, fontSize: fontSize.body(width), color: rColor }).setInteractive();
                rNameText.on('pointerdown', () => relicBg.emit('pointerdown'));
                this.detailViewContainer.add(rNameText);
            } else {
                const rEmptyText = this.add.text(relicStartX + 10, ry + 5, relicText, { fontFamily: FONT_MAIN, fontSize: fontSize.body(width), color: rColor }).setInteractive();
                rEmptyText.on('pointerdown', () => relicBg.emit('pointerdown'));
                this.detailViewContainer.add(rEmptyText);
            }
            
            ry += 35;
        }
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
}

