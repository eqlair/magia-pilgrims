import Phaser from 'phaser';
import { TransitionManager } from '../systems/TransitionManager';
import { MapData } from '../data/MapData';
import { MapFileList } from '../data/MapFileList';
import { TimeReporter } from '../systems/TimeReporter';
import { GlobalState } from '../systems/GlobalState';
import { RelicGenerator } from '../systems/RelicGenerator';
import { SaveManager } from '../systems/SaveManager';
import { fontSize, FONT_MAIN } from '../config/GameFont';
import { LOCATION_INFO_DATA } from '../data/location_info';
import { build1221WildhuntCommands } from '../data/wildhuntEvents';
import { SpriteText } from '../utils/SpriteText';
import { EventEngine } from '../systems/EventEngine';
import { Dec21Effect } from '../systems/Dec21Effect';







export default class AdventureScene extends Phaser.Scene {
    constructor() {
        super('AdventureScene');
    }

    init(data) {
        this._initData = data || {};
    }

    preload() {
        // MAP_HEX六角カット画像（ヘクスタイル用）
        for (const file of MapFileList) {
            if (file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.JPG') || file.endsWith('.PNG')) {
                const baseName = file.replace(/\.[^/.]+$/, "");
                this.load.image(`map_img_${file}`, `files/MAP_HEX/${baseName}.png`);
            }
        }
        // MAP元画像（背景用、カット前）
        for (const file of MapFileList) {
            if (file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.JPG') || file.endsWith('.PNG')) {
                this.load.image(`bg_img_${file}`, `files/MAP/${file}`);
            }
        }
        
        // 画面下半分の最背面背景
        this.load.image('bg_map_base', 'files/MAP/BG_map.jpg');

        // MAP画面UIボタン画像
        this.load.image('btn_tans', 'files/MAP/Btans.png'); // 探索ボタン
        this.load.image('btn_kyuu', 'files/MAP/Bkyuu.png'); // 休息ボタン
        this.load.image('btn_stat', 'files/MAP/Bstat.png'); // ステータスボタン
        this.load.image('bg_date',   'files/MAP/date.png');  // 日付枠画像
        this.load.image('bg_food',   'files/MAP/food.png');  // 食料枠画像
        this.load.image('bg_soul',   'files/MAP/soul.png');  // SP枠画像



        
        // ミニキャラ（全キャラ分, 600x300 = 4列×2行 = 150x150/フレーム）
        this.load.spritesheet('mini_001', 'files/CHR/001002.png', { frameWidth: 150, frameHeight: 150 });
        this.load.spritesheet('mini_002', 'files/CHR/002002.png', { frameWidth: 150, frameHeight: 150 });
        this.load.spritesheet('mini_003', 'files/CHR/003002.png', { frameWidth: 150, frameHeight: 150 });
        this.load.spritesheet('mini_004', 'files/CHR/004002.png', { frameWidth: 150, frameHeight: 150 });
        this.load.spritesheet('mini_005', 'files/CHR/005002.png', { frameWidth: 150, frameHeight: 150 });
        this.load.spritesheet('sion', 'files/CHR/001002.png', { frameWidth: 150, frameHeight: 150 });



    }

    create() {
        TransitionManager.fadeIn(this);
        const { width, height } = this.scale;
        const isNewGame = !!(this._initData && this._initData.isNewGame);
        if (isNewGame) {
            SaveManager.clearSaveData();
        }


        // 日数と時間帯の設定
        this.timePeriods = ['午前', '午後', '夜'];

        // セーブデータおよびGlobalStateから正確な日付を復元
        const gs = GlobalState.getInstance();
        if (isNewGame) {
            gs.currentMonth = 12;
            gs.currentDay = 1;
            gs.timePeriodIndex = 0;
            gs.inventory = { relics: [], gems: [] };
        }

        const _savedForDate = SaveManager.loadGameData();
        const _adv = _savedForDate && _savedForDate.adventureState ? _savedForDate.adventureState : null;
        
        const startDayInput = (this._initData && this._initData.startDay) ? Math.min(20, Math.max(1, parseInt(this._initData.startDay, 10))) : null;

        if (startDayInput !== null) {
            this.currentMonth = 12;
            this.currentDay   = startDayInput;
            this.timePeriodIndex = 0;
        } else if (isNewGame) {
            this.currentMonth = 12;
            this.currentDay   = 1;
            this.timePeriodIndex = 0;
        } else if (this._initData && this._initData.fromSave && _adv) {
            this.currentMonth = _adv.currentMonth || 12;
            this.currentDay   = _adv.currentDay   || 1;
            this.timePeriodIndex = (_adv.timePeriodIndex !== undefined) ? _adv.timePeriodIndex : 0;
        } else if (gs.currentMonth !== undefined && gs.currentDay !== undefined) {
            // 他シーン（CampScene等）からの遷移・復帰
            this.currentMonth = gs.currentMonth;
            this.currentDay   = gs.currentDay;
            this.timePeriodIndex = gs.timePeriodIndex || 0;
        } else if (_adv) {
            this.currentMonth = _adv.currentMonth || 12;
            this.currentDay   = _adv.currentDay   || 1;
            this.timePeriodIndex = (_adv.timePeriodIndex !== undefined) ? _adv.timePeriodIndex : 0;
        } else {
            this.currentMonth = 12;
            this.currentDay   = 1;
            this.timePeriodIndex = 0;
        }

        
        // GlobalStateにも確実に同調・保存
        gs.currentMonth = this.currentMonth;
        gs.currentDay = this.currentDay;
        gs.timePeriodIndex = this.timePeriodIndex;

        this.timeOfDay = this.timePeriods[this.timePeriodIndex];

        
        // 敵の量・ウェーブ数コントロール（デフォルトウェーブ数: 2）
        this.globalWaveCount = (_adv && _adv.globalWaveCount) ? _adv.globalWaveCount : 2.0;
        this.globalEnemyCount = (_adv && _adv.globalEnemyCount !== undefined) ? _adv.globalEnemyCount : 10;
        this.globalEnemyLevel = 1;
        this.previousPartySize = 1;



        // ── BGM制御 ──
        this.sound.stopAll();
        if (this.cache.audio.exists('bgm_hexen')) {
            const mapBgm = this.sound.add('bgm_hexen', { loop: true, volume: 0 });
            mapBgm.play();
            this.tweens.add({ targets: mapBgm, volume: 0.5, duration: 1000 });
        }

        // ヘックスのパラメータ設定
        this.hexRadius = 60;
        this.hexWidth = this.hexRadius * Math.sqrt(3);
        this.hexHeight = this.hexRadius * 2;
        this.hexVertSpacing = this.hexHeight * 0.75;

        // ヘックスの頂点座標 (pointy-topped)
        const points = [
            { x: 0, y: -this.hexRadius },
            { x: this.hexWidth/2, y: -this.hexRadius/2 },
            { x: this.hexWidth/2, y: this.hexRadius/2 },
            { x: 0, y: this.hexRadius },
            { x: -this.hexWidth/2, y: this.hexRadius/2 },
            { x: -this.hexWidth/2, y: -this.hexRadius/2 }
        ];

        // マップグループ作成
        this.mapContainer = this.add.container(0, 0);

        // マップデータの初期化・状態付与
        this.hexes = [];
        this.grid = []; // 2次元配列でのアクセス用
        for (let row = 0; row < MapData.length; row++) {
            this.grid[row] = [];
            for (let col = 0; col < MapData[row].length; col++) {
                // MapDataの参照汚染を防ぐためディープコピー
                const cellData = JSON.parse(JSON.stringify(MapData[row][col]));
                // 初期状態の付与
                cellData.visited = cellData.visited || 0;
                cellData.revealed = cellData.revealed || 0; // 一度でも隣接した水域・密林用
                cellData.isAdjacent = false; // 現在隣接しているか
                if (cellData.initialEnemyLevel === undefined) {
                    cellData.initialEnemyLevel = cellData.enemyLevel || 0;
                }
                // 敵の属性(1~5)をランダムに初期設定
                if (cellData.enemyAttr === undefined) {
                    cellData.enemyAttr = Math.floor(Math.random() * 5) + 1;
                }



                
                const xOffset = (row % 2 === 1) ? (this.hexWidth / 2) : 0;
                const px = col * this.hexWidth + xOffset;
                this.mapTiltY = 0.65; // 鳥瞰図用Y圧縮率
                const py = row * this.hexVertSpacing * this.mapTiltY;

                const hexData = { col, row, px, py, cellData };
                this.hexes.push(hexData);
                this.grid[row][col] = hexData;
            }
        }


        // セーブデータが存在しない場合（新規プレイ開始時）のみ魔女21箇所をランダム配置
        const savedDataForWitch = SaveManager.loadGameData();
        const hasSavedAdventure = savedDataForWitch && savedDataForWitch.adventureState && savedDataForWitch.adventureState.hexStates;

        if (!hasSavedAdventure) {
            const landHexes = this.hexes.filter(h => h.cellData.enemyLevel > 0);
            for (let i = landHexes.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [landHexes[i], landHexes[j]] = [landHexes[j], landHexes[i]];
            }
            const witchHexes = landHexes.slice(0, 21);
            for (const wh of witchHexes) {
                wh.cellData.witchLevel = wh.cellData.enemyLevel;
                wh.cellData.initialWitchLevel = wh.cellData.enemyLevel;
            }
        }



        // ヘックスごとの描画セットアップ
        for (const h of this.hexes) {
            h.container = this.add.container(h.px, h.py);
            
            // 背景画像用Sprite
            h.bgSprite = this.add.sprite(0, 0, 'map_img_woods.jpg');
            h.bgSprite.setScale(1, this.mapTiltY);
            
            // インタラクティブ領域
            h.bgSprite.setInteractive();
            h.bgSprite.on('pointerdown', () => {
                this.onHexTap(h);
            });

            // 枠線
            h.outline = this.add.graphics();
            h.outline.lineStyle(2, 0xaaaaaa, 0.8);
            h.outline.strokePoints(points, true);
            h.outline.setScale(1, this.mapTiltY);

            // テキスト
            let displayName = h.cellData.name.replace('\n', '');
            h.text = this.add.text(0, 0, displayName, {
                fontFamily: 'sans-serif',
                fontSize: '14px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 3,
                align: 'center'
            }).setOrigin(0.5, 0.5);

            h.container.add([h.bgSprite, h.outline, h.text]);


            h.witchSprite = this.add.sprite(0, 0, 'map_witch');
            const witchW = h.witchSprite.width || 300;
            h.witchSprite.setScale(94.0 / witchW);
            h.witchSprite.setOrigin(0.5, 1);
            h.witchSprite.setVisible(false);
            h.container.add(h.witchSprite);

            
            const attrColors = {
                1: '#ff4444', 2: '#aa44ff', 3: '#44ff44', 4: '#ffff44', 5: '#44aaff'
            };
            const textColor = attrColors[h.cellData.enemyAttr] || '#ffaa44';

            h.witchText = this.add.text(0, 5, `Witch LV.${h.cellData.witchLevel}`, {
                fontFamily: 'sans-serif', fontSize: '12px', color: textColor,
                stroke: '#000000', strokeThickness: 3, fontStyle: 'bold'
            }).setOrigin(0.5, 0).setVisible(false);
            h.container.add(h.witchText);
            
            h.enemyText = this.add.text(0, -5, `Wasp LV.${h.cellData.enemyLevel}`, {
                fontFamily: 'sans-serif', fontSize: '12px', color: textColor,
                stroke: '#000000', strokeThickness: 3, fontStyle: 'bold'
            }).setOrigin(0.5, 1).setVisible(false);
            h.container.add(h.enemyText);

            // 有利・不利表示用テキスト (敵LVの下に配置)
            h.affinityText = this.add.text(0, 15, '', {
                fontFamily: 'sans-serif', fontSize: '12px', color: '#ffffff',
                stroke: '#000000', strokeThickness: 3, fontStyle: 'bold'
            }).setOrigin(0.5, 0).setVisible(false);
            h.container.add(h.affinityText);

            this.mapContainer.add(h.container);
        }




        // プレイヤーキャラクタ
        this.currentCharKey = 'sion';
        this.player = this.add.sprite(0, 0, this.currentCharKey);
        
        // スケールとオフセットの定数（フレームサイズ150px基準: 旧728px×0.15 ≒ 新150px×0.73）
        this.PSCALE_X = 0.73;
        this.PSCALE_Y = 0.73;
        this.CHAR_OFFSET_Y = 52; // キャラを絵の1/4ほど上にずらす(25 + 27)


        // ヘクスの上にちょこんと乗るようにスケール
        this.player.setScale(this.PSCALE_X, this.PSCALE_Y);
        this.player.setDepth(10); // キャラクタを手前に表示
        this.mapContainer.add(this.player);

        // 呼吸アニメーション (Idle時)
        this.breatheTween = this.tweens.add({
            targets: this.player,
            scaleY: this.PSCALE_Y * 0.96,
            scaleX: this.PSCALE_X * 1.02,
            yoyo: true,
            repeat: -1,
            duration: 1200,
            ease: 'Sine.easeInOut'
        });

        // 現在地ヘクスのタップで喜ぶアクションを実行するよう変更（onHexTap内で処理）

        // 無操作10秒で喜ぶアクション
        this.resetIdleTimer();

        // カメラの自由な移動を保証するため、広めのBoundsを設定
        this.cameras.main.setBounds(-2000, -2000, 4000, 4000);
        
        // デバッグ用: Pキーで宝石ドロップフラグをトグル
        const globalState = GlobalState.getInstance();
        this.input.keyboard.on('keydown-P', () => {
            globalState.debugForceGemDrop = !globalState.debugForceGemDrop;
            const text = this.add.text(this.scale.width / 2, 50, `[DEBUG] 宝石確定ドロップ: ${globalState.debugForceGemDrop ? 'ON' : 'OFF'}`, {
                fontSize: '20px', color: '#ff0000', backgroundColor: '#ffffff', padding: { x: 5, y: 5 }
            }).setOrigin(0.5).setDepth(9999);
            this.time.delayedCall(2000, () => text.destroy());
        });

        // 初期位置: (D, 7) の東京 (col=3, row=6)
        this.playerCol = 3;
        this.playerRow = 6;
        this.isJumping = false;

        // チュートリアル初期化/ニューゲーム時
        if (this._initData.isTutorialStart || this._initData.fromTitleNewGame) {
            gs.currentMonth = 12;
            gs.currentDay = 1;
            gs.timePeriodIndex = 0;
            this.currentMonth = 12;
            this.currentDay = 1;
            this.timePeriodIndex = 0;
            this.timeOfDay = '午前';
            
            // 東京ヘクスの討伐済み初期化
            const tokyoHex = this.grid[6]?.[3];
            if (tokyoHex && tokyoHex.cellData) {
                tokyoHex.cellData.visited = 1;
                tokyoHex.cellData.enemyLevel = 0;
                tokyoHex.cellData.witchLevel = 0;
            }
        }
        
        // パーティ編成の読み込みと復元 (savedFormation や セーブデータから優先復元)
        let initialParty = this._initData.party;

        if (this._initData.fromTitleNewGame || this._initData.isTutorialStart) {
            initialParty = ['001'];
            gs.savedFormation = { '001': { lane: 0, isFront: false } };
        } else if (!initialParty || initialParty.length === 0) {
            const savedData = SaveManager.loadGameData();
            if (savedData && savedData.adventureState && savedData.adventureState.party) {
                initialParty = savedData.adventureState.party;
            }
        }
        
        const partySet = new Set();
        if (initialParty && Array.isArray(initialParty)) {
            for (const rawId of initialParty) {
                partySet.add(gs.normalizeCharId(rawId));
            }
        } else {
            partySet.add('001');
        }

        if (!this._initData.fromTitleNewGame && !this._initData.isTutorialStart && gs.savedFormation && Object.keys(gs.savedFormation).length > 0) {
            for (const cid of Object.keys(gs.savedFormation)) {
                partySet.add(gs.normalizeCharId(cid));
            }
        }
        this.party = Array.from(partySet);
        console.log('[AdventureScene] Restored & normalized party:', this.party);





        // タロット初期フラグ (最初は引けない。戦闘・探索・休息後に条件を満たせば引ける)
        this._pendingTarot = false;

        // -- UI用カメラ (ズームの影響を受けない固定UI層) --
        this.uiCamera = this.cameras.add(0, 0, width, height);
        this.uiCamera.setName('UICamera');
        // UIコンテナはメインカメラから無視される。mapContainerはUIカメラから無視される
        this.uiContainer = this.add.container(0, 0).setDepth(200);
        this.cameras.main.ignore(this.uiContainer);
        this.uiCamera.ignore(this.mapContainer);

        // -- 背景スプライトのセットアップ (ズームの影響なし) --
        this.setupBackground();

        // チュートリアル/新規開始時の東京ヘクス討伐済み処理
        if (this._initData.isTutorialStart || this._initData.fromTitleNewGame) {
            const tokyoHex = this.grid[6]?.[3];
            if (tokyoHex && tokyoHex.cellData) {
                tokyoHex.cellData.visited = 1;
                tokyoHex.cellData.enemyLevel = 0;
                tokyoHex.cellData.witchLevel = 0;
            }
        }

        // 最初のヘックスを踏破済みにする
        this.moveToHex(this.grid[this.playerRow][this.playerCol], false);

        
        // -- カメラ設定 --
        this.normalZoom = 1.4;
        this.wideZoom = 0.8;
        this.normalOffsetY = 0; // 中央に戻す (50%)
        this.cameras.main.setZoom(this.normalZoom);
        this.cameras.main.centerOn(this.player.x, this.player.y);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1, 0, this.normalOffsetY);

        
        // -- 画面上部のテロップ (Tips) --
        this.setupTicker();

        // セーブデータが存在し、かつ新規ゲーム起動(isNewGame)でない場合のみマップ状態を復元適用
        if (!isNewGame) {
            const saveData = SaveManager.loadGameData();
            if (saveData && saveData.adventureState) {
                this.applySaveData(saveData);
            }
        }



        // 休息モード中であればRestSceneへ直接接続して再開（時間の踏み倒し裏技防止）
        if (this.inRestMode) {
            this.scene.pause();
            this.scene.launch('RestScene', { party: this.party, timeOfDay: this.timeOfDay });
        } else {
            // 現在の状態を自動保存
            SaveManager.saveGame(this);
        }

        // ── チュートリアル午前イベントの発動チェック ──
        this.checkTutorialEvents();


        
        // アイドル時間計測用
        this.idleTime = 0;
        this.input.on('pointerdown', () => this.resetIdleTime());
        this.input.on('pointermove', () => this.resetIdleTime());

        
        // 他のシーン（EventSceneなど）から復帰したときの処理
        // ※ on()は毎回追加されるため、必ず一度offしてから登録して二重発火を防ぐ
        if (this._resumeHandler) {
            this.events.off('resume', this._resumeHandler, this);
        }
        this._resumeHandler = (scene, data) => {
            this._isAdvancingTime = false; // シーン復帰時に時間経過ロックを必ず解除
            this._updateFoodDisplay(); // タロット等で変更されたSP・食料表示をリアルタイム更新
            if (data && data.fromRest) {
                this.inRestMode = false;
                this.applyTutorialRestrictions();
                SaveManager.saveGame(this);
            }



            
        // 撤退または全滅からの復帰

        if (data && (data.isGameOver || data.isRetreated)) {
            // イベントシーンが残っていれば終了
            if (this.scene.isActive('EventScene')) {
                this.scene.stop('EventScene');
            }

            // 12/21の全滅時はリスポーンイベントへ突入
            if (data.isGameOver && (data.is1221NightBattle || this.currentDay === 21)) {
                const respData = this.cache.json.get('event_resp');
                if (respData) {
                    this.scene.pause();
                    this.scene.launch('EventScene', {
                        events: respData,
                        returnScene: 'AdventureScene',
                        fromRespEvent: true
                    });
                    return;
                }
            }

            if (this._preBattleSnapshot) {
                this.restoreSnapshot(this._preBattleSnapshot);
                this._preBattleSnapshot = null;
            }

            // 撤退または全滅からの復帰時チュートリアルチェック
            this._justReturnedFromGameOverOrRetreat = true;
            const tutFired = this.checkTutorialEvents();

            // 二重表示を防ぐため既存のメッセージを消去
            if (this._retreatMsgText) {

                this._retreatMsgText.destroy();
                this._retreatMsgText = null;
            }

            const msg = data.isGameOver ? '部隊は全滅した…' : '戦闘から撤退した。';
            // メッセージ表示 (1つのみ単一管理・uiContainerに追加してカメラ二重描画を防止)
            this._retreatMsgText = this.add.text(this.scale.width/2, this.scale.height/2, msg, {
                fontFamily: 'sans-serif',
                fontSize: '28px',
                color: '#ff6666',
                backgroundColor: 'rgba(0,0,0,0.85)',
                padding: { x: 24, y: 16 },
                stroke: '#000000',
                strokeThickness: 4
            }).setOrigin(0.5).setDepth(3000).setScrollFactor(0);

            if (this.uiContainer) {
                this.uiContainer.add(this._retreatMsgText);
            }

            this.time.delayedCall(2500, () => {
                if (this._retreatMsgText) {
                    this._retreatMsgText.destroy();
                    this._retreatMsgText = null;
                }
            });
            
            // BGM再開
            this.sound.stopAll();
            if (this.cache.audio.exists('bgm_hexen')) {
                const mapBgm = this.sound.add('bgm_hexen', { loop: true, volume: 0 });
                mapBgm.play();
                this.tweens.add({ targets: mapBgm, volume: 0.5, duration: 1000 });
            }
            return;
        }


        // 夜探索からの勝利復帰
        if (data && data.isNightExploration && data.fromBattle) {
            const gs = GlobalState.getInstance();
            gs.food = 140; // 食料回復
            this._updateFoodDisplay();
            
            // レリクス・宝石ドロップ生成
            const drops = RelicGenerator.generateBattleDrops();
            if (!gs.inventory) gs.inventory = { relics: [], gems: [] };
            drops.forEach(drop => {
                if (drop.type === 'gem') gs.inventory.gems.push(drop);
                else gs.inventory.relics.push(drop);
            });
            
            this.scene.pause();
            this.scene.launch('EventScene', {
                events: [
                    { cmd: 'bg', key: 'ev_expr' },
                    { cmd: 'text', name: '', body: '夜の危険な探索を乗り越え、\n充分な量の食料を手に入れた！' }
                ],
                returnScene: 'AdventureScene',
                fromNightExploration: true,  // 夜探索専用フラグ（fromExplorationとは別管理）
                explorationDrops: drops
            });
            return;
        }

        const gs = GlobalState.getInstance();
        if (gs.currentMonth !== undefined && gs.currentDay !== undefined) {
            this.currentMonth = gs.currentMonth;
            this.currentDay = gs.currentDay;
            this.timePeriodIndex = gs.timePeriodIndex || 0;
            this.timeOfDay = this.timePeriods[this.timePeriodIndex];
            if (this.dateTimeText) {
                this.dateTimeText.setText(`${this.currentMonth}月${this.currentDay}日 ${this.timeOfDay}`);
            }
        }

        if (this.player) this.player.setVisible(true);

            // タロット復帰時：塔の正位置などで仲間が離脱した場合にマップパーティを最新同期
            if (data && data.fromTarot) {
                if (gs.lastTowerRemovedCharId) {
                    const removedId = gs.normalizeCharId(gs.lastTowerRemovedCharId);
                    gs.lastTowerRemovedCharId = null;
                    if (gs.savedFormation) {
                        delete gs.savedFormation[removedId];
                    }
                    this.party = this.party.filter(id => gs.normalizeCharId(id) !== removedId);
                    console.log('[AdventureScene] Tower removed char processed:', removedId);
                }
                const updatedFormKeys = Object.keys(gs.savedFormation || {});
                if (updatedFormKeys.length > 0) {
                    this.party = updatedFormKeys;
                }
            }

            if (data && data.joinCharacterId) {
                const normJoinId = gs.normalizeCharId(data.joinCharacterId);
                if (!this.party.includes(normJoinId)) {
                    this.party.push(normJoinId);
                    gs.assignFormationForNewMember(normJoinId);

                    // 加入キャラのHP・SPをその時点のmaxHp/maxSpで100%全回復・満タン状態で加入させる
                    const joinedChar = gs.characters[normJoinId];
                    if (joinedChar) {
                        const stats = gs.calcStats(normJoinId, this.party);
                        if (stats) {
                            joinedChar.currentHp = stats.maxHp;
                            joinedChar.currentSp = stats.maxSp;
                        }
                    }

                    console.log('Joined party & updated savedFormation & healed:', normJoinId);
                    SaveManager.saveGame(this);
                }
            }

            // GlobalState.savedFormation に存在するキャラクターを this.party に同期
            for (const charId of this.party) {
                gs.assignFormationForNewMember(gs.normalizeCharId(charId));
            }
            if (gs.savedFormation) {
                for (const rawCid of Object.keys(gs.savedFormation)) {
                    const normCid = gs.normalizeCharId(rawCid);
                    if (!this.party.includes(normCid)) {
                        this.party.push(normCid);
                        console.log('[AdventureScene] Synced missing character to party:', normCid);
                    }
                }
            }






            let advancedTimeThisResume = false;

            // 休息・戦闘完了時のみ時間を1コマ進める
            // ※ fromExploration は除外！探索の時間進行は全ステップ完了後に
            //   _advanceTimeAfterExploration() が advanceTime() を呼ぶので、ここでは呼ばない
            // ※ fromNightExploration は夜探索専用フラグ。こちらはここで時間を進める
            if (data && (data.fromRest || data.fromBattle || data.fromNightExploration) && !data.fromTarot && !data.isNotification) {
                if (!advancedTimeThisResume) {
                    this.advanceTime();
                    advancedTimeThisResume = true;
                }
            }



            if (data && data.fromBattle) {
                console.log(`[AdventureScene] fromBattle returned. globalWaveCount=${this.globalWaveCount}`);

                // 現在のヘクスを制圧済みに（敵レベル・魔女レベルを0にして敵なしヘクスにする）
                const currentHex = this.grid[this.playerRow]?.[this.playerCol];
                if (currentHex && currentHex.cellData) {
                    const oldEnemyLevel = currentHex.cellData.enemyLevel || 0;
                    const oldWitchLevel = currentHex.cellData.witchLevel || 0;

                    currentHex.cellData.enemyLevel = 0;
                    currentHex.cellData.witchLevel = 0;

                    // ① 雑魚を倒すたび、マップ上のどこかの雑魚のレベルが1上がる（上限13）
                    if (oldEnemyLevel > 0 && oldWitchLevel === 0) {
                        const targetHexes = [];
                        for (let r = 0; r < this.grid.length; r++) {
                            for (let c = 0; c < this.grid[r].length; c++) {
                                const h = this.grid[r][c];
                                if (h && h.cellData && h.cellData.enemyLevel > 0 && (h.cellData.witchLevel || 0) === 0) {
                                    targetHexes.push(h);
                                }
                            }
                        }
                        if (targetHexes.length > 0) {
                            const picked = targetHexes[Math.floor(Math.random() * targetHexes.length)];
                            picked.cellData.enemyLevel = Math.min(13, picked.cellData.enemyLevel + 1);
                        }
                    }

                    // ② 魔女を倒すとマップ上のどこかの魔女のレベルが1上がる（上限13）
                    if (oldWitchLevel > 0) {
                        const witchHexes = [];
                        for (let r = 0; r < this.grid.length; r++) {
                            for (let c = 0; c < this.grid[r].length; c++) {
                                const h = this.grid[r][c];
                                if (h && h.cellData && (h.cellData.witchLevel || 0) > 0) {
                                    witchHexes.push(h);
                                }
                            }
                        }
                        if (witchHexes.length > 0) {
                            const pickedWitch = witchHexes[Math.floor(Math.random() * witchHexes.length)];
                            pickedWitch.cellData.witchLevel = Math.min(13, pickedWitch.cellData.witchLevel + 1);
                        }
                    }

                    console.log(`[AdventureScene] Hex (${this.playerCol}, ${this.playerRow}) cleared - enemies removed`);
                    this.updateVisibility(); // マップ上の敵表示を即時更新
                }


                // マップBGMを再開
                if (this.tweens && typeof this.tweens.getTweens === 'function') {
                    this.tweens.getTweens().forEach(t => {
                        if (t.targets && t.targets.some(target => target && target.key === 'bgm_hexen')) {
                            t.stop();
                        }
                    });
                }
                this.sound.stopAll();
                if (this.cache.audio.exists('bgm_hexen')) {
                    const mapBgm = this.sound.add('bgm_hexen', { loop: true, volume: 0 });
                    mapBgm.play();
                    this.tweens.add({
                        targets: mapBgm, volume: 0.5, duration: 1000,
                        onUpdate: (tween, target) => {
                            if (!target || !target.manager) tween.stop();
                        }
                    });
                }
            }

            // タロットからの復帰時などもマップBGMを再開
            if (!data || (!data.fromBattle && !data.startBattle)) {
                const existing = this.sound.get('bgm_hexen');
                if (!existing || !existing.isPlaying) {
                    if (this.tweens && typeof this.tweens.getTweens === 'function') {
                        this.tweens.getTweens().forEach(t => {
                            if (t.targets && t.targets.some(target => target && target.key === 'bgm_hexen')) {
                                t.stop();
                            }
                        });
                    }
                    this.sound.stopAll();

                    if (this.cache.audio.exists('bgm_hexen')) {
                        const mapBgm = this.sound.add('bgm_hexen', { loop: true, volume: 0 });
                        mapBgm.play();
                        this.tweens.add({
                            targets: mapBgm, volume: 0.5, duration: 1000,
                            onUpdate: (tween, target) => {
                                if (!target || !target.manager) tween.stop();
                            }
                        });
                    }
                }
            }


            if (data && data.startBattle) {
                console.log('Battle Started!', data);
                
                const attrMap = { 1: 'red', 2: 'purple', 3: 'green', 4: 'yellow', 5: 'blue' };
                const attrStr = attrMap[data.enemyAttr] || 'red';

                const isNightBattle = data.isNightBattle || data.isNightExploration || (this.timeOfDay === '夜');
                const config = {
                    rule: 0,
                    attribute: attrStr,
                    enemyCount: this.globalEnemyCount,
                    waveCount: Math.ceil(this.globalWaveCount),
                    enemyLevel: Math.min(13, data.enemyLevel || 1),
                    majoLevel: Math.min(13, data.majoLevel || 0),

                    bgmKey: data.selectedBgmKey || null,

                    isOverlay: true,
                    returnScene: 'AdventureScene',
                    party: this.party,
                    isNightExploration: data.isNightExploration || false,
                    isNightBattle: isNightBattle
                };


                this.scene.pause();
                this.scene.launch('BattleScene', config);
            } else {
                if (this.persistentFadeRect) {
                    this.tweens.add({
                        targets: this.persistentFadeRect,
                        alpha: 0,
                        duration: 800,
                        onComplete: () => {
                            if (this.persistentFadeRect) {
                                this.persistentFadeRect.destroy();
                                this.persistentFadeRect = null;
                            }
                        }
                    });
                } else {
                    TransitionManager.fadeIn(this);
                }

                if (this._pendingTarot) {
                    this._pendingTarot = false;
                    this.enqueueEvent({
                        type: 'tarot',
                        data: { returnScene: 'AdventureScene', party: this.party }
                    });
                }

                // イベントキューに次のイベントが残っている場合は連鎖自動再生（何もなければ時報またはセーブ）
                const hasNextEvent = this.processEventQueue();
                if (!hasNextEvent) {
                    if (this._pendingTimeSignal) {
                        this._pendingTimeSignal = false;
                        this.showTimeSignalOnly();
                    } else {
                        SaveManager.saveGame(this);
                    }
                }



                // 12/14就寝前イベント完了時 -> 時間を12/15午前へ進めて時報を表示
                if (data && data.from1214Event) {
                    this.advanceTime();
                    return;
                }

                // 1221wildhuntイベント復帰時 -> マップ画面のワンクリック猶予を挟まず即座に突破戦へ突入！
                if (data && data.from1221WildhuntEvent) {
                    this.start1221Breakthrough();
                    return;
                }

                // 12/21イベント完了時 -> 周回イベント(event_resp)の連続起動
                if (data && data.from1221Event) {

                    const respData = this.cache.json.get('event_resp');
                    if (respData) {
                        this.scene.pause();
                        this.scene.launch('EventScene', {
                            events: respData,
                            returnScene: 'AdventureScene',
                            fromRespEvent: true
                        });
                        return;
                    }
                }

                // 周回イベント(event_resp)完了時 -> 周回リセット実行と12月1日東京駅リスタート
                if (data && data.fromRespEvent) {
                    const gs = GlobalState.getInstance();
                    gs.resetForNewLoop();

                    this.party = ['001']; // 紫苑を残してみんなお別れ（初期メンバーのみ）
                    this.currentMonth = 12;
                    this.currentDay = 1;
                    this.timePeriodIndex = 0;
                    this.timeOfDay = this.timePeriods[0];
                    this._dec21MorningApplied = false;
                    this._dec21AfternoonApplied = false;

                    this.globalEnemyLevel = 1;
                    this.globalEnemyCount = 10;
                    this.globalWaveCount = 1;

                    if (this.dateTimeText) {
                        this.dateTimeText.setText(`${this.currentMonth}月${this.currentDay}日 ${this.timeOfDay}`);
                    }

                    this.resetMapForNewLoop();
                    SaveManager.saveGame(this);
                    TransitionManager.fadeIn(this);
                    return;
                }

                // タロット/イベント/戦闘いずれも発動せず → 入力待ち状態なのでセーブ
                if (!advancedTimeThisResume) {
                    // advanceTimeを経由していない復帰（キャンプ・装備・隊列など）
                    SaveManager.saveGame(this);
                }
                // advanceTimeを経由した場合はshowTimeSignal内でセーブ済み
            }

        };

        this.events.on('resume', this._resumeHandler, this);


        // --- UI (1) 上段: 日付枠画像（date.png）と日付テキスト（ヘクスマップすぐ下） ---
        const dateScale = 0.35;
        this.dateBg = this.add.image(width / 2, height - 180, 'bg_date')
            .setScale(dateScale)
            .setDepth(500)
            .setScrollFactor(0);

        this.dateTimeText = this.add.text(width / 2, height - 180, `${this.currentMonth}月${this.currentDay}日 ${this.timeOfDay}`, {
            fontFamily: 'sans-serif',
            fontSize: '22px',
            fontStyle: 'bold',
            color: '#fffaee',
            stroke: '#221100',
            strokeThickness: 4
        }).setOrigin(0.5, 0.5).setDepth(501).setScrollFactor(0);

        // --- UI (2) 中段: 探索ボタン（Btans.png）＆ 休息ボタン（Bkyuu.png） ---
        const tansScale = 0.33;
        this.exploreBtn = this.add.image(width / 2 - 110, height - 105, 'btn_tans')
            .setScale(tansScale)
            .setInteractive({ useHandCursor: true })
            .setDepth(500);
        this.exploreBtn.on('pointerdown', () => {
            this.exploreBtn.setScale(tansScale * 0.92);
            if (this.isWideMap || this.isTransitioningMode) return;
            if (this.check1221NightForcedBreakthrough()) return;
            if (!this.isJumping) this._startExploration();
        });
        this.exploreBtn.on('pointerup', () => this.exploreBtn.setScale(tansScale));
        this.exploreBtn.on('pointerout', () => this.exploreBtn.setScale(tansScale));

        const kyuuScale = 0.33;
        this.restBtn = this.add.image(width / 2 + 110, height - 105, 'btn_kyuu')
            .setScale(kyuuScale)
            .setInteractive({ useHandCursor: true })
            .setDepth(500);
        this.restBtn.on('pointerdown', () => {
            this.restBtn.setScale(kyuuScale * 0.92);
            if (this.isWideMap || this.isTransitioningMode) return;
            if (!this.isJumping) {
                this.inRestMode = true;
                SaveManager.saveGame(this);
                this.scene.pause();
                this.scene.launch('RestScene', { party: this.party, timeOfDay: this.timeOfDay });
            }
        });
        this.restBtn.on('pointerup', () => this.restBtn.setScale(kyuuScale));
        this.restBtn.on('pointerout', () => this.restBtn.setScale(kyuuScale));

        // --- UI (3) 最下段中央: ステータスボタン（Bstat.png） ---
        const statScale = 0.35;
        this.statusBtn = this.add.image(width / 2, height - 30, 'btn_stat')
            .setScale(statScale)
            .setInteractive({ useHandCursor: true })
            .setDepth(500);
        this.statusBtn.on('pointerdown', () => {
            this.statusBtn.setScale(statScale * 0.92);
            if (this.isWideMap || this.isTransitioningMode) return;
            this.scene.pause();
            const currentHex = this.grid[this.playerRow]?.[this.playerCol];
            const bgKey = currentHex ? this.findBgImageFile(currentHex.col, currentHex.row, currentHex.cellData) : 'bg_img_woods.jpg';
            this.scene.launch('CampScene', { party: this.party, bgKey: bgKey, isNight: this.timeOfDay === '夜' });
        });
        this.statusBtn.on('pointerup', () => this.statusBtn.setScale(statScale));
        this.statusBtn.on('pointerout', () => this.statusBtn.setScale(statScale));

        // --- UI (3) 最下段左: 食料パネル（food.png + スプライト数字: 数値のみ） ---
        const panelScale = 0.28;
        this.foodBg = this.add.image(width / 2 - 185, height - 30, 'bg_food')
            .setScale(panelScale)
            .setDepth(500)
            .setScrollFactor(0);

        this.foodText = new SpriteText(this, width / 2 - 150, height - 30, '', {
            tint: 0xfffaee,
            spacing: 36,
            originX: 0.5,
            originY: 0.5
        }).setDepth(501).setScrollFactor(0).setScale(0.40);

        // --- UI (3) 最下段右: SPパネル（soul.png + スプライト数字: 数値のみ） ---
        this.spBg = this.add.image(width / 2 + 185, height - 30, 'bg_soul')
            .setScale(panelScale)
            .setDepth(500)
            .setScrollFactor(0);

        this.spText = new SpriteText(this, width / 2 + 215, height - 30, '', {
            tint: 0xffea77,
            spacing: 36,
            originX: 0.5,
            originY: 0.5
        }).setDepth(501).setScrollFactor(0).setScale(0.40);



        this._updateFoodDisplay();




        // UI: 広域表示ボタン
        this.isWideMap = false;
        const wideBtn = this.add.text(20, 20, '広域表示にする', {
            fontFamily: 'sans-serif', fontSize: '24px', color: '#aaffaa', backgroundColor: '#333333'
        }).setOrigin(0, 0).setInteractive().setPadding(10);
        wideBtn.on('pointerdown', () => {
            if (this.isTransitioningMode) return;
            this.isTransitioningMode = true;
            
            this.isWideMap = !this.isWideMap;
            wideBtn.setText(this.isWideMap ? '通常表示に戻す' : '広域表示にする');
            
            // ── 順序①: UIの即時非表示化 ──
            if (this.isWideMap) {
                this._setUIVisibilityForWideMap(false);
            }

            // ── 最適化: アニメーション中はマップチップ(bgSprite)とテキストを全非表示にする ──
            // outline(六角枠)だけを残すことで毎フレームの重いsetScale処理を省きスマホ負荷を激減
            for (const h of this.hexes) {
                if (h.bgSprite) h.bgSprite.setVisible(false);
                if (h.text) h.text.setVisible(false);
                if (h.witchText) h.witchText.setVisible(false);
                if (h.enemyText) h.enemyText.setVisible(false);
                if (h.affinityText) h.affinityText.setVisible(false);
                if (h.witchSprite) h.witchSprite.setVisible(false);
            }

            // ── 順序②: 地形変化（ズームアウト・カメラ角度の切り替え） ──
            const targetZoom = this.isWideMap ? this.wideZoom : this.normalZoom;
            const targetTilt = this.isWideMap ? 1.0 : 0.65;
            const targetOffsetY = this.isWideMap ? 0 : this.normalOffsetY;
            
            const tweenObj = { 
                tilt: this.mapTiltY, 
                zoom: this.cameras.main.zoom,
                offsetY: this.cameras.main.followOffset.y
            };
            
            this.tweens.add({
                targets: tweenObj,
                tilt: targetTilt,
                zoom: targetZoom,
                offsetY: targetOffsetY,
                duration: 400,
                ease: 'Cubic.easeInOut',
                onUpdate: () => {
                    // カメラ・tilt・Y位置・outline(枠)のみ更新。bgSpriteのsetScaleは省略して軽量化
                    this.cameras.main.setZoom(tweenObj.zoom);
                    this.cameras.main.setFollowOffset(0, tweenObj.offsetY);
                    this.mapTiltY = tweenObj.tilt;

                    for (const h of this.hexes) {
                        h.py = h.row * this.hexVertSpacing * this.mapTiltY;
                        h.container.setY(h.py);
                        if (h.outline) h.outline.scaleY = this.mapTiltY;
                        // bgSpriteは非表示中なのでsetScaleをスキップ（軽量化）
                    }
                    
                    const currentHex = this.grid[this.playerRow][this.playerCol];
                    if (currentHex) this.player.setY(currentHex.py - this.CHAR_OFFSET_Y);
                },
                onComplete: () => {
                    // アニメーション完了後にbgSpriteのスケールをまとめて1回だけ更新して再表示
                    for (const h of this.hexes) {
                        if (h.bgSprite && h.bgSprite.width > 0) {
                            h.bgSprite.setScale(
                                this.hexWidth / h.bgSprite.width,
                                (this.hexWidth / h.bgSprite.width) * this.mapTiltY
                            );
                        }
                        if (h.bgSprite) h.bgSprite.setVisible(true);
                    }

                    this.isTransitioningMode = false;
                    if (!this.isWideMap) {
                        this._setUIVisibilityForWideMap(true);
                    }
                    // updateVisibility()でテキスト・敵表示などを正しい状態に反映
                    this.updateVisibility();
                }
            });
        });


        this.uiContainer.add([
            wideBtn,
            this.dateBg,
            this.dateTimeText,
            this.exploreBtn,
            this.restBtn,
            this.statusBtn,
            this.foodBg,
            this.foodText,
            this.spBg,
            this.spText,
        ]);



        // ── 突破テストボタン (時間経過無しでいつでも突破モードへ直接チャレンジ) ──
        const breakTestBtn = this.add.text(width - 20, 100, '⚔️ 突破テスト', {

            fontFamily: 'sans-serif', fontSize: '15px', color: '#00ffff', fontStyle: 'bold',
            backgroundColor: '#000000cc', padding: { x: 12, y: 8 }
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(2000).setInteractive({ useHandCursor: true });

        breakTestBtn.on('pointerdown', () => {
            TransitionManager.transitionTo(this, 'BattleScene', {
                rule: 2,
                isTest: true,
                party: this.party || ['001', '002', '003', '004', '005'],
                enemyCount: 50,
                enemyLevel: 1,
                spawnInterval: 1.0,
                breakthroughTarget: 42195,
                returnScene: 'AdventureScene'
            });
        });


        this.uiContainer.add([breakTestBtn]);

        // ── DPS計測ボタン (サンドバッグ3匹と戦闘) ──
        const dpsTestBtn = this.add.text(width - 20, 145, '🎯 DPS計測', {
            fontFamily: 'sans-serif', fontSize: '15px', color: '#ffcc00', fontStyle: 'bold',
            backgroundColor: '#000000cc', padding: { x: 12, y: 8 }
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(2000).setInteractive({ useHandCursor: true });

        dpsTestBtn.on('pointerdown', () => {
            TransitionManager.transitionTo(this, 'BattleScene', {
                rule: 3, // DPS計測モード
                isDpsTest: true,
                party: this.party || ['001', '002', '003', '004', '005'],
                returnScene: 'AdventureScene'
            });
        });

        this.uiContainer.add([dpsTestBtn]);
    }




    findImageFile(col, row, cellData) {
        const colLetter = String.fromCharCode(97 + col);
        const rowNum = row + 1;
        
        const regexSpecific = new RegExp(`^m\\(${colLetter},${rowNum}\\)(r)?\\.(jpg|png)$`, 'i');
        const regexGeneric = new RegExp(`^m\\(${cellData.name}\\)(r)?\\.(jpg|png)$`, 'i');
        
        let foundSpecific = null;
        let foundGeneric = null;

        for (const file of MapFileList) {
            if (regexSpecific.test(file)) foundSpecific = file;
            if (regexGeneric.test(file)) foundGeneric = file;
        }

        if (foundSpecific) return `map_img_${foundSpecific}`;
        if (cellData.name === '水域') {
            return (this.timeOfDay === '夜') ? 'map_img_sea_night.png' : 'map_img_sea_day.png';
        }
        if (cellData.name === '密林') {
            return 'map_img_woods.jpg';
        }
        if (foundGeneric) return `map_img_${foundGeneric}`;
        
        return 'map_img_woods.jpg';
    }

    // 背景用: カット前の元画像キーを返す（bg_img_ プレフィックス）
    findBgImageFile(col, row, cellData) {
        if (!cellData) return 'map_img_woods.jpg';
        const colLetter = String.fromCharCode(97 + col);
        const rowNum = row + 1;
        
        const regexSpecific = new RegExp(`^m\\(${colLetter},${rowNum}\\)(r)?\\.(jpg|png)$`, 'i');
        const cleanName = (cellData.name || '').replace(/\n/g, '');
        const regexGeneric = new RegExp(`^m\\(${cleanName}\\)(r)?\\.(jpg|png)$`, 'i');
        
        let foundSpecific = null;
        let foundGeneric = null;

        for (const file of MapFileList) {
            if (regexSpecific.test(file)) foundSpecific = file;
            if (cleanName && regexGeneric.test(file)) foundGeneric = file;
        }

        if (foundSpecific && this.textures.exists(`bg_img_${foundSpecific}`)) {
            return `bg_img_${foundSpecific}`;
        }
        if (foundGeneric && this.textures.exists(`bg_img_${foundGeneric}`)) {
            return `bg_img_${foundGeneric}`;
        }
        if (cellData.name === '水域') {
            return (this.timeOfDay === '夜') ? 'map_img_sea_night.png' : 'map_img_sea_day.png';
        }
        if (cellData.name === '密林') {
            return this.textures.exists('bg_img_m(woods).jpg') ? 'bg_img_m(woods).jpg' : 'map_img_woods.jpg';
        }
        
        if (foundSpecific) return `map_img_${foundSpecific}`;
        if (foundGeneric) return `map_img_${foundGeneric}`;
        
        return 'map_img_woods.jpg';
    }


    getHexDistance(col1, row1, col2, row2) {
        // Odd-r からキューブ座標への変換
        const q1 = col1 - (row1 - (row1 & 1)) / 2;
        const r1 = row1;
        const q2 = col2 - (row2 - (row2 & 1)) / 2;
        const r2 = row2;
        
        return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
    }

    updateVisibility() {
        // 全セルの隣接状態をリセット
        for (const h of this.hexes) {
            h.cellData.isAdjacent = false;
        }

        // 隣接判定
        const isOdd = (this.playerRow % 2 !== 0);
        const neighbors = [
            [0, -1], [0, 1], [-1, 0], [1, 0],
            isOdd ? [1, -1] : [-1, -1],
            isOdd ? [1, 1] : [-1, 1]
        ];

        for (const n of neighbors) {
            const nc = this.playerCol + n[0];
            const nr = this.playerRow + n[1];
            if (nr >= 0 && nr < this.grid.length && nc >= 0 && nc < this.grid[nr].length) {
                const adjHex = this.grid[nr][nc];
                adjHex.cellData.isAdjacent = true;
                
                // 水域・密林なら、隣接したことで永久にrevealedになる
                if (adjHex.cellData.name === '水域' || adjHex.cellData.name === '密林') {
                    adjHex.cellData.revealed = 1;
                }
            }
        }

        // 表示の更新
        const partyAffinity = this.calcPartyElementAdvantage();

        for (const h of this.hexes) {
            const cell = h.cellData;
            
            const dist = this.getHexDistance(this.playerCol, this.playerRow, h.col, h.row);
            // 通常表示かつ2ヘクスより先は非表示にしてスキップ
            if (!this.isWideMap && dist > 2) {
                h.container.setVisible(false);
                continue;
            }
            
            const isVisibleToPlayer = (cell.visited === 1 || cell.revealed === 1 || cell.isAdjacent);
            let imgKey = 'map_img_m(unexplored).jpg';
            let showText = false;

            if (cell.visited === 1) {
                imgKey = this.findImageFile(h.col, h.row, cell);
                showText = !(cell.name === '水域' || cell.name === '密林' || cell.name.startsWith('x'));
            } else if (cell.revealed === 1) {
                imgKey = this.findImageFile(h.col, h.row, cell);
                showText = false;
            } else if (cell.isAdjacent) {
                imgKey = 'map_img_m(adjacent).jpg';
                showText = false;
            } else {
                imgKey = 'map_img_m(unexplored).jpg';
            }

            // 未踏破は25%の不透明度、それ以外は100%
            const targetAlpha = !isVisibleToPlayer ? 0.25 : 1;
            if (h.container.alpha !== targetAlpha) {
                h.container.setAlpha(targetAlpha);
            }

            h.container.setVisible(true);

            // テクスチャが変更された場合のみ再適用（爆速化）
            if (h.currentImgKey !== imgKey) {
                h.currentImgKey = imgKey;
                if (this.textures.exists(imgKey)) {
                    h.bgSprite.setTexture(imgKey);
                    const tw = h.bgSprite.width;
                    if (tw > 0) {
                        h.bgSprite.setScale(this.hexWidth / tw, (this.hexWidth / tw) * this.mapTiltY);
                    }
                }
            } else {
                const tw = h.bgSprite.width;
                if (tw > 0) {
                    h.bgSprite.setScale(this.hexWidth / tw, (this.hexWidth / tw) * this.mapTiltY);
                }
            }

            if (h.outline) {
                h.outline.scaleY = this.mapTiltY;
            }


            // 広域表示時は軽量化のため敵LV・有利不利テキスト等は非表示にし、踏破済みの固有地名(showText)と魔女アイコンのみ表示
            if (this.isWideMap) {
                if (h.text && h.text.visible !== showText) h.text.setVisible(showText);
                if (h.witchText && h.witchText.visible) h.witchText.setVisible(false);
                if (h.enemyText && h.enemyText.visible) h.enemyText.setVisible(false);
                if (h.affinityText && h.affinityText.visible) h.affinityText.setVisible(false);
                if (cell.witchLevel > 0 && isVisibleToPlayer) {
                    if (!h.witchSprite.visible) h.witchSprite.setVisible(true);
                } else {
                    if (h.witchSprite && h.witchSprite.visible) h.witchSprite.setVisible(false);
                }
            } else {
                if (h.text && h.text.visible !== showText) h.text.setVisible(showText);

                const attrColors = {
                    1: '#ff4444', 2: '#aa44ff', 3: '#44ff44', 4: '#ffff44', 5: '#44aaff'
                };
                const textColor = attrColors[cell.enemyAttr] || '#ffaa44';

                // 魔女の表示更新（視界内または踏破済みのみ表示）
                if (cell.witchLevel > 0 && isVisibleToPlayer) {
                    if (!h.witchSprite.visible) h.witchSprite.setVisible(true);
                    const wText = `Witch LV.${cell.witchLevel}`;
                    if (h.witchText.text !== wText) h.witchText.setText(wText);
                    if (h.witchText.color !== textColor) h.witchText.setColor(textColor);
                    if (!h.witchText.visible) h.witchText.setVisible(true); 
                } else {
                    if (h.witchSprite && h.witchSprite.visible) h.witchSprite.setVisible(false);
                    if (h.witchText && h.witchText.visible) h.witchText.setVisible(false);
                }
                
                // 敵の表示更新（魔女がいる場合はWasp LVを非表示にする・視界内のみ表示）
                if (cell.enemyLevel > 0 && !(cell.witchLevel > 0) && isVisibleToPlayer) {
                    const eText = `Wasp LV.${cell.enemyLevel}`;
                    if (h.enemyText.text !== eText) h.enemyText.setText(eText);
                    if (h.enemyText.color !== textColor) h.enemyText.setColor(textColor);
                    if (!h.enemyText.visible) h.enemyText.setVisible(true);
                } else {
                    if (h.enemyText && h.enemyText.visible) h.enemyText.setVisible(false);
                }


                // 進行可能な属性ヘクスに対する「有利」「不利」表示
                if (h.affinityText) {
                    const partyAffinity = this.calcPartyElementAdvantage();
                    const enemyAttr = cell.enemyAttr;
                    if (cell.isAdjacent && (cell.enemyLevel > 0 || cell.witchLevel > 0) && enemyAttr) {
                        if (partyAffinity.strongAttrs.includes(enemyAttr)) {
                            h.affinityText.setText('有利').setColor('#55ff55').setVisible(true);
                        } else if (partyAffinity.weakAttrs.includes(enemyAttr)) {
                            h.affinityText.setText('不利').setColor('#ff4444').setVisible(true);
                        } else {
                            h.affinityText.setVisible(false);
                        }
                    } else {
                        h.affinityText.setVisible(false);
                    }
                }
            }

        }

    }

    /** 現在の編成メンバーの属性防御力を平均し、最高・最低の有利・不利属性番号を割り出す */
    calcPartyElementAdvantage() {
        const gs = GlobalState.getInstance();
        const party = this.party || ['001'];
        if (party.length === 0) return { strongAttrs: [], weakAttrs: [] };

        const charElementBase = {
            '001': { strong: 'green', weak: 'red' },
            '002': { strong: 'red', weak: 'yellow' },
            '003': { strong: 'purple', weak: 'blue' },
            '004': { strong: 'blue', weak: 'green' },
            '005': { strong: 'yellow', weak: 'purple' }
        };

        const attrToNum = { 'red': 1, 'purple': 2, 'green': 3, 'yellow': 4, 'blue': 5 };
        const elements = ['red', 'purple', 'green', 'yellow', 'blue'];

        // 各属性ごとのパーティ平均被ダメージ％を算出 (数値が小さいほど高防御＝有利、大きいほど低防御＝不利)
        const avgDef = {};
        elements.forEach(elem => {
            let sum = 0;
            party.forEach(charId => {
                const stats = gs.calcStats(charId, party);
                const elemMods = (stats && stats.elemMods) ? stats.elemMods : {};
                const rel = charElementBase[charId];
                let base = 100;
                if (rel && rel.strong === elem) base = 75;
                if (rel && rel.weak === elem) base = 125;
                const mod = elemMods[elem] || 0;
                const defVal = Math.max(1, base - mod);
                sum += defVal;
            });
            avgDef[elem] = sum / party.length;
        });

        let minVal = Infinity;
        let maxVal = -Infinity;
        elements.forEach(elem => {
            if (avgDef[elem] < minVal) minVal = avgDef[elem];
            if (avgDef[elem] > maxVal) maxVal = avgDef[elem];
        });

        const strongAttrs = [];
        const weakAttrs = [];
        elements.forEach(elem => {
            if (avgDef[elem] === minVal) strongAttrs.push(attrToNum[elem]);
            if (avgDef[elem] === maxVal && minVal !== maxVal) weakAttrs.push(attrToNum[elem]);
        });

        return { strongAttrs, weakAttrs };
    }


    _setUIVisibilityForWideMap(isVisible) {
        if (this.dateBg) this.dateBg.setVisible(isVisible);
        if (this.dateTimeText) this.dateTimeText.setVisible(isVisible);

        if (this.exploreBtn) this.exploreBtn.setVisible(isVisible);
        if (this.restBtn) this.restBtn.setVisible(isVisible);
        if (this.statusBtn) this.statusBtn.setVisible(isVisible);
        if (this.foodBg) this.foodBg.setVisible(isVisible);
        if (this.foodText) this.foodText.setVisible(isVisible);
        if (this.spBg) this.spBg.setVisible(isVisible);
        if (this.spText) this.spText.setVisible(isVisible);

        if (this.tickerBg) this.tickerBg.setVisible(isVisible);
        if (this.tickerText) this.tickerText.setVisible(isVisible);
        if (this.breakTestBtn) this.breakTestBtn.setVisible(isVisible);
        if (this.dpsTestBtn) this.dpsTestBtn.setVisible(isVisible);
    }



    moveToHex(hex, animate = true) {
        if (animate && this.check1221NightForcedBreakthrough()) {
            return;
        }
        const isUnexplored = (hex.cellData.visited !== 1 && hex.cellData.name !== '水域' && hex.cellData.name !== '密林');
        
        hex.cellData.visited = 1;

        
        // 背景のクロスフェード
        this.updateBackground(hex, animate);
        
        const dx = hex.px - this.player.x;
        const dy = hex.py - (this.player.y + 25); // 現在の着地位置(オフセット込み)との差分

        this.playerCol = hex.col;
        this.playerRow = hex.row;

        this.resetIdleTimer();

        // 向きの変更 (0:正面/下, 1:左向き, 2:右向き, 3:背中/上)
        let dirFrame = 0;
        if (dx > 10) dirFrame = 2;       // 右へ移動 -> コマ2 (右向き)
        else if (dx < -10) dirFrame = 1; // 左へ移動 -> コマ1 (左向き)
        else if (dy < -10) dirFrame = 3; // 上へ移動 -> コマ3 (背中/上向き)
        else if (dy > 10) dirFrame = 0;  // 下へ移動 -> コマ0 (正面/下向き)
        
        // playHappyActionで反転しているかもしれないのでスケールをリセット
        this.player.setScale(this.PSCALE_X, this.PSCALE_Y);

        if (this.player.frame.name !== 4) {
            this.player.setFrame(dirFrame);
        }

        if (animate) {
            this.isJumping = true;
            if (this.breatheTween) this.breatheTween.pause();
            
            this.tweens.add({
                targets: this.player,
                x: hex.px,
                duration: 400,
                ease: 'Sine.easeInOut'
            });

            this.tweens.add({
                targets: this.player,
                y: hex.py - this.CHAR_OFFSET_Y,
                duration: 400,
                ease: 'Sine.easeInOut',
                onComplete: () => {
                    this.player.setFrame(0); // 移動完了で正面に戻す
                    if (this.breatheTween) this.breatheTween.resume();
                    
                    this.updateVisibility();
                    
                    if (isUnexplored && animate) {
                        // 未踏破への移動なら1秒待ってイベントシーンへ
                        this.time.delayedCall(1000, () => {
                            this._startEventSequence(hex);
                        });
                    } else if (!isUnexplored && hex.cellData.enemyLevel > 0 && animate) {
                        // 踏破済みでも敵が（再）出現しているならイベントシーンへ
                        this.time.delayedCall(1000, () => {
                            this._startEventSequence(hex);
                        });
                    } else {
                        // 踏破済み＆敵なし → 何も起こさず即移動完了（時間も進まない）
                        this.isJumping = false;
                        SaveManager.saveGame(this);
                    }
                }
            });

            
            // 可愛いジャンプアニメーション（Z軸ジャンプと回転・スケール）
            const baseScaleX = this.PSCALE_X;
            const baseScaleY = this.PSCALE_Y;
            const jumpObj = { z: 0, angle: 0, scaleMult: 1.0 };
            this.tweens.add({
                targets: jumpObj,
                z: -30,
                angle: (dirFrame === 2) ? 15 : (dirFrame === 1) ? -15 : 0, // 右=右傾き, 左=左傾き

                scaleMult: 1.08, // 少し跳ねて膨らむ(1.0 -> 1.08)
                yoyo: true,
                duration: 200,
                ease: 'Sine.easeOut',
                onUpdate: () => {
                    this.player.displayOriginY = this.player.height / 2 - jumpObj.z / this.player.scaleY;
                    this.player.setAngle(jumpObj.angle);
                    this.player.setScale(baseScaleX * jumpObj.scaleMult, baseScaleY * jumpObj.scaleMult);
                },
                onComplete: () => {
                    this.player.displayOriginY = this.player.height / 2;
                    this.player.setAngle(0);
                    this.player.setScale(baseScaleX, baseScaleY);
                }
            });


        } else {
                this.player.setPosition(hex.px, hex.py - this.CHAR_OFFSET_Y);
                this.player.setFrame(0);
                this.updateVisibility();
            }
    }

    _startEventSequence(hex) {
        // イベント配列を構築
        const events = [];
        
        // 1. 背景表示（ヘクスの種類に対応したbg_img_キーを使う）
        const bgKey = this.findBgImageFile(hex.col, hex.row, hex.cellData);
        events.push({ cmd: 'bg', key: bgKey });

        // 2. 地名表示 (x1などは表示しない)
        let displayName = hex.cellData.name;
        if (displayName.startsWith('x')) {
            displayName = '';
        }
        events.push({ cmd: 'location', name: displayName });

        // 3. 1人目登場 & トーク
        const char1 = this.party[Math.floor(Math.random() * this.party.length)];
        events.push({ cmd: 'chara', key: `portrait_${char1}`, pos: 'right' });
        
        // トーク内容の取得（地名固有セリフ ➔ 汎用0~25/x1~x7セリフ）
        const talkData1 = this.cache.json.get(`talk_${char1}`);
        let locationText = '……。';
        if (talkData1) {
            // "現在の地名"のセリフを探す
            const lines = talkData1[hex.cellData?.name] || talkData1[displayName];
            if (lines && lines.length > 0) {
                locationText = lines[Math.floor(Math.random() * lines.length)];
            } else {
                // 汎用セリフ ("0"~"25" または "x1"~"x7") からランダム選択
                const randomKeys = Object.keys(talkData1).filter(k => /^[0-9]+$/.test(k) || k.startsWith('x'));
                if (randomKeys.length > 0) {
                    const rk = randomKeys[Math.floor(Math.random() * randomKeys.length)];
                    const rlines = talkData1[rk];
                    if (rlines && rlines.length > 0) {
                        locationText = rlines[Math.floor(Math.random() * rlines.length)];
                    }
                }
            }
        }

        
        // トーク名（データから取得して表示用の名前に整形する）
        const charData = GlobalState.getInstance().characters[char1];
        let char1Name = charData ? charData.name.replace(/^[0-9]+/, '').replace(/data$/, '') : 'キャラ';
        events.push({ cmd: 'text', name: char1Name, body: locationText });

        // 4. 敵がいる場合
        if (hex.cellData.enemyLevel > 0) {
            events.push({ cmd: 'clearText' });
            events.push({ cmd: 'call', func: 'showFog' }); // イベントシーン側でもやを表示
            events.push({ cmd: 'call', func: 'playBattleBgm' }); // BGMを戦闘用フェードイン

            // 1人目の戦闘突入トーク
            let battleText1 = '……来たね……！';
            if (talkData1 && talkData1['戦闘突入']) {
                const bLines = talkData1['戦闘突入'];
                battleText1 = bLines[Math.floor(Math.random() * bLines.length)];
            }

            if (this.party.length === 1) {
                events.push({ cmd: 'text', name: char1Name, body: battleText1 });
            } else {
                // 2人目登場
                const availableChar2 = this.party.filter(c => c !== char1);
                const char2 = availableChar2.length > 0 ? availableChar2[Math.floor(Math.random() * availableChar2.length)] : char1;
                events.push({ cmd: 'chara', key: `portrait_${char2}_b`, pos: 'left' });

                
                const talkData2 = this.cache.json.get(`talk_${char2}`);
                let battleText2 = '……！';
                if (talkData2 && talkData2['戦闘突入']) {
                    const bLines = talkData2['戦闘突入'];
                    battleText2 = bLines[Math.floor(Math.random() * bLines.length)];
                }
                const charData2 = GlobalState.getInstance().characters[char2];
                let char2Name = charData2 ? charData2.name.replace(/^[0-9]+/, '').replace(/data$/, '') : 'キャラ2';
                
                events.push({ cmd: 'text', name: char2Name, body: battleText2 });

                // 1人目の戦闘突入反応トーク
                let responseText1 = '……片付ける！';
                if (talkData1 && talkData1['戦闘突入反応']) {
                    const rLines = talkData1['戦闘突入反応'];
                    responseText1 = rLines[Math.floor(Math.random() * rLines.length)];
                }
                events.push({ cmd: 'text', name: char1Name, body: responseText1 });
            }
        }

        events.push({ cmd: 'end' });

        // カメラフラッシュ（明転）してから遷移
        const isNightMove = (this.timeOfDay === '夜');
        const moveEnemyLevel = hex.cellData.enemyLevel + (isNightMove ? 3 : 0);
        this.cameras.main.flash(1000, 255, 255, 255);
        this.time.delayedCall(1000, () => {
            this.scene.pause();
            this.scene.launch('EventScene', {
                events: events,
                returnScene: 'AdventureScene',
                enemyLevel: moveEnemyLevel,
                enemyAttr: hex.cellData.enemyAttr,
                majoLevel: hex.cellData.witchLevel || 0,
                isNightBattle: isNightMove
            });
            // 遷移後にジャンプロックを解除しておく（戻ってきたときのため）
            this.isJumping = false;
        });
    }

    onHexTap(hex) {
        if (this.isWideMap || this.isTransitioningMode || this.isJumping || this.isHappyJumping) return;

        
        // 現在地をタップした場合は喜ぶアクション
        if (hex.col === this.playerCol && hex.row === this.playerRow) {
            this.playHappyAction();
            return;
        }

        // チュートリアル午後(探索限定モード)・夜(休息限定モード)の場合、移動は不可
        if (this.isExploreOnlyTutorial || this.isRestOnlyTutorial) {
            return;
        }

        
        // 隣接しているヘクスのみ移動可能
        if (!hex.cellData.isAdjacent) return;

        
        // 水域・密林には移動不可
        if (hex.cellData.name === '水域' || hex.cellData.name === '密林') return;
        this._preBattleSnapshot = this.createSnapshot();
        this.moveToHex(hex, true);
    }

    createSnapshot() {
        return {
            playerCol: this.playerCol,
            playerRow: this.playerRow,
            party: JSON.parse(JSON.stringify(this.party)),
            timePeriodIndex: this.timePeriodIndex,
            currentDay: this.currentDay,
            timeOfDay: this.timeOfDay,
            globalEnemyLevel: this.globalEnemyLevel,
            globalEnemyCount: this.globalEnemyCount,
            globalWaveCount: this.globalWaveCount,
            previousPartySize: this.previousPartySize,
            gridData: this.grid.map(row => row.map(hex => ({
                isExplored: hex.cellData.isExplored,
                hasBase: hex.cellData.hasBase,
                enemyLevel: hex.cellData.enemyLevel,
                witchLevel: hex.cellData.witchLevel,
                isEvent: hex.cellData.isEvent,
                isSubBoss: hex.cellData.isSubBoss,
                enemyAttr: hex.cellData.enemyAttr
            }))),
            globalStateSnapshot: GlobalState.getInstance().createSnapshot()
        };
    }

    restoreSnapshot(data) {
        if (!data) return;
        this.playerCol = data.playerCol;
        this.playerRow = data.playerRow;
        this.party = JSON.parse(JSON.stringify(data.party));
        this.timePeriodIndex = data.timePeriodIndex;
        this.currentDay = data.currentDay;
        this.timeOfDay = data.timeOfDay;
        this.globalEnemyLevel = data.globalEnemyLevel;
        this.globalEnemyCount = data.globalEnemyCount;
        this.globalWaveCount = data.globalWaveCount;
        this.previousPartySize = data.previousPartySize;
        
        for (let r = 0; r < this.grid.length; r++) {
            for (let c = 0; c < this.grid[r].length; c++) {
                const src = data.gridData[r][c];
                const dst = this.grid[r][c].cellData;
                dst.isExplored = src.isExplored;
                dst.hasBase = src.hasBase;
                dst.enemyLevel = src.enemyLevel;
                dst.witchLevel = src.witchLevel;
                dst.isEvent = src.isEvent;
                dst.isSubBoss = src.isSubBoss;
                dst.enemyAttr = src.enemyAttr;
            }
        }
        
        GlobalState.getInstance().restoreSnapshot(data.globalStateSnapshot);
        
        // UI等の更新
        this.updateVisibility();
        this._updateFoodDisplay();
        this.dateTimeText.setText(`${this.currentMonth}月${this.currentDay}日 ${this.timeOfDay}`);
        
        // プレイヤーのスプライト位置を戻す
        const hex = this.grid[this.playerRow][this.playerCol];
        this.player.setPosition(hex.px, hex.py - this.CHAR_OFFSET_Y);
    }

    advanceTime() {
        const oldDay = this.currentDay;
        const oldTimePeriodIndex = this.timePeriodIndex;
        const gsInst = GlobalState.getInstance();

        // 12/14の夜の行動(戦闘・探索・休息など)が終了した瞬間：
        // 12/15朝の時報が表示される前に12/14就寝前イベントを発動させる
        if (this.currentMonth === 12 && oldDay === 14 && oldTimePeriodIndex === 2 && !gsInst.event1214Played) {
            gsInst.event1214Played = true;

            // BGM全停止
            this.sound.stopAll();

            const newGem = RelicGenerator.generateGem(1);
            if (!gsInst.inventory) gsInst.inventory = { relics: [], gems: [] };
            gsInst.inventory.gems.push(newGem);

            const eventData = this.cache.json.get('event_1214');
            this.scene.pause();
            this.scene.launch('EventScene', {
                events: eventData,
                returnScene: 'AdventureScene',
                from1214Event: true,
                explorationDrops: [newGem]
            });
            return;
        }

        this.timePeriodIndex++;
        if (this.timePeriodIndex >= this.timePeriods.length) {
            this.timePeriodIndex = 0;
            this.currentDay++;
        }
        this.timeOfDay = this.timePeriods[this.timePeriodIndex];


        // GlobalState と即座に同期
        gsInst.currentMonth = this.currentMonth;
        gsInst.currentDay = this.currentDay;
        gsInst.timePeriodIndex = this.timePeriodIndex;

        if (this.dateTimeText) {
            this.dateTimeText.setText(`${this.currentMonth}月${this.currentDay}日 ${this.timeOfDay}`);
        }


        // 12月21日の難易度補正（午前・午後）
        if (this.currentDay === 21) {
            if (this.timePeriodIndex === 0 && !this._dec21MorningApplied) {
                this._dec21MorningApplied = true;
                this.globalEnemyLevel += 1;
                this.globalEnemyCount += 50;
                gsInst.debugEnemySizeMultiplier = 1.2;
            } else if (this.timePeriodIndex === 1 && !this._dec21AfternoonApplied) {
                this._dec21AfternoonApplied = true;
                this.globalEnemyLevel += 1;
                this.globalEnemyCount += 50;
                gsInst.debugEnemySizeMultiplier = 1.2;
            }
        }




        // 敵の量コントロール
        // 時間が進む -> 数量が1～3増える
        this.globalEnemyCount += Math.floor(Math.random() * 3) + 1;

        
        // 毎日夜になるたびに
        if (this.timePeriodIndex === 2) {
            // 7日ごとの夜に敵および魔女のレベル+1
            if (this.currentDay > 0 && this.currentDay % 7 === 0) {
                this.globalEnemyLevel += 1;
            
                // マップ上の残存する敵・魔女のレベルも更新する
                for (const row of this.grid) {
                    for (const hex of row) {
                        if (hex && hex.cellData) {
                            if (hex.cellData.enemyLevel > 0) hex.cellData.enemyLevel += 1;
                            if (hex.cellData.witchLevel > 0) hex.cellData.witchLevel += 1;
                        }
                    }
                }
            }
            this.updateVisibility();
        }

        // 前回より仲間が増えているかチェック
        if (this.party.length > this.previousPartySize) {
            // 仲間加入時: 現在値の20% + 10
            this.globalEnemyCount = Math.floor(this.globalEnemyCount * 1.20) + 10;
            this.globalEnemyLevel += 1;

            
            // マップ上の残存する敵・魔女のレベルも更新する
            for (const row of this.grid) {
                for (const hex of row) {
                    if (hex && hex.cellData) {
                        if (hex.cellData.enemyLevel > 0) hex.cellData.enemyLevel += 1;
                        if (hex.cellData.witchLevel > 0) hex.cellData.witchLevel += 1;
                    }
                }
            }
            this.updateVisibility();
            
            this.previousPartySize = this.party.length;
        }

        
        // 午前(0)から午後(1)になったタイミングでタロットを引く
        if (this.timePeriodIndex === 1) {
            this._pendingTarot = true;
        }
        
        // 食料減少（5〜40ランダム）
        const foodDrain = Math.floor(Math.random() * 36) + 5;
        const gs = GlobalState.getInstance();
        const wasZero = gs.food <= 0;
        gs.food = Math.max(0, gs.food - foodDrain);
        this._updateFoodDisplay();
        let timeSignalCb = null;
        if (gs.food <= 0 && !wasZero && this.party.length > 0) {
            timeSignalCb = () => {
                const charId1 = this.party[0];
                const charName1 = gs.characters[charId1]?.name || charId1;
                const talkData1 = this.cache.json.get(`talk_${charId1}`);
                const lines1 = talkData1 ? talkData1['食料ゼロ'] : null;
                const body1 = lines1 ? lines1[Math.floor(Math.random() * lines1.length)] : '食べ物がなくなってしまった……';
                
                const events = [
                    { cmd: 'chara', key: `portrait_${charId1}`, pos: 'right' },
                    { cmd: 'text', name: charName1, body: body1 }
                ];

                if (this.party.length > 1) {
                    const charId2 = this.party[1];
                    const charName2 = gs.characters[charId2]?.name || charId2;
                    const talkData2 = this.cache.json.get(`talk_${charId2}`);
                    const lines2 = talkData2 ? talkData2['食料ゼロ反応'] : null;
                    if (lines2) {
                        const body2 = lines2[Math.floor(Math.random() * lines2.length)];
                        events.push({ cmd: 'chara', key: `portrait_${charId2}_b`, pos: 'left' });

                        events.push({ cmd: 'text', name: charName2, body: body2 });
                    }
                }

                this.scene.pause();
                this.scene.launch('EventScene', {
                    events: events,
                    returnScene: 'AdventureScene',
                    isNotification: true
                });
            };
        }

        this.handlePostTimeAdvance(timeSignalCb);
        this.updateNightOverlay();
        
        if (this.dateTimeText) {
            this.dateTimeText.setText(`${this.currentMonth}月${this.currentDay}日 ${this.timeOfDay}`);
        }
    }

    /** 時間経過後の各種イベント・タロットチェックと時報の優先度制御 */
    handlePostTimeAdvance(onComplete = null) {
        // 1. 食料ゼロ等の特別イベントコールバックをキューに追加
        if (typeof onComplete === 'function') {
            this.enqueueEvent({
                type: 'custom',
                action: onComplete
            });
        }

        // 2. スケジュールイベントチェック（12/7, 12/14, 12/21 Wildhuntなど）
        this.checkScheduledEvents();

        // 3. チュートリアルイベントチェック
        this.checkTutorialEvents();

        // 4. タロット引き（午前→午後の切り替えタイミング・未獲得カードが残っている場合のみ）
        const gs = GlobalState.getInstance();
        if (this._pendingTarot) {
            this._pendingTarot = false;
            if (!gs.drawnTarotCards || gs.drawnTarotCards.length < 22) {
                this.enqueueEvent({
                    type: 'tarot',
                    data: { returnScene: 'AdventureScene', party: this.party }
                });
            }
        }

        // イベントやタロットがキューに存在する場合は他を優先して先に実行！
        if (this.eventQueue && this.eventQueue.length > 0) {
            this._pendingTimeSignal = true; // 全イベント消化後に時報を表示するフラグ
            this.processEventQueue();
        } else {
            // 他に何もイベントが無い場合のみ、その場で時報を表示
            this.showTimeSignalOnly();
        }
    }

    /** 時報のみを再生して完了時に保存する処理 */
    showTimeSignalOnly(onDone = null) {
        TimeReporter.show(this, this.currentMonth, this.currentDay, this.timeOfDay, () => {
            SaveManager.saveGame(this);
            if (typeof onDone === 'function') onDone();
        });
    }





    _updateFoodDisplay() {
        const gs = GlobalState.getInstance();
        // 食料の上限制限(最大140)
        gs.food = Math.min(140, Math.max(0, gs.food));
        if (this.foodText) {
            const currentFood = Math.floor(gs.food);
            this.foodText.setText(`${currentFood}`);
            if (this.foodText.setTint) {
                this.foodText.setTint(currentFood <= 0 ? 0xff4444 : 0xfffaee);
            }
        }

        // SPの上限制限(最大9999)
        gs.stockSp = Math.min(9999, Math.max(0, gs.stockSp || 0));
        if (this.spText) {
            const currentSp = Math.floor(gs.stockSp);
            this.spText.setText(`${currentSp}`);
        }
    }



    _startExploration() {
        if (this._isExploring) return;
        this._isExploring = true;
        
        this._preBattleSnapshot = this.createSnapshot();

        // 夜または12月21日の場合は会話イベントを挟んでから戦闘に突入
        if (this.timeOfDay === '夜' || this.currentDay === 21) {

            const currentHex = this.grid[this.playerRow]?.[this.playerCol];
            this._isExploring = false; // 探索状態はリセットしておく
            
            // 周囲のヘクス（自分＋隣接6方向）で一番高い敵レベルを探し、それに +3 する
            let maxLevel = currentHex?.cellData?.enemyLevel || 0;
            const isOdd = (this.playerRow % 2 !== 0);
            const neighbors = [
                [0, -1], [0, 1], [-1, 0], [1, 0],
                isOdd ? [1, -1] : [-1, -1],
                isOdd ? [1, 1] : [-1, 1]
            ];
            for (const n of neighbors) {
                const nc = this.playerCol + n[0];
                const nr = this.playerRow + n[1];
                if (nr >= 0 && nr < this.grid.length && nc >= 0 && nc < this.grid[nr].length) {
                    const adjHex = this.grid[nr][nc];
                    const lvl = adjHex?.cellData?.enemyLevel || 0;
                    if (lvl > maxLevel) {
                        maxLevel = lvl;
                    }
                }
            }
            let eLvl = maxLevel + 3;

            const bgKey = this.findBgImageFile(
                currentHex ? currentHex.col : 0, 
                currentHex ? currentHex.row : 0, 
                currentHex ? currentHex.cellData : null
            );
            const events = [];

            // 1. 現在いるヘクスの背景 + 70%ブラックオーバーレイ
            events.push({ cmd: 'bg', key: bgKey, darkOverlay: 0.7 });

            // 敵遭遇演出用BGM / もや演出
            events.push({ cmd: 'call', func: 'showFog' });
            events.push({ cmd: 'call', func: 'playBattleBgm' });

            // 2. メンバーの選出と会話
            const char1 = this.party[Math.floor(Math.random() * this.party.length)];
            events.push({ cmd: 'chara', key: `portrait_${char1}`, pos: 'right' });

            const talkData1 = this.cache.json.get(`talk_${char1}`);
            const charData1 = GlobalState.getInstance().characters[char1];
            let char1Name = charData1 ? charData1.name.replace(/^[0-9]+/, '').replace(/data$/, '') : 'キャラ';

            // 「夜間の探索」セリフ取得
            let nightExploreText = '……夜の探索は気を引き締めないと……';
            if (talkData1 && talkData1['夜間の探索'] && talkData1['夜間の探索'].length > 0) {
                const lines = talkData1['夜間の探索'];
                nightExploreText = lines[Math.floor(Math.random() * lines.length)];
            }
            events.push({ cmd: 'text', name: char1Name, body: nightExploreText });

            if (this.party.length === 1) {
                // メンバーが1人の場合、夜間の探索セリフ -> 戦闘突入セリフをつぶやく
                let battleText1 = '……来たね……！';
                if (talkData1 && talkData1['戦闘突入'] && talkData1['戦闘突入'].length > 0) {
                    const bLines = talkData1['戦闘突入'];
                    battleText1 = bLines[Math.floor(Math.random() * bLines.length)];
                }
                events.push({ cmd: 'text', name: char1Name, body: battleText1 });
            } else {
                // メンバーが2人以上の場合
                const availableChar2 = this.party.filter(c => c !== char1);
                const char2 = availableChar2.length > 0 ? availableChar2[Math.floor(Math.random() * availableChar2.length)] : char1;
                events.push({ cmd: 'chara', key: `portrait_${char2}_b`, pos: 'left' });


                const talkData2 = this.cache.json.get(`talk_${char2}`);
                const charData2 = GlobalState.getInstance().characters[char2];
                let char2Name = charData2 ? charData2.name.replace(/^[0-9]+/, '').replace(/data$/, '') : 'キャラ2';

                let battleText2 = '……！';
                if (talkData2 && talkData2['戦闘突入'] && talkData2['戦闘突入'].length > 0) {
                    const bLines = talkData2['戦闘突入'];
                    battleText2 = bLines[Math.floor(Math.random() * bLines.length)];
                }
                events.push({ cmd: 'text', name: char2Name, body: battleText2 });

                // はじめの一人が戦闘突入反応で返答する
                let responseText1 = '……片付ける！';
                if (talkData1 && talkData1['戦闘突入反応'] && talkData1['戦闘突入反応'].length > 0) {
                    const rLines = talkData1['戦闘突入反応'];
                    responseText1 = rLines[Math.floor(Math.random() * rLines.length)];
                }
                events.push({ cmd: 'text', name: char1Name, body: responseText1 });
            }

            events.push({ cmd: 'end' });

            // カメラフラッシュ（明転）してからEventSceneを起動
            this.cameras.main.flash(1000, 255, 255, 255);
            this.time.delayedCall(1000, () => {
                this.scene.pause();
                this.scene.launch('EventScene', {
                    events: events,
                    returnScene: 'AdventureScene',
                    enemyLevel: eLvl,
                    enemyAttr: currentHex ? (currentHex.cellData ? currentHex.cellData.enemyAttr : 1) : 1,
                    majoLevel: 0,
                    isNightExploration: true,
                    isNightBattle: true
                });
            });
            return;
        }

        if (this._exploreContainer) {
            this._exploreContainer.destroy();
        }

        if (this.player) this.player.setVisible(false);

        const { width, height } = this.scale;
        this._exploreContainer = this.add.container(0, 0).setDepth(2000);
        if (this.cameras && this.cameras.main) {
            this.cameras.main.ignore(this._exploreContainer);
        }

        // クリック防止用の全画面ブロッカー
        const blocker = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.3).setInteractive();
        this._exploreContainer.add(blocker);

        // 探索中テキスト枠
        const exploreLabel = this.add.text(width / 2, height / 2 - 120, '探索中…', {
            fontFamily: 'sans-serif', fontSize: '36px', color: '#ffffaa',
            backgroundColor: 'rgba(0,0,0,0.7)', padding: { x: 25, y: 12 }
        }).setOrigin(0.5);

        this._exploreContainer.add(exploreLabel);

        // ユニークなパーティメンバー一覧を取得
        const uniqueParty = [...new Set(this.party)];
        const runners = [];
        const activeTweens = [];

        uniqueParty.forEach((charId, i) => {
            const spriteKey = this.textures.exists(`mini_${charId}`) ? `mini_${charId}` : 'sion';
            const startX = width * 0.2 + Math.random() * (width * 0.6);
            const startY = height * 0.3 + Math.random() * (height * 0.4);

            const runner = this.add.sprite(startX, startY, spriteKey)
                .setScale(this.PSCALE_X || 0.45, this.PSCALE_Y || 0.45)
                .setFrame(3); // 初期: 下向き

            this._exploreContainer.add(runner);
            runners.push(runner);

            // 個別のスピード倍率とランダム待機時間で独立して走り回らせる
            const speedFactor = 180 + Math.random() * 120; // 180〜300 px/sec

            const runToRandomPoint = () => {
                if (!this._isExploring || !runner.active) return;
                const targetX = 60 + Math.random() * (width - 120);
                const targetY = 150 + Math.random() * (height - 300);
                const dx = targetX - runner.x;
                const dy = targetY - runner.y;
                const dist = Math.hypot(dx, dy);
                const duration = Math.max(250, (dist / speedFactor) * 1000);

                // 走る方向に合わせた向き設定 (0:正面/下向き, 1:左向き, 2:右向き, 3:背中/上向き)
                if (Math.abs(dy) > Math.abs(dx)) {
                    if (dy < 0) {
                        runner.setFrame(3); // 上へ移動（奥へ進む＝背中を向ける）
                    } else {
                        runner.setFrame(0); // 下へ移動（手前へ進む＝正面を向く）
                    }
                    runner.setFlipX(false);
                } else {

                    if (dx < 0) {
                        runner.setFrame(1); // 左向き
                    } else {
                        runner.setFrame(2); // 右向き
                    }
                    runner.setFlipX(false);
                }

                const tw = this.tweens.add({
                    targets: runner,
                    x: targetX,
                    y: targetY,
                    duration: duration,
                    ease: 'Linear',
                    onComplete: () => {
                        if (this._isExploring && runner.active) {
                            this.time.delayedCall(Math.random() * 150, () => {
                                if (this._isExploring && runner.active) runToRandomPoint();
                            });
                        }
                    }
                });
                activeTweens.push(tw);
            };

            runToRandomPoint();
        });


        // 5秒後に探索完了
        this.time.delayedCall(5000, () => {
            activeTweens.forEach(t => { if (t && t.isPlaying) t.stop(); });
            if (this._exploreContainer) {
                this._exploreContainer.destroy();
                this._exploreContainer = null;
            }
            this._isExploring = false;

            const gs = GlobalState.getInstance();
            const currentHex = this.grid[this.playerRow]?.[this.playerCol];
            const hexName = currentHex && currentHex.cellData ? currentHex.cellData.name : '';
            const locInfo = LOCATION_INFO_DATA[hexName];
            const isGeneric = !locInfo;

            // ① 食料設定：地名ヘクスは 140、汎用ヘクスは半分（70）
            const foodAmount = isGeneric ? 70 : 140;
            gs.food = foodAmount;
            this._updateFoodDisplay();

            // ② レリクス・宝石ドロップ：汎用ヘクスはレア出現率半分
            const drops = RelicGenerator.generateExplorationDrops(isGeneric);
            if (!gs.inventory) {
                gs.inventory = { relics: [], gems: [] };
            }
            drops.forEach(drop => {
                if (drop.type === 'gem') gs.inventory.gems.push(drop);
                else gs.inventory.relics.push(drop);
            });

            // ③ 仲間遭遇判定 (1/5 = 20%) & 情報テキスト判定 (1/2 = 50%)
            let triggeredJoinCharId = null;
            let infoText = null;

            if (locInfo) {
                // まだ未遭遇の特定仲間がいる場合、パーティ人数に応じた確率で遭遇
                // 1人: 100%, 2人: 1/2(50%), 3人: 1/3(33.3%), 4人: 1/4(25%), 5人以上: 0%(発生しない)
                const targetCharId = locInfo.charId ? gs.normalizeCharId(locInfo.charId) : null;
                const currentNormParty = (this.party || []).map(id => gs.normalizeCharId(id));
                if (targetCharId && !currentNormParty.includes(targetCharId)) {
                    const partySize = this.party ? this.party.length : 1;
                    if (partySize < 5) {
                        const encounterChance = 1.0 / partySize;
                        if (Math.random() < encounterChance) {
                            triggeredJoinCharId = targetCharId;
                            // 加入処理はストーリーイベント完了後(onJoinStoryEnd)に行う
                            console.log('[AdventureScene] Encounter triggered for:', triggeredJoinCharId);
                        }
                    }
                }




                // 1/2 (50%) の確率で断片的な情報テキストを拾う
                if (locInfo.text && Math.random() < 0.50) {
                    infoText = locInfo.text;
                }
            }

            // ── 【入れ子構造シーケンスチェーンの構築】 ──
            // ステップ順序:
            // ① 探索結果表示 (食料入手 & 探索メモ)
            // ② レリクス／宝箱ドロップ獲得表示
            // ③ 特定仲間出会いストーリーイベント (遭遇時)
            // ④ 正式仲間加入 (パーティ追加・全回復・隊列登録・即時保存)
            // ⑤ 時間経過 & アドベンチャー復帰

            const steps = [];

            // ── ステップ①: 探索結果ダイアログ (食料・探索メモ) + そのままレリクス一覧表示 ──
            steps.push((onNextStep) => {
                const exprEvents = [
                    { cmd: 'bg', key: 'ev_expr' }
                ];
                const resultFoodText = isGeneric ? '探索を行い、一定量の食料を手に入れた。' : '探索を行い、充分な量の食料を手に入れた。';
                exprEvents.push({ cmd: 'text', name: '', body: resultFoodText });
                if (infoText) {
                    exprEvents.push({ cmd: 'text', name: '探索メモ', body: infoText });
                }

                let stepDone = false;
                const onEventEnd = (scene, data) => {
                    if (data && data.fromExploration) {
                        if (stepDone) return;
                        stepDone = true;
                        this.events.off('resume', onEventEnd);
                        onNextStep();
                    }
                };
                this.events.on('resume', onEventEnd);

                this.scene.pause();
                this.scene.launch('EventScene', {
                    events: exprEvents,
                    returnScene: 'AdventureScene',
                    fromExploration: true,
                    // ドロップがある場合は食料テキスト表示後、そのまま同シーン内でレリクス一覧を表示する
                    explorationDrops: (drops && drops.length > 0) ? drops : null
                });
            });

            // ── ステップ③: 特定仲間の出会いストーリーイベント (全キャラ共通) ──
            if (triggeredJoinCharId) {
                steps.push((onNextStep) => {
                    const normJoinId = gs.normalizeCharId(triggeredJoinCharId);
                    const joinEventsJson = this.cache.json.get('join_events');
                    let storyEvents = [];

                    if (joinEventsJson) {
                        storyEvents = joinEventsJson[normJoinId] || joinEventsJson[parseInt(normJoinId, 10)] || [];
                    }

                    if (!storyEvents || storyEvents.length === 0) {
                        const charName = gs.getCharacter(normJoinId)?.name || '新しい仲間';
                        storyEvents = [
                            { cmd: 'bg', key: 'ev_expr' },
                            { cmd: 'text', name: '遭遇', body: `${hexName}にて${charName}と出会った！` }
                        ];
                    }

                    // ストーリーイベントが終了した時点で正式加入・全回復・隊列登録・即時保存を実行し、そのままスムーズに次ステップへ
                    // joinDoneフラグで誤爆（二重発火）を防ぐ
                    let joinDone = false;
                    const onJoinStoryEnd = (scene, data) => {
                        // fromExploration フラグがついた resume のみ受け付ける（誤爆防止）
                        if (!data || !data.fromExploration) return;
                        if (joinDone) return;
                        joinDone = true;
                        this.events.off('resume', onJoinStoryEnd);

                        // 正式加入・全回復・隊列設定・即時保存
                        const currentNormParty = (this.party || []).map(id => gs.normalizeCharId(id));
                        if (!currentNormParty.includes(normJoinId)) {
                            this.party.push(normJoinId);
                        }
                        gs.assignFormationForNewMember(normJoinId);
                        const joinedChar = gs.getCharacter(normJoinId);
                        if (joinedChar) {
                            const stats = gs.calcStats(normJoinId, this.party);
                            if (stats) {
                                joinedChar.currentHp = stats.maxHp;
                                joinedChar.currentSp = stats.maxSp;
                            }
                        }
                        SaveManager.saveGame(this);
                        console.log('[AdventureScene] Story completed -> Joined party & saved for:', normJoinId);

                        // スムーズに次ステップへ移行
                        onNextStep();
                    };


                    this.events.on('resume', onJoinStoryEnd);

                    this.scene.pause();
                    this.scene.launch('EventScene', {
                        events: storyEvents,
                        returnScene: 'AdventureScene',
                        fromExploration: true
                    });
                });
            }


            // ── シーケンスチェインの実行関数 ──
            const runSequence = () => {
                if (steps.length === 0) {
                    // 全ステップ完了！ ここで初めて時間を進める
                    this._advanceTimeAfterExploration();
                    return;
                }
                const nextStep = steps.shift();
                // 10msの微小ディレイを挟んで、前ステップのresumeイベント伝播との同期干渉を完全に防ぐ
                this.time.delayedCall(10, () => {
                    nextStep(runSequence);
                });
            };

            // シーケンス開始！
            runSequence();
        });
    }

    // 探索シーケンスが全ステップ完了した後に呼ばれる時間進行処理
    // _resumeHandlerではなくここで advanceTime() を呼ぶことで、
    // 探索途中のfromExploration resumeが誤って時間を進めるのを防ぐ
    _advanceTimeAfterExploration() {
        this.advanceTime();
    }


    setupBackground() {
        const { width, height } = this.scale;
        
        // 最背面ベース背景 (画面下半分用)
        // bgCurrentと同じY座標(height/2)に配置し、下方向へ描画させることで隙間を防ぐ
        this.baseBg = this.add.image(width / 2, height / 2, 'bg_map_base')
            .setScrollFactor(0)
            .setDepth(-200)
            .setOrigin(0.5, 0);
        
        // 現在地の背景（最底面）
        this.bgCurrent = this.add.image(width / 2, height / 2, 'map_img_woods.jpg')
            .setScrollFactor(0)
            .setDepth(-100)
            .setVisible(false);
        
        // 移動先の背景（フェードイン用）
        this.bgNext = this.add.image(width / 2, height / 2, 'map_img_woods.jpg')
            .setScrollFactor(0)
            .setDepth(-99)
            .setAlpha(0)
            .setVisible(false);
        
        // 背景はメインカメラに描画（UIカメラから無視）
        this.nightOverlay = this.add.rectangle(width / 2, height / 2, width * 3, height * 3, 0x000000, 0.6)
            .setScrollFactor(0)
            .setDepth(-95)
            .setOrigin(0.5, 0.5)
            .setVisible(false);
            
        this.uiCamera.ignore([this.bgCurrent, this.bgNext, this.baseBg, this.nightOverlay]);
        
        this.bgCurrent.setOrigin(0.5, 1);
        this.bgNext.setOrigin(0.5, 1);
        
        // 初期背景: 現在いるヘクスの画像を設定
        const currentHex = this.grid[this.playerRow]?.[this.playerCol];
        if (currentHex) {
            const bgKey = this.findBgImageFile(currentHex.col, currentHex.row, currentHex.cellData);
            if (this.textures.exists(bgKey)) {
                this.bgCurrent.setTexture(bgKey).setVisible(true).setAlpha(1);
            }
        }
        this.updateNightOverlay();
    }
    
    updateNightOverlay() {
        if (this.nightOverlay) {
            const isDec21 = (this.currentMonth === 12 && this.currentDay === 21);
            this.nightOverlay.setVisible(this.timeOfDay === '夜' || isDec21);
        }
    }

    updateBackground(hex, animate) {
        if (!this.bgCurrent || !this.bgNext || !hex) return;
        
        // 背景用は現在いるヘクスの画像を取得
        const bgKey = this.findBgImageFile(hex.col, hex.row, hex.cellData);
        if (!this.textures.exists(bgKey)) return;

        // すでに同じ背景がセットされている場合はそのまま
        if (this.bgCurrent.texture.key === bgKey && !this.bgNext.visible) return;

        if (!animate) {
            this.bgCurrent.setTexture(bgKey).setVisible(true).setAlpha(1);
            this.bgNext.setVisible(false).setAlpha(0);
            return;
        }
        
        // 旧背景(bgCurrent)の上に新背景(bgNext)を重ねて透明度0→1にクロスフェード（黒バックが見えない）
        this.bgNext.setTexture(bgKey)
            .setScale(this.bgCurrent.scaleX, this.bgCurrent.scaleY)
            .setPosition(this.bgCurrent.x, this.bgCurrent.y)
            .setAlpha(0)
            .setVisible(true);
        
        this.tweens.killTweensOf(this.bgNext);
        this.tweens.add({
            targets: this.bgNext,
            alpha: 1,
            duration: 450,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                this.bgCurrent.setTexture(bgKey).setAlpha(1).setVisible(true);
                this.bgNext.setVisible(false).setAlpha(0);
            }
        });
    }


    resetIdleTimer() {
        if (this.idleTimer) {
            this.idleTimer.remove();
        }
        this.idleTimer = this.time.addEvent({
            delay: 10000,
            callback: this.playHappyAction,
            callbackScope: this
        });
    }

    playHappyAction() {
        if (this.isJumping || this.isHappyJumping) return;
        this.isHappyJumping = true;
        
        if (this.breatheTween) this.breatheTween.pause();
        
        // カメラの追従を一時停止（マップが上下に揺れるのを防ぐ）
        this.cameras.main.stopFollow();
        
        // 1/10の確率で8枚目(インデックス7)、それ以外は5枚目(インデックス4)
        const frameIndex = (Math.random() < 0.1) ? 7 : 4;
        this.player.setFrame(frameIndex);
        
        // 左右をランダムに反転させる
        if (Math.random() > 0.5) {
            this.player.setScale(-this.PSCALE_X, this.PSCALE_Y);
        } else {
            this.player.setScale(this.PSCALE_X, this.PSCALE_Y);
        }
        this.player.setAngle(0);

        const currentY = this.player.y;
        this.tweens.add({
            targets: this.player,
            y: currentY - 15,
            yoyo: true,
            repeat: 1, // 2回跳ねる
            duration: 200,
            ease: 'Sine.easeOut',
            onComplete: () => {
                this.player.setFrame(0); // 正面に戻す
                this.player.setY(currentY); // 念のためY座標を元に戻す
                if (this.breatheTween) this.breatheTween.resume();
                this.resetIdleTimer(); // タイマー再スタート
                
                // カメラの追従を再開
                const offsetY = this.isWideMap ? 0 : this.normalOffsetY;
                this.cameras.main.startFollow(this.player, true, 0.1, 0.1, 0, offsetY);
                this.isHappyJumping = false;
            }
        });
    }

    update(time, delta) {
        if (this.isTransitioning || this.isWideMap) return;

        
        // 背景のサイズと位置をズームに反比例させて画面に対して固定する
        const zoom = this.cameras.main.zoom;
        const { width, height } = this.scale;
        
        // bgCurrent と bgNext を横幅いっぱいに拡大し、下端を画面中心(Y = height/2)に合わせる
        [this.bgCurrent, this.bgNext].forEach(bg => {
            if (bg && bg.texture && bg.texture.key !== '__DEFAULT') {
                const baseScale = width / bg.width;
                bg.setScale(baseScale / zoom);
                bg.setPosition(width / 2, height / 2);
            }
        });
        
        // baseBg は画面下半分の配置（上端を画面中心に合わせる）
        if (this.baseBg && this.baseBg.texture) {
            const baseScale = width / this.baseBg.width;
            this.baseBg.setScale(baseScale / zoom);
            this.baseBg.setPosition(width / 2, height / 2);
        }

        // アイドル時間（無操作）のチェック
        this.idleTime += delta;
        if (this.idleTime >= 10000 && !this.isTickerActive) {
            this.startTicker();
        } else if (this.idleTime < 10000 && this.isTickerActive) {
            this.stopTicker();
        }

        // 12月21日の間はずっとBG_06.pngのゆらゆらエフェクト(Dec21Effect)を表示・更新
        const isDec21 = (this.currentMonth === 12 && this.currentDay === 21);
        if (isDec21) {
            if (!this.dec21Effect) {
                this.dec21Effect = new Dec21Effect(this, 12);
            }
            if (this.dec21Effect) {
                this.dec21Effect.update(delta / 1000);
            }
        } else {
            if (this.dec21Effect) {
                this.dec21Effect.fadeOut(1500);
                this.dec21Effect = null;
            }
        }

        this.updateNightOverlay();
    }

    resetIdleTime() {
        this.idleTime = 0;
    }

    setupTicker() {
        const { width, height } = this.scale;
        
        // ティーカ用の背景（半透明な黒い帯を画面上部に、10%ほど下げて 0.16 に）
        this.tickerBg = this.add.rectangle(width / 2, height * 0.16, width, 30, 0x000000, 0.6).setOrigin(0.5, 0.5);
        this.tickerBg.setVisible(false);
        this.uiContainer.add(this.tickerBg);

        this.tickerText = this.add.text(width, height * 0.16, '', {
            fontFamily: FONT_MAIN, fontSize: fontSize.body(width), color: '#ffffff'
        }).setOrigin(0.5, 0.5);
        this.tickerText.setVisible(false);
        this.uiContainer.add(this.tickerText);

        const tipsData = this.cache.json.get('tips');
        this.tipsList = tipsData ? tipsData.tips : ['ヒントが見つかりません。'];
        this.isTickerActive = false;
        this.currentTickerTween = null;
        this.tickerDelay = null;
    }

    startTicker() {
        this.isTickerActive = true;
        this.tickerBg.setVisible(true);
        this.tickerText.setVisible(true);
        this.startNextTicker();
    }

    stopTicker() {
        this.isTickerActive = false;
        this.tickerBg.setVisible(false);
        this.tickerText.setVisible(false);
        if (this.currentTickerTween) {
            this.currentTickerTween.stop();
            this.currentTickerTween = null;
        }
        if (this.tickerDelay) {
            this.tickerDelay.remove();
            this.tickerDelay = null;
        }
    }

    startNextTicker() {
        if (!this.tipsList || this.tipsList.length === 0 || !this.isTickerActive) return;
        
        let tip = Phaser.Math.RND.pick(this.tipsList);
        // 改行コードなどを取り除く
        this.tickerText.setText(tip.trim());

        const { width } = this.scale;
        const textWidth = this.tickerText.width;

        // 初期位置は画面右端の外側
        const startX = width + textWidth / 2;
        const centerX = width / 2;
        const endX = -textWidth / 2;
        
        this.tickerText.x = startX;

        // 速度 (1秒間に約80px進むくらいのゆっくりな速度)
        const speed = 80;
        const dur1 = (Math.abs(startX - centerX) / speed) * 1000;
        const dur2 = (Math.abs(centerX - endX) / speed) * 1000;

        // 画面中央まで移動
        this.currentTickerTween = this.tweens.add({
            targets: this.tickerText,
            x: centerX,
            duration: dur1,
            ease: 'Linear',
            onComplete: () => {
                if (!this.isTickerActive) {
                    this.currentTickerTween = null;
                    return;
                }
                
                // 中央で1秒待機
                this.tickerDelay = this.time.delayedCall(1000, () => {
                    this.tickerDelay = null;
                    if (!this.isTickerActive) return;
                    
                    // 左端まで移動して消える
                    this.currentTickerTween = this.tweens.add({
                        targets: this.tickerText,
                        x: endX,
                        duration: dur2,
                        ease: 'Linear',
                        onComplete: () => {
                            this.currentTickerTween = null;
                            if (!this.isTickerActive) return;
                            // 次のテロップを待機
                            this.tickerDelay = this.time.delayedCall(1000, () => {
                                this.tickerDelay = null;
                                if (this.isTickerActive) this.startNextTicker();
                            });
                        }
                    });
                });
            }
        });
    }

    /** イベントキューに登録して順次安全に再生する仕組み（入れ子・重なり対応） */
    enqueueEvent(item) {
        if (!this.eventQueue) this.eventQueue = [];
        this.eventQueue.push(item);
    }

    processEventQueue() {
        if (!this.eventQueue || this.eventQueue.length === 0) {
            return false;
        }

        const next = this.eventQueue.shift();
        if (!next) return false;

        if (next.type === 'event') {
            this.scene.pause();
            this.scene.launch('EventScene', next.data);
            return true;
        } else if (next.type === 'tarot') {
            this.scene.pause();
            this.scene.launch('TarotScene', next.data);
            return true;
        } else if (next.type === 'battle') {
            this.scene.pause();
            this.scene.launch('BattleScene', next.data);
            return true;
        } else if (next.type === 'custom' && typeof next.action === 'function') {
            next.action();
            return true;
        }
        return false;
    }

    checkScheduledEvents() {
        // 各イベントが発動したかどうかを判定してキューに追加
        let fired = false;
        if (this.check1207Event()) fired = true;
        if (this.check1214Event()) fired = true;
        if (this.check1221NightWildhunt()) fired = true;
        if (this.check1221Event()) fired = true;
        return fired;
    }


    check1207Event() {
        const gs = GlobalState.getInstance();
        // 12月7日の夜(timePeriodIndex === 2)またはそれ以降で未再生の場合に発動
        if (this.currentDay >= 7 && !gs.event1207Played) {
            if (this.currentDay === 7 && this.timePeriodIndex < 2) return false; // 12/7の午前・午後は夜まで待つ
            gs.event1207Played = true;
            const eventData = this.cache.json.get('event_1207');
            if (eventData) {
                this.enqueueEvent({
                    type: 'event',
                    data: {
                        events: eventData,
                        returnScene: 'AdventureScene',
                        from1207Event: true
                    }
                });
                return true; // イベント登録
            }
        }
        return false;
    }


    check1214Event() {
        const gs = GlobalState.getInstance();
        // 12/15以降で未再生の場合のフォールバック用
        const shouldTrigger = (!gs.event1214Played) && (this.currentDay > 14);

        if (shouldTrigger) {
            gs.event1214Played = true;

            // 再生されている可能性のあるBGMをすべて停止
            this.sound.stopAll();

            const newGem = RelicGenerator.generateGem(1);
            if (!gs.inventory) gs.inventory = { relics: [], gems: [] };
            gs.inventory.gems.push(newGem);

            const eventData = this.cache.json.get('event_1214');
            this.enqueueEvent({
                type: 'event',
                data: {
                    events: eventData,
                    returnScene: 'AdventureScene',
                    from1214Event: true,
                    explorationDrops: [newGem]
                }
            });
            return true;
        }
        return false;
    }



    check1221Event() {
        const gs = GlobalState.getInstance();
        if (this.currentDay === 22 && this.timePeriodIndex === 0 && !gs.event1221Played) {
            gs.event1221Played = true;

            const eventData = this.cache.json.get('event_1221');
            if (eventData) {
                this.enqueueEvent({
                    type: 'event',
                    data: {
                        events: eventData,
                        returnScene: 'AdventureScene',
                        from1221Event: true
                    }
                });
                return true;
            }
        }
        return false;
    }

    check1221NightWildhunt() {
        const gs = GlobalState.getInstance();
        if (this.currentMonth === 12 && this.currentDay === 21 && this.timePeriodIndex === 2 && !gs.event1221WildhuntPlayed) {
            const currentHex = this.grid[this.playerRow]?.[this.playerCol];
            const GAME_NAMED_SPOTS = [
                'スカイツリー', '品川', '京橋', '新宿', '東京城', '大手門', '東京',
                '新大久保', '丸の内', '中野', '桜田筋', '中央筋', '青山筋', '上野',
                '秋葉原', '水道橋', '池袋', '東京タワー', '舞浜', '山谷', 'リトル沖縄',
                '葛西臨海公園', 'ティスティニーランド', '神田明神', '路面電車', '平和島',
                'ニュートラム', 'ビッグサイト', 'シルバードーム'
            ];
            const rawName = (currentHex && currentHex.cellData && currentHex.cellData.name) ? currentHex.cellData.name.replace(/\n/g, '').trim() : '';
            
            // 全29個の固有地名（東京・品川・新宿など）に滞在しているか判定
            const isNamedSpot = (currentHex && currentHex.cellData && currentHex.cellData.isSpot) || GAME_NAMED_SPOTS.includes(rawName);

            // 地名付きの土地に滞在していない（野外にいる）場合
            if (!isNamedSpot) {
                gs.event1221WildhuntPlayed = true;

                if (this.sound) this.sound.stopAll();
                const commands = build1221WildhuntCommands(this.party);
                this.enqueueEvent({
                    type: 'event',
                    data: {
                        events: commands,
                        returnScene: 'AdventureScene',
                        from1221WildhuntEvent: true
                    }
                });
                return true;
            }
        }
        return false;
    }





    /** 周回開始時のマップ踏破・視界リセット処理 */
    resetMapForNewLoop() {
        this.playerCol = 3;
        this.playerRow = 6;

        if (this.grid) {
            for (let r = 0; r < this.grid.length; r++) {
                if (!this.grid[r]) continue;
                for (let c = 0; c < this.grid[r].length; c++) {
                    const hex = this.grid[r][c];
                    if (hex && hex.cellData) {
                        // 踏破フラグ (visited/isVisited) はクリアせず維持！
                        // 敵レベル・魔女レベルを初期値へ復元
                        if (hex.cellData.initialEnemyLevel !== undefined) {
                            hex.cellData.enemyLevel = hex.cellData.initialEnemyLevel;
                        }
                        if (hex.cellData.initialWitchLevel !== undefined) {
                            hex.cellData.witchLevel = hex.cellData.initialWitchLevel;
                        }
                        hex.isCleared = false;
                    }
                }
            }
        }

        const startHex = this.grid[this.playerRow]?.[this.playerCol];
        if (startHex) {
            this.moveToHex(startHex, false);
            this.cameras.main.centerOn(this.player.x, this.player.y);
        }
        this.updateVisibility();
        this._updateFoodDisplay();
    }


    /** 12/21夜：野外（地名無しヘクス）での強制突破戦スタート */
    start1221Breakthrough() {
        const currentHex = this.grid[this.playerRow]?.[this.playerCol];
        let maxLevel = currentHex?.cellData?.enemyLevel || 1;
        const isOdd = (this.playerRow % 2 !== 0);
        const neighbors = [
            [0, -1], [0, 1], [-1, 0], [1, 0],
            isOdd ? [1, -1] : [-1, -1],
            isOdd ? [1, 1] : [-1, 1]
        ];
        for (const n of neighbors) {
            const nc = this.playerCol + n[0];
            const nr = this.playerRow + n[1];
            if (nr >= 0 && nr < this.grid.length && nc >= 0 && nc < this.grid[nr].length) {
                const adjHex = this.grid[nr][nc];
                const lvl = adjHex?.cellData?.enemyLevel || 0;
                if (lvl > maxLevel) maxLevel = lvl;
            }
        }

        const config = {
            rule: 2, // 突破戦
            attribute: 'red',
            enemyCount: 200,
            breakthroughTarget: 12010,
            spawnInterval: 0.5,
            enemyLevel: maxLevel,
            majoLevel: 0,
            isOverlay: false,
            returnScene: 'AdventureScene',
            party: this.party,
            canRetreat: false,
            is1221NightBattle: true
        };

        this.scene.pause();
        this.scene.launch('BattleScene', config);
    }

    /** 12/21夜に名前付き土地も含め「探索」や「移動」などの行動を起こした時の強制作動（ワイルドハント発生／突破戦へ） */
    check1221NightForcedBreakthrough() {
        if (this.is1221WildhuntPendingBreakthrough) {
            this.is1221WildhuntPendingBreakthrough = false;
            this.start1221Breakthrough();
            return true;
        }
        if (this.currentMonth === 12 && this.currentDay === 21 && this.timePeriodIndex === 2) {
            const gs = GlobalState.getInstance();
            // ワイルドハント未体験であれば白画面フェード演出＋ワイルドハントイベントを発生
            if (!gs.event1221WildhuntPlayed) {
                gs.event1221WildhuntPlayed = true;

                if (this.sound) this.sound.stopAll();
                const commands = build1221WildhuntCommands(this.party);
                this.scene.pause();
                this.scene.launch('EventScene', {
                    events: commands,
                    returnScene: 'AdventureScene',
                    from1221WildhuntEvent: true
                });
                return true;
            } else {
                // すでにイベント閲覧済みならそのまま直接突破戦へ強制突入
                this.start1221Breakthrough();
                return true;
            }
        }
        return false;
    }






    applySaveData(saveData) {
        if (!saveData) return;
        SaveManager.restoreGlobalState(saveData);

        const adv = saveData.adventureState;
        if (!adv) return;

        if (adv.playerCol !== undefined && adv.playerRow !== undefined) {
            this.playerCol = adv.playerCol;
            this.playerRow = adv.playerRow;
        }
        if (adv.currentMonth !== undefined) this.currentMonth = adv.currentMonth;
        if (adv.currentDay !== undefined) this.currentDay = adv.currentDay;
        if (adv.timeOfDay !== undefined) this.timeOfDay = adv.timeOfDay;
        if (adv.timePeriodIndex !== undefined) this.timePeriodIndex = adv.timePeriodIndex;
        if (adv.globalWaveCount !== undefined) this.globalWaveCount = adv.globalWaveCount;
        if (adv.globalEnemyCount !== undefined) this.globalEnemyCount = adv.globalEnemyCount;
        if (adv.inRestMode !== undefined) this.inRestMode = adv.inRestMode;

        if (adv.party) this.party = adv.party;
        this.previousPartySize = (adv.previousPartySize !== undefined) ? adv.previousPartySize : (this.party ? this.party.length : 1);



        // ヘックスの訪問・レベル情報を復元
        if (adv.hexStates && Array.isArray(adv.hexStates) && this.hexes) {
            for (const state of adv.hexStates) {
                const hex = this.hexes.find(h => h.col === state.col && h.row === state.row);
                if (hex && hex.cellData) {
                    if (state.visited !== undefined) hex.cellData.visited = state.visited;
                    else if (state.isExplored) hex.cellData.visited = 1;

                    if (state.revealed !== undefined) hex.cellData.revealed = state.revealed;
                    hex.isExplored = !!(state.isExplored || hex.cellData.visited > 0);

                    if (state.enemyLevel !== undefined) hex.cellData.enemyLevel = state.enemyLevel;
                    if (state.witchLevel !== undefined) hex.cellData.witchLevel = state.witchLevel;
                    if (state.enemyAttr !== undefined) hex.cellData.enemyAttr = state.enemyAttr;
                    if (state.cleared !== undefined) hex.cellData.cleared = state.cleared;
                }
            }
        }

        // プレイヤー位置とカメラの更新
        const targetHex = this.hexes ? this.hexes.find(h => h.col === this.playerCol && h.row === this.playerRow) : null;
        if (targetHex && this.player) {
            this.player.setPosition(targetHex.px, targetHex.py - (this.CHAR_OFFSET_Y || 52));
            if (this.cameras && this.cameras.main) {
                this.cameras.main.centerOn(this.player.x, this.player.y);
            }
        }

        this.updateVisibility();
        if (this.dateTimeText) {
            this.dateTimeText.setText(`${this.currentMonth}月${this.currentDay}日 ${this.timeOfDay}`);
        }
        this.updateNightOverlay();
        console.log('[AdventureScene] Restored state from save data!');
    }

    // ─────────────────────────────────────────────────────
    // チュートリアル進行・イベント制御 & 操作制限
    // ─────────────────────────────────────────────────────
    checkTutorialEvents() {
        const gs = GlobalState.getInstance();
        const currentHex = (this.grid && this.grid[this.playerRow]) ? this.grid[this.playerRow][this.playerCol] : null;
        const bgKey = currentHex ? this.findBgImageFile(currentHex.col, currentHex.row, currentHex.cellData) : 'bg_img_12_1';

        // ── チュートリアル午前 ──
        if (gs.isTutorialMode && !gs.tutorialMorningSeen && gs.currentMonth === 12 && gs.currentDay === 1 && gs.timePeriodIndex === 0) {
            gs.tutorialMorningSeen = true;
            SaveManager.saveGame(this);

            let eventData = this.cache.json.get('tutorial_morning');
            if (eventData) {
                eventData = JSON.parse(JSON.stringify(eventData));
                if (eventData[0] && (eventData[0].cmd === 'image' || eventData[0].cmd === 'bg')) {
                    eventData[0] = { cmd: 'bg', key: bgKey };
                }
            } else {
                const talkSion = this.cache.json.get('talk_001');
                const morningLines = (talkSion && talkSion['チュートリアル(午前)']) ? talkSion['チュートリアル(午前)'] : [
                    "ここは…東京駅だったはず…",
                    "東京に遊びに来てたんだ、誰かと…",
                    "他に何も思い出せない、なんなんだ…",
                    "今日は…12月1日、まだ午前中かな",
                    "誰か他に人はいないのかな……。会えても、うまく話せるかどうか",
                    "…何か探しに行こうか…",
                    "(どこかに移動してみてください。)"
                ];

                eventData = [
                    { cmd: "bg", key: bgKey },
                    { cmd: "chara", key: "portrait_001", pos: "right" }
                ];
                for (let i = 0; i < morningLines.length; i++) {
                    const text = morningLines[i];
                    const isSystem = text.startsWith('(') && text.endsWith(')');
                    eventData.push({
                        cmd: "text",
                        name: isSystem ? "" : "紫苑",
                        body: text
                    });
                }
                eventData.push({ cmd: "clearText" });
                eventData.push({ cmd: "end" });
            }

            this.eventEngine = new EventEngine(this, eventData, () => {
                TransitionManager.meitenInPlace(this, () => {
                    if (this.eventEngine) {
                        this.eventEngine.cleanup();
                        this.eventEngine = null;
                    }
                    this.applyTutorialRestrictions();
                }, 800);
            });
            this.eventEngine.start();
            return true;
        }

        // ── チュートリアル午後 ──
        if (gs.isTutorialMode && !gs.tutorialAfternoonSeen && gs.timePeriodIndex === 1) {
            gs.tutorialAfternoonSeen = true;
            SaveManager.saveGame(this);

            let eventData = this.cache.json.get('tutorial_afternoon');
            if (eventData) {
                eventData = JSON.parse(JSON.stringify(eventData));
                if (eventData[0] && (eventData[0].cmd === 'image' || eventData[0].cmd === 'bg')) {
                    eventData[0] = { cmd: 'bg', key: bgKey };
                }
            } else {
                const talkSion = this.cache.json.get('talk_001');
                const afternoonLines = (talkSion && talkSion['チュートリアル(午後)']) ? talkSion['チュートリアル(午後)'] : [
                    "どこも化け物だらけだ、ひどい目に遭った…",
                    "あまり大きく移動はしないで周辺を調べてみようかな",
                    "化け物に見つからないように…",
                    "(探索を選んでみてください。)"
                ];

                eventData = [
                    { cmd: "bg", key: bgKey },
                    { cmd: "chara", key: "portrait_001", pos: "right" }
                ];
                for (let i = 0; i < afternoonLines.length; i++) {
                    const text = afternoonLines[i];
                    const isSystem = text.startsWith('(') && text.endsWith(')');
                    eventData.push({
                        cmd: "text",
                        name: isSystem ? "" : "紫苑",
                        body: text
                    });
                }
                eventData.push({ cmd: "clearText" });
                eventData.push({ cmd: "end" });
            }

            this.eventEngine = new EventEngine(this, eventData, () => {
                TransitionManager.meitenInPlace(this, () => {
                    if (this.eventEngine) {
                        this.eventEngine.cleanup();
                        this.eventEngine = null;
                    }
                    this.applyTutorialRestrictions();
                }, 800);
            });
            this.eventEngine.start();
            return true;
        }

        // ── チュートリアル夜 ──
        if (gs.isTutorialMode && !gs.tutorialNightSeen && gs.timePeriodIndex === 2) {
            gs.tutorialNightSeen = true;
            SaveManager.saveGame(this);

            let eventData = this.cache.json.get('tutorial_night');
            if (eventData) {
                eventData = JSON.parse(JSON.stringify(eventData));
                if (eventData[0] && (eventData[0].cmd === 'image' || eventData[0].cmd === 'bg')) {
                    eventData[0] = { cmd: 'bg', key: bgKey, darkOverlay: 0.7 };
                }
            } else {
                const talkSion = this.cache.json.get('talk_001');
                const nightLines = (talkSion && talkSion['チュートリアル(夜)']) ? talkSion['チュートリアル(夜)'] : [
                    "日が暮れてしまう、電気もないし何も見えなくなるかもしれない…",
                    "心なしか周辺の化け物の気配も妙に強くなったように感じる…",
                    "夜の間はどこかに隠れて休んでいたほうがいいかもしれない。",
                    "(休息を選んでみてください。)"
                ];

                eventData = [
                    { cmd: "bg", key: bgKey, darkOverlay: 0.7 },
                    { cmd: "chara", key: "portrait_001", pos: "right" }
                ];
                for (let i = 0; i < nightLines.length; i++) {
                    const text = nightLines[i];
                    const isSystem = text.startsWith('(') && text.endsWith(')');
                    eventData.push({
                        cmd: "text",
                        name: isSystem ? "" : "紫苑",
                        body: text
                    });
                }
                eventData.push({ cmd: "clearText" });
                eventData.push({ cmd: "end" });
            }

            this.eventEngine = new EventEngine(this, eventData, () => {
                TransitionManager.meitenInPlace(this, () => {
                    if (this.eventEngine) {
                        this.eventEngine.cleanup();
                        this.eventEngine = null;
                    }
                    this.applyTutorialRestrictions();
                }, 800);
            });
            this.eventEngine.start();
            return true;
        }

        // ── チュートリアルゲームオーバー / 撤退 ──
        if (!gs.tutorialGameOverSeen && (this._justReturnedFromGameOverOrRetreat || gs.pendingGameOverTutorial)) {
            gs.tutorialGameOverSeen = true;
            gs.pendingGameOverTutorial = false;
            this._justReturnedFromGameOverOrRetreat = false;
            SaveManager.saveGame(this);

            let eventData = this.cache.json.get('tutorial_gameover');
            if (eventData) {
                eventData = JSON.parse(JSON.stringify(eventData));
                if (eventData[0] && (eventData[0].cmd === 'image' || eventData[0].cmd === 'bg')) {
                    eventData[0] = { cmd: 'bg', key: bgKey };
                }
            } else {
                const talkSion = this.cache.json.get('talk_001');
                const goLines = (talkSion && talkSion['チュートリアル(ゲームオーバー)']) ? talkSion['チュートリアル(ゲームオーバー)'] : [
                    "…はっ！？",
                    "眠っていたの？ひどい夢を見た気がする…",
                    "…いやこの現実ももう充分悪夢なんだけど…",
                    "(紫苑はわずかに時間を巻き戻す力を持っています。)",
                    "(全滅の際、または戦闘中に撤退を選択すると、戦闘に突入する前まで戻ることができます。)"
                ];

                eventData = [
                    { cmd: "bg", key: bgKey },
                    { cmd: "chara", key: "portrait_001", pos: "right" }
                ];
                for (let i = 0; i < goLines.length; i++) {
                    const text = goLines[i];
                    const isSystem = text.startsWith('(') && text.endsWith(')');
                    eventData.push({
                        cmd: "text",
                        name: isSystem ? "" : "紫苑",
                        body: text
                    });
                }
                eventData.push({ cmd: "clearText" });
                eventData.push({ cmd: "end" });
            }

            this.eventEngine = new EventEngine(this, eventData, () => {
                TransitionManager.meitenInPlace(this, () => {
                    if (this.eventEngine) {
                        this.eventEngine.cleanup();
                        this.eventEngine = null;
                    }
                    this.applyTutorialRestrictions();
                }, 800);
            });
            this.eventEngine.start();
            return true;
        }

        if (gs.isTutorialMode) {
            this.applyTutorialRestrictions();
        }
        return false;
    }


    /** チュートリアル中の操作制限（午前：移動のみ、午後：探索のみ、夜：休息のみ） */
    applyTutorialRestrictions() {
        const gs = GlobalState.getInstance();
        if (!gs.isTutorialMode) {
            // チュートリアルモード終了：すべての操作ロックを解除し全ボタンを表示
            this.isMovementOnlyTutorial = false;
            this.isExploreOnlyTutorial = false;
            this.isRestOnlyTutorial = false;

            if (this.exploreBtn) this.exploreBtn.setVisible(true);
            if (this.restBtn) this.restBtn.setVisible(true);
            if (this.statusBtn) this.statusBtn.setVisible(true);
            return;
        }

        if (gs.timePeriodIndex === 0) {
            // チュートリアル午前：移動のみ許可
            this.isMovementOnlyTutorial = true;
            this.isExploreOnlyTutorial = false;
            this.isRestOnlyTutorial = false;

            if (this.restBtn) this.restBtn.setVisible(false);
            if (this.exploreBtn) this.exploreBtn.setVisible(false);
            if (this.statusBtn) this.statusBtn.setVisible(false);
        } else if (gs.timePeriodIndex === 1) {
            // チュートリアル午後：探索のみ許可
            this.isMovementOnlyTutorial = false;
            this.isExploreOnlyTutorial = true;
            this.isRestOnlyTutorial = false;

            if (this.exploreBtn) this.exploreBtn.setVisible(true);
            if (this.restBtn) this.restBtn.setVisible(false);
            if (this.statusBtn) this.statusBtn.setVisible(false);
        } else if (gs.timePeriodIndex === 2) {
            // チュートリアル夜：休息のみ許可
            this.isMovementOnlyTutorial = false;
            this.isExploreOnlyTutorial = false;
            this.isRestOnlyTutorial = true;

            if (this.exploreBtn) this.exploreBtn.setVisible(false);
            if (this.restBtn) this.restBtn.setVisible(true);
            if (this.statusBtn) this.statusBtn.setVisible(false);
        }
    }



}



