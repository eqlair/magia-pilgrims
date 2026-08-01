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
            const btnRemove = this.add.text(btnX, btnY, 'はずす', { fontSize: '16px', backgroundColor: '#553333', padding: { x: 10, y: 5 } }).setOrigin(0.5, 0).setInteractive();
            btnRemove.on('pointerdown', () => { if(!this.enhanceMode) this.unequipItem(index); });
            container.add(btnRemove);
            btnY += 40;
        } else if (!isTopSection && !this.enhanceMode) {
            const btnEquip = this.add.text(btnX, btnY, '装備する', { fontSize: '16px', backgroundColor: '#335533', padding: { x: 10, y: 5 } }).setOrigin(0.5, 0).setInteractive();
            btnEquip.on('pointerdown', () => { if(!this.enhanceMode) this.equipItem(index); });
            container.add(btnEquip);
            btnY += 40;
        }

        if (item.rank < 8 && !this.enhanceMode) {
            const btnEnhance = this.add.text(btnX, btnY, '強化', { fontSize: '16px', backgroundColor: '#333355', padding: { x: 10, y: 5 } }).setOrigin(0.5, 0).setInteractive();
            btnEnhance.on('pointerdown', () => {
                this.selectedItem = { item, isEquipped, index };
                this.startEnhanceMode(item);
            });
            container.add(btnEnhance);
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
            container.add(this.add.text(x, y, `${prefix}--- 空き ---`, { fontSize: nameFontSize, color: '#555555' }));
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
        const equipped = this.getEquippedItems();
        const item = equipped[this.slotIndex];
        this.drawItemDetail(this.topContainer, '【装備中アイテム詳細】', item, true, this.slotIndex, true);
    }

    drawMidSection() {
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

        if (this.enhanceMaterials.length === 4) {
            const btnExec = this.add.text(this.width - 120, 80, '強化実行', { fontSize: '20px', backgroundColor: '#880000', color: '#ffffff', padding: { x: 10, y: 5 }, fontStyle: 'bold' }).setInteractive();
            btnExec.on('pointerdown', () => this.executeEnhance());
            this.midContainer.add(btnExec);
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

        // 合成ボタン（レリクスのみ）
        if (this.itemType === 'relic') {
            const synthBtn = this.add.text(320, headerY, '合成', { fontSize: '18px', backgroundColor: '#552288', padding: { x: 8, y: 4 } }).setInteractive();
            synthBtn.on('pointerdown', () => this.executeSynthesis());
            this.bottomContainer.add(synthBtn);
        }

        const items = this.getInventoryItems();
        if (items.length === 0) {
            this.bottomContainer.add(this.add.text(30, 40, '所持アイテムがありません', { fontSize: '18px', color: '#777777', padding: { top: 4, bottom: 4 } }));
            return;
        }

        // Scrollable list simulation
        const listHeight = this.height - 420 - 20;
        const graphics = this.add.graphics();
        graphics.fillStyle(0x000000, 1);
        graphics.fillRect(20, 420 + 30, this.width - 40, listHeight);
        graphics.setVisible(false);
        
        const mask = graphics.createGeometryMask();
        
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
            const bg = this.add.rectangle(20, currentY, this.width - 40, bgHeight, bgColor).setOrigin(0, 0).setInteractive();
            scrollContainer.add(bg);
            
            // Name
            this.drawColoredItem(scrollContainer, 30, currentY + 8, '', item, '16px', this.expandedLayout);

            // Lock icon - add background rectangle to increase hit area
            const lockBg = this.add.rectangle(this.width - 50, currentY + 16, 40, 40, 0x000000, 0).setInteractive();
            const lockTxt = this.add.text(this.width - 50, currentY + 16, item.isLocked ? '🔒' : '🔓', { fontSize: '18px' }).setOrigin(0.5, 0.5);

            scrollContainer.add(lockBg);
            scrollContainer.add(lockTxt);

            // Interactions
            lockBg.on('pointerdown', () => {
                if (!this.enhanceMode) {
                    item.isLocked = !item.isLocked;
                    lockTxt.setText(item.isLocked ? '🔒' : '🔓');
                    // this.globalState.save(); // Save the state immediately
                }
            });

            bg.on('pointerdown', () => {
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

            scrollContainer.add(lockTxt);
            currentY += bgHeight;
        });

        // Add dragging logic to scrollContainer
        const hitArea = new Phaser.Geom.Rectangle(20, 0, this.width - 40, Math.max(listHeight, currentY));
        scrollContainer.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
        this.input.setDraggable(scrollContainer);

        let startY = 0;
        scrollContainer.on('dragstart', (pointer) => { startY = scrollContainer.y; });
        scrollContainer.on('drag', (pointer, dragX, dragY) => {
            let targetY = dragY;
            const minY = listHeight - currentY < 0 ? listHeight - currentY : 40;
            if (targetY > 40) targetY = 40;
            if (targetY < minY) targetY = minY;
            scrollContainer.y = targetY;
        });
        
        // Mouse wheel
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            let targetY = scrollContainer.y - (deltaY * 0.5);
            const minY = listHeight - currentY < 0 ? listHeight - currentY : 40;
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

            // Regenerate name using new rank words
            const pList = relicWords.prefixes[this.enhanceBaseItem.rank] || relicWords.prefixes[1];
            const prefix = pList[Math.floor(Math.random() * pList.length)] || '';
            // Only prefix changes based on rank, adj and noun remain the same for flavor, or we regenerate everything.
            // Let's just regenerate the prefix to show growth, keep adj and noun.
            const parts = this.enhanceBaseItem.name.split(/(?=[^\w\s])/); // Simplified extraction
            // To be safer, just append "+" or regenerate full name
            // 既存のランク冠詞を除去してから新しい冠詞を付与
            let baseName = this.enhanceBaseItem.name;
            // 全ランクの冠詞リストを収集して、先頭にある冠詞を除去する
            const allPrefixes = Object.values(relicWords.prefixes).flat();
            for (const p of allPrefixes) {
                if (baseName.startsWith(p + 'の')) {
                    baseName = baseName.slice(p.length + 1); // 「冠詞の」を除去
                    break;
                }
            }
            this.enhanceBaseItem.name = `${prefix}の${baseName}`;
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
        if (this.itemType !== 'relic') return;

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

        if (targetRank === -1) {
            this.showToast('合成できる同ランクのロックされていないレリクスが5個ありません');
            return;
        }

        // 対象ランクから5個消費
        const consumed = byRank[targetRank].slice(0, 5);
        this.globalState.inventory.relics = this.globalState.inventory.relics.filter(r => !consumed.includes(r));

        // 1ランク上のレリクスを生成
        const newRelic = RelicGenerator.generateRelic(targetRank + 1);
        
        this.globalState.inventory.relics.push(newRelic);
        SaveManager.saveGame();


        this.showToast(`『${newRelic.name}』のメモリアを合成した`);
        
        if (this.cache.audio.exists('se_powerup')) {
            this.sound.play('se_powerup');
        }

        // 再描画のため選択状態をリセット
        this.selectedItem = null;
        this.enhanceMode = false;
        this.drawUI();
    }
}
