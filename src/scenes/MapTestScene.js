import Phaser from 'phaser';
import { TransitionManager } from '../systems/TransitionManager';
import { MapProjector } from '../systems/MapProjector';
import { FONT_MAIN, fontSize } from '../config/GameFont';

export default class MapTestScene extends Phaser.Scene {
    constructor() {
        super('MapTestScene');
    }

    preload() {
        // 画像の読み込み（スプライトシートとして）
        // Shion: 2912x1440, 4x2 = 8 frames -> 728x720 per frame
        this.load.spritesheet('sion', 'files/CHR/001002.png', {
            frameWidth: 728,
            frameHeight: 720
        });


        // Enemy: 1200x300, 4x1 = 4 frames -> 300x300 per frame
        this.load.spritesheet('enemy', 'files/ENEMY/en001.png', {
            frameWidth: 300,
            frameHeight: 300
        });

    }

    create() {
        TransitionManager.fadeIn(this);
        const { width, height } = this.scale;

        this.projector = new MapProjector(width, height);
        this.graphics = this.add.graphics();

        // ベーススケール（1mの幅に対して何ピクセルか。キャラの解像度728pxに合わせる）
        this.CHAR_BASE_SCALE = 1.0 / 728 * 2.0; // 少し大きめに表示

        // キャラクタースプライトの配置
        this.chars = [];

        // 前衛（紫苑）正面ポーズ(frame: 0)
        this.sionFront = this.add.sprite(0, 0, 'sion', 0).setOrigin(0.5, 1);
        this.chars.push({ sprite: this.sionFront, wx: 0, wz: 5 });

        // 後衛（紫苑）正面ポーズ
        this.sionBack = this.add.sprite(0, 0, 'sion', 0).setOrigin(0.5, 1);
        this.chars.push({ sprite: this.sionBack, wx: 0, wz: 1 });

        // 敵キャラ (frame: 0)
        this.enemyObj = this.add.sprite(0, 0, 'enemy', 0).setOrigin(0.5, 1);
        this.chars.push({ sprite: this.enemyObj, wx: -2.5, wz: 15 });

        // UI表示
        this.add.rectangle(width/2, 60, width, 120, 0x000000, 0.7).setDepth(999);
        this.add.text(10, 10, '疑似3Dマップテスト (キーボードでパース調整)', {
            fontFamily: FONT_MAIN, fontSize: fontSize.small(width), color: '#ffffff'
        }).setDepth(1000);

        this.paramsText = this.add.text(10, 40, '', {
            fontFamily: FONT_MAIN, fontSize: fontSize.small(width), color: '#aaffaa', lineSpacing: 4
        }).setDepth(1000);

        const helpText = this.add.text(10, 85, 'Q/A:高さ W/S:奥行 E/D:角度 R/F:FOV T/G:画面Y位置 (Shiftで微細)', {
            fontFamily: FONT_MAIN, fontSize: '12px', color: '#aaaaaa'
        }).setDepth(1000);

        // 戻るボタン
        const backBtn = this.add.text(width - 20, 20, 'BACK', {
            fontFamily: FONT_MAIN, fontSize: fontSize.medium(width), color: '#ffaaaa'
        }).setOrigin(1, 0).setDepth(1000).setInteractive();
        backBtn.on('pointerdown', () => TransitionManager.transitionTo(this, 'DemoScene'));

        // 突破テストボタン
        const breakTestBtn = this.add.text(width - 20, 65, '⚔️ 突破テスト', {
            fontFamily: FONT_MAIN, fontSize: fontSize.small(width), color: '#00ffff',
            backgroundColor: '#000000bb', padding: { x: 10, y: 5 }
        }).setOrigin(1, 0).setDepth(1000).setInteractive();

        breakTestBtn.on('pointerdown', () => {
            TransitionManager.transitionTo(this, 'BattleScene', {
                rule: 2,
                isTest: true,
                party: ['001', '002', '003', '004', '005', '010'],

                enemyCount: 50,
                enemyLevel: 1,
                spawnInterval: 1.0,
                breakthroughTarget: 42195,
                returnScene: 'MapTestScene'
            });
        });




        // キー入力の設定
        this.input.keyboard.on('keydown', (e) => this.handleKey(e));

        // 初期描画
        this.updateMap();
    }

    handleKey(e) {
        const P = this.projector;
        const step = e.shiftKey ? 0.1 : 0.5;
        const angleStep = e.shiftKey ? 0.01 : 0.05;

        switch(e.code) {
            case 'KeyQ': P.cameraHeight += step; break;
            case 'KeyA': P.cameraHeight -= step; break;
            case 'KeyW': P.cameraZ += step; break;
            case 'KeyS': P.cameraZ -= step; break;
            case 'KeyE': P.pitch += angleStep; break;
            case 'KeyD': P.pitch -= angleStep; break;
            case 'KeyR': P.fov += (e.shiftKey ? 5 : 20); break;
            case 'KeyF': P.fov -= (e.shiftKey ? 5 : 20); break;
            case 'KeyT': P.screenCenterY += (e.shiftKey ? 5 : 20); break;
            case 'KeyG': P.screenCenterY -= (e.shiftKey ? 5 : 20); break;
        }
        this.updateMap();
    }

    updateMap() {
        const P = this.projector;
        this.graphics.clear();

        // UI更新
        this.paramsText.setText(
            `Height: ${P.cameraHeight.toFixed(2)}m | Dist Z: ${P.cameraZ.toFixed(2)}m | Pitch: ${(P.pitch * 180 / Math.PI).toFixed(1)}°\n` +
            `FOV: ${P.fov.toFixed(1)} | OffsetY: ${P.screenCenterY.toFixed(1)}`
        );

        // 10m x 18m のグリッド (チェッカーボードの線)
        // ピッチは1m
        this.graphics.lineStyle(1, 0x888888, 0.5);

        // 横線（X軸平行）
        for (let z = 0; z <= 18; z += 1) {
            const p1 = P.project(-5, z);
            const p2 = P.project(5, z);
            if (p1.visible && p2.visible) {
                this.graphics.strokeLineShape(new Phaser.Geom.Line(p1.x, p1.y, p2.x, p2.y));
            }
        }

        // 縦線（Z軸平行）
        for (let x = -5; x <= 5; x += 1) {
            // Zが遠いところまで線を引く
            let startZ = 0;
            // 後ろに隠れてる分を適当に見つける（描画最適化なしのシンプルループ）
            const p1 = P.project(x, 0);
            const p2 = P.project(x, 18);
            if (p2.visible) {
                // p1が非表示の場合も、画面手前から線を引く
                this.graphics.strokeLineShape(new Phaser.Geom.Line(p1.x, p1.y, p2.x, p2.y));
            }
        }

        // キャラの配置
        for (const c of this.chars) {
            const p = P.project(c.wx, c.wz);
            if (p.visible) {
                c.sprite.setVisible(true);
                c.sprite.setPosition(p.x, p.y);
                c.sprite.setDepth(p.depth); // 奥のものが先に描画されるようにZソート
                c.baseScale = p.scale * this.CHAR_BASE_SCALE;
                c.sprite.setScale(c.baseScale);
            } else {
                c.sprite.setVisible(false);
            }
        }
    }

    update(time, delta) {
        // 敵キャラのうごめきアニメーション（毎フレーム更新）
        if (this.enemyObj && this.enemyObj.visible) {
            const t = time / 1000;
            const tilt = Math.sin(t * 3) * 2; // 左右の微妙な傾き
            const scaleAnim = 1.0 + Math.sin(t * 5) * 0.03; // 拡縮による呼吸感

            this.enemyObj.setAngle(tilt);
            this.enemyObj.setScale(this.enemyObj.baseScale * scaleAnim, this.enemyObj.baseScale);
        }
    }
}
