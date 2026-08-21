import Phaser from 'phaser';
import { TransitionManager } from '../systems/TransitionManager';
import { FONT_MAIN, fontSize } from '../config/GameFont';

export default class MapEventAdjustScene extends Phaser.Scene {
    constructor() {
        super('MapEventAdjustScene');
    }

    create() {
        const { width, height } = this.scale;

        // 背景候補リスト
        this.bgList = [
            'bg_img_woods.jpg',
            'bg_img_city.jpg',
            'bg_img_field.jpg',
            'bg_img_tower.jpg',
            'tower_bg_街',
            'tower_bg_石',
            'tower_bg_樹',
            'tower_bg_骨',
            'tower_bg_氷',
            'tower_bg_顔',
            'tower_bg_炎',
            'tower_bg_金',
            'tower_bg_異',
            'tower_bg_外',
            'tower_bg_黒',
            'tower_bg_赤',
            'tower_bg_青',
            'tower_bg_黄',
            'tower_bg_緑',
            'tower_bg_紫',
            'tower_bg_白',
            'ikebukuro01',
            'ikebukuro02',
            'bg_1207a',
            'bg_1214a',
            'bg_1221a',
            'bg_wildhunt',
            'ev_daycamp',
            'ev_camp',
            'bg_resp'
        ].filter(k => this.textures.exists(k));

        if (this.bgList.length === 0) {
            this.bgList = ['bg_img_woods.jpg'];
        }

        // キャラクター候補リスト
        this.charList = [
            { id: '001', name: '紫苑', key: 'portrait_001', keyB: 'portrait_001_b' },
            { id: '002', name: '蒼樹', key: 'portrait_002', keyB: 'portrait_002_b' },
            { id: '003', name: '紅華', key: 'portrait_003', keyB: 'portrait_003_b' },
            { id: '004', name: '黄蘭', key: 'portrait_004', keyB: 'portrait_004_b' },
            { id: '005', name: '李乃果', key: 'portrait_005', keyB: 'portrait_005_b' },
            { id: '010', name: '白蓮', key: 'portrait_010', keyB: 'portrait_010_b' }
        ];

        this.bgIndex = 0;
        this.char1Index = 1; // 蒼樹 (左)
        this.char2Index = 0; // 紫苑 (右)

        // 1. 背景描画 (中央上を支点: origin(0.5, 0))
        this.bgScale = 0.8;

        this.bgImage = this.add.image(width / 2, 0, this.bgList[this.bgIndex]);
        this.bgImage.setOrigin(0.5, 0);
        this.bgImage.setScale(this.bgScale);

        // 2. キャラクター描画 (EventEngineの初期配置: H/2, scale = (H * 0.6) / height)
        this.charY = height / 2;
        const c1Def = this.charList[this.char1Index];
        const c2Def = this.charList[this.char2Index];

        const dummyTex = this.textures.get(c1Def.key);
        const charH = (dummyTex && dummyTex.getSourceImage()) ? dummyTex.getSourceImage().height : 800;
        this.defaultCharScale = (height * 0.6) / charH;
        this.charScale = this.defaultCharScale;

        const c1Key = this.textures.exists(c1Def.keyB) ? c1Def.keyB : c1Def.key;
        this.char1Image = this.add.image(width * 0.25, this.charY, c1Key);
        this.char1Image.setOrigin(0.5, 0.5);
        this.char1Image.setScale(this.charScale);

        this.char2Image = this.add.image(width * 0.75, this.charY, c2Def.key);
        this.char2Image.setOrigin(0.5, 0.5);
        this.char2Image.setScale(this.charScale);

        // 3. メッセージ欄 (いつものEventEngineと完全に同じ位置・サイズ・デザイン)
        const BOX_TOP = height * 0.62;
        const BOX_H   = height * 0.38;

        this.textBox = this.add.rectangle(width / 2, BOX_TOP + BOX_H / 2, width, BOX_H, 0x000000)
            .setAlpha(0.75);

        this.nameLabel = this.add.text(24, BOX_TOP + 8, '【マップイベント調整モード】', {
            fontFamily: FONT_MAIN,
            fontSize: fontSize.small(width),
            color: '#ffdd88',
            fontStyle: 'bold'
        });

        this.textLabel = this.add.text(24, BOX_TOP + 38, '', {
            fontFamily: FONT_MAIN,
            fontSize: '15px',
            color: '#ffffff',
            wordWrap: { width: width - 48, useAdvancedWrap: true },
            lineSpacing: 6
        });

        this.tapLabel = this.add.text(width - 16, height - 16, '[ESC] 終了して戻る', {
            fontFamily: FONT_MAIN,
            fontSize: fontSize.small(width),
            color: '#aaaaaa'
        }).setOrigin(1, 1);

        // 戻るボタン
        const backBtn = this.add.text(16, 16, '◀ 戻る', {
            fontFamily: FONT_MAIN,
            fontSize: '18px',
            color: '#ffaaaa',
            backgroundColor: '#220000bb',
            padding: { x: 10, y: 6 },
            stroke: '#000000',
            strokeThickness: 3
        }).setInteractive({ useHandCursor: true });

        backBtn.on('pointerdown', () => {
            TransitionManager.transitionTo(this, 'DemoScene');
        });

        // キーボード入力設定
        this.cursors = this.input.keyboard.addKeys({
            q: Phaser.Input.Keyboard.KeyCodes.Q,
            a: Phaser.Input.Keyboard.KeyCodes.A,
            w: Phaser.Input.Keyboard.KeyCodes.W,
            s: Phaser.Input.Keyboard.KeyCodes.S,
            e: Phaser.Input.Keyboard.KeyCodes.E,
            d: Phaser.Input.Keyboard.KeyCodes.D,
            r: Phaser.Input.Keyboard.KeyCodes.R,
            f: Phaser.Input.Keyboard.KeyCodes.F,
            t: Phaser.Input.Keyboard.KeyCodes.T,
            g: Phaser.Input.Keyboard.KeyCodes.G,
            esc: Phaser.Input.Keyboard.KeyCodes.ESC
        });

        this.input.keyboard.on('keydown-ESC', () => {
            TransitionManager.transitionTo(this, 'DemoScene');
        });

        // 単発キー切り替え
        this.input.keyboard.on('keydown-R', () => this.switchBg(1));
        this.input.keyboard.on('keydown-F', () => this.switchBg(-1));
        this.input.keyboard.on('keydown-T', () => this.switchRandomChars());
        this.input.keyboard.on('keydown-G', () => this.switchRandomChars());

        this.updateParamDisplay();
    }

    switchBg(delta = 1) {
        this.bgIndex = (this.bgIndex + delta + this.bgList.length) % this.bgList.length;
        const key = this.bgList[this.bgIndex];
        if (this.textures.exists(key)) {
            this.bgImage.setTexture(key);
        }
        this.updateParamDisplay();
    }

    switchRandomChars() {
        let idx1 = Math.floor(Math.random() * this.charList.length);
        let idx2 = Math.floor(Math.random() * this.charList.length);
        while (idx2 === idx1 && this.charList.length > 1) {
            idx2 = Math.floor(Math.random() * this.charList.length);
        }
        this.char1Index = idx1;
        this.char2Index = idx2;

        const c1 = this.charList[this.char1Index];
        const c2 = this.charList[this.char2Index];

        const c1Key = this.textures.exists(c1.keyB) ? c1.keyB : c1.key;
        this.char1Image.setTexture(c1Key);
        this.char2Image.setTexture(c2.key);

        this.updateParamDisplay();
    }

    update(time, delta) {
        const dt = delta / 1000;
        let changed = false;

        // Q, A: 背景の拡大率 (毎秒 0.3倍 変化)
        if (this.cursors.q.isDown) {
            this.bgScale = Math.min(3.0, this.bgScale + 0.3 * dt);
            this.bgImage.setScale(this.bgScale);
            changed = true;
        }
        if (this.cursors.a.isDown) {
            this.bgScale = Math.max(0.1, this.bgScale - 0.3 * dt);
            this.bgImage.setScale(this.bgScale);
            changed = true;
        }

        // W, S: キャラクターの拡大率 (毎秒 0.3倍 変化)
        if (this.cursors.w.isDown) {
            this.charScale = Math.min(2.5, this.charScale + 0.3 * dt);
            this.char1Image.setScale(this.charScale);
            this.char2Image.setScale(this.charScale);
            changed = true;
        }
        if (this.cursors.s.isDown) {
            this.charScale = Math.max(0.1, this.charScale - 0.3 * dt);
            this.char1Image.setScale(this.charScale);
            this.char2Image.setScale(this.charScale);
            changed = true;
        }

        // E, D: キャラクターの垂直位置 (毎秒 120px 変化)
        if (this.cursors.e.isDown) {
            this.charY -= 120 * dt;
            this.char1Image.setY(this.charY);
            this.char2Image.setY(this.charY);
            changed = true;
        }
        if (this.cursors.d.isDown) {
            this.charY += 120 * dt;
            this.char1Image.setY(this.charY);
            this.char2Image.setY(this.charY);
            changed = true;
        }

        if (changed) {
            this.updateParamDisplay();
        }
    }

    updateParamDisplay() {
        const bgKey = this.bgList[this.bgIndex];
        const c1 = this.charList[this.char1Index];
        const c2 = this.charList[this.char2Index];

        const text = [
            `🖼️ 背景画像: [${bgKey}]  Scale: ${this.bgScale.toFixed(4)} (中央上支点)`,
            `👥 キャラクター: [左: ${c1.name}]  [右: ${c2.name}]`,
            `📏 キャラScale: ${this.charScale.toFixed(4)}  |  垂直位置 (Y): ${Math.round(this.charY)} px (H/2からの差: ${Math.round(this.charY - this.scale.height / 2)}px)`,
            `⌨️ [Q/A] 背景拡大/縮小 | [W/S] キャラ拡大/縮小 | [E/D] キャラ上下 | [R/F] 背景切替 | [T/G] キャラ切替`
        ].join('\n');

        this.textLabel.setText(text);
    }
}
