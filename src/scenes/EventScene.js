import Phaser from 'phaser';
import { EventEngine } from '../systems/EventEngine';
import { TransitionManager } from '../systems/TransitionManager';
import { FogEffect } from '../systems/FogEffect';
import { Dec21Effect } from '../systems/Dec21Effect';
import { GlobalState } from '../systems/GlobalState';
import { FONT_MAIN } from '../config/GameFont';

/**
 * 汎用イベント再生用シーン
 * AdventureScene等から遷移してきて、EventEngineを実行する。
 * 終了後、指定されたアクション（シーン遷移など）を行う。
 */
export default class EventScene extends Phaser.Scene {
    constructor() {
        super('EventScene');
    }

    init(data) {
        this.eventData = data.events || [];
        this.returnScene = data.returnScene || 'AdventureScene';
        this.callbacks = data.callbacks || {};
        this.enemyLevel = data.enemyLevel || 0;
        this.enemyAttr = data.enemyAttr || 1;
        this.majoLevel = data.majoLevel || 0;
        this.joinCharacterId = data.joinCharacterId || null;
        this.isNightExploration = data.isNightExploration || false;
        this.isNightBattle = data.isNightBattle || false;
        this.fromTarot = data.fromTarot || false;
        this.fromExploration = data.fromExploration || false;
        this.fromNightExploration = data.fromNightExploration || false; // 夜探索専用フラグ
        this.explorationDrops = data.explorationDrops || null;
        this.isNotification = data.isNotification || false;
        this.from1207Event = data.from1207Event || false;
        this.from1214Event = data.from1214Event || false;
        this.from1217Event = data.from1217Event || false;
        this.from1221Event = data.from1221Event || false;
        this.from1221WildhuntEvent = data.from1221WildhuntEvent || false;
        this.fromIkebukuro01Event = data.fromIkebukuro01Event || false;
        this.fromIkebukuro02Event = data.fromIkebukuro02Event || false;
        this.fromRespEvent = data.fromRespEvent || false;
        this.from2R1201Event = data.from2R1201Event || false;
        this.from2RDevilEvent = data.from2RDevilEvent || false;
        this.fromTowerRespEvent = data.fromTowerRespEvent || false;
        this.fromDojoEvent = data.fromDojoEvent || false;
        this.fromOpTutorial = data.fromOpTutorial || false;
        this.battleConfig = data.battleConfig || null;
        this.isTowerBattle = data.isTowerBattle || false;
        this.towerEnemy1 = data.towerEnemy1 !== undefined ? data.towerEnemy1 : 0;
        this.towerEnemy2 = data.towerEnemy2 !== undefined ? data.towerEnemy2 : 0;
        this.towerEnemiesList = data.towerEnemiesList || null;
        this.isWitchOnly = data.isWitchOnly || false;
        this.witchPattern = data.witchPattern !== undefined ? data.witchPattern : 1;
        this.showDec21Effect = data.showDec21Effect || false;

        // ── 既読判定・周回スキップ用イベントIDの確定 ──
        this.eventId = data.eventId || null;
        if (!this.eventId) {
            if (this.joinCharacterId) {
                this.eventId = `join_${this.joinCharacterId}`;
            } else if (this.from1207Event) {
                this.eventId = 'event_1207';
            } else if (this.from1214Event) {
                this.eventId = 'event_1214';
            } else if (this.from1217Event) {
                this.eventId = 'event_1217';
            } else if (this.from1221Event) {
                this.eventId = 'event_1221';
            } else if (this.from1221WildhuntEvent) {
                this.eventId = 'event_1221_wildhunt';
            } else if (this.fromRespEvent) {
                this.eventId = 'event_resporn';
            } else if (this.fromTowerRespEvent) {
                this.eventId = 'event_tow_res';
            } else if (data.fromIkebukuro01Event) {
                this.eventId = 'event_ikebukuro01';
            } else if (data.fromIkebukuro02Event) {
                this.eventId = 'event_ikebukuro02';
            } else if (this.fromOpTutorial) {
                this.eventId = 'event_op_tutorial';
            }
        }

        const gs = GlobalState.getInstance();
        gs.addLog(`🎬 [EventScene init] eventId=${this.eventId}, from1207=${this.from1207Event}, from1214=${this.from1214Event}, eventLen=${this.eventData ? this.eventData.length : 0}`);
    }

    setupDebugOverlay() {
        const gs = GlobalState.getInstance();
        const logBox = this.add.text(10, 10, '', {
            fontSize: '11px', color: '#00ffcc', backgroundColor: '#000000bb',
            padding: { x: 6, y: 4 }, wordWrap: { width: this.scale.width - 20 }
        }).setScrollFactor(0).setDepth(999999);

        const updateText = (logs) => {
            if (logBox && logBox.active) {
                logBox.setText('【Debug Log】\n' + (logs || []).join('\n'));
            }
        };

        gs.onLogCallback = updateText;
        updateText(gs.debugLogs);
    }

    create() {
        TransitionManager.fadeIn(this);
        // this.setupDebugOverlay();
        const gs = GlobalState.getInstance();
        gs.addLog(`🎬 [EventScene create] starting EventEngine...`);

        if (this.from1214Event) {
            if (this.sound && this.sound.stopAll) {
                this.sound.stopAll();
            }
        }

        // ワイルドハントイベント時：既存のマップBGM(bgm_hexenなど)をstopAll()で完全消去し、bgm_wildhuntを直接再生
        if (this.from1221WildhuntEvent) {
            if (this.sound) {
                this.sound.stopAll();
            }
            if (this.cache.audio.exists('bgm_wildhunt')) {
                const wh = this.sound.add('bgm_wildhunt', { loop: true, volume: 0.75 });
                wh.play();
                console.log('[EventScene] bgm_wildhunt 強行再生成功 ✓');
            } else {
                console.warn('[EventScene] bgm_wildhunt キーが見つかりません');
            }
        }

        this.engine = new EventEngine(this, this.eventData, () => {
            this._onEventComplete();
        });

        // カスタムコールバックの設定
        this.engine.callbacks = {
            ...this.callbacks,
            showFog: (cb) => this._showFog(cb),
            playBattleBgm: (cb) => this._playBattleBgm(cb)
        };

        this.engine.start();

        // 12/21掛け合いイベント等で背景もやもやエフェクトを表示
        if (this.showDec21Effect) {
            this.dec21Effect = new Dec21Effect(this, 12);
        }

        // ── 2回目以降（既読イベント）またはデバッグモード時に「⏩ SKIP」ボタンを表示 ──
        const isSeen = this.eventId ? gs.isEventSeen(this.eventId) : false;
        if (isSeen || GlobalState.IS_DEBUG_MODE) {
            this._createSkipButton();
        }
    }

    update(time, delta) {
        if (this.dec21Effect) {
            this.dec21Effect.update(delta / 1000);
        }
    }

    _createSkipButton() {
        const { width } = this.scale;
        const skipBtn = this.add.text(width - 20, 20, '⏩ SKIP', {
            fontFamily: FONT_MAIN,
            fontSize: '18px',
            color: '#ffffff',
            backgroundColor: '#000000aa',
            padding: { x: 12, y: 6 },
            stroke: '#ffcc00',
            strokeThickness: 2
        }).setOrigin(1, 0).setDepth(20000).setInteractive({ useHandCursor: true });

        skipBtn.on('pointerover', () => skipBtn.setStyle({ color: '#ffcc00', backgroundColor: '#333300cc' }));
        skipBtn.on('pointerout', () => skipBtn.setStyle({ color: '#ffffff', backgroundColor: '#000000aa' }));

        skipBtn.on('pointerdown', (pointer) => {
            if (pointer && pointer.event) pointer.event.stopPropagation();
            this._skipEvent();
        });
    }

    _skipEvent() {
        if (this._isSkipping) return;
        this._isSkipping = true;
        console.log(`[EventScene] ⏩ Event skipped: ${this.eventId}`);

        if (this.engine) {
            this.engine.cleanup();
        }
        this._onEventComplete();
    }

    _playBattleBgm(cb) {
        // 現在のBGMをフェードアウト
        if (this.sound && this.sound.sounds) {
            this.sound.sounds.forEach(s => {
                if (s && s.isPlaying) {
                    this.tweens.add({
                        targets: s, volume: 0, duration: 1000,
                        onUpdate: (t, target) => {
                            if (!target || !target.manager || target.pendingRemove) {
                                try { t.stop(); } catch(e){}
                            }
                        },
                        onComplete: () => { try { s.stop(); } catch(e){} }
                    });
                }
            });
        }

        // ランダムな戦闘BGMを選ぶ (1~4) し、キーを記憶してBattleSceneへ引き継げるようにする
        const bgmIndex = Math.floor(Math.random() * 4) + 1;
        this.selectedBgmKey = `bgm_battle${bgmIndex}`;
        const battleBgm = this.sound.add(this.selectedBgmKey, { loop: true, volume: 0 });
        battleBgm.play();
        this.tweens.add({ targets: battleBgm, volume: 0.5, duration: 1000 });

        if (cb) cb();
    }


    _showFog(cb) {
        if (this.enemyLevel > 0) {
            // 背景(5000)とダークオーバーレイ(5001)の上、立ち絵(5010)の下のレイヤー(5002)に表示
            this.fogEffect = new FogEffect(this, this.enemyAttr, 5002);
            
            // 少しずつフェードインさせるため、FogEffect側で管理する変数を上書き
            this.fogEffect.bgEffect.setAlpha(0);
            this.fogEffect.fadeInMultiplier = 0; // フェードイン用の独自変数
            
            this.tweens.add({
                targets: this.fogEffect,
                fadeInMultiplier: 1,
                duration: 2000
            });
        }
        if (cb) cb();
    }

    update(time, delta) {
        if (this.fogEffect) {
            this.fogEffect.update(delta / 1000); // FogEffectは秒(dt)を要求
        }
    }

    _onEventComplete() {
        const gs = GlobalState.getInstance();
        gs.addLog(`🏁 [EventScene] _onEventComplete (eventId=${this.eventId}, from1207=${this.from1207Event}, from1214=${this.from1214Event})`);
        
        // 既読フラグを記録（周回しても永久保持）
        if (this.eventId) {
            gs.markEventSeen(this.eventId);
        }

        // 12/21 池袋02イベント完了時: タワー全景スクロールカットシーンを再生！
        if (this.fromIkebukuro02Event) {
            this._playTowerScrollCutscene();
            return;
        }

        // タワー内全滅時: ホワイトアウトさせず、直接「はい／いいえ」ダイアログを表示！
        if (this.fromTowerRespEvent) {
            if (this.engine) {
                this.engine.cleanup();
            }
            this._showTowerRespDialog();
            return;
        }

        if (this.engine) {
            this.engine.cleanup();
        }
        if (this.explorationDrops && this.explorationDrops.length > 0) {
            this._showExplorationDrops();
        } else {
            this._finishScene();
        }
    }

    _playTowerScrollCutscene() {
        const { width, height } = this.scale;

        // まず暗転フェードアウト
        const blackScreen = this.add.rectangle(width / 2, height / 2, width * 3, height * 3, 0x000000)
            .setAlpha(0).setDepth(99999).setScrollFactor(0);

        this.tweens.add({
            targets: blackScreen,
            alpha: 1,
            duration: 800,
            onComplete: () => {
                // テキストUI・立ち絵等のクリーンアップ
                if (this.engine) {
                    this.engine.cleanup();
                }

                // 4枚の画像（tow1〜tow4）を縦に隙間なく連結するコンテナを作成
                const towerContainer = this.add.container(0, 0).setDepth(100);

                // 画像の実寸は 400x400px → 画面幅に合わせてスケール
                const IMG_SRC_SIZE = 400;
                const imgScale = width / IMG_SRC_SIZE;
                const sliceHeight = IMG_SRC_SIZE * imgScale; // = width px
                const totalHeight = sliceHeight * 4;

                // 下から順に配置: tow1(1F-15F)が最下部, tow4(46F-60F)が最上部
                const tow4Key = this.textures.exists('tow4') ? 'tow4' : 'bg_tow4';
                const tow3Key = this.textures.exists('tow3') ? 'tow3' : 'bg_tow3';
                const tow2Key = this.textures.exists('tow2') ? 'tow2' : 'bg_tow2';
                const tow1Key = this.textures.exists('tow1') ? 'tow1' : 'bg_tow1';

                const tow4 = this.add.image(width / 2, sliceHeight * 0.5, tow4Key)
                    .setScale(imgScale).setOrigin(0.5, 0.5);
                const tow3 = this.add.image(width / 2, sliceHeight * 1.5, tow3Key)
                    .setScale(imgScale).setOrigin(0.5, 0.5);
                const tow2 = this.add.image(width / 2, sliceHeight * 2.5, tow2Key)
                    .setScale(imgScale).setOrigin(0.5, 0.5);
                const tow1 = this.add.image(width / 2, sliceHeight * 3.5, tow1Key)
                    .setScale(imgScale).setOrigin(0.5, 0.5);

                towerContainer.add([tow4, tow3, tow2, tow1]);

                // 初期位置: 最下部 (tow1) の底が画面下端に一致する位置
                const startY = height - totalHeight;
                // 終了位置: 最上部 (tow4) の天辺が画面上端に一致する位置
                const endY = 0;

                towerContainer.setPosition(0, startY);

                let cutsceneFinished = false;
                const finishCutscene = () => {
                    if (cutsceneFinished) return;
                    cutsceneFinished = true;

                    // 暗転して AdventureScene に復帰 (fromIkebukuro02Event で _resumeHandler がタワーへ遷移)
                    this.tweens.add({
                        targets: blackScreen,
                        alpha: 1,
                        duration: 800,
                        onComplete: () => {
                            const gs = GlobalState.getInstance();
                            gs.isTowerMode = true;
                            gs.hasEnteredTower = true;

                            // AdventureScene は pause 状態なので resume で復帰させる
                            // _resumeHandler が fromIkebukuro02Event を検出してタワーへ遷移する
                            this.scene.stop('EventScene');
                            const advScene = this.scene.get('AdventureScene');
                            if (advScene) {
                                advScene.scene.resume('AdventureScene', {
                                    fromIkebukuro02Event: true
                                });
                            } else {
                                // フォールバック: AdventureScene が見つからない場合は直接起動
                                this.scene.start('AdventureScene', {
                                    isTower: true,
                                    party: ['001']
                                });
                            }
                        }
                    });
                };

                // タップでスキップ可能にするインタラクション
                const skipZone = this.add.zone(0, 0, width, height)
                    .setOrigin(0, 0).setDepth(99998).setInteractive();
                skipZone.once('pointerdown', () => {
                    finishCutscene();
                });

                // 暗転をフェードイン（タワー最下層が映し出される）
                this.tweens.add({
                    targets: blackScreen,
                    alpha: 0,
                    duration: 1000,
                    onComplete: () => {
                        // 下(tow1)から上(tow4)へ15秒かけてゆっくりスクロール！
                        this.tweens.add({
                            targets: towerContainer,
                            y: endY,
                            duration: 15000,
                            ease: 'Linear',
                            onComplete: () => {
                                finishCutscene();
                            }
                        });
                    }
                });
            }
        });
    }

    _showExplorationDrops() {
        const { width, height } = this.scale;
        const drops = this.explorationDrops;

        // 暗転背景
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85).setDepth(10000);

        let startY = height / 2 - (drops.length * 20);

        for (let i = 0; i < drops.length; i++) {
            const drop = drops[i];
            let color = '#ffffff';
            if (drop.type === 'gem') color = '#ffdd44';
            else if (drop.rank === 2) color = '#aaffaa';
            else if (drop.rank === 3) color = '#aaaaff';

            const nameText = drop.type === 'gem' ? `[宝石] ${drop.name}` : `Rank${drop.rank}: ${drop.name}`;

            const txt = this.add.text(width / 2, startY + (i * 38), nameText, {
                fontFamily: 'sans-serif', fontSize: '22px', color: color
            }).setOrigin(0.5).setDepth(10001).setAlpha(0);

            this.tweens.add({
                targets: txt,
                alpha: 1,
                y: startY + (i * 38) - 10,
                duration: 400,
                delay: i * 150
            });
        }

        const totalDelay = drops.length * 150 + 400;

        this.time.delayedCall(totalDelay, () => {
            this.add.text(width / 2, startY + (drops.length * 38) + 15, `${drops.length}個のレリクスを見つけた！`, {
                fontFamily: 'sans-serif', fontSize: '26px', color: '#ffcc00', fontStyle: 'bold'
            }).setOrigin(0.5).setDepth(10001);

            const continueText = this.add.text(width / 2, height - 90, 'tap to continue', {
                fontFamily: 'sans-serif', fontSize: '28px', color: '#aaaaaa'
            }).setOrigin(0.5).setAlpha(0).setDepth(10001);


            this.tweens.add({
                targets: continueText,
                alpha: 1,
                duration: 800,
                yoyo: true,
                repeat: -1
            });

            const clickHandler = () => {
                this.input.off('pointerdown', clickHandler);
                this._finishScene();
            };
            this.input.on('pointerdown', clickHandler);
        });
    }

    _finishScene() {
        GlobalState.getInstance().addLog(`🚪 [_finishScene] leaving EventScene (from1207=${this.from1207Event}, from1214=${this.from1214Event})`);
        // ワイルドハント突破戦への遷移時はBGMを一切止めない（bgm_wildhuntをそのまま引き継ぐ）
        if (!this.from1221WildhuntEvent && this.sound && this.sound.sounds) {
            // 戦闘BGM(bgm_battle1~4)は鳴らしたまま引き継ぐ。また探索ダイアログ(fromExploration)の時はマップBGM(bgm_hexen, bgm_toppa)も止めずに継続する
            this.sound.sounds.forEach(s => {
                if (s && s.isPlaying) {
                    const isBattleBgm = s.key && s.key.startsWith('bgm_battle');
                    const isMapBgm = s.key && (s.key === 'bgm_hexen' || s.key === 'bgm_toppa');
                    if (!isBattleBgm && !(this.fromExploration && isMapBgm)) {
                        try { s.stop(); } catch (e) {}
                    }
                }
            });
        }

        const { width, height } = this.scale;

        const whiteScreen = this.add.rectangle(width / 2, height / 2, width * 3, height * 3, 0xffffff)
            .setAlpha(0).setDepth(9999).setScrollFactor(0);
            
        this.tweens.add({
            targets: whiteScreen,
            alpha: 1,
            duration: 800,
            onComplete: () => {
                if (this.fromOpTutorial && this.battleConfig) {
                    TransitionManager.transitionTo(this, 'BattleScene', this.battleConfig);
                    return;
                }

                const advScene = this.scene.get('AdventureScene');
                let party = ['001'];
                if (advScene && advScene.party) party = advScene.party;

                if (this.from1221WildhuntEvent) {
                    let maxLvl = 5;
                    if (advScene && advScene.grid && advScene.playerRow !== undefined && advScene.playerCol !== undefined) {
                        const currentHex = advScene.grid[advScene.playerRow]?.[advScene.playerCol];
                        maxLvl = currentHex?.cellData?.enemyLevel || 5;
                    }

                    const config = {
                        rule: 2, // 突破戦
                        bgKey: 'road_enkin02',
                        attribute: 'red',
                        enemyCount: 200,
                        breakthroughTarget: 12010,
                        spawnInterval: 0.5,
                        enemyLevel: 5,
                        majoLevel: 0,
                        isOverlay: false,
                        returnScene: 'AdventureScene',
                        party: party,
                        canRetreat: false,
                        is1221NightBattle: true
                    };

                    // BGMを止めずにBattleSceneへ引き継ぐ（keepBgm=true）
                    if (this.engine) this.engine.cleanup(true);
                    this.scene.sleep();
                    this.scene.launch('BattleScene', config);
                    return;
                }

                if (this.enemyLevel > 0 || this.isTowerBattle) {
                    console.log('[EventScene] Direct transition to BattleScene (No map resume intermediate)');
                    const partySize = (party && party.length) ? party.length : 1;
                    const baseEnemyTable = { 1: 10, 2: 20, 3: 35, 4: 55, 5: 80 };
                    const baseCount = baseEnemyTable[partySize] || (80 + (partySize - 5) * 25);
                    const calcEnemyCount = baseCount + (this.enemyLevel || 1) * 3;

                    const config = {
                        rule: this.isTowerBattle ? 1 : 0,
                        attribute: this.enemyAttr || 1,
                        enemyAttr: this.enemyAttr || 1,
                        enemyCount: this.isTowerBattle ? 100 : calcEnemyCount,
                        waveCount: 2,
                        totalWaves: 2,
                        enemyLevel: this.enemyLevel || 1,
                        majoLevel: this.majoLevel || 0,
                        witchPattern: this.witchPattern || 1,
                        isWitchOnly: this.isWitchOnly || false,
                        bgmKey: this.selectedBgmKey,
                        isOverlay: true,
                        returnScene: 'AdventureScene',
                        party: party,
                        canRetreat: true,
                        isNightBattle: this.isNightBattle || this.isNightExploration || false,
                        isTowerBattle: this.isTowerBattle,
                        towerEnemy1: this.towerEnemy1,
                        towerEnemy2: this.towerEnemy2,
                        towerEnemiesList: this.towerEnemiesList
                    };

                    if (this.engine) this.engine.cleanup();
                    this.scene.sleep();
                    this.scene.launch('BattleScene', config);
                    return;
                } else {
                    this.scene.stop();
                    this.scene.resume(this.returnScene, { 
                        fromEvent: !this.fromTarot && !this.fromExploration && !this.fromNightExploration && !this.from1207Event && !this.from1214Event && !this.from1217Event && !this.from1221Event && !this.from1221WildhuntEvent && !this.fromIkebukuro01Event && !this.fromIkebukuro02Event && !this.fromRespEvent && !this.from2R1201Event && !this.from2RDevilEvent && !this.fromTowerRespEvent && !this.fromOpTutorial,
                        fromExploration: this.fromExploration,
                        fromNightExploration: this.fromNightExploration, // 夜探索専用フラグを引き継ぎ
                        isNotification: this.isNotification,
                        from1207Event: this.from1207Event,
                        from1214Event: this.from1214Event,
                        from1217Event: this.from1217Event,
                        from1221Event: this.from1221Event,
                        from1221WildhuntEvent: this.from1221WildhuntEvent,
                        fromIkebukuro01Event: this.fromIkebukuro01Event,
                        fromIkebukuro02Event: this.fromIkebukuro02Event,
                        fromRespEvent: this.fromRespEvent,
                        from2R1201Event: this.from2R1201Event,
                        from2RDevilEvent: this.from2RDevilEvent,
                        fromDojoEvent: this.fromDojoEvent,
                        fromTowerRespEvent: this.fromTowerRespEvent,
                        joinCharacterId: this.joinCharacterId 
                    });
                }

            }
        });
    }

    /** タワー内全滅時の選択肢ダイアログ */
    _showTowerRespDialog() {
        const { width, height } = this.scale;
        const container = this.add.container(0, 0).setDepth(20000);

        // 暗転背景
        const mask = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6)
            .setInteractive();
        container.add(mask);

        // ダイアログボックス
        const dialogW = Math.min(width * 0.85, 520);
        const dialogH = 220;
        const box = this.add.rectangle(width / 2, height / 2, dialogW, dialogH, 0x181822, 0.95)
            .setStrokeStyle(2, 0x9966cc);
        container.add(box);

        const promptText = this.add.text(width / 2, height / 2 - 50, '『――もう少し前まで、もどってみる？』', {
            fontFamily: 'sans-serif',
            fontSize: '19px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        container.add(promptText);

        const subText = this.add.text(width / 2, height / 2 - 15, '（はい：12/1の東京に戻る ／ いいえ：タワー内に復旧）', {
            fontFamily: 'sans-serif',
            fontSize: '14px',
            color: '#aaaaaa',
            align: 'center'
        }).setOrigin(0.5);
        container.add(subText);

        // 「はい」ボタン
        const yesBtn = this.add.text(width / 2 - 100, height / 2 + 45, 'はい', {
            fontFamily: 'sans-serif',
            fontSize: '22px',
            color: '#ffffff',
            backgroundColor: '#663399',
            padding: { x: 30, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        yesBtn.on('pointerdown', () => {
            container.destroy();
            this._finishTowerResp('yes');
        });

        // 「いいえ」ボタン
        const noBtn = this.add.text(width / 2 + 100, height / 2 + 45, 'いいえ', {
            fontFamily: 'sans-serif',
            fontSize: '22px',
            color: '#ffffff',
            backgroundColor: '#333344',
            padding: { x: 30, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        noBtn.on('pointerdown', () => {
            container.destroy();
            this._finishTowerResp('no');
        });

        container.add([yesBtn, noBtn]);
    }

    _finishTowerResp(choice) {
        if (choice === 'yes') {
            const { width, height } = this.scale;
            const whiteScreen = this.add.rectangle(width / 2, height / 2, width * 3, height * 3, 0xffffff)
                .setAlpha(0).setDepth(20001);
            this.tweens.add({
                targets: whiteScreen,
                alpha: 1,
                duration: 800,
                onComplete: () => {
                    if (this.engine) this.engine.cleanup();
                    this.scene.stop();
                    this.scene.resume(this.returnScene, {
                        fromTowerRespEvent: true,
                        choice: 'yes'
                    });
                }
            });
        } else {
            if (this.engine) this.engine.cleanup();
            this.scene.stop();
            this.scene.resume(this.returnScene, {
                fromTowerRespEvent: true,
                choice: 'no'
            });
        }
    }
}
