import Phaser from 'phaser';
import { TransitionManager } from '../systems/TransitionManager';
import { MapProjector } from '../systems/MapProjector';
import { BattleEngine } from '../systems/BattleEngine';
import { EnemyCharacter } from '../systems/BattleEntities';

import { BattleRenderer } from '../systems/BattleRenderer';

import { FogEffect } from '../systems/FogEffect';
import { GlobalState } from '../systems/GlobalState';

export default class BattleScene extends Phaser.Scene {
    constructor() {
        super('BattleScene');
    }

    init(data) {
        this.battleConfig = data || {};
        // 食料が0かどうかを battleConfig に反映
        const gs = GlobalState.getInstance();
        this.battleConfig.isFoodEmpty = (gs.food <= 0);
        // フラグを1戦ごとにリセット（launchで起動しても前回の値が残るため）
        this.isExiting = false;
        this.isBossPresentationStarted = false;
        this.isBossBgmStarted = false;
        this.isBossDeadSEPlayed = false;
    }

    preload() {
        // 戦闘用ミニキャラ（battle_XXX: 立ち絵と別キーで管理）
        this.load.spritesheet('battle_001', '/files/CHR/001002.png', { frameWidth: 728, frameHeight: 720 });
        this.load.spritesheet('battle_001_b', '/files/CHR/001002b.png', { frameWidth: 150, frameHeight: 150 });

        this.load.spritesheet('battle_002', '/files/CHR/002002.png', { frameWidth: 728, frameHeight: 720 });
        this.load.spritesheet('battle_002_b', '/files/CHR/002002b.png', { frameWidth: 728, frameHeight: 720 });
        this.load.image('weapon_002', '/files/CHR/002003.png');
        this.load.spritesheet('battle_003', '/files/CHR/003002.png', { frameWidth: 728, frameHeight: 720 });
        this.load.spritesheet('battle_003_b', '/files/CHR/003002b.png', { frameWidth: 728, frameHeight: 720 });
        this.load.image('weapon_003', '/files/CHR/003003.png');
        this.load.spritesheet('battle_004', '/files/CHR/004002.png', { frameWidth: 728, frameHeight: 720 });
        this.load.spritesheet('battle_004_b', '/files/CHR/004002b.png', { frameWidth: 728, frameHeight: 720 });
        this.load.image('weapon_004', '/files/CHR/004003.png');
        this.load.spritesheet('battle_005', '/files/CHR/005002.png', { frameWidth: 728, frameHeight: 720 });
        this.load.spritesheet('battle_005_b', '/files/CHR/005002b.png', { frameWidth: 728, frameHeight: 720 });
        this.load.image('weapon_005', '/files/CHR/005003.png');


        // 雑魚敵（画像全体の幅1200px, 高さ300px -> 4分割で300x300）
        for (let i = 1; i <= 3; i++) {
            this.load.spritesheet(`en00${i}`, `/files/ENEMY/en00${i}.png`, {
                frameWidth: 300,
                frameHeight: 300
            });
        }

        // ボス（魔女: 画像全体の幅4000px, 高さ1000px -> 4分割で1000x1000）
        for (let i = 1; i <= 4; i++) {
            this.load.spritesheet(`boss00${i}`, `/files/ENEMY/boss00${i}.png`, {
                frameWidth: 1000,
                frameHeight: 1000
            });
        }


        this.load.image('bullet', '/files/CHR/001004.png');
        this.load.image('grenade', '/files/CHR/001003.png');
        for (let i = 1; i <= 6; i++) {
            this.load.image(`hit_effect${i}`, `/files/EFFECT/hit_effect${i}.png`);
        }

        // 突破BGMと背景画像
        this.load.audio('bgm_toppa', '/files/BGM/toppa.mp3');
        this.load.image('toppa_bg_1', '/files/BG_battle/yuka_enkin02.jpg');
        this.load.image('toppa_bg_2', '/files/BG_battle/road_enkin02.jpg');
        this.load.image('toppa_bg_3', '/files/BG_battle/grat_bg01.png');

        // 背景とエフェクト
        this.load.image('floor_a', '/files/BG_battle/floor_a.jpg');
        this.load.image('yuka_enkin01', '/files/BG_battle/yuka_enkin01.jpg');
        this.load.image('yuka_enkin02', '/files/BG_battle/yuka_enkin02.jpg');
        this.load.image('yukamas', '/files/BG_battle/yukamas.jpg');

        for (let i = 1; i <= 3; i++) {
            this.load.image(`bg00${i}`, `/files/BG_battle/bg00${i}.png`);
        }
        for (let i = 1; i <= 5; i++) {
            this.load.image(`BG_0${i}`, `/files/BG_battle/BG_0${i}.png`);
        }
    }

    create() {
        TransitionManager.fadeIn(this);
        const { width, height } = this.scale;

        // ── テクスチャフィルター: 全スプライトにLINEAR（バイリニア補間）を適用 ──
        // 大きな画像を小さく縮小する際のガビガビ（アウトラインのにじみ）を軽減する
        const spriteKeys = [
            'battle_001', 'battle_001_b',
            'battle_002', 'battle_002_b', 'weapon_002',
            'battle_003', 'battle_003_b', 'weapon_003',
            'battle_004', 'battle_004_b', 'weapon_004',
            'battle_005', 'battle_005_b', 'weapon_005',
            'en001', 'en002', 'en003',
            'boss001', 'boss002', 'boss003', 'boss004',
            'bullet', 'grenade'
        ];
        spriteKeys.forEach(key => {
            if (this.textures.exists(key)) {
                this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
            }
        });

        // 敵弾丸用テクスチャ生成（白丸）

        if (!this.textures.exists('enemy_bullet')) {
            const bG = this.make.graphics({x:0, y:0, add:false});
            bG.fillStyle(0xffffff, 1.0);
            bG.fillCircle(32, 32, 32);
            bG.generateTexture('enemy_bullet', 64, 64);
            bG.destroy();
        }

        // 1. パース投影器の初期化（パラメータは調整済みの値）
        this.projector = new MapProjector(width, height);
        
        // 2. 戦闘ロジックエンジンの初期化
        this.engine = new BattleEngine();
        const chrData = this.cache.json.get('chr_data');
        this.engine.setup(this.battleConfig, chrData); // 受け取った設定とキャラデータを渡す

        // 背景設定（突破モード: rule===2 の場合は floor_a を疑似3D平面メッシュ化して舞台と同じ角度に傾斜）
        if (this.battleConfig.rule === 2) {
            // 既存BGMを停止して突破専用BGM (toppa.mp3) をループ再生
            this.sound.stopAll();
            if (this.cache.audio.exists('bgm_toppa')) {
                this.sound.play('bgm_toppa', { loop: true, volume: 0.6 });
            }

            this.initGroundMesh();
            this.initBreakthroughDebugUI();
            
            // 突破進捗UI（画面上部）


            this.breakthroughContainer = this.add.container(width / 2, 35).setDepth(1500);
            const barBg = this.add.rectangle(0, 0, 320, 24, 0x222222, 0.8).setStrokeStyle(1, 0x00ffff);
            this.breakthroughBar = this.add.rectangle(-158, 0, 0, 20, 0x00e5ff).setOrigin(0, 0.5);
            this.breakthroughText = this.add.text(0, 0, '突破: 0m / 2000m (8.0m/s)', {
                fontFamily: 'sans-serif',
                fontSize: '14px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5);
            this.breakthroughContainer.add([barBg, this.breakthroughBar, this.breakthroughText]);
        } else {
            const bgIndex = Math.floor(Math.random() * 3) + 1;
            const bg = this.add.image(width / 2, height / 2, `bg00${bgIndex}`);
            bg.setOrigin(0.5, 0.5);
            bg.setScale(Math.max(width / bg.width, height / bg.height));
            bg.setDepth(-100);
        }

        // 3. 描画レンダラーの初期化
        this.renderer = new BattleRenderer(this, this.engine, this.projector);

        // 背景グリッド描画用のGraphics
        this.graphics = this.add.graphics();
        this.graphics.setDepth(-1); // キャラより奥に描画

        // スワイプ操作の実装
        this.input.on('pointerdown', this.onPointerDown, this);
        this.input.on('pointerup', this.onPointerUp, this);
        this.input.on('pointerupoutside', this.onPointerUp, this);




        // --- 一時停止・撤退UI ---
        this.pauseBtn = this.add.text(this.scale.width - 20, 20, '⚙️', { fontSize: '32px' })
            .setOrigin(1, 0)
            .setInteractive()
            .setDepth(2000)
            .on('pointerdown', () => this.togglePauseMenu());

        this.pauseContainer = this.add.container(0, 0).setDepth(2100).setVisible(false);
        const overlay = this.add.rectangle(this.scale.width/2, this.scale.height/2, this.scale.width, this.scale.height, 0x000000, 0.6).setInteractive();
        this.pauseContainer.add(overlay);

        const resumeBtn = this.add.text(this.scale.width/2, this.scale.height/2 - 40, '再開', { fontSize: '32px', color: '#ffffff', backgroundColor: '#333', padding: {x:20,y:10}, stroke: '#000000', strokeThickness: 3 })
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => this.togglePauseMenu());

        const retreatBtn = this.add.text(this.scale.width/2, this.scale.height/2 + 40, '撤退', { fontSize: '32px', color: '#ffaaaa', backgroundColor: '#333', padding: {x:20,y:10}, stroke: '#000000', strokeThickness: 3 })
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => this.showRetreatConfirm());

        this.pauseContainer.add([resumeBtn, retreatBtn]);

        this.confirmContainer = this.add.container(0, 0).setDepth(2200).setVisible(false);
        const cOverlay = this.add.rectangle(this.scale.width/2, this.scale.height/2, this.scale.width, this.scale.height, 0x000000, 0.8).setInteractive();
        const cText = this.add.text(this.scale.width/2, this.scale.height/2 - 60, '戦闘に入る前の状態に戻ります。', { fontSize: '24px', color: '#ffffff', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5);
        
        const yesBtn = this.add.text(this.scale.width/2 - 80, this.scale.height/2 + 20, 'はい', { fontSize: '28px', color: '#ffffff', backgroundColor: '#555', padding: {x:20,y:10}, stroke: '#000000', strokeThickness: 3 })
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => {
                this.isPaused = false;
                this.engine.retreat();
            });

        const noBtn = this.add.text(this.scale.width/2 + 80, this.scale.height/2 + 20, 'いいえ', { fontSize: '28px', color: '#ffffff', backgroundColor: '#555', padding: {x:20,y:10}, stroke: '#000000', strokeThickness: 3 })
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => {
                this.confirmContainer.setVisible(false);
            });
        
        this.confirmContainer.add([cOverlay, cText, yesBtn, noBtn]);

        this.input.keyboard.on('keydown-Y', () => {
            if (this.engine) {
                this.engine.debugFastForward();
            }
        });

        // DPS表示（画面左下）
        this.dpsText = this.add.text(10, this.scale.height - 10, '', {
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#00ffaa',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0, 1).setDepth(1500);

    }



    onPointerDown(pointer) {
        const now = this.time.now;
        if (this.lastTapTime && now - this.lastTapTime < 300) {
            // ダブルタップ判定
            this.handleDoubleTap(pointer);
            this.lastTapTime = 0;
            this.grabbedPlayer = null;
        } else {
            this.lastTapTime = now;
            
            // スワイプ開始位置と、スワイプ対象キャラクターの判定
            this.swipeStartX = pointer.x;
            this.swipeStartY = pointer.y;
            this.grabbedPlayer = null;

            for (const p of this.engine.players) {
                if (p.isDead) continue;
                const screenPos = this.renderer.projector.project(p.x, p.z);
                const dx = pointer.x - screenPos.x;
                const dy = pointer.y - screenPos.y;
                // タッチ判定（半径80ピクセル程度）
                if (dx*dx + dy*dy < 80*80) {
                    this.grabbedPlayer = p;
                    break;
                }
            }
        }
    }

    handleDoubleTap(pointer) {
        // キャラクターへのタップ判定
        for (const p of this.engine.players) {
            if (p.isDead) continue;
            const screenPos = this.renderer.projector.project(p.x, p.z);
            const dx = pointer.x - screenPos.x;
            const dy = pointer.y - screenPos.y;
            // 画面上の半径約60ピクセル以内をタップしたとみなす
            if (dx*dx + dy*dy < 60*60) {
                this.engine.triggerUltimate(p);
                break;
            }
        }
    }

    onPointerUp(pointer) {
        if (!this.grabbedPlayer || this.grabbedPlayer.isDead) return;

        const dx = pointer.x - this.swipeStartX;
        const dy = pointer.y - this.swipeStartY;

        // スワイプ判定
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
            // 横スワイプ（レーン移動）
            const direction = dx > 0 ? 1 : -1;
            this.engine.swapLane(this.grabbedPlayer, direction);
        } else if (Math.abs(dy) > 50 && Math.abs(dy) > Math.abs(dx)) {
            // 縦スワイプ（前後衛切り替え）
            const isFront = dy < 0; // 上スワイプ(dyがマイナス)なら前衛、下スワイプなら後衛
            this.engine.swapFrontBack(this.grabbedPlayer, isFront);
        }
        
        this.grabbedPlayer = null;
    }

    togglePauseMenu() {
        if (this.isExiting || this.engine.waveState === 'gameover' || this.engine.waveState === 'retreated') return;
        this.isPaused = !this.isPaused;
        this.pauseContainer.setVisible(this.isPaused);
        this.confirmContainer.setVisible(false);
    }

    showRetreatConfirm() {
        if (this.battleConfig && (this.battleConfig.canRetreat === false || this.battleConfig.is1221NightBattle)) {
            const msg = this.add.text(this.scale.width / 2, this.scale.height / 2, '撤退のできない戦闘です', {
                fontSize: '28px', color: '#ff4444', backgroundColor: '#000000', padding: { x: 20, y: 10 },
                stroke: '#ffffff', strokeThickness: 2
            }).setOrigin(0.5).setDepth(3000);
            this.time.delayedCall(2000, () => msg.destroy());
            return;
        }
        this.confirmContainer.setVisible(true);
    }


    update(time, delta) {
        if (this.isPaused) return;

        const dt = delta / 1000; // 秒に変換

        // 背景エフェクトの更新
        if (this.fogEffect) {
            this.fogEffect.update(dt);
        }

        // 論理更新
        this.engine.update(dt);


        // 突破モード時の疑似3D傾斜スライス床のスクロールとUI更新
        if (this.battleConfig.rule === 2 && this.engine) {
            const speed = this.engine.advanceSpeed || 0;
            this.updateGroundMesh(dt, speed);

            if (this.breakthroughBar && this.breakthroughText) {
                const dist = Math.floor(this.engine.breakthroughDist || 0);
                const target = this.engine.breakthroughTarget || 2000;
                const progress = Math.min(1, dist / target);
                this.breakthroughBar.width = 316 * progress;
                this.breakthroughText.setText(`突破: ${dist}m / ${target}m (${speed.toFixed(1)}m/s)`);
            }
        }


        // 魔女出現演出
        if (this.engine.waveState === 'boss_presentation' && !this.isBossPresentationStarted) {
            this.isBossPresentationStarted = true;
            
            // BGMフェードアウト (3秒ウェイトしてから1秒でフェードアウト)
            this.time.delayedCall(3000, () => {
                const bgmKeys = ['bgm_hexen', 'bgm_battle1', 'bgm_battle2', 'bgm_battle3', 'bgm_battle4', 'bgm_boss1', 'bgm_boss2', 'bgm_boss3', 'bgm_tarot', 'bgm_op', 'bgm_menu', 'JOIN_US'];
                bgmKeys.forEach(key => {
                    try {
                        const s = this.sound.get(key);
                        if (s && s.isPlaying) {
                            this.tweens.add({ targets: s, volume: 0, duration: 1000, onComplete: () => s.stop() });
                        }
                    } catch(e) { /* 無視 */ }
                });
            });

            // 魔女覚醒SE
            if (this.cache.audio.exists('se_awaken_boss')) {
                this.sound.play('se_awaken_boss', { volume: 1.0 });
            }

            // ワーニング画像の横流し（3秒かけて右から左へ）
            const { width, height } = this.scale;
            const warnImg = this.add.image(width + 400, height / 2, 'warn001').setDepth(3000);
            
            this.tweens.add({
                targets: warnImg,
                x: -400,
                duration: 3000,
                ease: 'Linear',
                onComplete: () => warnImg.destroy()
            });
        }

        // 魔女戦闘開始時のBGM
        if (this.engine.waveState === 'boss' && !this.isBossBgmStarted) {
            this.isBossBgmStarted = true;
            
            // 確実に前のBGMを全て止める
            const bgmKeys = ['bgm_hexen', 'bgm_battle1', 'bgm_battle2', 'bgm_battle3', 'bgm_battle4', 'bgm_tarot', 'bgm_op', 'bgm_menu', 'JOIN_US'];
            bgmKeys.forEach(key => {
                if (this.sound.stopByKey) {
                    this.sound.stopByKey(key);
                } else {
                    // fallback if stopByKey doesn't exist
                    try {
                        const s = this.sound.get(key);
                        if (s) s.stop();
                    } catch(e) {}
                }
            });

            const bossBgmIdx = Math.floor(Math.random() * 3) + 1; // 1, 2, 3
            if (this.cache.audio.exists(`bgm_boss${bossBgmIdx}`)) {
                this.sound.play(`bgm_boss${bossBgmIdx}`, { loop: true, volume: 0.5 });
            }
        }

        // 魔女死亡時のSE
        if (!this.isBossDeadSEPlayed) {
            const boss = this.engine.enemies.find(e => e.isBoss && e.hp <= 0);
            if (boss) {
                this.isBossDeadSEPlayed = true;
                if (this.cache.audio.exists('se_bossbomb')) {
                    this.sound.play('se_bossbomb', { volume: 1.0 });
                }
            }
        }

        // ミッションクリア時の遷移
        if (this.engine.waveState === 'cleared' && !this.isExiting) {
            console.log('[BattleScene] cleared detected, starting exit sequence');
            this.isExiting = true;
            
            // もやを消す
            if (this.fogEffect) {
                this.fogEffect.fadeOut(2000);
            }

            // BGMフェードアウト（キー名指定で安全に取得）
            const bgmKeys = ['bgm_hexen', 'bgm_battle1', 'bgm_battle2', 'bgm_battle3', 'bgm_battle4', 'bgm_boss1', 'bgm_boss2', 'bgm_boss3', 'bgm_tarot', 'bgm_op', 'bgm_menu', 'JOIN_US'];
            bgmKeys.forEach(key => {
                try {
                    const s = this.sound.get(key);
                    if (s && s.isPlaying) {
                        this.tweens.add({ targets: s, volume: 0, duration: 2000, onComplete: () => s.stop() });
                    }
                } catch(e) { /* 無視 */ }
            });

            // 魔女戦かどうかでウェイトを変える (魔女戦: 5000ms, 通常: 3000ms)
            const waitTime = this.engine.majoLevel > 0 ? 5000 : 3000;

            this.time.delayedCall(waitTime, () => {
                console.log('[BattleScene] delayedCall fired, transitioning to ResultScene');
                
                // 戦闘終了時のHP/SPをGlobalStateに反映
                const globalState = GlobalState.getInstance();
                for (const p of this.engine.players) {
                    const charData = globalState.characters[p.charId];
                    if (charData) {
                        charData.currentHp = Math.max(0, p.hp);
                        charData.currentSp = Math.max(0, p.sp);
                    }
                }
                
                TransitionManager.transitionTo(this, 'ResultScene', {
                    party: this.battleConfig.party || ['001'],
                    earnedExp: this.engine.earnedExp || 0,
                    earnedSp: this.engine.earnedSp || 0,
                    returnScene: this.battleConfig.returnScene || 'AdventureScene'
                });
            });
        }
        
        // 全滅・撤退時の遷移
        if ((this.engine.waveState === 'gameover' || this.engine.waveState === 'retreated') && !this.isExiting) {
            this.isExiting = true;
            const stateObj = { 
                isGameOver: this.engine.waveState === 'gameover',
                isRetreated: this.engine.waveState === 'retreated',
                isNightExploration: this.battleConfig.isNightExploration,
                is1221NightBattle: this.battleConfig.is1221NightBattle || false,
                fromBattle: true
            };

            const targetScene = this.battleConfig.returnScene || 'AdventureScene';
            this.time.delayedCall(this.engine.waveState === 'gameover' ? 4000 : 1500, () => {
                if (this.scene.isPaused(targetScene)) {
                    TransitionManager.fadeOut(this, () => {
                        this.scene.stop();
                        this.scene.resume(targetScene, stateObj);
                    });
                } else {
                    TransitionManager.transitionTo(this, targetScene, stateObj);
                }
            });
        }


        // 描画更新
        this.renderer.update();
        this.drawGrid();

        // DPS表示更新
        if (this.dpsText && this.engine) {
            const now = this.engine.time;
            const history = this.engine.damageHistory;
            // 10秒以古の履歴を削除
            while (history.length > 0 && now - history[0].time > 10) {
                history.shift();
            }
            // 直近、1秒のDPS（最後1秒内の履歴サンプルから）
            const oneSec = history.filter(h => now - h.time <= 1).reduce((s, h) => s + h.damage, 0);
            // 10秒平均DPS
            const tenSecTotal = history.reduce((s, h) => s + h.damage, 0);
            const elapsed = Math.min(now, 10);
            const tenSecDps = elapsed > 0 ? tenSecTotal / elapsed : 0;
            // 最大DPS更新
            if (oneSec > this.engine.maxDps) this.engine.maxDps = oneSec;
            this.dpsText.setText(
                `DPS 今: ${Math.floor(oneSec).toLocaleString()}  10s平: ${Math.floor(tenSecDps).toLocaleString()}  最大: ${Math.floor(this.engine.maxDps).toLocaleString()}`
            );
        }
    }

    drawGrid() {
        const P = this.projector;
        this.graphics.clear();
        this.graphics.lineStyle(1, 0x555555, 0.3); // グリッドは少し薄くする

        for (let z = 0; z <= 18; z += 1) {
            const p1 = P.project(-5, z);
            const p2 = P.project(5, z);
            if (p1.visible && p2.visible) {
                this.graphics.strokeLineShape(new Phaser.Geom.Line(p1.x, p1.y, p2.x, p2.y));
            }
        }
        for (let x = -5; x <= 5; x += 1) {
            const p1 = P.project(x, 0);
            const p2 = P.project(x, 18);
            if (p2.visible) {
                this.graphics.strokeLineShape(new Phaser.Geom.Line(p1.x, p1.y, p2.x, p2.y));
            }
        }
    }

    initGroundMesh(specifiedKey) {
        if (!this.projector || this.battleConfig.rule !== 2) return;

        const { width, height } = this.scale;
        const bgKeys = ['toppa_bg_1', 'toppa_bg_2', 'toppa_bg_3'];
        
        if (specifiedKey && bgKeys.includes(specifiedKey)) {
            this.selectedBreakthroughBgKey = specifiedKey;
        } else if (!this.selectedBreakthroughBgKey) {
            this.selectedBreakthroughBgKey = Phaser.Utils.Array.GetRandom(bgKeys);
        }

        const texKey = this.selectedBreakthroughBgKey;

        // --- 旧レイヤー全破棄 ---
        if (this.floorLayers) {
            this.floorLayers.forEach(l => { try { l.destroy(); } catch(e) {} });
            this.floorLayers = null;
        }

        this.floorProgress = 0; // 0.0 ～ 1.0 のループ進捗
        this.floorLayers = [];

        // 5枚の画像層を用意して画面奥から手前へつなぐ
        const NUM_LAYERS = 5;
        for (let i = 0; i < NUM_LAYERS; i++) {
            // 上端センター(0.5, 0)を基準点にして配置
            const img = this.add.image(width / 2, 0, texKey);
            img.setOrigin(0.5, 0);
            img.setDepth(-150 + i); // 手前ほど上に重ねる
            this.floorLayers.push(img);
        }

        // 地平線グラデーション影
        if (this.floorShadow) {
            try { this.floorShadow.destroy(); } catch(e) {}
        }
        this.floorShadow = this.add.graphics().setDepth(-140);
        this.floorShadow.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.85, 0.85, 0.0, 0.0);
        this.floorShadow.fillRect(0, 0, width, height * 0.40);

        this.updateGroundMesh(0, 0);
        console.log(`[BattleScene] Progressive 1.14x scaling floor initialized with random BG: ${texKey}`);
    }

    updateGroundMesh(dt, advanceSpeed) {
        if (!this.floorLayers || this.floorLayers.length === 0) return;

        const { width, height } = this.scale;

        // キャラクターの前進速度 (0以上の値、動いていなくても基本速度8.0)
        const moveSpeed = (advanceSpeed && advanceSpeed > 0) ? advanceSpeed : 12.0;

        // 前進速度に応じて進行度 progress (0.0 〜 1.0) を動かす
        const speedRate = 0.09;
        this.floorProgress = (this.floorProgress + moveSpeed * (dt || 0.016) * speedRate) % 1.0;
        const P = this.floorProgress;

        // 画像の実際の縦幅を動的に取得（デフォルト1600）
        const frame = this.textures.get(this.selectedBreakthroughBgKey || 'toppa_bg_1')?.get();
        const H0 = (frame && frame.height) ? frame.height : 1600;
        const K  = 1.14;              // 公比 (1.14倍)
        
        // 1枚目（最奥）の大きさ: 1.3倍に調整
        const baseScale = (width / H0) * 0.65 * 1.3;
        
        // 1枚目の下端が画面上端(Y=0)よりも上の位置(マイナス位置)になるよう設定
        const displayFactor = (height * 0.00028);
        const horizonY = -380;        // 画面上枠(0)よりしっかり上にセット

        const NUM_LAYERS = this.floorLayers.length;

        for (let i = 0; i < NUM_LAYERS; i++) {
            const img = this.floorLayers[i];
            if (!img || !img.active) continue;

            // 各層の連続スケール指数 e (i=0が最奥, P=1.0でちょうど次のi=1の位置・サイズに一致)
            const e = (i - 1) + P;

            // スケール: 1.14^e
            const currentScale = Math.pow(K, e) * baseScale;
            img.setScale(currentScale);

            // ユーザー指定の累計Y位置計算: H(e) = H0 * (1.14^e - 1) / (1.14 - 1)
            const cumulativeH = H0 * (Math.pow(K, e) - 1.0) / (K - 1.0);

            // 画面上の上端Y位置 (地平線 horizonY から手前＝下方向へ展開)
            const screenY = horizonY + cumulativeH * displayFactor;
            img.setPosition(width / 2, screenY);

            // フェード処理 (最奥からの出現と画面手前でのフェードアウト)
            if (e < -0.8) {
                img.setAlpha(0);
            } else if (e < 0.2) {
                img.setAlpha(Math.max(0, (e + 0.8)));
            } else if (e > 3.2) {
                img.setAlpha(Math.max(0, 1 - (e - 3.2)));
            } else {
                img.setAlpha(1.0);
            }
        }
    }

    initBreakthroughDebugUI() {
        if (this.battleConfig.rule !== 2 || !this.engine) return;

        const { width, height } = this.scale;
        
        // デバッグパネルコンテナ (画面右上近辺に設置)
        const panel = this.add.container(width - 150, 125).setDepth(2500);

        const bg = this.add.rectangle(0, 0, 280, 160, 0x000000, 0.85)
            .setStrokeStyle(2, 0x00ffcc)
            .setInteractive();

        const title = this.add.text(0, -65, '🛠️ 突破デバッグ調整', {
            fontFamily: 'sans-serif', fontSize: '13px', color: '#00ffcc', fontStyle: 'bold'
        }).setOrigin(0.5);

        // 1. 敵レベル調整
        const lvText = this.add.text(-30, -40, `敵LV: ${this.engine.enemyLevel || 1}`, {
            fontFamily: 'monospace', fontSize: '13px', color: '#ffffff'
        }).setOrigin(0.5);

        const lvMinusBtn = this.add.text(-110, -40, ' [LV-] ', {
            fontFamily: 'monospace', fontSize: '12px', color: '#ffaaaa', backgroundColor: '#333333', padding: {x:4,y:2}
        }).setOrigin(0.5).setInteractive().on('pointerdown', () => {
            this.engine.enemyLevel = Math.max(1, (this.engine.enemyLevel || 1) - 1);
            this.engine.enemies.forEach(e => { if (e.owner === 'enemy') e.level = this.engine.enemyLevel; });
            lvText.setText(`敵LV: ${this.engine.enemyLevel}`);
        });

        const lvPlusBtn = this.add.text(65, -40, ' [LV+] ', {
            fontFamily: 'monospace', fontSize: '12px', color: '#aaffaa', backgroundColor: '#333333', padding: {x:4,y:2}
        }).setOrigin(0.5).setInteractive().on('pointerdown', () => {
            this.engine.enemyLevel = (this.engine.enemyLevel || 1) + 1;
            this.engine.enemies.forEach(e => { if (e.owner === 'enemy') e.level = this.engine.enemyLevel; });
            lvText.setText(`敵LV: ${this.engine.enemyLevel}`);
        });

        // 2. 敵の最大量調整
        const countText = this.add.text(-30, -10, `最大量: ${this.engine.enemyCountPerWave || 10}体`, {
            fontFamily: 'monospace', fontSize: '13px', color: '#ffffff'
        }).setOrigin(0.5);

        const countMinusBtn = this.add.text(-110, -10, ' [量-] ', {
            fontFamily: 'monospace', fontSize: '12px', color: '#ffaaaa', backgroundColor: '#333333', padding: {x:4,y:2}
        }).setOrigin(0.5).setInteractive().on('pointerdown', () => {
            this.engine.enemyCountPerWave = Math.max(1, (this.engine.enemyCountPerWave || 10) - 2);
            countText.setText(`最大量: ${this.engine.enemyCountPerWave}体`);
        });

        const countPlusBtn = this.add.text(65, -10, ' [量+] ', {
            fontFamily: 'monospace', fontSize: '12px', color: '#aaffaa', backgroundColor: '#333333', padding: {x:4,y:2}
        }).setOrigin(0.5).setInteractive().on('pointerdown', () => {
            this.engine.enemyCountPerWave = (this.engine.enemyCountPerWave || 10) + 3;
            countText.setText(`最大量: ${this.engine.enemyCountPerWave}体`);
        });

        // 3. 生成速度 (出現間隔) 調整
        const intervalText = this.add.text(-30, 20, `間隔: ${(this.engine.spawnInterval || 1.0).toFixed(1)}秒`, {
            fontFamily: 'monospace', fontSize: '13px', color: '#ffffff'
        }).setOrigin(0.5);

        const speedMinusBtn = this.add.text(-110, 20, ' [速+] ', {
            fontFamily: 'monospace', fontSize: '12px', color: '#aaffaa', backgroundColor: '#333333', padding: {x:4,y:2}
        }).setOrigin(0.5).setInteractive().on('pointerdown', () => {
            this.engine.spawnInterval = Math.max(0.1, (this.engine.spawnInterval || 1.0) - 0.2);
            intervalText.setText(`間隔: ${this.engine.spawnInterval.toFixed(1)}秒`);
        });

        const speedPlusBtn = this.add.text(65, 20, ' [速-] ', {
            fontFamily: 'monospace', fontSize: '12px', color: '#ffaaaa', backgroundColor: '#333333', padding: {x:4,y:2}
        }).setOrigin(0.5).setInteractive().on('pointerdown', () => {
            this.engine.spawnInterval = (this.engine.spawnInterval || 1.0) + 0.3;
            intervalText.setText(`間隔: ${this.engine.spawnInterval.toFixed(1)}秒`);
        });

        // 4. 背景画像切替
        const bgNames = { 'toppa_bg_1': 'yuka_enkin02', 'toppa_bg_2': 'road_enkin02', 'toppa_bg_3': 'grat_bg01' };
        const bgText = this.add.text(-35, 52, `背景: ${bgNames[this.selectedBreakthroughBgKey] || '1'}`, {
            fontFamily: 'monospace', fontSize: '12px', color: '#ffffaa'
        }).setOrigin(0.5);

        const bgSwitchBtn = this.add.text(65, 52, ' [切替] ', {
            fontFamily: 'monospace', fontSize: '12px', color: '#aaffaa', backgroundColor: '#333333', padding: {x:4,y:2}
        }).setOrigin(0.5).setInteractive().on('pointerdown', () => {
            const keys = ['toppa_bg_1', 'toppa_bg_2', 'toppa_bg_3'];
            const curIdx = keys.indexOf(this.selectedBreakthroughBgKey);
            const nextKey = keys[(curIdx + 1) % keys.length];
            this.initGroundMesh(nextKey);
            bgText.setText(`背景: ${bgNames[nextKey]}`);
        });

        panel.add([bg, title, lvText, lvMinusBtn, lvPlusBtn, countText, countMinusBtn, countPlusBtn, intervalText, speedMinusBtn, speedPlusBtn, bgText, bgSwitchBtn]);
    }


}



