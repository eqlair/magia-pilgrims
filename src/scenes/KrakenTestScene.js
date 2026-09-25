import Phaser from 'phaser';
import { TransitionManager } from '../systems/TransitionManager';
import { KrakenBossVisual } from '../systems/KrakenBossVisual';
import { FONT_MAIN, fontSize } from '../config/GameFont';

/**
 * 巨大タコ魔女（クラーケン）演出テスト検証シーン
 * 
 * - タイトルの歯車（DemoScene）から直接起動可能
 * - コールタール水面背景の左右往復（5秒）＆横拡縮（3秒）
 * - 本体A+Bのピッタリ重なり＋±2%拡縮うごめき＋微小遅延追随
 * - 8本の触手（Rope）の奥4本・手前4本のウネウネ挙動
 * - タップした位置への視線・左右反転テスト
 */
export default class KrakenTestScene extends Phaser.Scene {
    constructor() {
        super('KrakenTestScene');
        this.kraken = null;
        this.targetMarker = null;
    }

    preload() {
        // アセットのロード
        this.load.image('kraken_a', 'files/ENEMY/KrakenA.png');
        this.load.image('kraken_b', 'files/ENEMY/KrakenB.png');
        this.load.image('kraken_c', 'files/ENEMY/KrakenC.png');
        this.load.image('kraken_bg', 'files/BG_battle/KrakenBG.jpg');

        // BGM（キャッシュになければロード）
        if (!this.cache.audio.exists('bgm_kraken')) {
            this.load.audio('bgm_kraken', 'files/BGM/BOSS002.mp3');
        }
    }

    create() {
        TransitionManager.fadeIn(this);

        const { width, height } = this.scale;

        // ── 1. クラーケン演出コンポーネントの構築 ──
        // 画面幅540の中央、水面高さ y=640 付近（水中に深く沈んだどっしり感）
        this.kraken = new KrakenBossVisual(this, width / 2, height * 0.67, {
            bodyScale: 0.52,
            facingRight: false,
            showBg: true
        });

        // ── 2. BGM再生 ──
        this._playBgm();

        // ── 3. タップでターゲット設定＆反転 ──
        this.input.on('pointerdown', (pointer) => {
            // UI領域（上部・下部ボタン）のタップは除外
            if (pointer.y < 80 || pointer.y > height - 70) return;

            this._setTargetPosition(pointer.x, pointer.y);
        });

        // ── 4. テスト用UIオーバーレイ ──
        this._buildUI();
    }

    _playBgm() {
        if (this.sound.get('bgm_kraken')) {
            this.sound.removeByKey('bgm_kraken');
        }
        try {
            const bgm = this.sound.add('bgm_kraken', { loop: true, volume: 0.65 });
            bgm.play();
            this._bgm = bgm;
        } catch (e) {
            console.warn('[KrakenTestScene] BGM play failed:', e);
        }
    }

    _setTargetPosition(x, y) {
        // ターゲットマーカーの表示・移動
        if (!this.targetMarker) {
            this.targetMarker = this.add.container(x, y).setDepth(200);
            
            const outerCircle = this.add.circle(0, 0, 18, 0xff3333, 0).setStrokeStyle(2, 0xff4444);
            const innerDot = this.add.circle(0, 0, 4, 0xff4444, 1.0);
            const lineH = this.add.line(0, 0, -24, 0, 24, 0, 0xff4444, 0.8);
            const lineV = this.add.line(0, 0, 0, -24, 0, 24, 0xff4444, 0.8);

            this.targetMarker.add([outerCircle, innerDot, lineH, lineV]);

            // 回転パルスアニメーション
            this.tweens.add({
                targets: this.targetMarker,
                angle: 360,
                duration: 4000,
                repeat: -1
            });
            this.tweens.add({
                targets: outerCircle,
                scale: 1.25,
                duration: 600,
                yoyo: true,
                repeat: -1
            });
        } else {
            this.targetMarker.setPosition(x, y);
            this.targetMarker.setAlpha(1);
        }

        // タコをターゲットのX座標に向けて反転
        if (this.kraken) {
            this.kraken.setTargetX(x);
        }
    }

    _buildUI() {
        const { width, height } = this.scale;

        // ── 上部バー ──
        const topBar = this.add.rectangle(width / 2, 35, width, 70, 0x000000, 0.65).setDepth(300);

        // 戻るボタン
        const backBtn = this.add.text(20, 35, '← 戻る', {
            fontFamily: FONT_MAIN,
            fontSize: '18px',
            color: '#ffffff',
            backgroundColor: '#333355aa',
            padding: { x: 12, y: 8 }
        }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true }).setDepth(301);

        backBtn.on('pointerdown', (pointer) => {
            if (pointer && pointer.event) pointer.event.stopPropagation();
            if (this._bgm && this._bgm.isPlaying) {
                this._bgm.stop();
            }
            TransitionManager.transitionTo(this, 'DemoScene');
        });

        // タイトル
        this.add.text(width / 2 + 30, 35, '🐙 巨大タコ魔女 演出テスト', {
            fontFamily: FONT_MAIN,
            fontSize: '18px',
            color: '#ffccaa',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0.5).setDepth(301);

        // ── 下部案内＆操作バー ──
        const bottomBar = this.add.rectangle(width / 2, height - 35, width, 70, 0x000000, 0.75).setDepth(300);

        // 説明テキスト
        this.add.text(width / 2, height - 48, '画面をタップするとターゲット位置を設定して反転します', {
            fontFamily: FONT_MAIN,
            fontSize: '13px',
            color: '#cccccc'
        }).setOrigin(0.5, 0.5).setDepth(301);

        // 「左右反転」トグルボタン
        const flipBtn = this.add.text(width / 2, height - 20, '🔄 向きを反転切替', {
            fontFamily: FONT_MAIN,
            fontSize: '14px',
            color: '#ffffff',
            backgroundColor: '#663322cc',
            padding: { x: 16, y: 4 }
        }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true }).setDepth(301);

        flipBtn.on('pointerdown', (pointer) => {
            if (pointer && pointer.event) pointer.event.stopPropagation();
            if (this.kraken) {
                this.kraken.toggleFacing();
            }
        });
    }

    update(time, delta) {
        // 秒単位のデルタ
        const deltaSec = delta * 0.001;
        if (this.kraken) {
            this.kraken.update(time, deltaSec);
        }
    }

    shutdown() {
        if (this._bgm && this._bgm.isPlaying) {
            this._bgm.stop();
        }
        if (this.kraken) {
            this.kraken.destroy();
            this.kraken = null;
        }
    }
}
