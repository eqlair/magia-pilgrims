import { FONT_MAIN, fontSize } from '../config/GameFont';

/**
 * シナリオ・イベント再生用の汎用エンジン「イベント」
 *
 * JSONコマンド一覧:
 *   { "cmd": "bg",      "key": "bg_forest" }              → 背景画像（縦いっぱい）
 *   { "cmd": "image",   "key": "illust_title" }            → 一枚絵（下端=画面中央, 横いっぱい）
 *   { "cmd": "chara",   "key": "hero",  "pos": "right" }  → 立ち絵（right|left）
 *   { "cmd": "chara",   "key": null,    "pos": "right" }  → 立ち絵を消す
 *   { "cmd": "text",    "name": "名前", "body": "本文..." } → テキスト表示（\n\nでページ送り）
 *   { "cmd": "clearText" }                                  → テキストボックスを消す
 *   { "cmd": "bgm",     "key": "bgm_key" }                 → BGM再生（クロスフェード）
 *   { "cmd": "bgmStop" }                                    → BGMフェードアウト（完了を待つ）
 *   { "cmd": "se",      "key": "se_key" }                  → SE再生（ノンブロッキング）
 *   { "cmd": "end" }                                        → 終了、コールバックを呼ぶ
 */
export class EventEngine {
    constructor(scene, eventData, onComplete = null) {
        this.scene = scene;
        this.events = eventData;
        this.onComplete = onComplete;
        this.index = 0;

        const { width, height } = scene.scale;
        this.W = width;
        this.H = height;
        this.DEPTH = 5000;


        // レイヤー管理
        this.bgImage     = null;
        this.illustImage = null;
        this.charaRight  = null;
        this.charaLeft   = null;
        this.textBox     = null;
        this.textLabel   = null;
        this.nameLabel   = null;
        this.tapLabel    = null;
        this.tapTween    = null;
        this._textPages  = [];
        this._pageIndex  = 0;

        // BGM管理
        this._currentBgm = null;
        
        // カスタムコールバック
        this.callbacks = {};
        
        // UI
        this.locationLabel = null;
    }

    /** イベントを開始する */
    start() {
        this._inputCooldown = true;
        if (this.scene && this.scene.time) {
            this.scene.time.delayedCall(600, () => {
                this._inputCooldown = false;
            });
        } else {
            this._inputCooldown = false;
        }
        this._processNext();
    }


    /** インデックスのコマンドを処理 */
    _processNext() {
        if (this.index >= this.events.length) { this._finish(); return; }

        const cmd = this.events[this.index++];

        switch (cmd.cmd) {
            case 'bg':        this._showBg(cmd.key, cmd.darkOverlay, () => this._processNext()); break;
            case 'image':     this._showIllust(cmd.key, () => this._processNext());       break;
            case 'chara':     this._showChara(cmd.key, cmd.pos, () => this._processNext()); break;
            case 'text':      this._showText(cmd.name, cmd.body || cmd.text);             break; // タップ待ち
            case 'clearText': this._clearText(() => this._processNext());                 break;
            case 'bgm':       this._changeBgm(cmd.key, () => this._processNext());        break;
            case 'bgmStop':   this._stopBgm(() => this._processNext());                   break; // フェード完了を待つ
            case 'se':        this._playSe(cmd.key); this._processNext();                 break; // ノンブロッキング
            case 'call':      this._doCall(cmd.func, () => this._processNext());          break; // カスタムコールバック
            case 'location':  this._showLocation(cmd.name); this._processNext();          break; // 地名表示
            case 'end':       this._finish();                                             break;
            default:
                console.warn(`EventEngine: 不明なコマンド "${cmd.cmd}"`);
                this._processNext();
        }
    }

    // ─────────────────────────────────────────────────────
    // BGM管理
    // ─────────────────────────────────────────────────────

    /** BGMをクロスフェードで切り替え（即座に次へ進む・ノンブロッキング） */
    _changeBgm(key, cb) {
        // 現在のBGMをフェードアウト
        if (this._currentBgm) {
            const old = this._currentBgm;
            this._currentBgm = null;
            this.scene.tweens.add({
                targets: old, volume: 0, duration: 600,
                onUpdate: (t, target) => { if (!target || !target.manager) t.stop(); },
                onComplete: () => { try { old.stop(); old.destroy(); } catch(e){} }
            });
        }
        // 新しいBGMをフェードイン（キーが存在すれば）
        if (this.scene.cache.audio.exists(key)) {
            const bgm = this.scene.sound.add(key, { loop: true, volume: 0 });
            bgm.play();
            this.scene.tweens.add({
                targets: bgm, volume: 0.75, duration: 800,
                onUpdate: (t, target) => { if (!target || !target.manager) t.stop(); }
            });
            this._currentBgm = bgm;
        } else {
            console.warn(`EventEngine: BGMキー "${key}" が見つかりません`);
        }
        cb(); // BGMはバックグラウンドで再生、即次へ
    }

    /** BGMをフェードアウトして停止（完了まで待つ・ブロッキング） */
    _stopBgm(cb) {
        if (this._currentBgm && this._currentBgm.isPlaying) {
            const old = this._currentBgm;
            this._currentBgm = null;
            this.scene.tweens.add({
                targets: old, volume: 0, duration: 600,
                onUpdate: (t, target) => { if (!target || !target.manager) t.stop(); },
                onComplete: () => { try { old.stop(); old.destroy(); } catch(e){} cb(); }
            });
        } else {
            cb();
        }
    }


    /** SEを再生（ノンブロッキング） */
    _playSe(key) {
        if (this.scene.cache.audio.exists(key)) {
            this.scene.sound.play(key);
        } else {
            console.warn(`EventEngine: SEキー "${key}" が見つかりません`);
        }
    }

    /** カスタムコールバックを実行 */
    _doCall(funcName, cb) {
        if (typeof this.callbacks[funcName] === 'function') {
            this.callbacks[funcName](cb);
        } else {
            console.warn(`EventEngine: コールバック "${funcName}" が設定されていません`);
            cb();
        }
    }

    /** 地名表示（画面上部中央） */
    _showLocation(name) {
        if (this.locationLabel) {
            this.locationLabel.destroy();
            this.locationLabel = null;
        }
        if (!name) return;

        this.locationLabel = this.scene.add.text(this.W / 2, 80, name, {
            fontFamily: FONT_MAIN,
            fontSize: '54px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6,
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(this.DEPTH + 5).setAlpha(0);

        this.scene.tweens.add({
            targets: this.locationLabel,
            alpha: 1,
            duration: 1000
        });
    }

    // ─────────────────────────────────────────────────────
    // 背景画像（縦いっぱい）
    // ─────────────────────────────────────────────────────
    _showBg(key, darkOverlay, cb) {
        let overlayAlpha = 0;
        let callback = cb;
        if (typeof darkOverlay === 'function') {
            callback = darkOverlay;
        } else if (typeof darkOverlay === 'number') {
            overlayAlpha = darkOverlay;
        } else if (darkOverlay === true) {
            overlayAlpha = 0.7;
        }

        const screenH = Math.max(this.H, this.scene.scale ? this.scene.scale.height : 0);
        const screenW = Math.max(this.W, this.scene.scale ? this.scene.scale.width : 0);
        newBg.setPosition(screenW / 2, screenH / 2);

        // 画面の縦サイズ(screenH)いっぱいに埋まるようアスペクト比保持で拡大（横方向は画面外へはみ出てもOK）
        const bgW = newBg.width || 1;
        const bgH = newBg.height || 1;
        const scale = Math.max(screenW / bgW, screenH / bgH);
        newBg.setScale(scale);




        if (this.bgOverlay) {
            this.bgOverlay.destroy();
            this.bgOverlay = null;
        }

        this.scene.tweens.add({
            targets: newBg, alpha: 1, duration: 500,
            onComplete: () => {
                if (this.bgImage) this.bgImage.destroy();
                this.bgImage = newBg;

                if (overlayAlpha > 0) {
                    this.bgOverlay = this.scene.add.rectangle(this.W / 2, this.H / 2, this.W, this.H, 0x000000)
                        .setDepth(this.DEPTH + 1)
                        .setAlpha(overlayAlpha);
                }

                if (callback) callback();
            }
        });
    }

    // ─────────────────────────────────────────────────────
    // 一枚絵（下端=画面中央, 左右いっぱい）
    // ─────────────────────────────────────────────────────
    _showIllust(key, cb) {
        if (this.illustImage) {
            this.scene.tweens.add({
                targets: this.illustImage, alpha: 0, duration: 300,
                onComplete: () => { this.illustImage.destroy(); this.illustImage = null; this._doShowIllust(key, cb); }
            });
        } else {
            this._doShowIllust(key, cb);
        }
    }

    _doShowIllust(key, cb) {
        if (!key) { cb(); return; }
        const img = this.scene.add.image(this.W / 2, this.H / 2, key)
            .setOrigin(0.5, 1)
            .setDepth(this.DEPTH + 1)
            .setAlpha(0);
        img.y = this.H / 2;
        img.setScale(this.W / img.width);

        this.scene.tweens.add({
            targets: img, alpha: 1, duration: 500,
            onComplete: () => { this.illustImage = img; cb(); }
        });
    }

    // ─────────────────────────────────────────────────────
    // 立ち絵（高さ=画面3/5, right|left）
    // ─────────────────────────────────────────────────────
    _showChara(key, pos, cb) {
        const isRight   = pos === 'right';
        const ref       = isRight ? 'charaRight' : 'charaLeft';
        const otherRef  = isRight ? 'charaLeft'  : 'charaRight';
        const destX     = isRight ? this.W * 0.75 : this.W * 0.25;
        const startX    = isRight ? this.W + 200  : -200;

        if (this[ref]) { this[ref].destroy(); this[ref] = null; }
        if (!key) { cb(); return; }

        // 2人目として画面に出てきたか判定 (画面内に既に1人目がいるか、キー自体に_bが明示されている場合)
        let textureKey = key;
        const hasOtherChara = !!this[otherRef];
        if (hasOtherChara || key.endsWith('_b')) {
            if (!textureKey.endsWith('_b') && textureKey.startsWith('portrait_')) {
                const bKey = `${textureKey}_b`;
                if (this.scene.textures.exists(bKey)) {
                    textureKey = bKey;
                }
            }
        }

        const chara = this.scene.add.image(startX, this.H / 2, textureKey)
            .setDepth(this.DEPTH + 2).setAlpha(0);
        chara.setScale((this.H * 0.6) / chara.height);

        this.scene.tweens.add({
            targets: chara, x: destX, alpha: 1, duration: 400, ease: 'Back.easeOut',
            onComplete: () => { this[ref] = chara; cb(); }
        });
    }


    // ─────────────────────────────────────────────────────
    // テキストボックス（\n\nでページ送り）
    // ─────────────────────────────────────────────────────
    _showText(name, body) {
        this._textPages = body.split('\n\n').map(p => p.trim()).filter(p => p.length > 0);
        this._pageIndex = 0;

        if (!this.textBox) {
            const BOX_TOP = this.H * 0.62;
            const BOX_H   = this.H * 0.38;

            this.textBox = this.scene.add.rectangle(this.W / 2, BOX_TOP + BOX_H / 2, this.W, BOX_H, 0x000000)
                .setAlpha(0.72).setDepth(this.DEPTH + 3);

            this.nameLabel = this.scene.add.text(24, BOX_TOP + 10, '', {
                fontFamily: FONT_MAIN,
                fontSize: fontSize.small(this.W),
                color: '#ffdd88', fontStyle: 'bold'
            }).setDepth(this.DEPTH + 4);

            this.textLabel = this.scene.add.text(24, BOX_TOP + 44, '', {
                fontFamily: FONT_MAIN,
                fontSize: fontSize.body(this.W),
                color: '#ffffff',
                wordWrap: { width: this.W - 48, useAdvancedWrap: true },
                lineSpacing: 8
            }).setDepth(this.DEPTH + 4);

            this.tapLabel = this.scene.add.text(this.W - 16, this.H - 16, 'tap to continue', {
                fontFamily: FONT_MAIN,
                fontSize: fontSize.small(this.W),
                color: '#aaaaaa'
            }).setOrigin(1, 1).setDepth(this.DEPTH + 4).setAlpha(0);

            this.tapTween = this.scene.tweens.add({
                targets: this.tapLabel, alpha: 0.25, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
            });
        }

        this.nameLabel.setText(name || '');
        this._showPage();
    }

    _showPage() {
        const page   = this._textPages[this._pageIndex];
        const isLast = this._pageIndex >= this._textPages.length - 1;

        // 手動の文字数制限を外し、PhaserのwordWrapに任せる
        this.textLabel.setText(page);
        this.tapLabel.setAlpha(1);
        if (this.tapTween) this.tapTween.restart();

        // タップ受付ブロッカー
        if (this._tapBlocker) this._tapBlocker.destroy();
        this._tapBlocker = this.scene.add.rectangle(this.W / 2, this.H / 2, this.W, this.H, 0x000000)
            .setAlpha(0.001).setDepth(this.DEPTH + 5).setInteractive();

        this._tapBlocker.on('pointerdown', () => {
            if (this._inputCooldown) return;
            if (this._tapBlocker) { this._tapBlocker.destroy(); this._tapBlocker = null; }
            if (isLast) {
                this._processNext();
            } else {
                this._pageIndex++;
                this.textLabel.setText('');
                this._showPage();
            }
        });

    }

    _clearText(cb) {
        if (this._tapBlocker) { this._tapBlocker.destroy(); this._tapBlocker = null; }
        if (this.tapTween)  { this.tapTween.stop(); this.tapTween = null; }
        if (this.textBox)   { this.textBox.destroy();   this.textBox   = null; }
        if (this.textLabel) { this.textLabel.destroy(); this.textLabel = null; }
        if (this.nameLabel) { this.nameLabel.destroy(); this.nameLabel = null; }
        if (this.tapLabel)  { this.tapLabel.destroy();  this.tapLabel  = null; }
        cb();
    }

    /** 全リソースを破棄（シーン終了・明転前に呼ぶ） */
    cleanup() {
        if (this._tapBlocker) { this._tapBlocker.destroy(); this._tapBlocker = null; }
        if (this.bgImage)     { this.bgImage.destroy();     this.bgImage     = null; }
        if (this.bgOverlay)   { this.bgOverlay.destroy();   this.bgOverlay   = null; }
        if (this.illustImage) { this.illustImage.destroy(); this.illustImage = null; }
        if (this.charaRight)  { this.charaRight.destroy();  this.charaRight  = null; }
        if (this.charaLeft)   { this.charaLeft.destroy();   this.charaLeft   = null; }
        if (this.locationLabel) { this.locationLabel.destroy(); this.locationLabel = null; }
        this._clearText(() => {});

        if (this._currentBgm) {
            if (this._currentBgm.isPlaying) this._currentBgm.stop();
            this._currentBgm.destroy();
            this._currentBgm = null;
        }
    }

    _finish() {
        if (this.onComplete) this.onComplete();
    }
}
