import Phaser from 'phaser';
import { TransitionManager } from '../systems/TransitionManager';
import { EventEngine } from '../systems/EventEngine';

export default class OpScene extends Phaser.Scene {
    constructor() {
        super('OpScene');
    }

    preload() {
        // OP用のアセットをロード
        this.load.image('ev001', 'files/OP/ev001.jpg');
        this.load.image('ev002', 'files/OP/ev002.jpg');
        this.load.image('ev003', 'files/OP/ev003.jpg');
        this.load.image('evp001', 'files/OP/evp001.jpg');
        
        this.load.audio('bgm_hoshi', 'files/BGM/003_hoshihuru.mp3');
        this.load.audio('bgm_mad', 'files/BGM/007_stage_mad.mp3');
        this.load.audio('se_bomb', 'files/OP/bomb.mp3');

        this.load.image('op_title', 'files/OP/title.png');
        this.load.audio('op_start', 'files/OP/start.mp3');

        // シナリオデータをロード
        this.load.json('op_event', 'files/OP/op_event.json');
    }


    create() {
        // デモシーンのBGMを止める
        if (this.sound.get('bgm_menu')) {
            this.sound.get('bgm_menu').stop();
        }

        TransitionManager.fadeIn(this);

        // キャッシュからJSONデータを取得
        const eventData = this.cache.json.get('op_event');

        this.engine = new EventEngine(this, eventData, () => {
            triggerOpFinish();
        });

        const triggerOpFinish = () => {
            if (this.isSkipping) return;
            this.isSkipping = true;
            if (this.skipBtn) this.skipBtn.destroy();

            if (this.engine) {
                this.engine.cleanup();
                this.engine = null;
            }
            if (this.sound) this.sound.stopAll();

            const width = this.scale.width;
            const height = this.scale.height;

            // 背景黒
            const blackBg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000).setDepth(4998);

            // 中央タイトル画像 (title.png)
            const titleImg = this.add.image(width / 2, height / 2, 'op_title')
                .setOrigin(0.5)
                .setDepth(5000);

            if (titleImg.width > 0 && titleImg.height > 0) {
                const scale = Math.min(width / titleImg.width, height / titleImg.height) * 0.85;
                titleImg.setScale(scale);
            }

            // 前面ホワイトアウト用矩形 (白 0xffffff)
            const whiteOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0xffffff)
                .setDepth(5001)
                .setAlpha(1.0);

            // start.mp3 同時再生
            if (this.cache.audio.exists('op_start')) {
                this.sound.play('op_start', { volume: 0.8 });
            }

            // ホワイトアウトがフェードアウトしてタイトル画像が浮かび上がる
            this.tweens.add({
                targets: whiteOverlay,
                alpha: 0,
                duration: 3000,
                ease: 'Quad.easeOut'
            });

            // チュートリアル戦闘へ突入
            this.time.delayedCall(3500, () => {
                TransitionManager.transitionTo(this, 'BattleScene', {
                    party: ['001'],
                    rule: 1,
                    enemyLevel: 2,
                    totalWaves: 2,
                    waveCount: 2,
                    majoLevel: 1,
                    attribute: 'green',

                    bgmKey: 'bgm_battle4',
                    bossBgmKey: 'bgm_boss3',
                    isTutorial: true,
                    canRetreat: false,
                    returnScene: 'AdventureScene'
                });
            });
        };

        // ── 画面左上の隠しOPスキップボタン ──
        this.isSkipping = false;
        this.skipBtn = this.add.text(20, 20, '⏩ SKIP', {
            fontFamily: 'sans-serif',
            fontSize: '18px',
            color: '#ffffff',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            padding: { x: 10, y: 6 }
        }).setDepth(9999).setInteractive({ useHandCursor: true });

        this.skipBtn.setAlpha(0.6);
        this.skipBtn.on('pointerover', () => this.skipBtn.setAlpha(1.0));
        this.skipBtn.on('pointerout', () => this.skipBtn.setAlpha(0.6));
        this.skipBtn.on('pointerdown', triggerOpFinish);

        this.engine.start();
    }
}
