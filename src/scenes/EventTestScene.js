import Phaser from 'phaser';
import { TransitionManager } from '../systems/TransitionManager';
import { GlobalState } from '../systems/GlobalState';
import { FONT_MAIN } from '../config/GameFont';

/**
 * 🎬 イベント再生テストシーン
 * ゲーム内の日付イベント、仲間加入イベント、施設・特殊イベント、チュートリアルを一覧から選んで再生テストできる画面
 */
export default class EventTestScene extends Phaser.Scene {
    constructor() {
        super('EventTestScene');
    }

    create() {
        TransitionManager.fadeIn(this);
        const { width, height } = this.scale;

        // BGM管理
        this._playMenuBgm();

        // イベント復帰ハンドラ（EventScene終了時にresumeされる）
        this.events.off('resume');
        this.events.on('resume', () => {
            console.log('[EventTestScene] Resumed from EventScene');
            this.scene.setVisible(true);
            this._playMenuBgm();
        });

        // 1. 背景
        this.add.rectangle(width / 2, height / 2, width, height, 0x12131f).setDepth(0);

        // 2. スクロール用コンテナ
        this.listContainer = this.add.container(0, 70).setDepth(10);

        // 3. イベント定義リストの構築
        const eventCategories = this._getEventList();

        let currentY = 10;
        const btnWidth = width * 0.88;
        const btnHeight = 44;

        // ドラッグ判定用のフラグ
        this._dragMoved = false;

        eventCategories.forEach(cat => {
            // カテゴリ見出し
            const catHeaderBg = this.add.rectangle(width / 2, currentY + 16, btnWidth, 32, cat.headerColor, 0.45)
                .setStrokeStyle(1, cat.headerColor, 0.9);
            const catHeaderText = this.add.text(width / 2, currentY + 16, cat.title, {
                fontFamily: FONT_MAIN,
                fontSize: '15px',
                fontStyle: 'bold',
                color: '#ffffff'
            }).setOrigin(0.5);

            this.listContainer.add([catHeaderBg, catHeaderText]);
            currentY += 40;

            // 各イベントボタン
            cat.items.forEach(item => {
                const btnBg = this.add.rectangle(width / 2, currentY + btnHeight / 2, btnWidth, btnHeight, cat.btnColor)
                    .setStrokeStyle(1, 0xffffff, 0.25)
                    .setInteractive({ useHandCursor: true });

                const label = this.add.text(width / 2, currentY + btnHeight / 2, item.name, {
                    fontFamily: FONT_MAIN,
                    fontSize: '13px',
                    fontStyle: 'bold',
                    color: '#ffffff'
                }).setOrigin(0.5);

                btnBg.on('pointerover', () => btnBg.setFillStyle(Phaser.Display.Color.ValueToColor(cat.btnColor).brighten(25).color));
                btnBg.on('pointerout', () => btnBg.setFillStyle(cat.btnColor));

                btnBg.on('pointerup', () => {
                    if (this._dragMoved) return; // スクロール中はクリックさせない
                    this._launchEvent(item);
                });

                this.listContainer.add([btnBg, label]);
                currentY += btnHeight + 8;
            });

            currentY += 12;
        });

        const totalContentH = currentY + 30;
        const minScrollY = Math.min(70, height - totalContentH);
        const maxScrollY = 70;

        // 4. スクロール操作（ドラッグ ＆ マウスホイール）
        let startPointerY = 0;
        let startContainerY = 70;
        let isPointerDown = false;

        this.input.on('pointerdown', (pointer) => {
            if (pointer.y < 60) return; // ヘッダー部分は除外
            isPointerDown = true;
            this._dragMoved = false;
            startPointerY = pointer.y;
            startContainerY = this.listContainer.y;
        });

        this.input.on('pointermove', (pointer) => {
            if (!isPointerDown) return;
            const dist = pointer.y - startPointerY;
            if (Math.abs(dist) > 6) {
                this._dragMoved = true;
            }
            this.listContainer.y = Phaser.Math.Clamp(startContainerY + dist, minScrollY, maxScrollY);
        });

        this.input.on('pointerup', () => {
            isPointerDown = false;
        });

        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            this.listContainer.y = Phaser.Math.Clamp(this.listContainer.y - deltaY * 0.7, minScrollY, maxScrollY);
        });

        // 5. 固定ヘッダー（Depth: 50）
        const headerBg = this.add.rectangle(width / 2, 30, width, 60, 0x0c0c16)
            .setDepth(50).setStrokeStyle(1, 0x333355);
        this.add.text(width / 2, 30, '🎬 イベント再生テスト', {
            fontFamily: FONT_MAIN,
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#ffcc00'
        }).setOrigin(0.5).setDepth(51);

        // 戻るボタン
        const backBtn = this.add.text(16, 30, '◀ 戻る', {
            fontFamily: FONT_MAIN,
            fontSize: '15px',
            color: '#ffffff',
            backgroundColor: '#00000088',
            padding: { x: 10, y: 6 }
        }).setOrigin(0, 0.5).setDepth(52).setInteractive({ useHandCursor: true });

        backBtn.on('pointerover', () => backBtn.setStyle({ color: '#ffcc00' }));
        backBtn.on('pointerout', () => backBtn.setStyle({ color: '#ffffff' }));
        backBtn.on('pointerdown', () => {
            this.sound.stopByKey('bgm_menu');
            TransitionManager.transitionTo(this, 'DemoScene');
        });
    }

    _playMenuBgm() {
        if (!this.sound.get('bgm_menu') || !this.sound.get('bgm_menu').isPlaying) {
            if (this.cache.audio.exists('bgm_menu')) {
                const menuBgm = this.sound.add('bgm_menu', { loop: true, volume: 0 });
                menuBgm.play();
                this.tweens.add({ targets: menuBgm, volume: 0.7, duration: 600 });
            }
        }
    }

    _getEventList() {
        return [
            {
                title: '📅 【メインストーリー・日付イベント】',
                headerColor: 0x336699,
                btnColor: 0x1f3d5c,
                items: [
                    { name: '序章：オープニングイベント', cacheKey: 'op_event', eventId: 'event_op_tutorial', fromOpTutorial: true },
                    { name: '12月7日：蒼樹との遭遇・激戦前夜', cacheKey: 'event_1207', eventId: 'event_1207', from1207Event: true },
                    { name: '12月14日：記憶と誓いの対話', cacheKey: 'event_1214', eventId: 'event_1214', from1214Event: true },
                    { name: '12月17日：決意と仲間たちの対話', cacheKey: 'event_1217', eventId: 'event_1217', from1217Event: true },
                    { name: '12月21日：ワイルドハント前夜', cacheKey: 'event_1221', eventId: 'event_1221', from1221Event: true, showDec21Effect: true },
                    { name: '12月21日：ワイルドハント突破戦突入', cacheKey: 'event_1221wildhunt', eventId: 'event_1221_wildhunt', from1221WildhuntEvent: true },
                    { name: '池袋イベント 01', cacheKey: 'event_ikebukuro01', eventId: 'event_ikebukuro01', fromIkebukuro01Event: true },
                    { name: '池袋イベント 02', cacheKey: 'event_ikebukuro02', eventId: 'event_ikebukuro02', fromIkebukuro02Event: true },
                ]
            },
            {
                title: '🤝 【仲間との出会い・加入イベント】',
                headerColor: 0x8844aa,
                btnColor: 0x4a225f,
                items: [
                    { name: '002: 蒼樹 加入イベント', joinCharId: '002', eventId: 'join_002' },
                    { name: '003: 紅華 加入イベント', joinCharId: '003', eventId: 'join_003' },
                    { name: '004: 黄蘭 加入イベント', joinCharId: '004', eventId: 'join_004' },
                    { name: '005: 李乃果 加入イベント', joinCharId: '005', eventId: 'join_005' },
                    { name: '007: ななよ 加入イベント', joinCharId: '007', eventId: 'join_007' },
                    { name: '008: ノア 加入イベント', joinCharId: '008', eventId: 'join_008' },
                    { name: '009: リフィエル 加入イベント', joinCharId: '009', eventId: 'join_009' },
                    { name: '010: プロセル 加入イベント', joinCharId: '010', eventId: 'join_010' },
                    { name: '011: 白蓮 加入イベント', joinCharId: '011', eventId: 'join_011' },
                ]
            },
            {
                title: '🏛️ 【施設・周回・特殊イベント】',
                headerColor: 0x228866,
                btnColor: 0x164d3a,
                items: [
                    { name: '悪魔プロセルとの仮契約（道場解放）', cacheKey: 'event_2rdevil', eventId: 'event_2r_devil', from2RDevilEvent: true },
                    { name: 'DOJO初回訪問チュートリアル', cacheKey: 'event_dojo', eventId: 'event_dojo', fromDojoEvent: true },
                    { name: '時空館解放イベント（JIKU）', cacheKey: 'event_jiku', eventId: 'event_jiku', fromJikuEvent: true },
                    { name: '2周目 12月1日 朝の目覚め', cacheKey: 'event_2r1201', eventId: 'event_2r1201', from2R1201Event: true },
                    { name: '地上敗北リスポーンイベント', cacheKey: 'event_resp', eventId: 'event_resp', fromRespEvent: true },
                    { name: 'タワー敗北リスポーンイベント', cacheKey: 'event_tow_res', eventId: 'event_tow_res', fromTowerRespEvent: true },
                ]
            },
            {
                title: '💡 【チュートリアル解説イベント】',
                headerColor: 0xaa7722,
                btnColor: 0x5a3e12,
                items: [
                    { name: '12/1 午前 探索開始チュートリアル', cacheKey: 'tutorial_morning', eventId: 'tutorial_morning' },
                    { name: '12/1 午後 チュートリアル', cacheKey: 'tutorial_afternoon', eventId: 'tutorial_afternoon' },
                    { name: '夜間探索 チュートリアル', cacheKey: 'tutorial_night', eventId: 'tutorial_night' },
                    { name: 'キャンプ・休息 チュートリアル', cacheKey: 'tutorial_rest', eventId: 'tutorial_rest' },
                    { name: 'ゲームオーバー解説 チュートリアル', cacheKey: 'tutorial_gameover', eventId: 'tutorial_gameover' },
                ]
            }
        ];
    }

    _launchEvent(item) {
        let events = null;

        if (item.joinCharId) {
            const joinJson = this.cache.json.get('join_events');
            if (joinJson) {
                events = joinJson[item.joinCharId] || joinJson[parseInt(item.joinCharId, 10)];
            }
        } else if (item.cacheKey) {
            events = this.cache.json.get(item.cacheKey);
        }

        if (!events || !Array.isArray(events) || events.length === 0) {
            console.warn(`[EventTestScene] イベントデータが見つかりません: ${item.name}`);
            return;
        }

        // BGM停止
        this.sound.stopByKey('bgm_menu');

        // EventScene を起動
        this.scene.setVisible(false);
        this.scene.pause();
        this.scene.launch('EventScene', {
            events: events,
            returnScene: 'EventTestScene',
            eventId: item.eventId,
            joinCharacterId: item.joinCharId || null,
            from1207Event: item.from1207Event || false,
            from1214Event: item.from1214Event || false,
            from1217Event: item.from1217Event || false,
            from1221Event: item.from1221Event || false,
            from1221WildhuntEvent: item.from1221WildhuntEvent || false,
            fromIkebukuro01Event: item.fromIkebukuro01Event || false,
            fromIkebukuro02Event: item.fromIkebukuro02Event || false,
            fromRespEvent: item.fromRespEvent || false,
            from2R1201Event: item.from2R1201Event || false,
            from2RDevilEvent: item.from2RDevilEvent || false,
            fromDojoEvent: item.fromDojoEvent || false,
            fromJikuEvent: item.fromJikuEvent || false,
            fromTowerRespEvent: item.fromTowerRespEvent || false,
            fromOpTutorial: item.fromOpTutorial || false,
            showDec21Effect: item.showDec21Effect || false
        });
    }
}
