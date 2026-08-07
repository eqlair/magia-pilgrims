import Phaser from 'phaser';
import { TransitionManager } from '../systems/TransitionManager';
import { SaveManager } from '../systems/SaveManager';
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

        // ── NEW GAME ボタン ──────────────────────
        const newGameBtn = this.add.text(width / 2, height * 0.72, 'NEW  GAME', {
            fontFamily: FONT_MAIN,
            fontSize: '26px',
            color: '#fffaee',
            fontStyle: 'bold',
            backgroundColor: 'rgba(30, 30, 60, 0.85)',
            padding: { x: 35, y: 12 },
            stroke: '#000000',
            strokeThickness: 5,
            shadow: { offsetX: 0, offsetY: 0, color: '#ffcc44', blur: 15, fill: true }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        newGameBtn.on('pointerdown', (pointer) => {
            if (pointer && pointer.event) pointer.event.stopPropagation();
            this._startNewGame();
        });

        // 続きからボタン（セーブデータがある場合）
        const hasSave = SaveManager.hasSaveData();
        if (hasSave) {
            const continueBtn = this.add.text(width / 2, height * 0.83, 'CONTINUE', {
                fontFamily: FONT_MAIN,
                fontSize: '26px',
                color: '#aaccff',
                fontStyle: 'bold',
                backgroundColor: 'rgba(20, 20, 40, 0.85)',
                padding: { x: 35, y: 12 },
                stroke: '#000000',
                strokeThickness: 5,
                shadow: { offsetX: 0, offsetY: 0, color: '#4488ff', blur: 15, fill: true }
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            continueBtn.on('pointerdown', (pointer) => {
                if (pointer && pointer.event) pointer.event.stopPropagation();
                this._startDirectGame();
            });
        }


        // ── バージョン ─────────────────────────
        this.add.text(width - 10, height - 10, 'ver.0.0.1', {
            fontSize: '14px', color: '#666666'
        }).setOrigin(1, 1);

        // ── 左上 歯車ボタン (これまでの設定/システムメニューへ) ──
        const gearBtnBg = this.add.circle(40, 40, 24, 0x000000, 0.6).setInteractive({ useHandCursor: true });
        const gearIcon = this.add.text(40, 40, '⚙', {
            fontSize: '28px', color: '#ffffff'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        const openMenu = (pointer) => {
            if (pointer) pointer.event.stopPropagation();
            this._goToMenu();
        };

        gearBtnBg.on('pointerdown', openMenu);
        gearIcon.on('pointerdown', openMenu);

        // ⚙ ボタンのホバー演出
        gearBtnBg.on('pointerover', () => gearBtnBg.setFillStyle(0x333333, 0.8));
        gearBtnBg.on('pointerout', () => gearBtnBg.setFillStyle(0x000000, 0.6));

        // ── 明転フェードイン ─────────────────────
        TransitionManager.fadeIn(this);

        // ── 画面通常タップ（ゲーム開始/続きから）待ち ─────────────────
        this.input.on('pointerdown', (pointer) => {
            // 左上歯車ボタンのタップは除外
            if (pointer.x <= 80 && pointer.y <= 80) return;
            this._startDirectGame();
        });

        // リサイズ追従
        this.scale.on('resize', this._fitVideo, this);
    }

    /**
     * ニューゲーム選択時：
     * データ完全初期化 ➔ OPイベントシーン(OpScene)へ
     */
    _startNewGame() {
        this.input.enabled = false;

        if (this._bgm && this._bgm.isPlaying) {
            this.tweens.add({ targets: this._bgm, volume: 0, duration: 500 });
        }

        if (this._video) {
            this._video.style.transition = 'opacity 0.5s';
            this._video.style.opacity = '0';
        }

        // データの完全リセット (12月1日 午前, 紫苑1人, LV1, 食料100, SP0)
        SaveManager.clearSaveData();
        GlobalState.getInstance().resetAll();

        // OPイベントへ遷移
        TransitionManager.transitionTo(this, 'OpScene');

        this.time.delayedCall(600, () => {
            if (this._video) {
                this._video.style.display = 'none';
                this._video.style.opacity = '1';
                this._video.style.transition = '';
            }
        });
    }

    /**
     * 続きから再開時
     */
    _startDirectGame() {

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

        const hasSave = SaveManager.hasSaveData();
        if (hasSave) {
            // セーブデータがあれば続きから復帰
            const saveData = SaveManager.loadGameData();
            SaveManager.restoreGlobalState(saveData);
            TransitionManager.transitionTo(this, 'AdventureScene', { fromSave: true });
        } else {
            // データがなければ紫苑一人で新規スタート
            const globalState = SaveManager.getGlobalState ? SaveManager.getGlobalState() : (window.globalStateInstance || null);
            if (globalState && globalState.characters) {
                globalState.savedFormation = { '001': { isFront: true, index: 0 } };
            }
            TransitionManager.transitionTo(this, 'AdventureScene', { party: ['001'], fromTitleNewGame: true });
        }

        // 遷移後に動画を隠す
        this.time.delayedCall(600, () => {
            if (this._video) {
                this._video.style.display = 'none';
                this._video.style.opacity = '1';
                this._video.style.transition = '';
            }
        });
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

        // 明転してDemoSceneへ (これまでのテストメニュー)
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
