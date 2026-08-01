import Phaser from 'phaser';
import { GlobalState } from '../systems/GlobalState';
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
            }).setOrigin(0.5).setDepth(9999);
            this.time.delayedCall(2000, () => text.destroy());
        });

        // UIコンテナ
        this.mainViewContainer = this.add.container(0, 0);
        this.detailViewContainer = this.add.container(0, 0);
        this.detailViewContainer.setVisible(false);
        this.elementResistContainer = this.add.container(0, 0);
        this.elementResistContainer.setVisible(false);

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

        // 戻るボタン (トップレベル -> マップに戻る)
        const backBtn = this.add.text(width * 0.05, height * 0.02, '◀ 戻る', {
            stroke: '#000000', strokeThickness: 3, fontFamily: 'sans-serif', fontSize: '24px', color: '#ffaaaa', backgroundColor: '#333333'
        }).setInteractive().setPadding(10);
        backBtn.on('pointerdown', () => {
            this.sound.stopAll();
            // AdventureSceneを再開
            this.scene.resume('AdventureScene');
            this.scene.stop();
        });
        this.mainViewContainer.add(backBtn);
        
        // タイトル
        this.mainViewContainer.add(this.add.text(width / 2, height * 0.04, 'キャンプ画面', {
            stroke: '#000000', strokeThickness: 3, fontFamily: 'sans-serif', fontSize: '28px', color: '#ffffff'
        }).setOrigin(0.5, 0.5));

        // ストック経験値（トップ右上からは削除し、右下に移動する）

        // 隊列編成ボタン
        const formationBtn = this.add.text(width / 2 + 180, height * 0.04, '隊列編成', {
            stroke: '#000000', strokeThickness: 3, fontFamily: 'sans-serif', fontSize: '20px', color: '#ffffff', backgroundColor: '#555555', padding: { x: 10, y: 5 }
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
            const barWidth = width * 0.55; // 画面幅の半分くらい

            // 名前 & Lv
            this.mainViewContainer.add(this.add.text(textX, cy - rowHeight * 0.25, `${charData.name} Lv.${charData.level}`, {
                stroke: '#000000', strokeThickness: 3, fontFamily: 'sans-serif', fontSize: '24px', color: '#ffffff', fontStyle: 'bold'
            }).setOrigin(0, 0.5));

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

        });
        
        // ストック経験値を右下に配置
        const stockExpText = this.add.text(width - 20, height - 20, `ストックSP: ${this.globalState.stockSp}　ストックEXP: ${this.globalState.stockExp}`, { stroke: '#000000', strokeThickness: 3, fontSize: '20px', color: '#ffffaa' }).setOrigin(1, 1);
        this.mainViewContainer.add(stockExpText);
        
        // 「影響」ボタンを左下に配置
        const effectBtn = this.add.text(20, height - 20, '影響', {
            fontSize: '20px', backgroundColor: '#333333', color: '#ffffff'
        }).setPadding(10).setOrigin(0, 1).setInteractive();
        
        effectBtn.on('pointerdown', () => {
            this.showEffectView(width, height);
        });
        this.mainViewContainer.add(effectBtn);
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
        this.friendshipViewContainer.add(this.add.text(width * 0.1, ry, `${charData.name} の友好度`, { stroke: '#000000', strokeThickness: 3, fontSize: '28px', fontStyle: 'bold' }));
        ry += 40;
        
        // 友好度ボーナス
        const bonusText = this.add.text(width * 0.1, ry, `友好度ボーナスポイント: ${charData.friendshipPoints || 0}`, { stroke: '#000000', strokeThickness: 3, fontSize: '20px', color: '#ffffaa' });
        this.friendshipViewContainer.add(bonusText);
        ry += 50;

        // リスト描画
        const metChars = charData.metCharacters || [];
        if (metChars.length === 0) {
            this.friendshipViewContainer.add(this.add.text(width * 0.1, ry, '一緒に編成したキャラクターがいません', { stroke: '#000000', strokeThickness: 3, fontSize: '18px', color: '#aaaaaa' }));
        } else {
            for (const otherId of metChars) {
                if (otherId === charId) continue;
                const otherChar = this.globalState.characters[otherId];
                if (!otherChar) continue;

                const fVal = (charData.friendships && charData.friendships[otherId]) ? charData.friendships[otherId] : 0;
                
                // 顔アイコンの代わりに名前
                const rowText = this.add.text(width * 0.1, ry, `${otherChar.name}  友好度: ${fVal}`, { stroke: '#000000', strokeThickness: 3, fontSize: '22px' });
                this.friendshipViewContainer.add(rowText);

                // ハートボタン
                const heartBtn = this.add.text(width * 0.6, ry, '❤️', { stroke: '#000000', strokeThickness: 3, fontSize: '24px' }).setInteractive();
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

    showElementResistanceView(charId, width, height) {
        this.detailViewContainer.setVisible(false);
        this.elementResistContainer.removeAll(true);
        this.elementResistContainer.setVisible(true);

        const charData = this.globalState.characters[charId];
        
        // 戻るボタン
        const backBtn = this.add.text(width * 0.05, height * 0.02, '◀ 戻る', {
            stroke: '#000000', strokeThickness: 3, fontFamily: 'sans-serif', fontSize: '24px', color: '#ffaaaa', backgroundColor: '#333333'
        }).setInteractive().setPadding(10);
        backBtn.on('pointerdown', () => {
            this.elementResistContainer.setVisible(false);
            this.detailViewContainer.setVisible(true);
        });
        this.elementResistContainer.add(backBtn);

        // Header
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
            const modVal = elemMods[e.id] || 0;
            // 標準相性100%からの変化、または装備・宝石等の効果(modVal)がある場合はオレンジ色(#ff9900)
            const isDefBoosted = (defVal !== 100) || (modVal !== 0);

            // 属性別防御力
            this.elementResistContainer.add(this.add.image(width * 0.1, ry + 12, e.icon).setScale(0.15));
            this.elementResistContainer.add(this.add.text(width * 0.15, ry, `${e.name}: ${defVal}%`, {
                stroke: '#000000', strokeThickness: 3, fontSize: '22px',
                color: isDefBoosted ? '#ff9900' : '#ffffff'
            }));
            
            // 属性別デバフ抵抗力
            this.elementResistContainer.add(this.add.image(width * 0.4, dry + 12, e.icon).setScale(0.15));
            this.elementResistContainer.add(this.add.text(width * 0.45, dry, `${e.name}: ${defVal}%`, {
                stroke: '#000000', strokeThickness: 3, fontSize: '22px',
                color: isDefBoosted ? '#ff9900' : '#ffffff'
            }));
            
            ry += 35;
            dry += 35;
        });


        // Center bottom image and text
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
            stroke: '#000000', strokeThickness: 3, fontFamily: 'sans-serif', fontSize: '24px', color: '#ffaaaa', backgroundColor: '#333333'
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
        const getElementImage = (id) => {
            switch(id) {
                case '001': return 'em_2'; // 混沌
                case '002': return 'em_5'; // 統制
                case '003': return 'em_1'; // 情熱
                case '004': return 'em_4'; // 犠牲
                case '005': return 'em_3'; // 調和
                default: return 'em_1';
            }
        };
        const elementIcon = this.add.image(rx - 25, ry + 16, getElementImage(charId)).setScale(0.15).setInteractive({ useHandCursor: true });
        this.detailViewContainer.add(elementIcon);
        elementIcon.on('pointerdown', () => {
            this.showElementResistanceView(charId, width, height);
        });

        this.detailViewContainer.add(this.add.text(rx, ry, `${charData.name}`, { stroke: '#000000', strokeThickness: 3, fontSize: '32px', color: '#ffffff', fontStyle: 'bold' }));
        this.detailViewContainer.add(this.add.text(rx + 150, ry + 6, `Lv.${charData.level}`, { stroke: '#000000', strokeThickness: 3, fontSize: '24px', color: '#aaffaa' }));
        ry += lineSpacing * 0.8;

        // 2行目: 経験値
        const expBonus = stats.expBonus || 0;
        const expBonusStr = expBonus > 0 ? ` (+${expBonus}%)` : '';
        this.detailViewContainer.add(this.add.text(rx, ry, `EXP: ${charData.exp}/${reqExp}${expBonusStr}`, {
            stroke: '#000000', strokeThickness: 3, fontSize: '18px',
            color: expBonus > 0 ? '#ff9900' : '#ffffff',
            padding: { top: 4, bottom: 4 }
        }));
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
        ry += lineSpacing * 0.9;

        // 4行目: 親愛度・友好度ボタン
        const affectionValue = stats.affection || 0;
        this.detailViewContainer.add(this.add.text(rx, ry + 5, `親愛度: ${affectionValue}`, { stroke: '#000000', strokeThickness: 3, fontSize: '18px' }));
        const friendshipBtn = this.add.text(rx + 120, ry, '友好度をみる', {
            fontSize: '18px', backgroundColor: '#3333aa', color: '#ffffff'
        }).setPadding(6).setInteractive();
        friendshipBtn.on('pointerdown', () => {
            this.showFriendshipView(charId, width, height);
        });
        this.detailViewContainer.add(friendshipBtn);
        ry += lineSpacing * 0.8;

        const hpDiff = stats.maxHp - baseStats.maxHp;
        const spDiff = stats.maxSp - baseStats.maxSp;
        const atkDiff = stats.atk - baseStats.atk;
        const reloadDiff = stats.reload - baseStats.reload;
        const formatDiff = (d) => d === 0 ? '' : ` (${d>0?'+':''}${d})`;

        // 5行目: 各種ステータス1 (生命力 / 精神力)
        this.detailViewContainer.add(this.add.text(rx, ry, `生命力: ${Math.floor(charData.currentHp)}/${stats.maxHp}${formatDiff(hpDiff)}`, { stroke: '#000000', strokeThickness: 3, fontSize: '18px', padding: { top: 4, bottom: 4 } }));
        ry += lineSpacing * 0.7;
        this.detailViewContainer.add(this.add.text(rx, ry, `精神力: ${Math.floor(charData.currentSp)}/${stats.maxSp}${formatDiff(spDiff)}`, { stroke: '#000000', strokeThickness: 3, fontSize: '18px', padding: { top: 4, bottom: 4 } }));
        ry += lineSpacing * 0.7;

        // 6行目: 各種ステータス2 (攻撃力 / リロード)
        this.detailViewContainer.add(this.add.text(rx, ry, `攻撃力: ${stats.atk}${formatDiff(atkDiff)}`, { stroke: '#000000', strokeThickness: 3, fontSize: '18px', padding: { top: 4, bottom: 4 } }));
        ry += lineSpacing * 0.7;
        this.detailViewContainer.add(this.add.text(rx, ry, `リロード速度: ${stats.reload}${formatDiff(reloadDiff)}`, { stroke: '#000000', strokeThickness: 3, fontSize: '18px', padding: { top: 4, bottom: 4 } }));
        ry += lineSpacing * 0.7;
        
        const hitBonus = Math.floor((stats.hitRateBonus || 0) * 100);
        const hitRateStr = `100%`;
        const hitRateDiffStr = hitBonus !== 0 ? ` (${hitBonus > 0 ? '+' : ''}${hitBonus})` : '';
        this.detailViewContainer.add(this.add.text(rx, ry, `命中率: ${hitRateStr}${hitRateDiffStr}`, { stroke: '#000000', strokeThickness: 3, fontSize: '18px', padding: { top: 4, bottom: 4 } }));
        ry += lineSpacing * 0.7;

        const evadeBonus = Math.floor((stats.evadeRateBonus || 0) * 100);
        const evadeRateStr = `0%`;
        const evadeRateDiffStr = evadeBonus !== 0 ? ` (${evadeBonus > 0 ? '+' : ''}${evadeBonus})` : '';
        this.detailViewContainer.add(this.add.text(rx, ry, `回避率: ${evadeRateStr}${evadeRateDiffStr}`, { stroke: '#000000', strokeThickness: 3, fontSize: '18px', padding: { top: 4, bottom: 4 } }));
        ry += lineSpacing * 0.7;
        
        const critBonus = Math.floor((stats.critRateBonus || 0) * 100);
        const critRateStr = `5%`;
        const critRateDiffStr = critBonus !== 0 ? ` (${critBonus > 0 ? '+' : ''}${critBonus})` : '';
        this.detailViewContainer.add(this.add.text(rx, ry, `クリティカル率: ${critRateStr}${critRateDiffStr}`, { stroke: '#000000', strokeThickness: 3, fontSize: '18px', padding: { top: 4, bottom: 4 } }));
        ry += lineSpacing * 0.7;
        
        const critMultBonus = Math.floor((stats.critMultBonus || 0) * 100);
        const critMultStr = `100%`;
        const critMultDiffStr = critMultBonus !== 0 ? ` (${critMultBonus > 0 ? '+' : ''}${critMultBonus})` : '';
        this.detailViewContainer.add(this.add.text(rx, ry, `クリティカル倍率: ${critMultStr}${critMultDiffStr}`, { stroke: '#000000', strokeThickness: 3, fontSize: '18px', padding: { top: 4, bottom: 4 } }));
        ry += lineSpacing * 0.7;

        // 7行目: 各種ステータス3 (近接 / 遠隔)
        const effMelee = stats.meleeLevel || charData.meleeLevel;
        const effRanged = stats.rangedLevel || charData.rangedLevel;
        const isMeleeBoosted = effMelee > charData.meleeLevel;
        const isRangedBoosted = effRanged > charData.rangedLevel;

        this.detailViewContainer.add(this.add.text(rx, ry, `近接: Lv${effMelee}`, {
            stroke: '#000000', strokeThickness: 3, fontSize: '18px',
            color: isMeleeBoosted ? '#ff9900' : '#ffffff',
            padding: { top: 4, bottom: 4 }
        }));
        this.detailViewContainer.add(this.add.text(rx + 130, ry, `遠隔: Lv${effRanged}`, {
            stroke: '#000000', strokeThickness: 3, fontSize: '18px',
            color: isRangedBoosted ? '#ff9900' : '#ffffff',
            padding: { top: 4, bottom: 4 }
        }));
        ry += lineSpacing * 1.0;


        // 8行目: 宝石
        this.detailViewContainer.add(this.add.text(rx, ry, '装備中の宝石', { stroke: '#000000', strokeThickness: 3, fontSize: '18px', color: '#aaaaaa' }));
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
            this.scene.launch('EquipmentScene', { charId, itemType: 'gem', slotIndex: 0 });
            this.scene.bringToTop('EquipmentScene');
        });
        
        this.detailViewContainer.add(gemBg);
        
        const gemNameText = this.add.text(rx + 10, ry + 5, gemText, { stroke: '#000000', strokeThickness: 3, fontSize: '18px', color: gemColor, padding: { top: 4, bottom: 4 } }).setInteractive();
        gemNameText.on('pointerdown', () => gemBg.emit('pointerdown'));
        this.detailViewContainer.add(gemNameText);
        
        ry += 40;

        // 9行目: レリクス
        this.detailViewContainer.add(this.add.text(rx, ry, 'レリクス', { stroke: '#000000', strokeThickness: 3, fontSize: '18px' }));
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
                    this.scene.launch('EquipmentScene', { charId, itemType: 'relic', slotIndex: i });
                    this.scene.bringToTop('EquipmentScene');
                });
            }
            this.detailViewContainer.add(relicBg);
            
            let relicText = `${i+1}. 装備なし`;
            let rColor = '#777777';

            if (!isUnlocked) {
                relicText = `${i+1}. レベル${requiredLevel}で装備可能`;
                rColor = '#ffffff';
                const rEmptyText = this.add.text(relicStartX + 10, ry + 5, relicText, { stroke: '#000000', strokeThickness: 3, fontFamily: FONT_MAIN, fontSize: fontSize.body(width), color: rColor });
                this.detailViewContainer.add(rEmptyText);
            } else if (charData.equipRelics && charData.equipRelics[i]) {
                const r = charData.equipRelics[i];
                rColor = this.getRankColor(r.rank);
                
                const rName = r.name || 'Unknown';
                const rankStr = this.getRankString(r.rank || 1);
                const rNameText = this.add.text(relicStartX + 10, ry + 5, `[${rankStr}] ${rName}`, { stroke: '#000000', strokeThickness: 3, fontFamily: FONT_MAIN, fontSize: fontSize.body(width), color: rColor }).setInteractive();
                rNameText.on('pointerdown', () => relicBg.emit('pointerdown'));
                this.detailViewContainer.add(rNameText);
            } else {
                const rEmptyText = this.add.text(relicStartX + 10, ry + 5, relicText, { stroke: '#000000', strokeThickness: 3, fontFamily: FONT_MAIN, fontSize: fontSize.body(width), color: rColor }).setInteractive();
                rEmptyText.on('pointerdown', () => relicBg.emit('pointerdown'));
                this.detailViewContainer.add(rEmptyText);
            }
            
            ry += 35;
        }

        // ストック経験値を右下に配置
        const stockExpText = this.add.text(width - 20, height - 20, `ストックSP: ${this.globalState.stockSp}　ストックEXP: ${this.globalState.stockExp}`, { stroke: '#000000', strokeThickness: 3, fontSize: '20px', color: '#ffffaa' }).setOrigin(1, 1);
        this.detailViewContainer.add(stockExpText);

        // 「影響」ボタンを左下に配置
        const effectBtn = this.add.text(20, height - 20, '影響', {
            fontSize: '20px', backgroundColor: '#333333', color: '#ffffff'
        }).setPadding(10).setOrigin(0, 1).setInteractive();
        
        effectBtn.on('pointerdown', () => {
            this.showEffectView(width, height);
        });
        this.detailViewContainer.add(effectBtn);
    }

    showEffectView(width, height) {
        const container = this.add.container(0, 0);
        container.setDepth(100);
        
        const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.8).setOrigin(0, 0).setInteractive();
        container.add(bg);
        
        bg.on('pointerdown', () => {
            container.destroy();
        });
        
        const padding = 20;
        let y = padding;
        const fontSizePx = Math.floor(width / 25);
        
        const titleText = this.add.text(width/2, y, '現在受けているタロットの影響', { stroke: '#000000', strokeThickness: 3, fontSize: '24px', color: '#ffffff' }).setOrigin(0.5, 0);
        container.add(titleText);
        y += 50;

        const tarotData = this.cache.json.get('tarot_data');
        const activeTarots = this.globalState.activeTarots || [];
        
        if (activeTarots.length === 0) {
            container.add(this.add.text(padding, y, '現在受けている影響はありません。', { stroke: '#000000', strokeThickness: 3, fontSize: `${fontSizePx}px`, color: '#aaaaaa' }));
        } else {
            for (const tarot of activeTarots) {
                let cardInfo = null;
                if (tarotData) {
                    if (tarotData[tarot.id.toString()]) {
                        cardInfo = tarotData[tarot.id.toString()];
                    } else if (tarotData.tarot && tarotData.tarot[tarot.id.toString()]) {
                        cardInfo = tarotData.tarot[tarot.id.toString()];
                    }
                }
                if (!cardInfo) continue;
                
                const posStr = tarot.isUpright ? '正位置' : '逆位置';
                const effectText = tarot.isUpright ? cardInfo.upright : cardInfo.reversed;
                
                const nameText = this.add.text(padding, y, `No.${tarot.id} ${cardInfo.name} (${posStr})`, { stroke: '#000000', strokeThickness: 3, fontSize: `${fontSizePx}px`, color: tarot.isUpright ? '#aaffaa' : '#ffaaaa', fontStyle: 'bold' });
                container.add(nameText);
                y += fontSizePx * 1.5;
                
                const descText = this.add.text(padding, y, effectText, { stroke: '#000000', strokeThickness: 3, fontSize: `${fontSizePx}px`, color: '#ffffff', wordWrap: { width: width - padding * 2 } });
                container.add(descText);
                y += descText.height + fontSizePx * 1.2;
            }
        }
        
        const closeText = this.add.text(width/2, height - 30, 'タップして閉じる', { stroke: '#000000', strokeThickness: 3, fontSize: '18px', color: '#888888' }).setOrigin(0.5, 0.5);
        container.add(closeText);
    }
}

