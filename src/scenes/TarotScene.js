import Phaser from 'phaser';
import { TransitionManager } from '../systems/TransitionManager';
import { FONT_MAIN, fontSize } from '../config/GameFont';
import { GlobalState } from '../systems/GlobalState';

export default class TarotScene extends Phaser.Scene {
    constructor() {
        super('TarotScene');
    }

    init(data) {
        this.returnScene = data.returnScene || 'AdventureScene';
        this.party = data.party || [];
    }

    create() {
        this.cameras.main.setBackgroundColor('#052210');
        TransitionManager.fadeIn(this);

        this.bgm = this.sound.add('bgm_tarot', { loop: true, volume: 0.5 });
        this.bgm.play();

        this.width = this.scale.width;
        this.height = this.scale.height;

        this.tarotData = this.cache.json.get('tarot_data');

        // Create UI layer
        this.uiContainer = this.add.container(0, 0).setDepth(100);

        this.promptText = this.add.text(this.width / 2, 80, '', {
            fontFamily: FONT_MAIN, fontSize: '32px', color: '#ffffff', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setAlpha(0);
        this.uiContainer.add(this.promptText);

        const gs = GlobalState.getInstance();
        if (!gs.drawnTarotCards) gs.drawnTarotCards = [];

        // 全22枚すでに引いて獲得している場合はタロット発生なし
        if (gs.drawnTarotCards.length >= 22) {
            console.log('[TarotScene] All 22 tarot cards already drawn. Ending scene.');
            this.time.delayedCall(10, () => this.endScene());
            return;
        }

        // 過去に選んで引いたカード(drawnTarotCards)を除外した未獲得カードのみで山札を作成
        this.tarotDeck = [];
        for (let i = 1; i <= 22; i++) {
            if (!gs.drawnTarotCards.includes(i)) {
                this.tarotDeck.push(i);
            }
        }
        Phaser.Utils.Array.Shuffle(this.tarotDeck);

        // Iキーで3枚配りなおす（インチキ機能）
        this.input.keyboard.on('keydown-I', () => {
            if (!this.canSelect) return;
            
            console.log('Redrawing Tarot Cards...');
            // 選んでいない3枚をデッキに戻して再シャッフル
            if (this.drawnCardIds && this.drawnCardIds.length > 0) {
                this.drawnCardIds.forEach(id => {
                    if (!this.tarotDeck.includes(id)) this.tarotDeck.push(id);
                });
                this.drawnCardIds = [];
            }
            Phaser.Utils.Array.Shuffle(this.tarotDeck);
            
            if (this.bgm) {
                this.bgm.stop();
                this.bgm.destroy();
            }
            this.scene.restart();
        });


        this.startCardFlowAnimation();
    }

    startCardFlowAnimation() {
        // Animation of cards passing from right to left
        const flowCount = Math.min(10, this.tarotDeck.length);
        const spacing = 150;
        
        let completedCards = 0;

        for (let i = 0; i < flowCount; i++) {
            const cardObj = this.add.image(this.width + 100 + i * spacing, this.height / 2, 'tarot_0')
                .setOrigin(0.5);
                
            // Set passing cards to be slightly smaller than 3/10
            cardObj.displayWidth = this.width * 0.2;
            cardObj.scaleY = cardObj.scaleX;

            // Add some random Y offset and rotation for organic feel
            cardObj.y += (Math.random() - 0.5) * 100;
            cardObj.rotation = (Math.random() - 0.5) * 0.5;

            this.tweens.add({
                targets: cardObj,
                x: -200,
                duration: 1500 + Math.random() * 500,
                delay: i * 100,
                ease: 'Linear',
                onComplete: () => {
                    cardObj.destroy();
                    completedCards++;
                    if (completedCards === flowCount) {
                        this.showThreeCards();
                    }
                }
            });
        }

        if (flowCount === 0) {
            this.showThreeCards();
        }
    }

    showThreeCards() {
        this.cards = [];
        this.canSelect = false;

        // Position 3 cards evenly across the screen (1/6, 1/2, 5/6)
        const positionsX = [this.width / 6, this.width / 2, this.width * 5 / 6];
        const targetWidth = this.width * 0.3; // 画面の3/10

        const gs = GlobalState.getInstance();
        if (!gs.drawnTarotCards) gs.drawnTarotCards = [];

        // 残っている山札から最大3枚を引く
        const drawCount = Math.min(3, this.tarotDeck.length);
        if (drawCount === 0) {
            console.log('[TarotScene] No undrawn tarot cards left.');
            this.endScene();
            return;
        }

        this.drawnCardIds = [];
        for (let i = 0; i < drawCount; i++) {
            this.drawnCardIds.push(this.tarotDeck.shift());
        }


        let completedTweens = 0;

        // Oキーでデバッグフラグトグル

        this.input.keyboard.on('keydown-O', () => {
            gs.tarotAllFaceUp = !gs.tarotAllFaceUp;
            console.log('Tarot All Face Up:', gs.tarotAllFaceUp);
            if (gs.tarotAllFaceUp && this.cards && this.cards.length > 0) {
                this.cards.forEach((card, idx) => {
                    card.setTexture(`tarot_${this.drawnCardIds[idx]}`);
                });
            } else if (!gs.tarotAllFaceUp && this.cards && this.cards.length > 0) {
                this.cards.forEach(card => card.setTexture('tarot_0'));
            }
        });

        for (let i = 0; i < drawCount; i++) {
            // Cards flow from left this time
            const textureKey = gs.tarotAllFaceUp ? `tarot_${this.drawnCardIds[i]}` : 'tarot_0';
            const card = this.add.image(-200, this.height / 2, textureKey)
                .setOrigin(0.5)
                .setInteractive();
                
            card.displayWidth = targetWidth;
            card.scaleY = card.scaleX;

            this.cards.push(card);

            this.tweens.add({
                targets: card,
                x: positionsX[i],
                rotation: 0,
                duration: 800,
                delay: i * 200,
                ease: 'Power2',
                onComplete: () => {
                    completedTweens++;
                    if (completedTweens === drawCount) {
                        this.promptText.setText('どれか一枚を選んでください');
                        this.tweens.add({ targets: this.promptText, alpha: 1, duration: 500 });
                        this.canSelect = true;
                        this.checkTarotTutorial();
                    }

                }
            });

            card.on('pointerdown', () => this.selectCard(i));
        }
    }

    selectCard(index) {
        if (!this.canSelect) return;
        this.canSelect = false;

        const gs = GlobalState.getInstance();
        if (gs.tarotAllFaceUp) {
            gs.tarotAllFaceUp = false; // 引くとフラグは消える
        }

        this.promptText.setAlpha(0);

        const selectedCard = this.cards[index];
        const cardId = this.drawnCardIds[index];
        const cardData = this.tarotData[cardId];

        // 選択したカードを永久獲得リスト(drawnTarotCards)に保存して山札から除外
        if (!gs.drawnTarotCards) gs.drawnTarotCards = [];
        if (!gs.drawnTarotCards.includes(cardId)) {
            gs.drawnTarotCards.push(cardId);
        }

        // 選ばれなかった残りの2枚は山札に戻して再シャッフル
        this.drawnCardIds.forEach((id, i) => {
            if (i !== index && !gs.drawnTarotCards.includes(id)) {
                this.tarotDeck.push(id);
            }
        });
        Phaser.Utils.Array.Shuffle(this.tarotDeck);

        // 50% chance of Upright vs Reversed
        const isUpright = Math.random() >= 0.5;

        // Animate out the non-selected cards
        this.cards.forEach((c, i) => {
            if (i !== index) {
                this.tweens.add({
                    targets: c,
                    alpha: 0,
                    scale: 0,
                    duration: 400,
                    onComplete: () => c.destroy()
                });
            }
        });


        const startScale = selectedCard.scaleX;
        const targetScale = startScale * 1.5; // Enlarge 1.5x from selection size

        // Move selected card to center and enlarge, flipping over
        this.tweens.add({
            targets: selectedCard,
            x: this.width / 2,
            y: this.height / 2 - 50,
            scaleX: 0, // 3D flip effect (halfway)
            scaleY: targetScale, 
            duration: 400,
            onComplete: () => {
                // Change texture to the actual card
                selectedCard.setTexture(`tarot_${cardId}`);
                if (!isUpright) {
                    selectedCard.setRotation(Math.PI); // 180 degrees reversed
                }

                // Finish flip
                this.tweens.add({
                    targets: selectedCard,
                    scaleX: targetScale, 
                    duration: 400,
                    ease: 'Back.easeOut',
                    onComplete: () => {
                        this.showCardEffect(cardData, isUpright);
                    }
                });
            }
        });
    }

    showCardEffect(cardData, isUpright) {
        const effectText = isUpright ? cardData.upright : cardData.reversed;
        const positionText = isUpright ? '正位置' : '逆位置';

        const infoBox = this.add.rectangle(this.width / 2, this.height - 180, this.width - 100, 240, 0x000000, 0.7)
            .setAlpha(0);

        const titleText = this.add.text(this.width / 2, this.height - 260, `${cardData.name} 【${positionText}】`, {
            fontFamily: FONT_MAIN, fontSize: fontSize.body(this.width), color: '#ffddaa'
        }).setOrigin(0.5).setAlpha(0);

        const charaText = this.add.text(this.width / 2, this.height - 210, `暗示: ${cardData.character}`, {
            fontFamily: FONT_MAIN, fontSize: fontSize.body(this.width), color: '#aaaaaa'
        }).setOrigin(0.5).setAlpha(0);

        const descText = this.add.text(this.width / 2, this.height - 180, effectText, {
            fontFamily: FONT_MAIN, fontSize: fontSize.body(this.width), color: '#ffffff',
            wordWrap: { width: this.width - 140, useAdvancedWrap: true },
            lineSpacing: 8
        }).setOrigin(0.5, 0).setAlpha(0);

        const tapNextText = this.add.text(this.width - 60, this.height - 60, 'tap to next', {
            fontFamily: FONT_MAIN, fontSize: fontSize.body(this.width), color: '#888888'
        }).setOrigin(1).setAlpha(0);

        this.tweens.add({
            targets: [infoBox, titleText, charaText, descText],
            alpha: 1,
            duration: 500,
            onComplete: () => {
                this.tweens.add({
                    targets: tapNextText,
                    alpha: 0.5,
                    yoyo: true,
                    repeat: -1,
                    duration: 600
                });

                // Wait for tap
                this.time.delayedCall(500, () => {
                    this.input.once('pointerdown', () => {
                        this.endScene(cardData.id, isUpright);
                    });
                });
            }
        });
    }

    endScene(drawnCardId, isUpright = true) {
        const { width, height } = this.scale;
        const whiteScreen = this.add.rectangle(width / 2, height / 2, width, height, 0xffffff)
            .setAlpha(0).setDepth(9999);
            
        this.tweens.add({
            targets: whiteScreen,
            alpha: 1,
            duration: 1000,
            onComplete: () => {
                // Save updated deck
                this.registry.set('tarotDeck', this.tarotDeck);

                // 発動中のタロット効果として登録
                GlobalState.getInstance().activeTarots.push({ id: drawnCardId, isUpright: isUpright });
                GlobalState.getInstance().applyImmediateTarotEffect(drawnCardId, isUpright);
                
                if (this.bgm) {
                    this.bgm.stop();
                    this.bgm.destroy();
                }

                // Check for join events
                const joinEvents = this.cache.json.get('join_events');
                const joinCharId = this.getCharacterId(drawnCardId);
                const alreadyInParty = joinCharId && this.party.includes(joinCharId);
                
                if (joinEvents && joinEvents[drawnCardId] && !alreadyInParty) {
                    this.scene.stop();
                    const script = joinEvents[drawnCardId];
                    this.scene.start('EventScene', { 
                        returnScene: this.returnScene,
                        events: script,
                        joinCharacterId: joinCharId,
                        fromTarot: true
                    });
                } else {
                    this.scene.stop();
                    this.scene.resume(this.returnScene, { fromTarot: true });
                }

            }
        });
    }

    getCharacterId(tarotId) {
        const map = {
            4: '004',   // 黄蘭
            9: '003',   // 紅華
            12: '002',  // 蒼樹
            15: '005'   // 李乃果
        };
        return map[tarotId] || null;
    }

    /** タロットカード引き時のチュートリアル解説オーバーレイ表示 */
    checkTarotTutorial() {
        const gs = GlobalState.getInstance();
        if (gs.isTutorialMode && !gs.tutorialTarotSeen) {
            gs.tutorialTarotSeen = true;
            this.canSelect = false; // 一時的にカードタップをロック

            const width = this.scale.width;
            const height = this.scale.height;

            // 暗い画面オーバーレイ
            const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
                .setDepth(2000).setInteractive();

            // システムデモの解説表示枠
            const boxWidth = Math.min(width * 0.88, 640);
            const boxHeight = 160;
            const boxBg = this.add.rectangle(width / 2, height / 2, boxWidth, boxHeight, 0x111122, 0.95)
                .setStrokeStyle(2, 0x00ffcc).setDepth(2001);

            const titleLabel = this.add.text(width / 2 - boxWidth / 2 + 20, height / 2 - boxHeight / 2 + 15, '💡 システム解説', {
                fontFamily: FONT_MAIN, fontSize: '16px', color: '#00ffcc', fontStyle: 'bold'
            }).setDepth(2002);

            const messages = [
                "(巡礼者たちは神秘的な力によって一日に一度、奇跡を起こすチャンスがあります。)",
                "(心の示すままカードを手に取ってください。)"
            ];
            let msgIdx = 0;

            const bodyText = this.add.text(width / 2, height / 2 + 10, messages[0], {
                fontFamily: FONT_MAIN, fontSize: '18px', color: '#ffffff',
                align: 'center', stroke: '#000000', strokeThickness: 3,
                wordWrap: { width: boxWidth - 40, useAdvancedWrap: true },
                lineSpacing: 6
            }).setOrigin(0.5, 0.5).setDepth(2002);

            const hintText = this.add.text(width / 2, height / 2 + boxHeight / 2 - 20, 'タップして次へ', {
                fontFamily: FONT_MAIN, fontSize: '13px', color: '#aaaaaa'
            }).setOrigin(0.5, 0.5).setDepth(2002);

            overlay.on('pointerdown', () => {
                msgIdx++;
                if (msgIdx < messages.length) {
                    bodyText.setText(messages[msgIdx]);
                } else {
                    // タップでチュートリアル解説枠が消え、タロット選択が可能になる
                    overlay.destroy();
                    boxBg.destroy();
                    titleLabel.destroy();
                    bodyText.destroy();
                    hintText.destroy();
                    this.canSelect = true;
                }
            });
        }
    }
}

