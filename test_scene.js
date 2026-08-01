





class EquipmentScene {
    constructor() {
        super('EquipmentScene');
    }

    init(data) {
        this.charId = data.charId;
        this.itemType = data.itemType; // 'relic' or 'gem'
        this.globalState = GlobalState.getInstance();
    }

    create() {
        this.width = this.cameras.main.width;
        this.height = this.cameras.main.height;
        
        // Background overlay
        this.add.rectangle(0, 0, this.width, this.height, 0x111111, 0.95).setOrigin(0, 0);

        // Header and Back Button
        const headerText = this.add.text(this.width / 2, 20, `${this.itemType === 'relic' ? 'レリクス' : '宝石'} 管理画面`, {
            fontSize: '28px', color: '#ffffff', fontStyle: 'bold'
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
        this.scene.resume('CampScene');
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
            case 1: return '#cccccc';
            case 2: return '#aaffaa';
            case 3: return '#aaaaff';
            case 4: return '#ffaaff';
            case 5: return '#ffffaa';
            case 6: return '#ffaa00';
            case 7: return '#ff5555';
            case 8: return '#00ffff';
            default: return '#ffffff';
        }
    }
    
    getTraitRank(level) {
        if (level <= 3) return 1;
        if (level <= 5) return 2;
        if (level <= 7) return 3;
        if (level <= 9) return 4;
        if (level <= 11) return 5;
        if (level <= 13) return 6;
        if (level <= 15) return 7;
        return 8;
    }

    drawColoredItem(container, x, y, prefix, item, fontSizeStr) {
        const fontSize = parseInt(fontSizeStr);
        if (!item) {
            container.add(this.add.text(x, y, `${prefix}--- 空き ---`, { fontSize: fontSizeStr, color: '#555555' }));
            return;
        }
        let currentX = x;
        if (prefix) {
            const pTxt = this.add.text(currentX, y, prefix, { fontSize: fontSizeStr, color: '#aaaaaa' });
            container.add(pTxt);
            currentX += pTxt.width + 5;
        }
        
        const nColor = this.getRankColor(item.rank);
        const nameTxt = this.add.text(currentX, y, `[Rank${item.rank}] ${item.name}`, { fontSize: fontSizeStr, color: nColor });
        container.add(nameTxt);
        currentX += nameTxt.width + 10;
        
        if (item.traits) {
            item.traits.filter(t => t.level > 0).forEach(t => {
                const c = this.getRankColor(this.getTraitRank(t.level));
                const tTxt = this.add.text(currentX, y + 2, `${t.name.replace(/\(%\)/,'')}+${t.level}`, { fontSize: (fontSize - 2) + 'px', color: c });
                container.add(tTxt);
                currentX += tTxt.width + 8;
            });
        }
        if (item.type === 'gem') {
            const unique = gemEffects[item.name]?.effects?.[item.rank];
            if (unique && unique !== 'なし') {
                const uTxt = this.add.text(currentX, y + 2, `【${unique}】`, { fontSize: (fontSize - 2) + 'px', color: nColor });
                container.add(uTxt);
            }
        }
    }

    drawUI() {
        this.topContainer.removeAll(true);
        this.midContainer.removeAll(true);
        this.bottomContainer.removeAll(true);

        this.drawTopSection();
        this.drawMidSection();
        this.drawBottomSection();
    }

    drawTopSection() {
        // 現在装備中 (1/5)
        this.topContainer.add(this.add.text(20, 0, '【装備中】', { fontSize: '20px', color: '#aaaaaa' }));
        const equipped = this.getEquippedItems();
        
        equipped.forEach((item, index) => {
            const y = 30 + (index * 30);
            
            const hitArea = this.add.rectangle(30, y, this.width - 60, 25, 0x000000, 0).setOrigin(0,0).setInteractive();
            if (item) {
                hitArea.on('pointerdown', () => {
                    if (this.enhanceMode) return;
                    this.selectedItem = { item, isEquipped: true, index };
                    this.drawMidSection();
                });
            }
            this.topContainer.add(hitArea);
            this.drawColoredItem(this.topContainer, 30, y, `${index + 1}.`, item, '18px');
        });
    }

    drawMidSection() {
        // 選択アイテム詳細 (1/5)
        this.midContainer.add(this.add.text(20, 0, this.enhanceMode ? '【強化モード：素材選択中】' : '【選択中アイテム詳細】', { fontSize: '20px', color: '#ffcc00' }));
        
        if (this.enhanceMode) {
            this.drawEnhanceModeUI();
            return;
        }

        if (!this.selectedItem) {
            this.midContainer.add(this.add.text(30, 40, 'アイテムが選択されていません', { fontSize: '18px', color: '#777777' }));
            return;
        }

        const item = this.selectedItem.item;
        
        this.drawColoredItem(this.midContainer, 30, 30, '', item, '22px');
        // Buttons
        const btnY = 90;
        if (this.selectedItem.isEquipped) {
            // はずす
            const btnRemove = this.add.text(30, btnY, 'はずす', { fontSize: '20px', backgroundColor: '#553333', padding: { x: 10, y: 5 } }).setInteractive();
            btnRemove.on('pointerdown', () => this.unequipItem(this.selectedItem.index));
            this.midContainer.add(btnRemove);
        } else {
            // 装備する
            const btnEquip = this.add.text(30, btnY, '装備する', { fontSize: '20px', backgroundColor: '#335533', padding: { x: 10, y: 5 } }).setInteractive();
            btnEquip.on('pointerdown', () => this.equipItem(this.selectedItem.index));
            this.midContainer.add(btnEquip);
        }

        // 強化する (Rank 8未満)
        if (item.rank < 8) {
            const btnEnhance = this.add.text(140, btnY, '強化する', { fontSize: '20px', backgroundColor: '#333355', padding: { x: 10, y: 5 } }).setInteractive();
            btnEnhance.on('pointerdown', () => this.startEnhanceMode(item));
            this.midContainer.add(btnEnhance);
        }
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
        this.bottomContainer.add(this.add.text(20, 0, '【インベントリ】', { fontSize: '20px', color: '#aaaaaa' }));

        const items = this.getInventoryItems();
        if (items.length === 0) {
            this.bottomContainer.add(this.add.text(30, 40, '所持アイテムがありません', { fontSize: '18px', color: '#777777' }));
            return;
        }

        // Scrollable list simulation
        const listHeight = this.height - 420 - 20;
        const graphics = this.add.graphics();
        graphics.fillStyle(0x000000, 1);
        graphics.fillRect(20, 420 + 30, this.width - 40, listHeight);
        graphics.setVisible(false);
        
        const mask = new Phaser.Display.Masks.GeometryMask(this, graphics);
        
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

            const bg = this.add.rectangle(20, currentY, this.width - 40, itemSpacing, bgColor).setOrigin(0, 0).setInteractive();
            
            // Name
            this.drawColoredItem(scrollContainer, 30, currentY + 8, '', item, '16px');

            // Lock icon
            const lockTxt = this.add.text(this.width - 60, currentY + 8, item.isLocked ? '🔒' : '🔓', { fontSize: '18px' }).setInteractive();

            // Interactions
            lockTxt.on('pointerdown', (e) => {
                e.stopPropagation(); // Prevents selection
                if (!this.enhanceMode) {
                    item.isLocked = !item.isLocked;
                    lockTxt.setText(item.isLocked ? '🔒' : '🔓');
                }
            });

            bg.on('pointerdown', () => {
                if (this.enhanceMode) {
                    // Toggle material selection
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

            scrollContainer.add([bg, nameTxt, lockTxt]);
            currentY += itemSpacing;
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
            // Find empty slot or replace first
            let emptyIdx = char.equipRelics.findIndex(r => r === null);
            if (emptyIdx === -1) emptyIdx = 0; // Swap first if full
            
            const oldItem = char.equipRelics[emptyIdx];
            char.equipRelics[emptyIdx] = item;
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
            this.enhanceBaseItem.name = `${prefix}の${this.enhanceBaseItem.name}`;
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
}

const scene = new EquipmentScene();
scene.width = 800;
scene.height = 600;
scene.enhanceMode = false;
scene.enhanceMaterials = [];
scene.selectedItem = null;
scene.itemType = 'relic';
scene.charId = '001';

// Mocks
scene.add = {
    container: () => ({ add: function(child) { this.children = this.children || []; this.children.push(child); }, removeAll: () => {}, setMask: () => {} }),
    text: (x, y, text, style) => ({ width: 50, setInteractive: () => ({ on: () => {} }), on: () => {}, setText: () => {} }),
    rectangle: () => ({ setOrigin: () => ({ setInteractive: () => ({ on: () => {} }) }) }),
    graphics: () => ({ fillStyle: () => {}, fillRect: () => {}, setVisible: () => {} })
};
scene.globalState = {
    characters: {
        '001': {
            equipRelics: [null, null, null, null, null],
            equipGem: null
        }
    },
    inventory: {
        relics: [
            {
                type: 'relic',
                name: 'Test Relic',
                rank: 1,
                traits: [
                    { name: '攻撁EUP(%)', level: 1 }
                ]
            }
        ],
        gems: []
    }
};

scene.topContainer = scene.add.container();
scene.midContainer = scene.add.container();
scene.bottomContainer = scene.add.container();

// Mask mock
global.Phaser = { Display: { Masks: { GeometryMask: class {} } } };

try {
    scene.drawUI();
    console.log('Success');
} catch (e) {
    console.error('Error:', e);
}
