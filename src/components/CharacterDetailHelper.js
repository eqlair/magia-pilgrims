import { GlobalState } from '../systems/GlobalState';
import { SaveManager } from '../systems/SaveManager';
import { fontSize, FONT_MAIN } from '../config/GameFont';

export class CharacterDetailHelper {
    static getRankColor(rank) {
        switch(rank) {
            case 1: return '#ffffff'; // N (白)
            case 2: return '#55ff55'; // R (緑)
            case 3: return '#5555ff'; // SR (青)
            case 4: return '#ff55ff'; // SSR (紫)
            case 5: return '#ffff55'; // UR (黄)
            case 6: return '#ff5555'; // LR (赤)
            default: return '#ffffff';
        }
    }

    static getRankString(rank) {
        switch(rank) {
            case 1: return 'N';
            case 2: return 'R';
            case 3: return 'SR';
            case 4: return 'SSR';
            case 5: return 'UR';
            case 6: return 'MR';
            case 7: return 'GR';
            case 8: return 'GTR';
            default: return 'N';
        }
    }

    /**
     * キャラクターの個人ステータス詳細画面を表示
     * @param {Phaser.Scene} scene - 呼び出し元のPhaserシーン (CampScene または RestScene)
     * @param {string} charId - 表示対象のキャラクターID
     * @param {string} parentSceneName - 親シーン名 ('CampScene' または 'RestScene')
     * @param {Phaser.GameObjects.Container} targetContainer - 描画対象コンテナ
     * @param {Function} onBack - 戻るボタン押下時のコールバック
     */
    static showDetailView(scene, charId, parentSceneName, targetContainer, onBack) {
        if (!targetContainer) return;
        targetContainer.removeAll(true);
        targetContainer.setPosition(0, 0);
        targetContainer.setDepth(100);
        targetContainer.setVisible(true);
        if (scene.children && scene.children.bringToTop) {
            scene.children.bringToTop(targetContainer);
        }

        const width = scene.scale ? scene.scale.width : (scene.cameras ? scene.cameras.main.width : 800);
        const height = scene.scale ? scene.scale.height : (scene.cameras ? scene.cameras.main.height : 600);

        // 詳細画面用の暗いバックドロップ（立ち絵や文字を見やすく覆う）
        const bgBackdrop = scene.add.rectangle(0, 0, width, height, 0x000000, 0.85).setOrigin(0, 0).setInteractive();
        targetContainer.add(bgBackdrop);

        const globalState = GlobalState.getInstance();
        const party = (scene.party && scene.party.length > 0) ? scene.party : (globalState.party || ['001']);

        // 左右スワイプによるキャラクター切り替え（2人以上の場合のみ）
        if (party.length > 1) {
            let pointerDownX = 0;
            let pointerDownY = 0;
            let pointerDownTime = 0;
            let isSwiping = false;

            bgBackdrop.on('pointerdown', (pointer) => {
                pointerDownX = pointer.x;
                pointerDownY = pointer.y;
                pointerDownTime = Date.now();
                isSwiping = true;
            });

            bgBackdrop.on('pointerup', (pointer) => {
                if (!isSwiping) return;
                isSwiping = false;
                const dx = pointer.x - pointerDownX;
                const dy = pointer.y - pointerDownY;
                const dt = Date.now() - pointerDownTime;

                // スワイプ判定: 横移動が40px以上、かつ縦移動の1.2倍以上、かつ600ms以内
                if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.2 && dt < 600) {
                    const currentIdx = party.indexOf(charId);
                    if (currentIdx !== -1) {
                        let nextIdx = currentIdx;
                        if (dx < -40) {
                            // 右から左にスワイプ: 次のキャラクター
                            nextIdx = (currentIdx + 1) % party.length;
                        } else if (dx > 40) {
                            // 左から右にスワイプ: 前のキャラクター
                            nextIdx = (currentIdx - 1 + party.length) % party.length;
                        }
                        if (nextIdx !== currentIdx) {
                            const nextCharId = party[nextIdx];
                            if (scene.showDetailView) {
                                scene.showDetailView(nextCharId, width, height);
                            } else {
                                CharacterDetailHelper.showDetailView(scene, nextCharId, parentSceneName, targetContainer, onBack);
                            }
                        }
                    }
                }
            });
        }

        // レベル低下によるスロット不足のレリクスを事前に自動パージ
        const purgedRelics = globalState.validateEquippedRelics(charId, party);
        if (purgedRelics.length > 0 && scene.showToast) {
            scene.showToast(`レベル不足のため『${purgedRelics.join(', ')}』が外れました`);
        }

        const charData = globalState.characters[charId];
        if (!charData) {
            console.warn(`[CharacterDetailHelper] Character not found: ${charId}`);
            return;
        }

        const stats = globalState.calcStats(charId, party);
        const baseStats = globalState.calcBaseStats(charId);
        const reqExp = globalState.getRequiredExp(charData.level);

        // 戻るボタン (詳細 -> メイン)
        const backBtn = scene.add.text(width * 0.05, height * 0.02, '◀ 戻る', {
            stroke: '#000000', strokeThickness: 3, fontFamily: 'sans-serif', fontSize: '24px', color: '#ffaaaa', backgroundColor: '#333333'
        }).setInteractive().setPadding(10);
        backBtn.on('pointerdown', () => {
            targetContainer.setVisible(false);
            if (onBack) onBack();
        });
        targetContainer.add(backBtn);

        // 左半分：立ち絵（テクスチャ存在チェック）
        const portraitKey = `portrait_${charId}`;
        if (scene.textures.exists(portraitKey)) {
            const portrait = scene.add.image(width * 0.25, height * 0.6, portraitKey);
            const scale = (height * 0.8) / portrait.height;
            portrait.setScale(scale);
            targetContainer.add(portrait);
        } else {
            // テクスチャが無い場合のフォールバック枠
            const dummyBox = scene.add.rectangle(width * 0.25, height * 0.5, width * 0.35, height * 0.7, 0x333333, 0.5);
            targetContainer.add(dummyBox);
            targetContainer.add(scene.add.text(width * 0.25, height * 0.5, `${charData.name}`, { fontSize: '28px', color: '#ffffff' }).setOrigin(0.5));
        }


        // 右半分：詳細データ表示基準位置
        const rx = width * 0.5;
        let ry = height * 0.12;
        const lineSpacing = height * 0.055;

        // 1行目: 属性アイコン・名前・レベル
        const getElementImage = (id) => {
            switch(id) {
                case '001': return 'em_2'; // 混沌
                case '002': return 'em_5'; // 統制
                case '003': return 'em_1'; // 情熱
                case '004': return 'em_4'; // 犠牲
                case '005': return 'em_3'; // 調和
                case '010': return 'em_5'; // 統制 (白蓮)
                default: return 'em_1';
            }
        };
        const elementIcon = scene.add.image(rx - 25, ry + 16, getElementImage(charId)).setScale(0.15).setInteractive({ useHandCursor: true });
        if (!globalState.guideTappedElementResistBtn) {
            scene.tweens.add({
                targets: elementIcon,
                alpha: 0.35,
                duration: 600,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
        targetContainer.add(elementIcon);
        elementIcon.on('pointerdown', () => {
            if (!globalState.guideTappedElementResistBtn) {
                globalState.guideTappedElementResistBtn = true;
                scene.tweens.killTweensOf(elementIcon);
                elementIcon.setAlpha(1.0);
                SaveManager.saveGame(scene);
            }
            CharacterDetailHelper.showElementResistanceView(scene, charId, parentSceneName, targetContainer, () => {
                CharacterDetailHelper.showDetailView(scene, charId, parentSceneName, targetContainer, onBack);
            });
        });

        const charElementBase = {
            '001': { strong: 'green', weak: 'red' },
            '002': { strong: 'red', weak: 'yellow' },
            '003': { strong: 'purple', weak: 'blue' },
            '004': { strong: 'blue', weak: 'green' },
            '005': { strong: 'yellow', weak: 'purple' },
            '010': { strong: 'red', weak: 'yellow' }
        };

        targetContainer.add(scene.add.text(rx, ry, `${charData.name}`, { stroke: '#000000', strokeThickness: 3, fontSize: '32px', color: '#ffffff', fontStyle: 'bold' }));
        
        const lvlBonus = stats.charLevelBonus || 0;
        const levelTxt = scene.add.text(rx + 150, ry + 6, `Lv.${charData.level}`, { stroke: '#000000', strokeThickness: 3, fontSize: '24px', color: '#aaffaa' });
        targetContainer.add(levelTxt);
        if (lvlBonus > 0) {
            const bonusTxt = scene.add.text(levelTxt.x + levelTxt.width + 4, ry + 6, `(+${lvlBonus})`, { stroke: '#000000', strokeThickness: 3, fontSize: '24px', color: '#ff9900' });
            targetContainer.add(bonusTxt);
        }
        ry += lineSpacing * 0.8;


        // 2行目: 経験値
        const expBonus = stats.expBonus || 0;
        const expBonusStr = expBonus > 0 ? ` (+${expBonus}%)` : '';
        targetContainer.add(scene.add.text(rx, ry, `EXP: ${charData.exp}/${reqExp}${expBonusStr}`, {
            stroke: '#000000', strokeThickness: 3, fontSize: '18px',
            color: expBonus > 0 ? '#ff9900' : '#ffffff',
            padding: { top: 4, bottom: 4 }
        }));
        ry += lineSpacing * 0.8;

        // 4行目: レベルを上げるボタン
        const canLevelUp = (charData.exp + globalState.stockExp) >= reqExp;
        const btnBg = canLevelUp ? '#aa0000' : '#444444';
        const btnColor = canLevelUp ? '#ffffff' : '#aaaaaa';
        const levelUpBtn = scene.add.text(rx, ry, 'レベルを上げる', {
            fontSize: '22px', backgroundColor: btnBg, color: btnColor
        }).setPadding(10).setInteractive();
        
        levelUpBtn.on('pointerdown', () => {
            if (canLevelUp) {
                const res = globalState.levelUp(charId, party);
                if (res && res.success) {
                    SaveManager.saveGame();
                    if (res.isBonus && scene.showToast) {
                        scene.showToast(`Lv.UP！ 友好度ボーナスポイント+1を獲得！`);
                    } else if (res.targetName && scene.showToast) {
                        scene.showToast(`Lv.UP！ 『${res.targetName}』への友好度が+1上昇！`);
                    } else if (scene.showToast) {
                        scene.showToast(`Lv.UP！ レベルが${globalState.characters[charId].level}になりました`);
                    }
                    CharacterDetailHelper.showDetailView(scene, charId, parentSceneName, targetContainer, onBack);
                }
            }
        });
        targetContainer.add(levelUpBtn);
        ry += lineSpacing * 0.9;

        // 4行目: 親愛度・友好度ボタン
        const affectionValue = stats.affection || 0;
        targetContainer.add(scene.add.text(rx, ry + 5, `親愛度: ${affectionValue}`, { stroke: '#000000', strokeThickness: 3, fontSize: '18px' }));
        const friendshipBtn = scene.add.text(rx + 120, ry, '友好度をみる', {
            fontSize: '18px', backgroundColor: '#3333aa', color: '#ffffff'
        }).setPadding(6).setInteractive();

        if (!globalState.guideTappedFriendshipBtn) {
            scene.tweens.add({
                targets: friendshipBtn,
                alpha: 0.35,
                duration: 600,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }

        friendshipBtn.on('pointerdown', () => {
            if (!globalState.guideTappedFriendshipBtn) {
                globalState.guideTappedFriendshipBtn = true;
                scene.tweens.killTweensOf(friendshipBtn);
                friendshipBtn.setAlpha(1.0);
                SaveManager.saveGame(scene);
            }
            CharacterDetailHelper.showFriendshipView(scene, charId, parentSceneName, targetContainer, () => {
                CharacterDetailHelper.showDetailView(scene, charId, parentSceneName, targetContainer, onBack);
            });
        });
        targetContainer.add(friendshipBtn);
        ry += lineSpacing * 0.8;

        const hpDiff = stats.maxHp - baseStats.maxHp;
        const spDiff = stats.maxSp - baseStats.maxSp;
        const atkDiff = stats.atk - baseStats.atk;
        const reloadDiff = stats.reload - baseStats.reload;
        const formatDiff = (d) => d === 0 ? '' : ` (${d>0?'+':''}${d})`;

        // 5行目: 各種ステータス1 (生命力 / 精神力)
        targetContainer.add(scene.add.text(rx, ry, `生命力: ${Math.floor(charData.currentHp)}/${stats.maxHp}${formatDiff(hpDiff)}`, { stroke: '#000000', strokeThickness: 3, fontSize: '18px', padding: { top: 4, bottom: 4 } }));
        ry += lineSpacing * 0.7;
        targetContainer.add(scene.add.text(rx, ry, `精神力: ${Math.floor(charData.currentSp)}/${stats.maxSp}${formatDiff(spDiff)}`, { stroke: '#000000', strokeThickness: 3, fontSize: '18px', padding: { top: 4, bottom: 4 } }));
        ry += lineSpacing * 0.7;

        // 6行目: 各種ステータス2 (攻撃力 / リロード)
        targetContainer.add(scene.add.text(rx, ry, `攻撃力: ${stats.atk}${formatDiff(atkDiff)}`, { stroke: '#000000', strokeThickness: 3, fontSize: '18px', padding: { top: 4, bottom: 4 } }));
        ry += lineSpacing * 0.7;
        targetContainer.add(scene.add.text(rx, ry, `リロード速度: ${stats.reload}${formatDiff(reloadDiff)}`, { stroke: '#000000', strokeThickness: 3, fontSize: '18px', padding: { top: 4, bottom: 4 } }));
        ry += lineSpacing * 0.7;
        
        const hitBonus = Math.floor((stats.hitRateBonus || 0) * 100);
        const hitRateStr = `100%`;
        const hitRateDiffStr = hitBonus !== 0 ? ` (${hitBonus > 0 ? '+' : ''}${hitBonus})` : '';
        targetContainer.add(scene.add.text(rx, ry, `命中率: ${hitRateStr}${hitRateDiffStr}`, { stroke: '#000000', strokeThickness: 3, fontSize: '18px', padding: { top: 4, bottom: 4 } }));
        ry += lineSpacing * 0.7;

        const evadeBonus = Math.floor((stats.evadeRateBonus || 0) * 100);
        const evadeRateStr = `5%`;
        const evadeRateDiffStr = evadeBonus !== 0 ? ` (${evadeBonus > 0 ? '+' : ''}${evadeBonus}%)` : '';
        targetContainer.add(scene.add.text(rx, ry, `回避率: ${evadeRateStr}${evadeRateDiffStr}`, { stroke: '#000000', strokeThickness: 3, fontSize: '18px', padding: { top: 4, bottom: 4 } }));
        ry += lineSpacing * 0.7;
        
        const critBonus = Math.floor((stats.critRateBonus || 0) * 100);
        const critRateStr = `5%`;
        const critRateDiffStr = critBonus !== 0 ? ` (${critBonus > 0 ? '+' : ''}${critBonus}%)` : '';
        targetContainer.add(scene.add.text(rx, ry, `クリティカル率: ${critRateStr}${critRateDiffStr}`, { stroke: '#000000', strokeThickness: 3, fontSize: '18px', padding: { top: 4, bottom: 4 } }));
        ry += lineSpacing * 0.7;
        
        const critMultBonus = Math.floor((stats.critMultBonus || 0) * 100);
        const critMultStr = `200%`;
        const critMultDiffStr = critMultBonus !== 0 ? ` (${critMultBonus > 0 ? '+' : ''}${critMultBonus}%)` : '';
        targetContainer.add(scene.add.text(rx, ry, `クリティカル倍率: ${critMultStr}${critMultDiffStr}`, { stroke: '#000000', strokeThickness: 3, fontSize: '18px', padding: { top: 4, bottom: 4 } }));
        ry += lineSpacing * 0.7;

        // 7行目: 各種ステータス3 (近接 / 遠隔)
        const baseMelee = charData.meleeLevel || 1;
        const baseRanged = charData.rangedLevel || 1;
        const effMelee = stats.meleeLevel || baseMelee;
        const effRanged = stats.rangedLevel || baseRanged;
        const isMeleeBoosted = effMelee > baseMelee;
        const isRangedBoosted = effRanged > baseRanged;

        targetContainer.add(scene.add.text(rx, ry, `近接: Lv.${effMelee}`, {
            stroke: '#000000', strokeThickness: 3, fontSize: '18px',
            color: isMeleeBoosted ? '#ff9900' : '#ffffff',
            padding: { top: 4, bottom: 4 }
        }));
        targetContainer.add(scene.add.text(rx + 130, ry, `遠隔: Lv.${effRanged}`, {
            stroke: '#000000', strokeThickness: 3, fontSize: '18px',
            color: isRangedBoosted ? '#ff9900' : '#ffffff',
            padding: { top: 4, bottom: 4 }
        }));
        ry += lineSpacing * 1.0;


        // 所持インベントリに未装備のレリクス・宝石があるかチェック
        const availableRelicsCount = (globalState.inventory && globalState.inventory.relics) ? globalState.inventory.relics.length : 0;
        const availableGemsCount = (globalState.inventory && globalState.inventory.gems) ? globalState.inventory.gems.length : 0;
        const hasAvailableRelic = availableRelicsCount > 0;
        const hasAvailableGem = availableGemsCount > 0;


        // 8行目: 宝石
        targetContainer.add(scene.add.text(rx, ry, '装備中の宝石', { stroke: '#000000', strokeThickness: 3, fontSize: '18px', color: '#aaaaaa' }));
        ry += 25;

        let gemText = '装備なし';
        let gemColor = '#777777';
        let gemBgHeight = 30;
        let gemBgColor = 0x222222;
        let isGemAlert = false;
        
        if (charData.equipGem) {
            gemColor = CharacterDetailHelper.getRankColor(charData.equipGem.rank);
            const rankStr = CharacterDetailHelper.getRankString(charData.equipGem.rank);
            gemText = `[${rankStr}] ${charData.equipGem.name}`;
        } else if (hasAvailableGem) {
            isGemAlert = true;
            gemBgColor = 0x441111;
            gemText = '装備なし (装備可能!)';
            gemColor = '#ff6666';
        }
        
        const gemBg = scene.add.rectangle(rx, ry, width * 0.45, gemBgHeight, gemBgColor).setOrigin(0, 0).setInteractive();
        if (isGemAlert) {
            gemBg.setStrokeStyle(2, 0xff3333); // 赤枠線でアピール！
        }
        gemBg.on('pointerdown', () => {
            scene.scene.pause();
            scene.scene.launch('EquipmentScene', { charId, itemType: 'gem', slotIndex: 0, parentScene: parentSceneName });
            scene.scene.bringToTop('EquipmentScene');
        });
        
        targetContainer.add(gemBg);
        
        const gemNameText = scene.add.text(rx + 10, ry + 5, gemText, { stroke: '#000000', strokeThickness: 3, fontSize: '18px', color: gemColor, padding: { top: 4, bottom: 4 } }).setInteractive();
        gemNameText.on('pointerdown', () => gemBg.emit('pointerdown'));
        targetContainer.add(gemNameText);
        
        ry += 40;

        // 9行目: レリクス
        targetContainer.add(scene.add.text(rx, ry, 'レリクス', { stroke: '#000000', strokeThickness: 3, fontSize: '18px' }));
        ry += 30;
        
        const relicStartX = width * 0.05;
        const relicWidth = width * 0.9;
        
        const effLevel = stats.level || (charData.level + (stats.charLevelBonus || 0));
        for (let i = 0; i < 5; i++) {
            const requiredLevel = 1 + i * 4;
            const isUnlocked = (effLevel >= requiredLevel);
            const isEquipped = !!(charData.equipRelics && charData.equipRelics[i]);

            let relicBgColor = 0x111111;
            let isRelicAlert = false;

            if (isUnlocked && !isEquipped && hasAvailableRelic) {
                isRelicAlert = true;
                relicBgColor = 0x441111;
            }

            const relicBg = scene.add.rectangle(relicStartX, ry, relicWidth, 30, relicBgColor, 0.9).setOrigin(0, 0);
            if (isRelicAlert) {
                relicBg.setStrokeStyle(2, 0xff3333); // 赤枠線でアピール！
            }

            if (isUnlocked) {
                relicBg.setInteractive();
                relicBg.on('pointerdown', () => {
                    scene.scene.pause();
                    scene.scene.launch('EquipmentScene', { charId, itemType: 'relic', slotIndex: i, parentScene: parentSceneName });
                    scene.scene.bringToTop('EquipmentScene');
                });
            }
            targetContainer.add(relicBg);
            
            let relicText = `${i+1}. 装備なし`;
            let rColor = '#777777';

            if (!isUnlocked) {
                relicText = `${i+1}. レベル${requiredLevel}で装備可能`;
                rColor = '#ffffff';
                const rEmptyText = scene.add.text(relicStartX + 10, ry + 5, relicText, { stroke: '#000000', strokeThickness: 3, fontFamily: FONT_MAIN, fontSize: fontSize.body(width), color: rColor });
                targetContainer.add(rEmptyText);
            } else if (isEquipped) {
                const r = charData.equipRelics[i];
                rColor = CharacterDetailHelper.getRankColor(r.rank);
                
                const rName = r.name || 'Unknown';
                const rankStr = CharacterDetailHelper.getRankString(r.rank || 1);
                const rNameText = scene.add.text(relicStartX + 10, ry + 5, `[${rankStr}] ${rName}`, { stroke: '#000000', strokeThickness: 3, fontFamily: FONT_MAIN, fontSize: fontSize.body(width), color: rColor }).setInteractive();
                rNameText.on('pointerdown', () => relicBg.emit('pointerdown'));
                targetContainer.add(rNameText);
            } else {
                if (isRelicAlert) {
                    relicText = `${i+1}. 装備なし (装備可能!)`;
                    rColor = '#ff6666';
                }
                const rEmptyText = scene.add.text(relicStartX + 10, ry + 5, relicText, { stroke: '#000000', strokeThickness: 3, fontFamily: FONT_MAIN, fontSize: fontSize.body(width), color: rColor }).setInteractive();
                rEmptyText.on('pointerdown', () => relicBg.emit('pointerdown'));
                targetContainer.add(rEmptyText);
            }
            
            ry += 35;
        }


        // ストック経験値を右下に配置
        const stockExpText = scene.add.text(width - 20, height - 20, `ストックSP: ${globalState.stockSp}　ストックEXP: ${globalState.stockExp}`, { stroke: '#000000', strokeThickness: 3, fontSize: '20px', color: '#ffffaa' }).setOrigin(1, 1);
        targetContainer.add(stockExpText);

        // 「影響」ボタンを左下に配置
        const effectBtn = scene.add.text(20, height - 20, '影響', {
            fontSize: '20px', backgroundColor: '#333333', color: '#ffffff'
        }).setPadding(10).setOrigin(0, 1).setInteractive();

        if (!globalState.guideTappedEffectBtn) {
            scene.tweens.add({
                targets: effectBtn,
                alpha: 0.35,
                duration: 600,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
        
        effectBtn.on('pointerdown', () => {
            if (!globalState.guideTappedEffectBtn) {
                globalState.guideTappedEffectBtn = true;
                scene.tweens.killTweensOf(effectBtn);
                effectBtn.setAlpha(1.0);
                SaveManager.saveGame(scene);
            }
            CharacterDetailHelper.showEffectView(scene);
        });
        targetContainer.add(effectBtn);
    }

    /**
     * 属性・耐性情報画面 (2ページ目) を表示
     */
    static showElementResistanceView(scene, charId, parentSceneName, targetContainer, onBack) {
        if (!targetContainer) return;
        targetContainer.removeAll(true);
        targetContainer.setPosition(0, 0);
        targetContainer.setDepth(100);
        targetContainer.setVisible(true);


        const { width, height } = scene.scale;
        const bgBackdrop = scene.add.rectangle(0, 0, width, height, 0x000000, 0.85).setOrigin(0, 0).setInteractive();
        targetContainer.add(bgBackdrop);

        const globalState = GlobalState.getInstance();
        const party = scene.party || ['001'];
        const charData = globalState.characters[charId];
        if (!charData) return;

        // 戻るボタン
        const backBtn = scene.add.text(width * 0.05, height * 0.02, '◀ 戻る', {
            stroke: '#000000', strokeThickness: 3, fontFamily: 'sans-serif', fontSize: '24px', color: '#ffaaaa', backgroundColor: '#333333'
        }).setInteractive().setPadding(10);
        backBtn.on('pointerdown', () => {
            targetContainer.setVisible(false);
            if (onBack) onBack();
        });
        targetContainer.add(backBtn);

        // Header
        const headerText = scene.add.text(width * 0.5, height * 0.1, `${charData.name} の属性・耐性情報`, {
            stroke: '#000000', strokeThickness: 3, fontSize: '32px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5, 0.5);
        targetContainer.add(headerText);

        const stats = globalState.calcStats(charId, party);
        const elemMods = stats.elemMods || { red: 0, blue: 0, green: 0, yellow: 0, purple: 0 };
        
        const charElementBase = {
            '001': { strong: 'green', weak: 'red' },
            '002': { strong: 'red', weak: 'yellow' },
            '003': { strong: 'purple', weak: 'blue' },
            '004': { strong: 'blue', weak: 'green' },
            '005': { strong: 'yellow', weak: 'purple' },
            '010': { strong: 'red', weak: 'yellow' }
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
        targetContainer.add(scene.add.text(width * 0.15, ry, '【属性別防御力】', { stroke: '#000000', strokeThickness: 2, fontSize: '24px', color: '#aaffaa' }));
        let dry = height * 0.2;
        targetContainer.add(scene.add.text(width * 0.55, dry, '【属性別デバフ抵抗力】', { stroke: '#000000', strokeThickness: 2, fontSize: '24px', color: '#ffaaaa' }));

        ry += 40;
        dry += 40;
        elements.forEach(e => {
            const defVal = getDef(e.id);
            const modVal = elemMods[e.id] || 0;
            // キャラ属性由来の素の数値(75%, 125%)は白文字。装備等(modVal !== 0)の追加補正がある時のみオレンジ色(#ff9900)
            const isDefBoosted = (modVal !== 0);

            // 属性別防御力
            targetContainer.add(scene.add.image(width * 0.15, ry + 12, e.icon).setScale(0.15));
            targetContainer.add(scene.add.text(width * 0.20, ry, `${e.name}: ${defVal}%`, {
                stroke: '#000000', strokeThickness: 3, fontSize: '22px',
                color: isDefBoosted ? '#ff9900' : '#ffffff'
            }));
            
            // 属性別デバフ抵抗力
            targetContainer.add(scene.add.image(width * 0.55, dry + 12, e.icon).setScale(0.15));
            targetContainer.add(scene.add.text(width * 0.60, dry, `${e.name}: ${defVal}%`, {
                stroke: '#000000', strokeThickness: 3, fontSize: '22px',
                color: isDefBoosted ? '#ff9900' : '#ffffff'
            }));

            
            ry += 35;
            dry += 35;
        });

        // ※受けるダメージやデバフ効果を上記の値に増減する。\n100％以上の表記は弱点 の注記テキスト
        const noteText = '※受けるダメージやデバフ効果を上記の値に増減する。\n100％以上の表記は弱点';
        targetContainer.add(scene.add.text(width * 0.5, height * 0.56, noteText, {
            stroke: '#000000', strokeThickness: 3, fontFamily: 'sans-serif', fontSize: '18px', color: '#ffffaa', align: 'center'
        }).setOrigin(0.5, 0));

        // Center bottom image and text
        const embImage = scene.add.image(width * 0.2, height * 0.8, 'emb_0');
        const scale = (height * 0.26) / embImage.height;
        embImage.setScale(scale);
        targetContainer.add(embImage);

        const relText = '情熱は混沌に強く統制に弱い。\n混沌は調和に強く情熱に弱い。\n調和は犠牲に強く混沌に弱い。\n犠牲は統制に強く調和に弱い。\n統制は情熱に強く犠牲に弱い。';
        const relObj = scene.add.text(width * 0.35, height * 0.8, relText, {
            stroke: '#000000', strokeThickness: 3, fontSize: '20px', lineSpacing: 6
        }).setOrigin(0, 0.5);
        targetContainer.add(relObj);
    }


    /**
     * 友好度表示画面を表示
     */
    static showFriendshipView(scene, charId, parentSceneName, targetContainer, onBack) {
        if (!targetContainer) return;
        targetContainer.removeAll(true);
        targetContainer.setPosition(0, 0);
        targetContainer.setDepth(100);
        targetContainer.setVisible(true);


        const { width, height } = scene.scale;
        const bgBackdrop = scene.add.rectangle(0, 0, width, height, 0x000000, 0.85).setOrigin(0, 0).setInteractive();
        targetContainer.add(bgBackdrop);

        const globalState = GlobalState.getInstance();
        const charData = globalState.characters[charId];
        if (!charData) return;
        
        // 戻るボタン
        const backBtn = scene.add.text(width * 0.05, height * 0.02, '◀ 戻る', {
            stroke: '#000000', strokeThickness: 3, fontSize: '24px', backgroundColor: '#333333', padding: 8
        }).setInteractive();
        backBtn.on('pointerdown', () => {
            targetContainer.setVisible(false);
            if (onBack) onBack();
        });
        targetContainer.add(backBtn);

        let ry = height * 0.12;
        targetContainer.add(scene.add.text(width * 0.1, ry, `${charData.name} の友好度`, { stroke: '#000000', strokeThickness: 3, fontSize: '28px', fontStyle: 'bold' }));
        ry += 40;
        
        // 友好度ボーナス
        const bonusText = scene.add.text(width * 0.1, ry, `友好度ボーナスポイント: ${charData.friendshipPoints || 0}`, { stroke: '#000000', strokeThickness: 3, fontSize: '20px', color: '#ffffaa' });
        targetContainer.add(bonusText);
        ry += 50;

        // リスト描画（同行経験フラグ hasAccompanied または同伴履歴のあるキャラのみ表示）
        const displayCharIds = Object.keys(globalState.characters).filter(id => {
            if (id === charId) return false;
            const other = globalState.characters[id];
            if (!other) return false;
            const isAccompanied = !!(other.hasAccompanied || (charData.metCharacters && charData.metCharacters.includes(id)) || (charData.friendships && charData.friendships[id] !== undefined));
            return isAccompanied;
        });

        if (displayCharIds.length === 0) {
            targetContainer.add(scene.add.text(width * 0.1, ry, '過去に一緒に編成された仲間がいません', { stroke: '#000000', strokeThickness: 3, fontSize: '18px', color: '#aaaaaa' }));
        } else {
            for (const otherId of displayCharIds) {
                const otherChar = globalState.characters[otherId];
                if (!otherChar) continue;

                const fVal = (charData.friendships && charData.friendships[otherId]) ? charData.friendships[otherId] : 0;
                
                const rowText = scene.add.text(width * 0.1, ry, `${otherChar.name}  友好度: ${fVal}`, { stroke: '#000000', strokeThickness: 3, fontSize: '22px' });
                targetContainer.add(rowText);

                // ハートボタン（ボーナスポイントで控えのキャラにも自由に手動割振り可能！）
                const heartBtn = scene.add.text(width * 0.6, ry, '❤️', { stroke: '#000000', strokeThickness: 3, fontSize: '24px' }).setInteractive();
                heartBtn.on('pointerdown', () => {
                    if ((charData.friendshipPoints || 0) > 0 && fVal < 25) {
                        charData.friendshipPoints--;
                        if (!charData.friendships) charData.friendships = {};
                        charData.friendships[otherId] = fVal + 1;
                        if (!charData.metCharacters) charData.metCharacters = [];
                        if (!charData.metCharacters.includes(otherId)) charData.metCharacters.push(otherId);
                        globalState.save();
                        CharacterDetailHelper.showFriendshipView(scene, charId, parentSceneName, targetContainer, onBack);
                    }
                });
                if ((charData.friendshipPoints || 0) <= 0 || fVal >= 25) {
                    heartBtn.setAlpha(0.3);
                }
                targetContainer.add(heartBtn);

                ry += 40;
            }
        }
    }

    /**
     * タロットの影響表示ダイアログを表示（スクロール・上下ボタン対応）
     */
    static showEffectView(scene) {
        const { width, height } = scene.scale;
        const globalState = GlobalState.getInstance();
        const mainContainer = scene.add.container(0, 0);
        mainContainer.setDepth(2000);
        
        // 背景（背景タップでクローズ）
        const bg = scene.add.rectangle(0, 0, width, height, 0x000000, 0.85).setOrigin(0, 0).setInteractive();
        mainContainer.add(bg);
        
        // タイトル
        const titleText = scene.add.text(width / 2, 20, '現在受けているタロットの影響', {
            stroke: '#000000', strokeThickness: 4, fontSize: '26px', color: '#ffffaa', fontStyle: 'bold'
        }).setOrigin(0.5, 0);
        mainContainer.add(titleText);

        // 閉じるボタン
        const closeBtn = scene.add.text(width - 20, 20, '✕ 閉じる', {
            stroke: '#000000', strokeThickness: 3, fontSize: '18px', color: '#ffffff', backgroundColor: '#444444', padding: { x: 8, y: 4 }
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
        closeBtn.on('pointerdown', () => mainContainer.destroy());
        mainContainer.add(closeBtn);

        // 表示枠・スクロール用設定
        const viewY = 70;
        const viewH = height - 140;
        const padding = 25;
        const fontSizePx = Math.max(16, Math.floor(width / 26));

        // Geometry Mask (表示エリア外の溢れをカット)
        const maskGraphics = scene.make.graphics({ x: 0, y: 0, add: false });
        maskGraphics.fillStyle(0xffffff, 1);
        maskGraphics.fillRect(0, viewY, width, viewH);
        const mask = maskGraphics.createGeometryMask();

        // スクロール内包コンテナ
        const listContainer = scene.add.container(0, viewY);
        listContainer.setMask(mask);
        mainContainer.add(listContainer);

        const tarotData = scene.cache.json.get('tarot_data');
        const activeTarots = globalState.activeTarots || [];
        let listY = 10;

        if (activeTarots.length === 0) {
            const noEffectText = scene.add.text(padding, listY, '現在受けている影響はありません。', {
                stroke: '#000000', strokeThickness: 3, fontSize: `${fontSizePx}px`, color: '#aaaaaa'
            });
            listContainer.add(noEffectText);
            listY += 40;
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
                
                const nameText = scene.add.text(padding, listY, `No.${tarot.id} ${cardInfo.name} (${posStr})`, {
                    stroke: '#000000', strokeThickness: 3, fontSize: `${fontSizePx + 2}px`,
                    color: tarot.isUpright ? '#77ff77' : '#ff7777', fontStyle: 'bold'
                });
                listContainer.add(nameText);
                listY += fontSizePx * 1.5;
                
                const descText = scene.add.text(padding, listY, effectText, {
                    stroke: '#000000', strokeThickness: 3, fontSize: `${fontSizePx}px`, color: '#ffffff',
                    wordWrap: { width: width - padding * 2 - 60 }
                });
                listContainer.add(descText);
                listY += descText.height + fontSizePx * 1.2;
            }
        }

        // スクロール限界
        const contentHeight = listY;
        const maxScrollY = viewY;
        const minScrollY = Math.min(viewY, viewY - (contentHeight - viewH));

        const clampY = (y) => Math.max(minScrollY, Math.min(maxScrollY, y));

        const updateScroll = (targetY) => {
            const newY = clampY(targetY);
            scene.tweens.add({
                targets: listContainer,
                y: newY,
                duration: 200,
                ease: 'Cubic.out'
            });
        };

        // ドラッグスクロールタッチエリア
        let isDragging = false;
        let dragStartY = 0;
        let containerStartY = 0;

        const touchZone = scene.add.rectangle(0, viewY, width - 60, viewH, 0x000000, 0.001).setOrigin(0, 0).setInteractive();
        mainContainer.add(touchZone);

        touchZone.on('pointerdown', (pointer) => {
            isDragging = true;
            dragStartY = pointer.y;
            containerStartY = listContainer.y;
        });

        touchZone.on('pointermove', (pointer) => {
            if (isDragging) {
                const dy = pointer.y - dragStartY;
                listContainer.y = clampY(containerStartY + dy);
            }
        });

        const stopDrag = () => { isDragging = false; };
        touchZone.on('pointerup', stopDrag);
        touchZone.on('pointerout', stopDrag);

        // 「▲ 上」「▼ 下」スクロールボタン（右端に固定配置）
        const btnX = width - 20;
        
        const btnUp = scene.add.text(btnX, viewY + 30, '▲\n上', {
            stroke: '#000000', strokeThickness: 3, fontSize: '18px', color: '#ffffff',
            backgroundColor: '#335588', padding: { x: 10, y: 8 }, align: 'center'
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

        btnUp.on('pointerdown', () => {
            updateScroll(listContainer.y + 160);
        });
        mainContainer.add(btnUp);

        const btnDown = scene.add.text(btnX, viewY + viewH - 30, '▼\n下', {
            stroke: '#000000', strokeThickness: 3, fontSize: '18px', color: '#ffffff',
            backgroundColor: '#335588', padding: { x: 10, y: 8 }, align: 'center'
        }).setOrigin(1, 1).setInteractive({ useHandCursor: true });

        btnDown.on('pointerdown', () => {
            updateScroll(listContainer.y - 160);
        });
        mainContainer.add(btnDown);
    }
}
