import Phaser from 'phaser';
import { TransitionManager } from '../systems/TransitionManager';
import { SaveManager } from '../systems/SaveManager';
import { GlobalState } from '../systems/GlobalState';
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
        this.load.json('test_save_snapshot', '/test_save_snapshot.json');
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

        // ── TAP TO START 点滅テキスト ─────────────────────
        const tapText = this.add.text(width / 2, height * 0.78, '- TAP TO START -', {
            fontFamily: FONT_MAIN,
            fontSize: '24px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4,
            shadow: { offsetX: 0, offsetY: 0, color: '#00ffff', blur: 12, fill: true }
        }).setOrigin(0.5);

        this.tweens.add({
            targets: tapText,
            alpha: 0.25,
            duration: 850,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // ── バージョン ─────────────────────────
        const buildVer = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : (() => {
            const d = new Date();
            const yy = String(d.getFullYear()).slice(-2);
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const hh = String(d.getHours()).padStart(2, '0');
            const min = String(d.getMinutes()).padStart(2, '0');
            const hex = parseInt(`${yy}${mm}${dd}${hh}${min}`, 10).toString(16).toUpperCase();
            return `ver.0.1${hex}`;
        })();

        this.add.text(width - 12, height - 12, buildVer, {
            fontFamily: FONT_MAIN,
            fontSize: '13px',
            color: '#888888',
            fontStyle: 'bold'
        }).setOrigin(1, 1);

        // ── 左上 歯車ボタン & 戦闘テストボタン (デバッグモード時のみ表示) ──
        if (GlobalState.IS_DEBUG_MODE) {
            const gearBtnBg = this.add.circle(35, 35, 20, 0x000000, 0.6).setInteractive({ useHandCursor: true });
            const gearIcon = this.add.text(35, 35, '⚙', {
                fontSize: '24px', color: '#ffffff'
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            const openMenu = (pointer) => {
                if (pointer && pointer.event) pointer.event.stopPropagation();
                this._goToMenu();
            };

            gearBtnBg.on('pointerdown', openMenu);
            gearIcon.on('pointerdown', openMenu);
            gearBtnBg.on('pointerover', () => gearBtnBg.setFillStyle(0x333333, 0.8));
            gearBtnBg.on('pointerout', () => gearBtnBg.setFillStyle(0x000000, 0.6));
        }

        // ── 画面右上 「新規」ボタン (セーブデータが存在する時のみ表示) ──
        if (SaveManager.hasSaveData()) {
            const newGameBtn = this.add.text(width - 20, 20, '新規', {
                fontSize: '16px', color: '#ffaaaa', stroke: '#000000', strokeThickness: 3,
                backgroundColor: '#330000aa', padding: { x: 10, y: 6 }
            }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

            newGameBtn.on('pointerdown', (pointer) => {
                if (pointer && pointer.event) pointer.event.stopPropagation();
                this._showNewGameConfirmDialog();
            });
        }

        // ── 右上 「🧪 テスト続き」インポートボタン (デバッグモード時のみ表示) ──
        if (GlobalState.IS_DEBUG_MODE) {
            const testImportBtn = this.add.text(width - 80, 20, '🧪 テスト続き', {
                fontSize: '14px', color: '#aaffaa', stroke: '#000000', strokeThickness: 3,
                backgroundColor: '#003311cc', padding: { x: 8, y: 6 }
            }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

            testImportBtn.on('pointerdown', async (pointer) => {
                if (pointer && pointer.event) pointer.event.stopPropagation();
                await this._loadTestSnapshotSave();
            });

            // ── URLパラメータ ?load_test_save=1 の自動適用 ──
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('load_test_save') === '1' || urlParams.get('test_save') === '1') {
                this._loadTestSnapshotSave();
                return;
            }
        }

        // ── 明転フェードイン ─────────────────────
        TransitionManager.fadeIn(this);

        // ── 画面通常タップ（ゲーム開始/続きから）待ち ─────────────────
        this.input.on('pointerdown', (pointer) => {
            // ダイアログ表示中は一切反応しない
            if (this._isConfirmDialogOpen) return;
            // 左上歯車ボタンのタップは除外
            if (GlobalState.IS_DEBUG_MODE && pointer && pointer.x <= 80 && pointer.y <= 80) return;
            // 右上「新規」ボタンの領域タップは除外
            if (SaveManager.hasSaveData() && pointer && pointer.x >= width - 90 && pointer.y <= 70) return;
            this._startDirectGame();
        });

        // リサイズ追従
        this.scale.on('resize', this._fitVideo, this);
    }

    /**
     * セーブデータ削除＆ニューゲーム確認ダイアログ（「はい」を5秒長押しで削除）
     */
    _showNewGameConfirmDialog() {
        this._isConfirmDialogOpen = true;
        const { width, height } = this.scale;
        const dialogContainer = this.add.container(0, 0).setDepth(10000);

        const closeDialog = () => {
            this._isConfirmDialogOpen = false;
            dialogContainer.destroy();
        };

        // 背景遮断
        const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.85).setOrigin(0, 0).setInteractive();
        bg.on('pointerdown', (pointer) => {
            if (pointer && pointer.event) pointer.event.stopPropagation();
        });
        dialogContainer.add(bg);

        // メッセージパネル
        const panelWidth = Math.min(width * 0.88, 460);
        const panelHeight = 270;
        const panel = this.add.rectangle(width / 2, height / 2, panelWidth, panelHeight, 0x1a0d0d, 0.95)
            .setStrokeStyle(2, 0xff5555);
        dialogContainer.add(panel);

        // 説明テキスト
        const msgText = this.add.text(width / 2, height / 2 - 60,
            'ゲームデータを削除し、\nニューゲームではじめるには\n「はい」を5秒押してください。', {
            fontSize: '18px', color: '#ffffff', stroke: '#000000', strokeThickness: 3,
            align: 'center', wordWrap: { width: panelWidth - 30 }
        }).setOrigin(0.5, 0.5);
        dialogContainer.add(msgText);

        // ボタンの配置
        const btnY = height / 2 + 55;

        // 「いいえ」ボタン
        const noBtn = this.add.text(width / 2 + 75, btnY, 'いいえ', {
            fontSize: '20px', color: '#ffffff', stroke: '#000000', strokeThickness: 3,
            backgroundColor: '#444455', padding: { x: 22, y: 10 }
        }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

        noBtn.on('pointerdown', (pointer) => {
            if (pointer && pointer.event) pointer.event.stopPropagation();
            closeDialog();
        });
        dialogContainer.add(noBtn);

        // 「はい」ボタン (長押し5秒判定)
        const yesBtn = this.add.text(width / 2 - 75, btnY, 'はい', {
            fontSize: '20px', color: '#ffaaaa', stroke: '#000000', strokeThickness: 3,
            backgroundColor: '#661111', padding: { x: 22, y: 10 }
        }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
        dialogContainer.add(yesBtn);

        // 長押しプログレスバー (ゲージ)
        const progressBarBg = this.add.rectangle(width / 2 - 75, btnY + 34, 100, 8, 0x333333).setOrigin(0.5, 0.5);
        const progressBarFill = this.add.rectangle(width / 2 - 125, btnY + 34, 0, 8, 0xff3333).setOrigin(0, 0.5);
        dialogContainer.add([progressBarBg, progressBarFill]);

        let pressTimer = null;
        let elapsedMs = 0;
        const targetMs = 5000;

        const stopPress = () => {
            if (pressTimer) {
                pressTimer.remove();
                pressTimer = null;
            }
            elapsedMs = 0;
            progressBarFill.width = 0;
            yesBtn.setText('はい');
        };

        yesBtn.on('pointerdown', (pointer) => {
            if (pointer && pointer.event) pointer.event.stopPropagation();
            stopPress();

            pressTimer = this.time.addEvent({
                delay: 50,
                loop: true,
                callback: () => {
                    elapsedMs += 50;
                    const progress = Math.min(1.0, elapsedMs / targetMs);
                    progressBarFill.width = 100 * progress;
                    
                    const secRemaining = Math.ceil((targetMs - elapsedMs) / 1000);
                    yesBtn.setText(`はい (${secRemaining}s)`);

                    if (elapsedMs >= targetMs) {
                        stopPress();
                        closeDialog();
                        this._startNewGame();
                    }
                }
            });
        });

        yesBtn.on('pointerup', stopPress);
        yesBtn.on('pointerout', stopPress);
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

    /**
     * 🧪 テストプレイで進めたセーブデータスナップショットをロードして即時開始
     */
    _loadTestSnapshotSave() {
        try {
            const data = this.cache.json.get('test_save_snapshot');
            if (data) {
                localStorage.setItem('antigravity_game_save', JSON.stringify(data));
                console.log('[TitleScene] 🧪 Test snapshot save loaded into localStorage successfully!');
                this._startDirectGame();
            } else {
                fetch('/test_save_snapshot.json').then(r => r.json()).then(d => {
                    localStorage.setItem('antigravity_game_save', JSON.stringify(d));
                    this._startDirectGame();
                });
            }
        } catch (e) {
            console.error('[TitleScene] Failed to load test snapshot save:', e);
            this._startDirectGame();
        }
    }

    shutdown() {
        this.scale.off('resize', this._fitVideo, this);
        if (this._bgm && this._bgm.isPlaying) this._bgm.stop();
    }
}
