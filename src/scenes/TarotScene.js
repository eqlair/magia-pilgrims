import Phaser from 'phaser';
import { TransitionManager } from '../systems/TransitionManager';
import { FONT_MAIN, fontSize } from '../config/GameFont';
import { GlobalState } from '../systems/GlobalState';
import { CharacterLossManager } from '../systems/CharacterLossManager';
import { RewardService } from '../systems/RewardService';
import { FairyTradeManager } from '../systems/FairyTradeManager';
import { SaveManager } from '../systems/SaveManager';

export default class TarotScene extends Phaser.Scene {
    constructor() {
        super('TarotScene');
    }

    init(data) {
        this.returnScene = data.returnScene || 'AdventureScene';
        this.party = data.party || [];
        this.bgKey = data.bgKey || 'bg_map_base';
        this._hasRerolledTarot = false;
        // 1/100 (1%) の確率でカードがめくれてしまう大事故ハプニング！
        this.isAccidentFlow = (data && data.forceAccident) ? true : (Math.random() < 0.01);
    }

    preload() {
        if (!this.cache.json.exists('tarot_data')) {
            this.load.json('tarot_data', 'files/DATA/tarot.json');
        }
        for (let i = 0; i <= 22; i++) {
            if (!this.textures.exists(`tarot_${i}`)) {
                this.load.image(`tarot_${i}`, `files/tarot/tc (${i}).webp`);
            }
        }
        if (!this.cache.audio.exists('bgm_tarot')) {
            this.load.audio('bgm_tarot', 'files/BGM/006_TAROT.mp3');
        }
    }

    create() {
        this.cameras.main.setBackgroundColor('#052210');
        TransitionManager.fadeIn(this);

        // 前のシーン（マップ等）のBGMを確実に停止
        this.sound.stopAll();

        if (this.cache.audio.exists('bgm_tarot')) {
            this.bgm = this.sound.add('bgm_tarot', { loop: true, volume: 0.5 });
            this.bgm.play();
        }

        this.width = this.scale.width;
        this.height = this.scale.height;

        this.tarotData = this.cache.json.get('tarot_data') || {};

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
        if (GlobalState.IS_DEBUG_MODE) {
            this.input.keyboard.on('keydown-I', () => {
                if (!this.canSelect) return;
                this.scene.restart();
            });
            // Uキーで1/100の事故演出を強制発動テスト
            this.input.keyboard.on('keydown-U', () => {
                console.log('[DEBUG] Force Tarot Accident Triggered!');
                this.scene.restart({
                    forceAccident: true,
                    party: this.party,
                    returnScene: this.returnScene,
                    bgKey: this.bgKey
                });
            });
        }


        this.startCardFlowAnimation();
    }

    startCardFlowAnimation() {
        // Animation of cards passing from right to left
        const flowCount = Math.min(10, this.tarotDeck.length);
        const spacing = 150;
        
        let completedCards = 0;

        if (this.isAccidentFlow) {
            console.log('💥 [TarotScene] 1/100 Accident Mode Activated! Cards will flip over!');
            this.time.delayedCall(500, () => {
                const accidentBanner = this.add.text(this.width / 2, this.height * 0.22, '⚠️ ハプニング！カードがめくれてしまった…！', {
                    fontFamily: FONT_MAIN,
                    fontSize: '18px',
                    fontStyle: 'bold',
                    color: '#ffea00',
                    stroke: '#000000',
                    strokeThickness: 4
                }).setOrigin(0.5).setAlpha(0);
                this.tweens.add({
                    targets: accidentBanner,
                    alpha: 1,
                    scaleX: 1.1,
                    scaleY: 1.1,
                    duration: 300,
                    yoyo: true,
                    hold: 1200,
                    onComplete: () => accidentBanner.destroy()
                });
            });
        }

        for (let i = 0; i < flowCount; i++) {
            const cardObj = this.add.image(this.width + 100 + i * spacing, this.height / 2, 'tarot_0')
                .setOrigin(0.5);
                
            // Set passing cards to be slightly smaller than 3/10
            cardObj.displayWidth = this.width * 0.2;
            cardObj.scaleY = cardObj.scaleX;

            // Add some random Y offset and rotation for organic feel
            cardObj.y += (Math.random() - 0.5) * 100;
            cardObj.rotation = (Math.random() - 0.5) * 0.5;

            // 事故モードの場合、画面中央あたりを通過するときにパタッと表向きにめくれる！
            if (this.isAccidentFlow) {
                const flipDelay = (i * 100) + 400;
                this.time.delayedCall(flipDelay, () => {
                    if (!cardObj || !cardObj.scene) return;
                    this.tweens.add({
                        targets: cardObj,
                        scaleX: 0,
                        duration: 120,
                        onComplete: () => {
                            if (!cardObj || !cardObj.scene) return;
                            const sampleId = this.tarotDeck[i % this.tarotDeck.length] || 1;
                            cardObj.setTexture(`tarot_${sampleId}`);
                            if (i % 2 === 1) cardObj.setRotation(cardObj.rotation + Math.PI);
                            this.tweens.add({
                                targets: cardObj,
                                scaleX: cardObj.scaleY,
                                duration: 120
                            });
                        }
                    });
                });
            }

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

    /**
     * 👥 現在の状況で引いた時に新しく仲間になるタロットカードIDのリストを取得
     */
    getAvailableJoinTarotIds() {
        const gs = GlobalState.getInstance();
        const available = [];
        const candidates = [
            { tarotId: 4, charId: '004' },  // 黄蘭 (女帝)
            { tarotId: 9, charId: '003' },  // 紅華 (力)
            { tarotId: 12, charId: '002' }, // 蒼樹 (正義)
            { tarotId: 15, charId: '005' }, // 李乃果 (節制)
            { tarotId: 1, charId: '007', req: () => gs.hasEnteredTower }, // ななよ (愚者)
            { tarotId: 5, charId: '008', req: () => gs.hasEnteredTower }, // ノア (皇帝)
            { tarotId: 10, charId: '011', req: () => (gs.loopCount >= 2) || !!(gs.characters?.['011']?.hasAccompanied) }, // 白蓮 (隠者)
            { tarotId: 16, charId: '010', req: () => gs.tower21BossDefeated } // プロセル (悪魔)
        ];

        const currentParty = (this.party || []).map(id => gs.normalizeCharId ? gs.normalizeCharId(id) : id);
        const lostChars = (gs.lostCharacterIdsInCurrentLoop || []).map(id => gs.normalizeCharId ? gs.normalizeCharId(id) : id);

        for (const c of candidates) {
            const normCId = gs.normalizeCharId ? gs.normalizeCharId(c.charId) : c.charId;
            // すでに獲得済みのタロットなら除外
            if (gs.drawnTarotCards && gs.drawnTarotCards.includes(c.tarotId)) continue;
            // すでにパーティにいるなら除外
            if (currentParty.includes(normCId)) continue;
            // 今周回で離脱/ロスト済みなら除外
            if (lostChars.includes(normCId)) continue;
            // 個別のタロット解放条件を満たしていないなら除外
            if (c.req && !c.req()) continue;

            // 山札（tarotDeck）に入っているか確認
            if (this.tarotDeck && this.tarotDeck.includes(c.tarotId)) {
                available.push(c.tarotId);
            }
        }
        return available;
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

        // ① 1周目かつ12/3以降に 蒼樹(002)・紅華(003)・黄蘭(004) が誰もいない場合の救済判定（12/1〜12/2は完全ランダム自引き）
        const isFirstLoop = (gs.loopCount || 1) <= 1;
        const isTargetDay = (gs.currentDay || 1) >= 3;
        const hasSpecificMember = (this.party || []).includes('002') || (this.party || []).includes('003') || (this.party || []).includes('004') ||
                                  !!(gs.characters?.['002']?.hasAccompanied) ||
                                  !!(gs.characters?.['003']?.hasAccompanied) ||
                                  !!(gs.characters?.['004']?.hasAccompanied);

        const isGuaranteeMode = isFirstLoop && isTargetDay && !hasSpecificMember;

        this.drawnCardIds = [];
        if (isGuaranteeMode) {
            // 黄蘭: 4 (女帝), 紅華: 9 (力), 蒼樹: 12 (正義)
            const guaranteePool = [4, 9, 12].filter(id => {
                const cId = id === 4 ? '004' : (id === 9 ? '003' : '002');
                const isLost = gs.lostCharacterIdsInCurrentLoop && gs.lostCharacterIdsInCurrentLoop.includes(cId);
                return !gs.drawnTarotCards.includes(id) && !isLost;
            });
            if (guaranteePool.length > 0) {
                Phaser.Utils.Array.Shuffle(guaranteePool);
                for (let i = 0; i < drawCount; i++) {
                    this.drawnCardIds.push(guaranteePool[i % guaranteePool.length]);
                }
                // 山札から提示カードを取り除く
                this.tarotDeck = this.tarotDeck.filter(id => !this.drawnCardIds.includes(id));
                console.log('[TarotScene] Guarantee Mode Activated! Drawn Cards:', this.drawnCardIds);
            }
        }

        // ② 【新規】パーティが1〜2人の時の仲間保証枠（3枚のうち最低1枚は仲間カードにする）
        if (this.drawnCardIds.length === 0 && (this.party || []).length <= 2) {
            const joinCandidates = this.getAvailableJoinTarotIds();
            if (joinCandidates.length > 0) {
                Phaser.Utils.Array.Shuffle(joinCandidates);
                const guaranteedJoinCard = joinCandidates[0]; // 仲間カードを1枚ピックアップ
                // 山札からこのカードを取り除く
                this.tarotDeck = this.tarotDeck.filter(id => id !== guaranteedJoinCard);

                const pickedCards = [guaranteedJoinCard];
                // 残り(drawCount - 1)枚を山札から引く
                const remainingNeeded = drawCount - 1;
                for (let i = 0; i < remainingNeeded; i++) {
                    if (this.tarotDeck.length > 0) {
                        pickedCards.push(this.tarotDeck.shift());
                    }
                }
                // 3枚をシャッフルして並び順をランダムにする
                Phaser.Utils.Array.Shuffle(pickedCards);
                this.drawnCardIds = pickedCards;
                console.log(`[TarotScene] Small Party Join Guarantee (Party: ${(this.party || []).length}人): Guaranteed Card ${guaranteedJoinCard}, Result:`, this.drawnCardIds);
            }
        }

        // ③ 通常ドロー（救済モード外またはフォールバック）
        if (this.drawnCardIds.length === 0) {
            for (let i = 0; i < drawCount; i++) {
                this.drawnCardIds.push(this.tarotDeck.shift());
            }
        }

        // 事故モードの場合、3枚それぞれの正位置/逆位置をあらかじめ決定
        if (this.isAccidentFlow) {
            this.accidentCardStates = this.drawnCardIds.map(id => ({
                id: id,
                isUpright: Math.random() >= 0.5
            }));
            this.accidentDescElements = [];
        }

        let completedTweens = 0;

        // Oキーでデバッグフラグトグル (デバッグモード時のみ)
        if (GlobalState.IS_DEBUG_MODE) {
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
        }

        for (let i = 0; i < drawCount; i++) {
            const cId = this.drawnCardIds[i];
            const isAccident = !!this.isAccidentFlow;
            const accidentState = isAccident ? this.accidentCardStates[i] : null;

            // テクスチャ: 事故モードまたはデバッグ全表モードなら表向き
            const isFaceUp = (isAccident || gs.tarotAllFaceUp);
            const textureKey = isFaceUp ? `tarot_${cId}` : 'tarot_0';
            const targetRotation = (isAccident && accidentState && !accidentState.isUpright) ? Math.PI : 0;

            const card = this.add.image(-200, this.height / 2 - (isAccident ? 40 : 0), textureKey)
                .setOrigin(0.5)
                .setInteractive();
                
            card.displayWidth = targetWidth;
            card.scaleY = card.scaleX;
            if (targetRotation !== 0) {
                card.setRotation(targetRotation);
            }

            this.cards.push(card);

            // 事故モードの場合、各カードの下に効果説明UIを作成
            if (isAccident && accidentState) {
                const cardData = this.tarotData[cId] || {
                    id: cId,
                    name: `タロット No.${cId}`,
                    upright: '効果なし',
                    reversed: '効果なし'
                };
                const isU = accidentState.isUpright;
                const posName = isU ? '【正位置】' : '【逆位置】';
                const effText = isU ? cardData.upright : cardData.reversed;
                const textColor = isU ? '#44ffaa' : '#ff7788';

                const descBox = this.add.container(positionsX[i], this.height / 2 + 85).setAlpha(0);
                
                const boxW = Math.min(this.width * 0.31, 230);
                const bgRect = this.add.rectangle(0, 0, boxW, 85, 0x051510, 0.9)
                    .setStrokeStyle(1.5, isU ? 0x44ffaa : 0xff5566, 0.9)
                    .setOrigin(0.5, 0);

                const titleTxt = this.add.text(0, 6, `${cardData.name} ${posName}`, {
                    fontFamily: FONT_MAIN, fontSize: '11px', fontStyle: 'bold',
                    color: textColor, align: 'center', stroke: '#000000', strokeThickness: 2
                }).setOrigin(0.5, 0);

                const bodyTxt = this.add.text(0, 26, effText, {
                    fontFamily: FONT_MAIN, fontSize: '10px', color: '#ffffff',
                    align: 'center', stroke: '#000000', strokeThickness: 2,
                    wordWrap: { width: boxW - 10, useAdvancedWrap: true }
                }).setOrigin(0.5, 0);

                descBox.add([bgRect, titleTxt, bodyTxt]);
                this.accidentDescElements.push(descBox);
            }

            this.tweens.add({
                targets: card,
                x: positionsX[i],
                rotation: targetRotation,
                duration: 800,
                delay: i * 200,
                ease: 'Power2',
                onComplete: () => {
                    completedTweens++;
                    if (completedTweens === drawCount) {
                        const promptMsg = isAccident
                            ? '⚠️ ハプニング！表向きのカードから一枚選んでください'
                            : 'どれか一枚を選んでください';
                        this.promptText.setText(promptMsg);
                        if (isAccident) {
                            this.promptText.setColor('#ffff66');
                        }
                        this.tweens.add({ targets: this.promptText, alpha: 1, duration: 500 });

                        // 説明UIもフェードイン
                        if (this.accidentDescElements && this.accidentDescElements.length > 0) {
                            this.tweens.add({ targets: this.accidentDescElements, alpha: 1, duration: 500 });
                        }

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

        // 事故モードの説明UIをフェードアウト＆破棄
        if (this.accidentDescElements && this.accidentDescElements.length > 0) {
            this.tweens.add({
                targets: this.accidentDescElements,
                alpha: 0,
                duration: 300,
                onComplete: () => {
                    if (this.accidentDescElements) {
                        this.accidentDescElements.forEach(el => el.destroy());
                        this.accidentDescElements = [];
                    }
                }
            });
        }

        const selectedCard = this.cards[index];
        const cardId = this.drawnCardIds[index];
        if (!this.tarotData) {
            this.tarotData = this.cache.json.get('tarot_data') || {};
        }
        const cardData = this.tarotData[cardId] || {
            id: cardId,
            name: `タロット No.${cardId}`,
            character: '',
            upright: '効果なし',
            reversed: '効果なし'
        };
        this._selectedCardObj = selectedCard;

        // 選ばれなかった残りの2枚を保持（引き直し用）
        this._otherCardIds = this.drawnCardIds.filter((_, i) => i !== index);

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

        // 正位置/逆位置の判定: 事故モードの場合はすでに決まっている向きをそのまま使用！
        const isUpright = (this.isAccidentFlow && this.accidentCardStates && this.accidentCardStates[index])
            ? this.accidentCardStates[index].isUpright
            : (Math.random() >= 0.5);

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
        const targetScale = Math.abs(startScale) * 1.5; // Enlarge 1.5x from selection size

        // 事故モードの場合はすでに表向きなので、フリップ反転せずそのまま中央へスムーズに拡大移動！
        if (this.isAccidentFlow) {
            this.tweens.add({
                targets: selectedCard,
                x: this.width / 2,
                y: this.height / 2 - 50,
                scaleX: targetScale,
                scaleY: targetScale,
                rotation: isUpright ? 0 : Math.PI,
                duration: 450,
                ease: 'Back.easeOut',
                onComplete: () => {
                    this.showCardEffect(cardData, isUpright);
                }
            });
            return;
        }

        // 通常モード: 中央へ移動してカードを3Dフリップ反転オープン！
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
        const gs = GlobalState.getInstance();
        const effectText = isUpright ? cardData.upright : cardData.reversed;
        const positionText = isUpright ? '正位置' : '逆位置';

        const infoBox = this.add.rectangle(this.width / 2, this.height - 180, this.width - 100, 240, 0x000000, 0.7)
            .setAlpha(0);

        const titleText = this.add.text(this.width / 2, this.height - 240, `${cardData.name} 【${positionText}】`, {
            fontFamily: FONT_MAIN, fontSize: fontSize.body(this.width), color: '#ffddaa'
        }).setOrigin(0.5).setAlpha(0);

        const descText = this.add.text(this.width / 2, this.height - 190, effectText, {
            fontFamily: FONT_MAIN, fontSize: fontSize.body(this.width), color: '#ffffff',
            wordWrap: { width: this.width - 140, useAdvancedWrap: true },
            lineSpacing: 8
        }).setOrigin(0.5, 0).setAlpha(0);

        const tapNextText = this.add.text(this.width - 60, this.height - 60, 'tap to next', {
            fontFamily: FONT_MAIN, fontSize: fontSize.body(this.width), color: '#888888'
        }).setOrigin(1).setAlpha(0);

        let rerollBtn = null;
        let restingNoticeText = null;
        let isConfirmed = false;

        // 🧚‍♀️ リフィエル解放済みの場合、残りの2枚を表にして選び直す取引ボタンを表示！(0時更新・1日1回・取引後30分休憩)
        const isFairyResting = FairyTradeManager.isFairyOnCooldown();
        const isTradeUsedToday = FairyTradeManager.isTradeUsedToday('tarot_reroll');
        const canTarotTrade = gs.hasMetFairy && !this._hasRerolledTarot && !isTradeUsedToday && !isFairyResting && this._otherCardIds && this._otherCardIds.length === 2;

        if (canTarotTrade) {
            const isVip = !!gs.hasNoAdsPass;
            const btnLabel = isVip
                ? '🧚‍♀️ 妖精の取引：残りのカードを表にして選び直す (✨VIP即時)'
                : '🧚‍♀️ 妖精の取引：残りのカードを表にして選び直す (🎬広告)';

            rerollBtn = this.add.text(this.width / 2, this.height - 75, btnLabel, {
                fontFamily: FONT_MAIN,
                fontSize: '14px',
                fontStyle: 'bold',
                color: isVip ? '#ffeeaa' : '#ffea00',
                backgroundColor: '#221144ee',
                padding: { x: 12, y: 7 }
            }).setOrigin(0.5).setAlpha(0).setDepth(500).setInteractive({ useHandCursor: true });

            rerollBtn.on('pointerdown', (pointer) => {
                if (isConfirmed) return;
                isConfirmed = true;
                RewardService.showRewardAd(this, {
                    title: '運命の再選択',
                    rewardDescription: '残り2枚のタロットを表にして引き直す',
                    onReward: () => {
                        this._hasRerolledTarot = true;
                        FairyTradeManager.recordTrade('tarot_reroll');
                        // 現在のカードUIを破棄
                        infoBox.destroy();
                        titleText.destroy();
                        descText.destroy();
                        tapNextText.destroy();
                        rerollBtn.destroy();
                        if (this._selectedCardObj) this._selectedCardObj.destroy();

                        // 選択済みリストから現在のカードを解除
                        const idx = gs.drawnTarotCards.indexOf(cardData.id);
                        if (idx !== -1) gs.drawnTarotCards.splice(idx, 1);

                        // 残り2枚を表にして表示
                        this.showRerollTwoCards(this._otherCardIds);
                    },
                    onClose: () => {
                        isConfirmed = false;
                    }
                });
            });
        } else if (gs.hasMetFairy && !this._hasRerolledTarot && isFairyResting && this._otherCardIds && this._otherCardIds.length === 2) {
            // お昼寝中のため取引不可（取引ボタンは出さず、助けを呼べない絶望テキストを表示）
            const remStr = FairyTradeManager.formatCooldownTimer(FairyTradeManager.getGlobalCooldownRemainingMs());
            restingNoticeText = this.add.text(this.width / 2, this.height - 75, `🧚‍♀️ 妖精リフィエルはお昼寝中です…zzz (${remStr} / 助けを呼べない！)`, {
                fontFamily: FONT_MAIN,
                fontSize: '12px',
                color: '#ff9977',
                backgroundColor: '#2a1111cc',
                padding: { x: 10, y: 5 }
            }).setOrigin(0.5).setAlpha(0).setDepth(500);
        }

        // ⚡ 塔（正位置）のリセット逃げ防止処理
        // 妖精に助けを呼べない状態（お昼寝中、または本日使用済み、または未遭遇）で塔（正位置）が出た場合、
        // 出現した瞬間に即座に仲間離脱効果を確定させてオートセーブを実行する（タスクキル逃げを完全封殺）
        if (cardData.id === 17 && isUpright && !canTarotTrade) {
            if (!this._towerEffectAlreadyApplied) {
                this._towerEffectAlreadyApplied = true;
                this.registry.set('tarotDeck', this.tarotDeck);
                if (!gs.activeTarots.some(t => t.id === 17 && t.isUpright)) {
                    gs.activeTarots.push({ id: 17, isUpright: true });
                }
                gs.applyImmediateTarotEffect(17, true, this);
                try {
                    SaveManager.saveGame(this);
                    console.log('[TarotScene] 塔（正位置）確定：即時離脱＆オートセーブ完了（リセット逃げ封じ）');
                } catch (e) {
                    console.error('[TarotScene] 塔オートセーブ失敗:', e);
                }
            }
        }

        const uiElements = [infoBox, titleText, descText];
        if (rerollBtn) uiElements.push(rerollBtn);
        if (restingNoticeText) uiElements.push(restingNoticeText);

        this.tweens.add({
            targets: uiElements,
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
                    this.input.once('pointerdown', (pointer) => {
                        // リロールボタンのタップ時は次へ進まない
                        if (rerollBtn && rerollBtn.getBounds().contains(pointer.x, pointer.y)) {
                            return;
                        }
                        if (isConfirmed) return;
                        isConfirmed = true;
                        this.endScene(cardData.id, isUpright);
                    });
                });
            }
        });
    }

    /**
     * 🧚‍♀️ 引き直し時：残り2枚のカードを表向き（オープン）で提示して選択させる
     * ★ 正位置・逆位置があらかじめ決定された向きで並び、選んだあとも勝手にひっくり返らない！
     */
    showRerollTwoCards(otherCardIds) {
        this.promptText.setText('残りのカードから一枚を選んでください').setAlpha(1).setColor('#ffffff');
        const cardPositionsX = [this.width * 0.32, this.width * 0.68];
        const targetW = this.width * 0.28;
        const newCards = [];

        if (!this.tarotData) {
            this.tarotData = this.cache.json.get('tarot_data') || {};
        }

        // あらかじめ2枚のカードの正位置/逆位置を決定！
        const cardStates = otherCardIds.map(cId => ({
            id: cId,
            isUpright: Math.random() >= 0.5
        }));

        this._rerollDescElements = [];

        cardStates.forEach((state, i) => {
            const cId = state.id;
            const isUpright = state.isUpright;
            const cardData = this.tarotData[cId] || {
                id: cId,
                name: `タロット No.${cId}`,
                upright: '効果なし',
                reversed: '効果なし'
            };

            const cardObj = this.add.image(cardPositionsX[i], this.height / 2 - 50, `tarot_${cId}`)
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true });
            cardObj.displayWidth = targetW;
            cardObj.scaleY = cardObj.scaleX;
            cardObj.setAlpha(0);
            cardObj.setRotation(isUpright ? 0 : Math.PI); // 最初から向きを設定！

            this.tweens.add({
                targets: cardObj,
                alpha: 1,
                y: this.height / 2 - 60,
                duration: 500,
                ease: 'Back.easeOut'
            });

            // カードの下に正位置/逆位置ラベルと簡単な効果説明を表示
            const posLabel = this.add.text(cardPositionsX[i], this.height / 2 + targetW * 0.8 - 15, isUpright ? '【正位置】' : '【逆位置】', {
                fontFamily: FONT_MAIN,
                fontSize: '14px',
                fontStyle: 'bold',
                color: isUpright ? '#44ff88' : '#ff5566',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5).setAlpha(0);

            this.tweens.add({ targets: posLabel, alpha: 1, duration: 500 });
            this._rerollDescElements.push(posLabel);

            cardObj.on('pointerdown', () => {
                newCards.forEach(c => c.disableInteractive());
                this.promptText.setAlpha(0);
                if (this._rerollDescElements) {
                    this._rerollDescElements.forEach(el => el.destroy());
                    this._rerollDescElements = [];
                }

                const gs = GlobalState.getInstance();
                if (!gs.drawnTarotCards) gs.drawnTarotCards = [];
                if (!gs.drawnTarotCards.includes(cId)) {
                    gs.drawnTarotCards.push(cId);
                }

                // 選ばれなかったもう1枚はデッキへ
                const unselectedId = otherCardIds.find(id => id !== cId);
                if (unselectedId && !gs.drawnTarotCards.includes(unselectedId)) {
                    this.tarotDeck.push(unselectedId);
                    Phaser.Utils.Array.Shuffle(this.tarotDeck);
                }

                // フェードアウト他方
                newCards.forEach(c => {
                    if (c !== cardObj) {
                        this.tweens.add({ targets: c, alpha: 0, scale: 0, duration: 300, onComplete: () => c.destroy() });
                    }
                });

                this._selectedCardObj = cardObj;

                // 向きはすでに確定しているので、そのままの向き(isUpright ? 0 : Math.PI)で中央へ移動＆拡大！
                this.tweens.add({
                    targets: cardObj,
                    x: this.width / 2,
                    y: this.height / 2 - 50,
                    scaleX: cardObj.scaleX * 1.3,
                    scaleY: cardObj.scaleY * 1.3,
                    rotation: isUpright ? 0 : Math.PI,
                    duration: 400,
                    ease: 'Back.easeOut',
                    onComplete: () => {
                        this.showCardEffect(cardData, isUpright);
                    }
                });
            });

            newCards.push(cardObj);
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

                // 発動中のタロット効果として登録（リセット逃げ防止で即時適用済みの場合は二重適用をスキップ）
                const gs = GlobalState.getInstance();
                const alreadyApplied = (drawnCardId === 17 && isUpright && this._towerEffectAlreadyApplied);
                if (!alreadyApplied) {
                    gs.activeTarots.push({ id: drawnCardId, isUpright: isUpright });
                    gs.applyImmediateTarotEffect(drawnCardId, isUpright, this);
                }
                
                if (this.bgm) {
                    this.bgm.stop();
                    this.bgm.destroy();
                }
                this.sound.stopAll();

                // 塔（正位置）で仲間が離脱した場合の喪失イベント
                const removedCharId = gs.lastTowerRemovedCharId;
                if (removedCharId) {
                    if (whiteScreen) whiteScreen.destroy();
                    CharacterLossManager.triggerSingleLoss(this, removedCharId, () => {
                        this.scene.stop();
                        this.scene.resume(this.returnScene, { fromTarot: true });
                    });
                    return;
                }

                // Check for join events (パーティが5人以上の場合は出会いイベントを不発にして6人目加入を防ぐ)
                const joinEvents = this.cache.json.get('join_events');
                const joinCharId = this.getCharacterId(drawnCardId);
                const alreadyInParty = joinCharId && this.party.includes(joinCharId);
                const isPartyFull = this.party && this.party.length >= 5;

                // キャラごとのタロット加入解放条件チェック
                let isUnlockedForTarot = true;
                
                // ① ノア(008)・ななよ(007): 一度でも塔に突入したことがある実績(hasEnteredTower)が必要
                // ※ 単純に地上でリスポーンしただけでは解放されない
                if (joinCharId === '007' || joinCharId === '008') {
                    if (!gs.hasEnteredTower) {
                        isUnlockedForTarot = false;
                    }
                }

                // ② 白蓮(011): 1周目(リスポーン未経験)はタロット遭遇不可。
                // 秋葉原で探索して出会った後(hasAccompanied)か、1度以上リスポーンした後に解放
                if (joinCharId === '011') {
                    const hasMetInAkiba = !!(gs.characters?.['011']?.hasAccompanied);
                    const hasRespawned = (gs.loopCount || 1) >= 2;
                    if (!hasMetInAkiba && !hasRespawned) {
                        isUnlockedForTarot = false;
                    }
                }

                // ★ 教皇カード（ID: 6）引き時: 2周目以降かつ妖精未遭遇の場合のみ、リフィエル遭遇イベントを発火！（※仲間には加えない隠しキャラ）
                if (drawnCardId === 6) {
                    const isSecondLoopFairy = (gs.loopCount || 1) >= 2;
                    if (isSecondLoopFairy && !gs.hasMetFairy) {
                        const fairyEventRaw = this.cache.json.get('event_fairy_join');
                        if (fairyEventRaw) {
                            const fairyEvent = JSON.parse(JSON.stringify(fairyEventRaw));
                            if (fairyEvent[0] && fairyEvent[0].cmd === 'bg') {
                                fairyEvent[0].key = this.bgKey || 'bg_map_base';
                            } else {
                                fairyEvent.unshift({ cmd: 'bg', key: this.bgKey || 'bg_map_base' });
                            }
                            gs.hasMetFairy = true;
                            SaveManager.saveGame();

                            this.scene.stop();
                            this.scene.start('EventScene', {
                                returnScene: this.returnScene,
                                events: fairyEvent,
                                joinCharacterId: null, // ★ パーティには編成させない！
                                fromFairyJoinEvent: true,
                                fromTarot: true
                            });
                            return;
                        }
                    }
                    // 1周目、または既に遭遇済みの場合は仲間加入判定に進まずそのまま終了
                    this.scene.stop();
                    this.scene.resume(this.returnScene, { fromTarot: true });
                    return;
                }
                
                // ★ 悪魔カード（ID: 16）引き時: 2周目以降かつ道場未解放の場合、2RDEVILイベントを発火！
                const isSecondLoopOrLater = (gs.loopCount || 1) >= 2 || (gs.devilStockSp || 0) > 0;
                if (drawnCardId === 16 && isSecondLoopOrLater && !gs.isDojoUnlocked) {
                    const devilEventRaw = this.cache.json.get('event_2rdevil');
                    if (devilEventRaw) {
                        const devilEvent = JSON.parse(JSON.stringify(devilEventRaw));
                        const bgCmd = devilEvent.find(c => c.cmd === 'bg');
                        if (bgCmd) {
                            bgCmd.key = this.bgKey || 'bg_map_base';
                        } else {
                            devilEvent.unshift({ cmd: 'bg', key: this.bgKey || 'bg_map_base' });
                        }
                        this.scene.stop();
                        this.scene.start('EventScene', {
                            returnScene: this.returnScene,
                            events: devilEvent,
                            from2RDevilEvent: true,
                            fromTarot: true
                        });
                        return;
                    }
                }
                
                const targetChar = gs.characters ? gs.characters[joinCharId] : null;
                const charName = targetChar?.name || '仲間';
                const isReunion = !!(targetChar && (targetChar.hasAccompanied || gs.isEventSeen('join_' + joinCharId)));

                let script = null;
                if (isReunion) {
                    script = [
                        { cmd: 'bg', key: this.bgKey || 'bg_map_base' },
                        { cmd: 'bgm', key: 'JOIN_US' },
                        { cmd: 'text', name: '導きの再会', text: `タロットの導きにより、${charName}と再び巡り会った！\n運命の糸に手繰り寄せられ、再び共に歩むことになった。` }
                    ];
                } else {
                    script = joinEvents && joinCharId && (joinEvents[joinCharId] || joinEvents[drawnCardId]);
                }
                const isLostInLoop = gs.lostCharacterIdsInCurrentLoop && gs.lostCharacterIdsInCurrentLoop.includes(joinCharId);

                if (script && !alreadyInParty && !isPartyFull && isUnlockedForTarot && !isLostInLoop) {
                    this.scene.stop();
                    this.scene.start('EventScene', { 
                        returnScene: this.returnScene,
                        events: script,
                        joinCharacterId: joinCharId,
                        eventId: `join_${joinCharId}`,
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
        const gs = GlobalState.getInstance();
        const map = {
            1: '007',   // ななよ (愚者)
            4: '004',   // 黄蘭 (女帝)
            5: '008',   // ノア (皇帝)
            9: '003',   // 紅華 (力)
            10: '011',  // 白蓮 (隠者)
            12: '002',  // 蒼樹 (正義)
            15: '005'   // 李乃果 (節制)
        };
        // ★ 悪魔（ID: 16）: 塔21階のプロセル氷像を撃破済みの場合、プロセル(010)が加入対象になる
        if (tarotId === 16 && gs.tower21BossDefeated) {
            return '010';
        }
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

