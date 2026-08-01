import Phaser from 'phaser';
import { TransitionManager } from '../systems/TransitionManager';
import { FONT_MAIN, fontSize } from '../config/GameFont';

/**
 * 明転システムのテスト専用シーン
 *
 * - 緑色の背景
 * - 「明転テスト」タイトル
 * - 「tap to return」をタップするとDemoSceneへ明転して戻る
 */
export default class TransitionTestScene extends Phaser.Scene {
    constructor() {
        super('TransitionTestScene');
    }

    create() {
        // ── まず明転でフェードインして始まる ──
        TransitionManager.fadeIn(this);

        const { width, height } = this.scale;

        // ── 緑色の背景 ──
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a7a3a);

        // ── 「明転テスト」タイトル ──
        this.add.text(width / 2, height * 0.38, '明転テスト', {
            fontFamily: FONT_MAIN,
            fontSize: fontSize.large(width),
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.add.text(width / 2, height * 0.5, '白いスクリーンが\n1秒かけてフェードインしました', {
            fontFamily: FONT_MAIN,
            fontSize: fontSize.small(width),
            color: '#ccffcc',
            align: 'center',
            lineSpacing: 8
        }).setOrigin(0.5);

        // ── 「tap to return」──
        const tapText = this.add.text(width / 2, height * 0.68, 'tap to return', {
            fontFamily: FONT_MAIN,
            fontSize: fontSize.medium(width),
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        // 点滅アニメ
        this.tweens.add({
            targets: tapText,
            alpha: 0.15,
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // ── タップでDemoSceneへ明転して戻る ──
        this.input.once('pointerdown', () => {
            TransitionManager.transitionTo(this, 'DemoScene');
        });
    }
}
