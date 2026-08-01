import Phaser from 'phaser';
import { TransitionManager } from '../systems/TransitionManager';
import { FONT_MAIN, fontSize } from '../config/GameFont';

/**
 * タイトルシーン
 *
 * 構成:
 *  - HTML <video> タグ（canvas背面）で OP動画をループ再生
 *  - Phaser canvas（前面・透明）にタイトルロゴ + "TAP TO START"
 *  - Phaser Sound で BGM再生
 *  - タップで DemoScene へ明転遷移、BGMはフェードアウト
 */
export default class TitleScene extends Phaser.Scene {
    constructor() {
        super('TitleScene');
        this._bgm = null;
        this._video = null;
    }

    preload() {
        this.load.image('title_logo', '/files/OP/title.png');
        this.load.audio('bgm_op',   '/files/BGM/001_OP001.mp3');
        this.load.audio('bgm_menu', '/files/BGM/002_menu.mp3');
    }

    create() {
        const { width, height } = this.scale;
        this._video = document.getElementById('title-video');

        // ── 動画を表示・再生 ──────────────────
        this._showVideo();

        // ── BGM再生 ──────────────────────────
        // 既に再生中なら止める（シーン再訪時）
        if (this.sound.get('bgm_op')) this.sound.removeByKey('bgm_op');
        this._bgm = this.sound.add('bgm_op', { loop: true, volume: 0 });
        this._bgm.play();
        // 少し遅延してからフェードイン（ユーザー操作後のautoplay対策）
        this.tweens.add({ targets: this._bgm, volume: 0.75, duration: 1000, delay: 200 });

        // ── タイトルロゴ ──────────────────────
        const logo = this.add.image(width / 2, height * 0.38, 'title_logo');
        const logoScale = Math.min((width * 0.88) / logo.width, (height * 0.45) / logo.height);
        logo.setScale(logoScale);
        // 光るホワっとした明滅
        this.tweens.add({
            targets: logo,
            alpha: { from: 0.82, to: 1.0 },
            duration: 2200,
            yoyo: true, repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // ── TAP TO START ──────────────────────
        const tapText = this.add.text(width / 2, height * 0.76, 'TAP  TO  START', {
            fontFamily: FONT_MAIN,
            fontSize: fontSize.small(width),
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 5,
            shadow: { offsetX: 0, offsetY: 0, color: '#88ccff', blur: 20, fill: true }
        }).setOrigin(0.5).setAlpha(0);

        // フェードインしてから点滅
        this.tweens.add({
            targets: tapText,
            alpha: 1,
            duration: 800,
            delay: 400,
            onComplete: () => {
                this.tweens.add({
                    targets: tapText,
                    alpha: 0.1,
                    duration: 1000,
                    yoyo: true, repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
        });

        // ── バージョン ─────────────────────────
        this.add.text(width - 10, height - 10, 'ver.0.0.1', {
            fontSize: '14px', color: '#666666'
        }).setOrigin(1, 1);

        // ── 明転フェードイン ─────────────────────
        TransitionManager.fadeIn(this);

        // ── タップ待ち ──────────────────────────
        this.input.once('pointerdown', () => this._goToMenu());

        // リサイズ追従
        this.scale.on('resize', this._fitVideo, this);
    }

    _goToMenu() {
        this.input.enabled = false;

        // BGMフェードアウト
        if (this._bgm && this._bgm.isPlaying) {
            this.tweens.add({ targets: this._bgm, volume: 0, duration: 500 });
        }

        // 動画フェードアウト（CSSトランジション）
        if (this._video) {
            this._video.style.transition = 'opacity 0.5s';
            this._video.style.opacity = '0';
        }

        // 明転してDemoSceneへ
        TransitionManager.transitionTo(this, 'DemoScene');

        // 遷移後に動画を隠す
        this.time.delayedCall(600, () => {
            if (this._video) {
                this._video.style.display = 'none';
                this._video.style.opacity = '1';
                this._video.style.transition = '';
            }
        });
    }

    /** 動画をcanvasにぴったり重ねるサイズ・位置に調整 */
    _showVideo() {
        if (!this._video) return;
        this._video.style.display = 'block';
        this._video.style.opacity = '1';
        this._fitVideo();

        // play()はPromiseを返す。ブラウザのautoplay policyでブロックされた場合の対策
        const playPromise = this._video.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                // ユーザー操作が必要な場合は最初のタップで再生
                document.addEventListener('click', () => this._video.play(), { once: true });
            });
        }
    }

    /** canvasの位置・サイズに動画を合わせる */
    _fitVideo() {
        const canvas = document.querySelector('#game-container canvas');
        if (!canvas || !this._video) return;
        const r = canvas.getBoundingClientRect();
        const v = this._video;
        v.style.left   = r.left   + 'px';
        v.style.top    = r.top    + 'px';
        v.style.width  = r.width  + 'px';
        v.style.height = r.height + 'px';
    }

    shutdown() {
        this.scale.off('resize', this._fitVideo, this);
        if (this._bgm && this._bgm.isPlaying) this._bgm.stop();
    }
}
