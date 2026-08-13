import Phaser from 'phaser';
import { GlobalState } from '../systems/GlobalState';
import { SaveManager } from '../systems/SaveManager';

import { RelicGenerator } from '../systems/RelicGenerator';
import relicWords from '../data/relic_words.json';
import gemEffects from '../data/gem_effects.json';

export default class EquipmentScene extends Phaser.Scene {
    constructor() {
        super('EquipmentScene');
    }

    init(data) {
        this.charId = data.charId;
        this.itemType = data.itemType; // 'relic' or 'gem'
        this.slotIndex = data.slotIndex !== undefined ? data.slotIndex : 0;
        this.globalState = GlobalState.getInstance();
        this.parentScene = data.parentScene || 'CampScene';
        this.expandedLayout = false;
    }

    create() {
        this.width = this.cameras.main.width;
        this.height = this.cameras.main.height;
        
        // Background overlay
        this.add.rectangle(0, 0, this.width, this.height, 0x111111, 0.95).setOrigin(0, 0);

        // Header and Back Button
        const headerText = this.add.text(this.width / 2, 20, `${this.itemType === 'relic' ? 'レリクス' : '宝石'} 管理画面`, {
            fontSize: '28px', color: '#ffffff', fontStyle: 'bold', padding: { top: 4, bottom: 4 }
        }).setOrigin(0.5, 0);

        const backBtn = this.add.text(20, 20, '◀ 戻る', {
            fontSize: '24px', color: '#ffaaaa', backgroundColor: '#333333', padding: { x: 10, y: 10 }
        }).setInteractive();
        backBtn.on('pointerdown', () => this.closeScene());

        // Layout Containers
        this.topContainer = this.add.container(0, 70); // 1/5 (Equipped)
        this.midContainer = this.add.container(0, 260); // 1/5 (Selected)
        this.bottomContainer = this.add.container(0, 420); // 3/5 (Inventory)

        // States
        this.selectedItem = null;
        this.selectedListIndex = -1;
        this.enhanceMode = false;
        this.enhanceMaterials = [];
        this.enhanceBaseItem = null;
        // 合成確認モード
        this.synthConfirmMode = false;
        this.synthConsumed = null;
        this.synthTargetRank = -1;

        // Initialize inventory structure if missing
        if (!this.globalState.inventory) {
            this.globalState.inventory = { relics: [], gems: [] };
        }

        this.drawUI();
    }

    closeScene() {
        this.scene.resume(this.parentScene);
        this.scene.stop();
    }

    getInventoryItems() {
        return this.itemType === 'relic' ? this.globalState.inventory.relics : this.globalState.inventory.gems;
    }

    getEquippedItems() {
        const char = this.globalState.characters[this.charId];
        if (this.itemType === 'relic') return char.equipRelics;
        return [char.equipGem];
    }

    formatItemText(item) {
        // Deprecated, use drawColoredItem instead
        return '';
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
    
    getTraitRank(level) {
        return level;
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

    drawItemDetail(container, title, item, isEquipped, index, isTopSection) {
        container.add(this.add.text(20, 0, title, { fontSize: '20px', color: '#aaaaaa', padding: { top: 4, bottom: 4 } }));
        
        if (!item && isTopSection) {
             container.add(this.add.text(30, 40, '--- 空き ---', { fontSize: '18px', color: '#555555', padding: { top: 4, bottom: 4 } }));
             return;
        } else if (!item && !isTopSection) {
             container.add(this.add.text(30, 40, 'アイテムが選択されていません', { fontSize: '18px', color: '#777777', padding: { top: 4, bottom: 4 } }));
             return;
        }

        let ry = 35;
        const rank = item.rank || 1;
        const rankStr = this.getRankString(rank);
        const rColor = this.getRankColor(rank);

        const nameTxt = this.add.text(30, ry, `[${rankStr}] ${item.name || 'Unknown'}`, { fontSize: '20px', color: rColor, padding: { top: 4, bottom: 4 } });
        container.add(nameTxt);
        ry += 35;

        if (item.traits && Array.isArray(item.traits)) {
            // 開花済み特性（通常表示）
            item.traits.filter(t => t && t.level > 0).forEach(t => {
                const tRank = this.getTraitRank(t.level);
                const tColor = this.getRankColor(tRank);
                const tName = t.name ? t.name.replace(/(\(%\))/,'') : 'Unknown';
                const tTxt = this.add.text(40, ry, `${tName}+${t.level}`, { fontSize: '16px', color: tColor, padding: { top: 4, bottom: 4 } });
                container.add(tTxt);
                ry += 25;
            });
            // 未開花特性（グレー表示）
            item.traits.filter(t => t && t.level === 0).forEach(t => {
                const tName = t.name ? t.name.replace(/(\(%\))/,'') : 'Unknown';
                const row = this.add.container(40, ry);
                const tTxt = this.add.text(0, 0, tName, { fontSize: '16px', color: '#666666', padding: { top: 4, bottom: 4 } });
                const badge = this.add.text(tTxt.width + 6, 2, '未開花', { fontSize: '12px', color: '#888888', backgroundColor: '#333333', padding: { x: 4, y: 2 } });
                row.add([tTxt, badge]);
                container.add(row);
                ry += 25;
            });
        }
        if (item.type === 'gem' && typeof gemEffects !== 'undefined' && gemEffects[item.name]) {
            const unique = gemEffects[item.name]?.effects?.[rank];
            if (unique && unique !== 'なし') {
                const uTxt = this.add.text(40, ry, `【${unique}】`, { fontSize: '16px', color: rColor, padding: { top: 4, bottom: 4 } });
                container.add(uTxt);
                ry += 25;
            }
        }

        const btnX = this.width - 90;
        let btnY = 35;

        if (isEquipped) {
            const btnRemove = this.add.text(btnX, btnY, 'はずす', { fontSize: '16px', backgroundColor: '#553333', padding: { x: 10, y: 5 } }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
            btnRemove.on('pointerdown', () => { if(!this.enhanceMode) this.unequipItem(index); });
            container.add(btnRemove);
            btnY += 38;
        } else if (!isTopSection && !this.enhanceMode) {
            const btnEquip = this.add.text(btnX, btnY, '装備する', { fontSize: '16px', backgroundColor: '#335533', padding: { x: 10, y: 5 } }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
            btnEquip.on('pointerdown', () => { if(!this.enhanceMode) this.equipItem(index); });
            container.add(btnEquip);
            btnY += 38;
        }

        if (item.rank < 8 && !this.enhanceMode) {
            const btnEnhance = this.add.text(btnX, btnY, '強化', { fontSize: '16px', backgroundColor: '#333355', padding: { x: 10, y: 5 } }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
            btnEnhance.on('pointerdown', () => {
                this.selectedItem = { item, isEquipped, index };
                this.startEnhanceMode(item);
            });
            container.add(btnEnhance);
            btnY += 38;
        }

        // 鍵ボタン（「装備する/はずす」「強化」の下に配置！詳細表示欄でのみロック・解除操作を行う）
        if (!this.enhanceMode) {
            const isLocked = !!item.isLocked;
            const lockBtnColor = isLocked ? '#664400' : '#444444';
            const lockBtnText = isLocked ? '🔒 ロック' : '🔓 解除';
            const btnLock = this.add.text(btnX, btnY, lockBtnText, { fontSize: '15px', backgroundColor: lockBtnColor, color: '#ffffff', padding: { x: 8, y: 5 } }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
            
            btnLock.on('pointerdown', () => {
                item.isLocked = !item.isLocked;
                SaveManager.saveGame();
                this.drawUI();
            });
            container.add(btnLock);
        }
    }


    drawColoredItem(container, x, y, prefix, item, fontSizeStr, isExpanded = false) {
        let fontSize = parseInt(fontSizeStr);
        let nameFontSize = fontSizeStr;
        let traitFontSizeStr = (fontSize - 2) + 'px';
        
        if (isExpanded) {
            fontSize = Math.floor(fontSize * 1.2);
            nameFontSize = fontSize + 'px';
            traitFontSizeStr = nameFontSize;
        }

        if (!item) {
            const hasItems = this.getInventoryItems().length > 0;
            const textStr = hasItems ? `${prefix}--- 未装備 (装備可能!) ---` : `${prefix}--- 空き ---`;
            const textColor = hasItems ? '#ff6666' : '#555555';
            container.add(this.add.text(x, y, textStr, { fontSize: nameFontSize, color: textColor, fontStyle: hasItems ? 'bold' : 'normal' }));
            return;
        }

        let currentX = x;
        if (prefix) {
            const pTxt = this.add.text(currentX, y, prefix, { fontSize: nameFontSize, color: '#aaaaaa' });
            container.add(pTxt);
            currentX += pTxt.width + 5;
        }
        
        const rank = item.rank || 1;
        const nColor = this.getRankColor(rank);
        const nameStr = item.name || 'Unknown';
        const rankStr = this.getRankString(rank);
        const nameTxt = this.add.text(currentX, y, `[${rankStr}] ${nameStr}`, { fontSize: nameFontSize, color: nColor });
        container.add(nameTxt);
        currentX += nameTxt.width + 10;
        
        let traitY = y;
        if (isExpanded) {
            currentX = x + 30; // 性能行は少しインデント
            traitY = y + fontSize + 4;
        } else {
            traitY = y + 2;
        }

        if (item.traits && Array.isArray(item.traits)) {
            // 開花済み
            item.traits.filter(t => t && t.level > 0).forEach(t => {
                const c = this.getRankColor(this.getTraitRank(t.level));
                const tName = t.name ? t.name.replace(/(\(%\))/,'') : 'Unknown';
                const tTxt = this.add.text(currentX, traitY, `${tName}+${t.level}`, { fontSize: traitFontSizeStr, color: c });
                container.add(tTxt);
                currentX += tTxt.width + 8;
            });
            // 未開花（グレー）
            item.traits.filter(t => t && t.level === 0).forEach(t => {
                const tName = t.name ? t.name.replace(/(\(%\))/,'') : 'Unknown';
                const tTxt = this.add.text(currentX, traitY, tName, { fontSize: traitFontSizeStr, color: '#666666' });
                container.add(tTxt);
                currentX += tTxt.width + 2;
                const badge = this.add.text(currentX, traitY + 2, '未開花', { fontSize: '11px', color: '#888888', backgroundColor: '#333333', padding: { x: 3, y: 1 } });
                container.add(badge);
                currentX += badge.width + 8;
            });
        }
        if (item.type === 'gem' && typeof gemEffects !== 'undefined' && gemEffects[item.name]) {
            const unique = gemEffects[item.name]?.effects?.[rank];
            if (unique && unique !== 'なし') {
                const uTxt = this.add.text(currentX, traitY, `【${unique}】`, { fontSize: traitFontSizeStr, color: nColor });
                container.add(uTxt);
            }
        }
    }

    drawUI() {
        try {
            this.topContainer.removeAll(true);
            this.midContainer.removeAll(true);
            this.bottomContainer.removeAll(true);

            this.drawTopSection();
            this.drawMidSection();
            this.drawBottomSection();
        } catch(e) {
            this.add.text(10, 10, 'Error: ' + e.toString() + '\\n' + e.stack.substring(0, 500), { fontSize: '14px', color: '#ff0000', backgroundColor: '#000000' });
            console.error(e);
        }
    }

    drawTopSection() {
        if (this.synthConfirmMode) {
            this.showSynthesisConfirmUI();
            return;
        }
        const equipped = this.getEquippedItems();
        const item = equipped[this.slotIndex];
        this.drawItemDetail(this.topContainer, '【装備中アイテム詳細】', item, true, this.slotIndex, true);
    }

    drawMidSection() {
        if (this.synthConfirmMode) {
            return; // showSynthesisConfirmUIでtopContainerとmidContainerの両方を描画済み
        }

        if (this.enhanceMode) {
            this.midContainer.add(this.add.text(20, 0, '【強化モード：素材選択中】', { fontSize: '20px', color: '#ffcc00', padding: { top: 4, bottom: 4 } }));
            this.drawEnhanceModeUI();
            return;
        }

        const item = this.selectedItem ? this.selectedItem.item : null;
        const index = this.selectedItem ? this.selectedItem.index : -1;
        this.drawItemDetail(this.midContainer, '【選択中アイテム詳細】', item, false, index, false);
    }

    drawEnhanceModeUI() {
        const item = this.enhanceBaseItem;
        this.midContainer.add(this.add.text(30, 30, `強化ベース: `, { fontSize: '18px', color: '#ffffff' }));
        this.drawColoredItem(this.midContainer, 130, 30, '', item, '18px');
        
        this.midContainer.add(this.add.text(30, 60, `選択した素材 (${this.enhanceMaterials.length}/4)`, { fontSize: '18px', color: '#ffaaaa' }));

        const btnCancel = this.add.text(this.width - 120, 30, 'キャンセル', { fontSize: '18px', backgroundColor: '#553333', padding: { x: 10, y: 5 } }).setInteractive();
        btnCancel.on('pointerdown', () => {
            this.enhanceMode = false;
            this.enhanceMaterials = [];
            this.enhanceBaseItem = null;
            this.drawUI();
        });
        this.midContainer.add(btnCancel);

        // 「自動」選択ボタン（キャンセルの下に配置）
        const btnAuto = this.add.text(this.width - 120, 75, '自動', { fontSize: '18px', backgroundColor: '#225588', color: '#ffffff', padding: { x: 22, y: 5 } }).setInteractive();
        btnAuto.on('pointerdown', () => {
            this.autoSelectEnhanceMaterials();
            this.drawUI();
        });
        this.midContainer.add(btnAuto);

        if (this.enhanceMaterials.length === 4) {
            const btnExec = this.add.text(this.width - 120, 120, '強化実行', { fontSize: '18px', backgroundColor: '#880000', color: '#ffffff', padding: { x: 10, y: 5 }, fontStyle: 'bold' }).setInteractive();
            btnExec.on('pointerdown', () => this.executeEnhance());
            this.midContainer.add(btnExec);
        }
    }

    autoSelectEnhanceMaterials() {
        if (!this.enhanceBaseItem) return;
        
        const inventory = this.getInventoryItems();
        const validMaterials = inventory.filter(item => {
            if (!item) return false;
            if (item === this.enhanceBaseItem) return false;
            if (item.isLocked) return false; // ロックされたアイテムは除外
            if (item.rank !== this.enhanceBaseItem.rank) return false; // 同ランクのみ
            return true;
        });

        this.enhanceMaterials = validMaterials.slice(0, 4);
        
        if (this.enhanceMaterials.length < 4) {
            this.showToast(`適正な非ロック素材が${this.enhanceMaterials.length}個選択されました`);
        } else {
            this.showToast('素材を自動選択しました (4/4)');
        }
    }


    drawBottomSection() {
        // インベントリ一覧 (3/5)
        const headerY = 0;
        this.bottomContainer.add(this.add.text(20, headerY, '【インベントリ】', { fontSize: '20px', color: '#aaaaaa', padding: { top: 4, bottom: 4 } }));

        // レイアウト変更ボタン
        const layoutBtn = this.add.text(200, headerY, 'レイアウト', { fontSize: '18px', backgroundColor: '#333333', padding: { x: 8, y: 4 } }).setInteractive();
        layoutBtn.on('pointerdown', () => {
            this.expandedLayout = !this.expandedLayout;
            this.drawUI();
        });
        this.bottomContainer.add(layoutBtn);

        // 合成ボタン（レリクス・宝石共通）
        const synthBtn = this.add.text(320, headerY, '合成', { fontSize: '18px', backgroundColor: '#552288', padding: { x: 8, y: 4 } }).setInteractive();
        synthBtn.on('pointerdown', () => this.executeSynthesis());
        this.bottomContainer.add(synthBtn);

        const items = this.getInventoryItems();
        if (items.length === 0) {
            this.bottomContainer.add(this.add.text(30, 40, '所持アイテムがありません', { fontSize: '18px', color: '#777777', padding: { top: 4, bottom: 4 } }));
            return;
        }

        // Scrollable list simulation (WebGL対応マスク)
        const listHeight = this.height - 420 - 20;
        const maskShape = this.make.graphics({ x: 0, y: 0, add: false });
        maskShape.fillStyle(0xffffff, 1);
        maskShape.fillRect(20, 420 + 30, this.width - 40, listHeight);
        
        const mask = maskShape.createGeometryMask();
        
        const scrollContainer = this.add.container(0, 40);
        this.bottomContainer.add(scrollContainer);
        scrollContainer.setMask(mask);


        let currentY = 0;
        const itemSpacing = 35;

        items.forEach((item, index) => {
            // Is it selected for enhance?
            const isMat = this.enhanceMaterials.includes(item);
            let bgColor = index % 2 === 0 ? 0x222222 : 0x111111;
            if (this.selectedItem && !this.selectedItem.isEquipped && this.selectedItem.index === index) bgColor = 0x334433;
            if (isMat) bgColor = 0x552222;

            const bgHeight = this.expandedLayout ? itemSpacing + 25 : itemSpacing;
            const bg = this.add.rectangle(20, currentY, this.width - 90, bgHeight, bgColor).setOrigin(0, 0).setInteractive();
            scrollContainer.add(bg);
            
            // Name
            this.drawColoredItem(scrollContainer, 30, currentY + 8, '', item, '16px', this.expandedLayout);

            // Lock icon - ロックのかかっているアイテムにのみ 🔒 アイコンを表示
            if (item.isLocked) {
                const lockY = currentY + Math.floor(bgHeight / 2);
                const lockTxt = this.add.text(this.width - 65, lockY, '🔒', { fontSize: '18px' }).setOrigin(0.5, 0.5);
                scrollContainer.add(lockTxt);
            }

            // スワイプ判定用変数
            let touchStartY = 0;
            let touchStartX = 0;
            let touchStartScrollY = 0;
            let isSwiping = false;


            bg.on('pointerdown', (pointer) => {
                touchStartY = pointer.y;
                touchStartX = pointer.x;
                touchStartScrollY = scrollContainer.y;
                isSwiping = false;
            });

            bg.on('pointermove', (pointer) => {
                if (!pointer.isDown) return;
                const dy = pointer.y - touchStartY;
                if (Math.abs(dy) > 8 || isSwiping) {
                    isSwiping = true;
                    let targetY = touchStartScrollY + dy;
                    const minY = listHeight - currentY < 0 ? listHeight - currentY : 40;
                    if (targetY > 40) targetY = 40;
                    if (targetY < minY) targetY = minY;
                    scrollContainer.y = targetY;
                }
            });

            bg.on('pointerup', (pointer) => {
                if (isSwiping) return; // スワイプした場合はタップ扱いしない

                if (this.enhanceMode) {
                    if (item === this.enhanceBaseItem) return;
                    if (item.isLocked) return; // Cannot use locked
                    if (item.rank !== this.enhanceBaseItem.rank) return; // Must match rank
                    
                    if (isMat) {
                        this.enhanceMaterials = this.enhanceMaterials.filter(m => m !== item);
                    } else if (this.enhanceMaterials.length < 4) {
                        this.enhanceMaterials.push(item);
                    }
                    this.drawUI();
                } else {
                    this.selectedItem = { item, isEquipped: false, index };
                    this.drawUI();
                }
            });

            currentY += bgHeight;
        });

        // スクロール限界計算
        const minY = listHeight - currentY < 0 ? listHeight - currentY : 40;

        // ── スマホ用右端 ページ送り (▲ / ▼) ボタンの追加 ──
        const scrollBtnX = this.width - 35;
        const btnUp = this.add.text(scrollBtnX, 45, '▲\n上', {
            fontSize: '18px', color: '#ffffff', backgroundColor: '#225533', align: 'center', fontStyle: 'bold', padding: { x: 10, y: 10 }
        }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });

        const btnDown = this.add.text(scrollBtnX, listHeight - 10, '▼\n下', {
            fontSize: '18px', color: '#ffffff', backgroundColor: '#225533', align: 'center', fontStyle: 'bold', padding: { x: 10, y: 10 }
        }).setOrigin(0.5, 1).setInteractive({ useHandCursor: true });

        this.bottomContainer.add(btnUp);
        this.bottomContainer.add(btnDown);

        const scrollByAmount = (amount) => {
            let targetY = scrollContainer.y + amount;
            if (targetY > 40) targetY = 40;
            if (targetY < minY) targetY = minY;
            this.tweens.add({
                targets: scrollContainer,
                y: targetY,
                duration: 200,
                ease: 'Power1'
            });
        };

        btnUp.on('pointerdown', () => scrollByAmount(180));
        btnDown.on('pointerdown', () => scrollByAmount(-180));


        // PCマウスホイールスクロール
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            let targetY = scrollContainer.y - (deltaY * 0.5);
            if (targetY > 40) targetY = 40;
            if (targetY < minY) targetY = minY;
            scrollContainer.y = targetY;
        });

    }

    equipItem(invIndex) {
        const items = this.getInventoryItems();
        const item = items[invIndex];
        const char = this.globalState.characters[this.charId];
        
        if (this.itemType === 'relic') {
            // 選択されたスロット（this.slotIndex）に装備する
            let targetIdx = this.slotIndex;
            
            const oldItem = char.equipRelics[targetIdx];
            char.equipRelics[targetIdx] = item;
            items.splice(invIndex, 1);
            if (oldItem) items.push(oldItem);
        } else {
            const oldItem = char.equipGem;
            char.equipGem = item;
            items.splice(invIndex, 1);
            if (oldItem) items.push(oldItem);
        }
        
        SaveManager.saveGame();
        this.selectedItem = null;
        this.drawUI();
    }

    unequipItem(equipIndex) {
        const items = this.getInventoryItems();
        const char = this.globalState.characters[this.charId];
        
        if (this.itemType === 'relic') {
            const oldItem = char.equipRelics[equipIndex];
            char.equipRelics[equipIndex] = null;
            if (oldItem) items.push(oldItem);
        } else {
            const oldItem = char.equipGem;
            char.equipGem = null;
            if (oldItem) items.push(oldItem);
        }
        
        SaveManager.saveGame();
        this.selectedItem = null;
        this.drawUI();
    }


    startEnhanceMode(item) {
        this.enhanceMode = true;
        this.enhanceBaseItem = item;
        this.enhanceMaterials = [];
        this.drawUI();
    }

    executeEnhance() {
        if (this.enhanceMaterials.length !== 4) return;
        
        // Remove materials from inventory
        const items = this.getInventoryItems();
        this.enhanceMaterials.forEach(mat => {
            const idx = items.indexOf(mat);
            if (idx > -1) items.splice(idx, 1);
        });

        // Upgrade base item
        this.enhanceBaseItem.rank += 1;
        
        if (this.enhanceBaseItem.type === 'gem') {
            // Activate one more hidden trait
            const inactive = this.enhanceBaseItem.traits.filter(t => t.level === 0);
            if (inactive.length > 0) {
                const rndTrait = inactive[Math.floor(Math.random() * inactive.length)];
                rndTrait.level = 5;
            }
        } else {
            // Randomly distribute +2 to traits (max level rises by 2 per rank roughly)
            const levelsToAdd = 2; // Fixed to 2 for simplicity when upgrading
            for (let i = 0; i < levelsToAdd; i++) {
                if (this.enhanceBaseItem.traits && this.enhanceBaseItem.traits.length > 0) {
                    const rndTraitIdx = Math.floor(Math.random() * this.enhanceBaseItem.traits.length);
                    this.enhanceBaseItem.traits[rndTraitIdx].level += 1;
                }
            }

            // 新しいランクの冠詞を取得して入れ替える
            const pList = relicWords.prefixes[this.enhanceBaseItem.rank] || relicWords.prefixes[1];
            const newPrefix = pList[Math.floor(Math.random() * pList.length)] || '';
            let baseName = this.enhanceBaseItem.name;
            // 長い冠詞から順に前方一致判定し、古い冠詞をきれいに除去して入れ替える
            const allPrefixes = Object.values(relicWords.prefixes).flat().sort((a, b) => b.length - a.length);
            for (const p of allPrefixes) {
                if (baseName.startsWith(p)) {
                    baseName = baseName.slice(p.length);
                    break;
                }
            }
            this.enhanceBaseItem.name = `${newPrefix}${baseName}`;
        }


        this.enhanceMode = false;
        this.enhanceMaterials = [];
        this.enhanceBaseItem = null;
        this.selectedItem = null; // deselect to refresh
        
        // Play success sound if any
        if (this.cache.audio.exists('se_powerup')) {
            this.sound.play('se_powerup');
        }

        this.drawUI();
    }

    showToast(message) {
        const toast = this.add.text(this.width / 2, this.height - 100, message, {
            fontSize: '20px', backgroundColor: '#000000', color: '#ffffff', padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setAlpha(0).setDepth(100);

        this.tweens.add({
            targets: toast,
            alpha: 1,
            duration: 300,
            yoyo: true,
            hold: 2000,
            onComplete: () => toast.destroy()
        });
    }

    executeSynthesis() {
        // 装備中、ロック中のアイテムを除外
        const items = this.getInventoryItems().filter(i => !i.isLocked && !i.isEquipped);

        // ランク別にグループ化
        const byRank = {};
        items.forEach(i => {
            byRank[i.rank] = byRank[i.rank] || [];
            byRank[i.rank].push(i);
        });

        // 5個以上あるランクのうち、最も低いものを探す
        let targetRank = -1;
        const ranks = Object.keys(byRank).map(Number).sort((a, b) => a - b);
        for (const r of ranks) {
            if (byRank[r].length >= 5) {
                targetRank = r;
                break;
            }
        }

        const typeLabel = this.itemType === 'relic' ? 'レリクス' : '宝石';

        if (targetRank === -1) {
            this.synthConsumed = null;
            this.synthTargetRank = -1;
            this.synthConfirmMode = false;
            this.showToast(`合成できる同ランクのロックされていない${typeLabel}が5個ありません`);
            this.drawUI();
            return;
        }

        // 消費対象5個を確定してから確認ダイアログへ
        const consumed = byRank[targetRank].slice(0, 5);
        this.synthConsumed = consumed;
        this.synthTargetRank = targetRank;
        this.synthConfirmMode = true;
        this.drawUI();
    }

    doSynthesis() {
        const consumed = this.synthConsumed;
        const targetRank = this.synthTargetRank;

        if (this.itemType === 'relic') {
            this.globalState.inventory.relics = this.globalState.inventory.relics.filter(r => !consumed.includes(r));
            const newRelic = RelicGenerator.generateRelic(targetRank + 1);
            this.globalState.inventory.relics.push(newRelic);
            this.showToast(`『${newRelic.name}』のメモリアを合成した`);
        } else {
            if (!this.globalState.inventory.gems) this.globalState.inventory.gems = [];
            this.globalState.inventory.gems = this.globalState.inventory.gems.filter(g => !consumed.includes(g));
            const newGem = RelicGenerator.generateGem(targetRank + 1);
            this.globalState.inventory.gems.push(newGem);
            this.showToast(`『${newGem.name}』の宝石を合成した`);
        }

        SaveManager.saveGame();

        if (this.cache.audio.exists('se_powerup')) {
            this.sound.play('se_powerup');
        }

        // 確認モードを解除して再描画
        this.synthConsumed = null;
        this.synthTargetRank = -1;
        this.synthConfirmMode = false;
        this.selectedItem = null;
        this.enhanceMode = false;
        this.drawUI();
    }

    drawConfirmRelicItem(container, x, y, item) {
        const itemW = this.width - 40;
        const itemH = 40;
        const bg = this.add.rectangle(x, y, itemW, itemH, 0x221133).setOrigin(0, 0);
        container.add(bg);

        const iRankStr = this.getRankString(item.rank);
        const iColor = this.getRankColor(item.rank);
        const label = this.add.text(x + 8, y + 3, `[${iRankStr}] ${item.name || 'Unknown'}`, {
            fontSize: '14px', color: iColor
        });
        container.add(label);

        // 特性一覧 (開花済み ＋ 未開花)
        let traitX = x + 8;
        const traitY = y + 21;
        if (item.traits && Array.isArray(item.traits)) {
            // ① 開花済み
            item.traits.filter(t => t && t.level > 0).forEach(t => {
                const tName = t.name ? t.name.replace(/(\(%\))/, '') : '';
                const tColor = this.getRankColor(this.getTraitRank(t.level));
                const tLabel = this.add.text(traitX, traitY, `${tName}+${t.level}`, {
                    fontSize: '12px', color: tColor
                });
                container.add(tLabel);
                traitX += tLabel.width + 8;
            });
            // ② 未開花
            item.traits.filter(t => t && t.level === 0).forEach(t => {
                const tName = t.name ? t.name.replace(/(\(%\))/, '') : '';
                const tLabel = this.add.text(traitX, traitY, tName, {
                    fontSize: '12px', color: '#666666'
                });
                container.add(tLabel);
                traitX += tLabel.width + 2;

                const badge = this.add.text(traitX, traitY + 1, '未開花', {
                    fontSize: '10px', color: '#888888', backgroundColor: '#333333', padding: { x: 2, y: 1 }
                });
                container.add(badge);
                traitX += badge.width + 8;
            });
        }
        if (item.type === 'gem' && typeof gemEffects !== 'undefined' && gemEffects[item.name]) {
            const unique = gemEffects[item.name]?.effects?.[item.rank];
            if (unique && unique !== 'なし') {
                const uTxt = this.add.text(traitX, traitY, `【${unique}】`, { fontSize: '12px', color: iColor });
                container.add(uTxt);
            }
        }

        // 右端に鍵ボタン（解除状態の表記「🔓 解除」で統一。タップでロック保護＋別アイテムに再選定）
        const isLocked = !!item.isLocked;
        const lockBtnColor = isLocked ? '#664400' : '#444444';
        const lockBtnText = isLocked ? '🔒 ロック' : '🔓 解除';

        const lockBtn = this.add.text(x + itemW - 75, y + 8, lockBtnText, {
            fontSize: '12px', color: '#ffffff', backgroundColor: lockBtnColor,
            padding: { x: 6, y: 4 }
        }).setInteractive({ useHandCursor: true });

        lockBtn.on('pointerdown', () => {
            item.isLocked = true;
            SaveManager.saveGame();
            this.showToast(`『${item.name}』をロック保護しました`);
            this.executeSynthesis();
        });
        container.add(lockBtn);
    }

    showSynthesisConfirmUI() {
        const consumed = this.synthConsumed;
        const targetRank = this.synthTargetRank;
        const rankStr = this.getRankString(targetRank);
        const nextRankStr = this.getRankString(targetRank + 1);
        const typeLabel = this.itemType === 'relic' ? 'レリクス' : '宝石';

        // --- topContainer (y=70〜) ---
        // タイトル
        this.topContainer.add(
            this.add.text(20, 0, '【合成確認】', { fontSize: '18px', color: '#ffcc44' })
        );
        this.topContainer.add(
            this.add.text(20, 22, `${rankStr}${typeLabel} × 5 → ${nextRankStr}${typeLabel} × 1`, {
                fontSize: '14px', color: '#aaaaaa'
            })
        );

        // 1〜3個目を topContainer に縦並びで表示
        const itemH = 44;
        const topStartY = 42;
        consumed.slice(0, 3).forEach((item, idx) => {
            const by = topStartY + idx * itemH;
            this.drawConfirmRelicItem(this.topContainer, 20, by, item);
        });

        // --- midContainer (y=260〜) ---
        // 4〜5個目を midContainer に縦並びで表示
        const midStartY = 0;
        consumed.slice(3, 5).forEach((item, idx) => {
            const by = midStartY + idx * itemH;
            this.drawConfirmRelicItem(this.midContainer, 20, by, item);
        });

        // はい / いいえ ボタン
        const btnY = midStartY + 2 * itemH + 8;
        const btnYes = this.add.text(this.width / 2 - 95, btnY, '  はい  ', {
            fontSize: '20px', backgroundColor: '#226622', color: '#ffffff',
            padding: { x: 16, y: 8 }, fontStyle: 'bold'
        }).setInteractive({ useHandCursor: true });
        btnYes.on('pointerdown', () => this.doSynthesis());
        this.midContainer.add(btnYes);

        const btnNo = this.add.text(this.width / 2 + 15, btnY, ' いいえ ', {
            fontSize: '20px', backgroundColor: '#662222', color: '#ffffff',
            padding: { x: 16, y: 8 }
        }).setInteractive({ useHandCursor: true });
        btnNo.on('pointerdown', () => {
            this.synthConsumed = null;
            this.synthTargetRank = -1;
            this.synthConfirmMode = false;
            this.drawUI();
        });
        this.midContainer.add(btnNo);
    }
}
