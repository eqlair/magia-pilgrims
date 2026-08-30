import Phaser from 'phaser';
import { GlobalState } from '../systems/GlobalState';
import { LoadingOverlay } from '../systems/LoadingOverlay';

export class DebugMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'DebugMenuScene' });
    }

    create() {
        const { width, height } = this.scale;
        const centerX = width / 2;

        // 暗い背景
        this.add.rectangle(0, 0, width, height, 0x000000, 0.8).setOrigin(0, 0);

        // タイトル
        this.add.text(centerX, 100, 'デバッグ設定', {
            fontSize: '32px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0.5);

        const gs = GlobalState.getInstance();

        // --- 敵HP倍率 (XX) ---
        this.createNumberInput(centerX, 150, '敵最大HP倍率 (XX)', gs.debugEnemyHpMultiplier, (val) => {
            gs.debugEnemyHpMultiplier = val;
        });

        // --- 敵移動倍率 (YY) ---
        this.createNumberInput(centerX, 250, '敵移動・インターバル倍率 (YY)', gs.debugEnemyMoveMultiplier, (val) => {
            gs.debugEnemyMoveMultiplier = val;
        });

        // --- 敵射程倍率 (ZZ) ---
        this.createNumberInput(centerX, 350, '敵射程距離倍率 (ZZ)', gs.debugEnemyRangeMultiplier, (val) => {
            gs.debugEnemyRangeMultiplier = val;
        });

        // --- 敵サイズ倍率 (WW) ---
        this.createNumberInput(centerX, 450, '敵サイズ倍率 (WW)', gs.debugEnemySizeMultiplier || 1.0, (val) => {
            gs.debugEnemySizeMultiplier = val;
        });
        
        // --- 敵HP成長率 (VV) ---
        this.createNumberInput(centerX, 550, '敵HP成長率 (VV)', gs.debugEnemyHpGrowthRate || 1.0, (val) => {
            gs.debugEnemyHpGrowthRate = val;
        });

        // タワー編テスト開始ボタン
        const towerBtn = this.add.text(centerX, 630, '🗼 タワー編テスト開始', {
            fontSize: '20px',
            color: '#00ffff',
            fontStyle: 'bold',
            backgroundColor: '#113355',
            padding: { x: 20, y: 8 }
        }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

        towerBtn.on('pointerdown', () => {
            gs.isTowerMode = true;
            gs.towerFloor = 0;
            gs.food = 100;
            this.scene.stop('TitleScene');
            this.scene.stop('AdventureScene');
            this.scene.start('AdventureScene', {
                isTower: true,
                party: ['001', '002', '003', '004', '005']
            });
            this.scene.stop();
        });

        // 🏃‍♀️ ローディング画面テストボタン
        const loadingTestBtn = this.add.text(centerX, 690, '🏃‍♀️ ローディング画面プレビュー', {
            fontSize: '20px',
            color: '#ffcc00',
            fontStyle: 'bold',
            backgroundColor: '#332211',
            padding: { x: 20, y: 8 }
        }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

        loadingTestBtn.on('pointerdown', () => {
            const overlay = LoadingOverlay.show(this, { depth: 20000 });
            // タップで別キャラ・TIPSを再抽選、2秒後に自動で閉じるかタップで閉じる案内
            const closeHint = this.add.text(centerX, height * 0.85, '【 タップすると閉じます 】', {
                fontSize: '16px',
                color: '#aaaaaa'
            }).setOrigin(0.5, 0.5).setDepth(20001);

            const clickZone = this.add.rectangle(0, 0, width, height, 0x000000, 0)
                .setOrigin(0, 0)
                .setDepth(20002)
                .setInteractive({ useHandCursor: true });

            clickZone.on('pointerdown', () => {
                clickZone.destroy();
                closeHint.destroy();
                LoadingOverlay.hide(this, 150);
            });
        });

        // 閉じるボタン
        const closeBtn = this.add.text(centerX, 750, '閉じる', {
            fontSize: '22px',
            color: '#ffffff',
            backgroundColor: '#666666',
            padding: { x: 20, y: 8 }
        }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

        closeBtn.on('pointerdown', () => {
            this.scene.resume('TitleScene');
            this.scene.resume('AdventureScene');
            this.scene.stop();
        });
    }

    createNumberInput(x, y, label, initialValue, onChange) {
        // ラベル
        this.add.text(x, y - 30, label, {
            fontSize: '20px',
            color: '#aaaaaa'
        }).setOrigin(0.5, 0.5);

        // 値テキスト
        const valueText = this.add.text(x, y, initialValue.toFixed(1), {
            fontSize: '28px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0.5);

        // マイナスボタン
        const minusBtn = this.add.text(x - 80, y, ' - ', {
            fontSize: '28px',
            color: '#ffffff',
            backgroundColor: '#ff4444',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

        // プラスボタン
        const plusBtn = this.add.text(x + 80, y, ' + ', {
            fontSize: '28px',
            color: '#ffffff',
            backgroundColor: '#4444ff',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

        let currentValue = initialValue;

        const updateValue = (delta) => {
            currentValue = Math.max(0.1, currentValue + delta);
            valueText.setText(currentValue.toFixed(1));
            onChange(currentValue);
        };

        minusBtn.on('pointerdown', () => updateValue(-0.5));
        plusBtn.on('pointerdown', () => updateValue(0.5));
    }
}
