import Phaser from 'phaser';
import { EventEngine } from '../systems/EventEngine';
import { TransitionManager } from '../systems/TransitionManager';
import { FogEffect } from '../systems/FogEffect';
import { GlobalState } from '../systems/GlobalState';

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
        this.from1221Event = data.from1221Event || false;
        this.from1221WildhuntEvent = data.from1221WildhuntEvent || false;
        this.fromRespEvent = data.fromRespEvent || false;
        this.fromOpTutorial = data.fromOpTutorial || false;
        this.battleConfig = data.battleConfig || null;

        const gs = GlobalState.getInstance();
        gs.addLog(`🎬 [EventScene init] from1207=${this.from1207Event}, from1214=${this.from1214Event}, eventLen=${this.eventData ? this.eventData.length : 0}`);
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
        GlobalState.getInstance().addLog(`🎬 [EventScene create] starting EventEngine...`);

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
        GlobalState.getInstance().addLog(`🏁 [EventScene] _onEventComplete (from1207=${this.from1207Event}, from1214=${this.from1214Event})`);
        if (this.engine) {
            this.engine.cleanup();
        }
        if (this.explorationDrops && this.explorationDrops.length > 0) {
            this._showExplorationDrops();
        } else {
            this._finishScene();
        }
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
            // 戦闘BGM(bgm_battle1~4)は鳴らしたまま引き継ぐ。それ以外は停止
            this.sound.sounds.forEach(s => {
                if (s && s.isPlaying && !(s.key && s.key.startsWith('bgm_battle'))) {
                    try { s.stop(); } catch (e) {}
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

                if (this.enemyLevel > 0) {
                    console.log('[EventScene] Direct transition to BattleScene (No map resume intermediate)');
                    const config = {
                        rule: 0,
                        attribute: this.enemyAttr || 1,
                        enemyAttr: this.enemyAttr || 1,
                        enemyCount: 10 + (this.enemyLevel || 1) * 3,
                        waveCount: 2,
                        enemyLevel: this.enemyLevel || 1,
                        majoLevel: this.majoLevel || 0,
                        bgmKey: this.selectedBgmKey,
                        isOverlay: true,
                        returnScene: 'AdventureScene',
                        party: party,
                        canRetreat: true,
                        isNightBattle: this.isNightBattle || this.isNightExploration || false
                    };

                    if (this.engine) this.engine.cleanup();
                    this.scene.sleep();
                    this.scene.launch('BattleScene', config);
                    return;
                } else {
                    this.scene.stop();
                    this.scene.resume(this.returnScene, { 
                        fromEvent: !this.fromTarot && !this.fromExploration && !this.fromNightExploration && !this.from1207Event && !this.from1214Event && !this.from1221Event && !this.fromRespEvent && !this.fromOpTutorial,
                        fromExploration: this.fromExploration,
                        fromNightExploration: this.fromNightExploration, // 夜探索専用フラグを引き継ぎ
                        isNotification: this.isNotification,
                        from1207Event: this.from1207Event,
                        from1214Event: this.from1214Event,
                        from1221Event: this.from1221Event,
                        fromRespEvent: this.fromRespEvent,

                        joinCharacterId: this.joinCharacterId 
                    });
                }

            }
        });
    }
}
