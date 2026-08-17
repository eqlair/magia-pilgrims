import Phaser from 'phaser';
import { TransitionManager } from '../systems/TransitionManager';
import { FONT_MAIN, fontSize } from '../config/GameFont';

export default class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // キャラクター立ち絵画像（portrait_XXX: アドベンチャー/UI用）
        this.load.image('map_witch', 'files/MAP/map_witch.png');
        
        // マップエフェクト
        for (let i = 1; i <= 5; i++) {
            this.load.image(`map_eff${i}`, `files/MAP/map_eff${i}.jpg`);
        }
        this.load.image('bg_dec21_effect', 'files/BG_battle/BG_06.png');

        // 文字・数字スプライトフォント (13列x3行, 30x60px)
        this.load.spritesheet('letterS', 'files/CHR/letterS.png', { frameWidth: 30, frameHeight: 60 });

        this.load.image('warn001', 'files/EFFECT/warn001.png');
        this.load.image('slash', 'files/EFFECT/slash.png');


        this.load.image('portrait_001', 'files/CHR/001001.png');
        this.load.image('portrait_002', 'files/CHR/002001.png');
        this.load.image('portrait_003', 'files/CHR/003001.png');
        this.load.image('portrait_004', 'files/CHR/004001.png');
        this.load.image('portrait_005', 'files/CHR/005001.png');
        this.load.image('portrait_010', 'files/CHR/011001.png');

        // 2人目用立ち絵 (001001b.png ~ 005001b.png, 011001b.png)
        this.load.image('portrait_001_b', 'files/CHR/001001b.png');
        this.load.image('portrait_002_b', 'files/CHR/002001b.png');
        this.load.image('portrait_003_b', 'files/CHR/003001b.png');
        this.load.image('portrait_004_b', 'files/CHR/004001b.png');
        this.load.image('portrait_005_b', 'files/CHR/005001b.png');
        this.load.image('portrait_010_b', 'files/CHR/011001b.png');
        this.load.spritesheet('mini_010', 'files/CHR/011002.png', { frameWidth: 150, frameHeight: 150 });
        this.load.image('weapon_010', 'files/CHR/011003.png');
        this.load.image('weapon_010b', 'files/CHR/011003b.png');



        // 属性アイコン
        for (let i = 1; i <= 5; i++) {
            this.load.image(`em_${i}`, `files/CHR/em_${i}.png`);
        }
        this.load.image('emb_0', 'files/CHR/emb_0.png');

        // 顔画像 (Result / Status画面用)
        for (let i = 1; i <= 5; i++) {
            this.load.image(`face_00${i}`, `files/CHR/00${i}p.jpg`);
            
            // 編成画面やマップ画面用のミニキャラ（600x300, 4列×2行 = 150x150/フレーム）
            const filePrefix = `00${i}002`;
            this.load.spritesheet(`mini_00${i}`, `files/CHR/${filePrefix}.png`, { frameWidth: 150, frameHeight: 150 });


        }
        this.load.image('face_010', 'files/CHR/011p.jpg');
        
        // キャラクター固有トークデータ(JSON)
        this.load.json('talk_001', 'files/CHR/talk_紫苑.json');
        this.load.json('talk_002', 'files/CHR/talk_青樹.json');
        this.load.json('talk_003', 'files/CHR/talk_紅華.json');
        this.load.json('talk_004', 'files/CHR/talk_黄蘭.json');
        this.load.json('talk_005', 'files/CHR/talk_李乃果.json');
        
        // タロットデータとイベントとキャラデータ
        this.load.json('tarot_data', 'files/DATA/tarot.json');
        this.load.json('join_events', 'files/DATA/join_events.json');
        this.load.json('chr_data', 'files/DATA/chr_data.json');
        this.load.json('tips', 'files/DATA/tips.json');
        this.load.json('tips_battle', 'files/DATA/tips_battle.json');
        this.load.json('op_event', 'files/OP/op_event.json');
        this.load.json('tutorial_morning', 'files/DATA/tutorial_morning.json');
        this.load.json('tutorial_afternoon', 'files/DATA/tutorial_afternoon.json');
        this.load.json('tutorial_night', 'files/DATA/tutorial_night.json');
        this.load.json('tutorial_rest', 'files/DATA/tutorial_rest.json');
        this.load.json('tutorial_gameover', 'files/DATA/tutorial_gameover.json');







        for (let i = 0; i <= 22; i++) {
            this.load.image(`tarot_${i}`, `files/tarot/tc (${i}).jpg`);
        }
        
        // イベント一枚絵 (evp002 ~ evp015)
        for (let i = 2; i <= 15; i++) {
            const numStr = i.toString().padStart(3, '0');
            this.load.image(`evp${numStr}`, `files/event/evp${numStr}.jpg`);
        }

        // 探索・休息イベント画像
        this.load.image('ev_expr', 'files/event/ev_expr.jpg');
        this.load.image('ev_daycamp', 'files/event/ev_daycamp.jpg');
        this.load.image('ev_camp', 'files/event/ev_camp.jpg');
        
        // 12/7, 12/14, 12/21, 周回イベント画像とBGM
        this.load.json('event_1207', 'files/DATA/event_1207.json');
        this.load.image('bg_1207a', 'files/event/1207a.jpg');
        this.load.image('bg_1207b', 'files/event/1207b.jpg');
        this.load.json('event_1214', 'files/DATA/event_1214.json');
        this.load.image('bg_1214a', 'files/event/1214a.jpg');
        this.load.image('bg_1214b', 'files/event/1214b.jpg');
        this.load.json('event_1221', 'files/DATA/event_1221.json');
        this.load.json('event_1221wildhunt', 'files/DATA/event_1221wildhunt.json');
        this.load.image('bg_1221a', 'files/event/1221a.jpg');
        this.load.image('bg_1221b', 'files/event/1221b.jpg');
        this.load.image('bg_1221c', 'files/event/1221c.jpg');
        this.load.image('bg_wildhunt', 'files/event/wildhunt.jpg');
        this.load.json('event_resp', 'files/DATA/event_resp.json');

        // 池袋イベントアセット
        this.load.json('event_ikebukuro01', 'files/DATA/event_ikebukuro01.json');
        this.load.json('event_ikebukuro02', 'files/DATA/event_ikebukuro02.json');
        this.load.image('ikebukuro01', 'files/event/ikebukuro01.jpg');
        this.load.image('ikebukuro02', 'files/event/ikebukuro02.jpg');
        this.load.audio('unknoun_terror', 'files/BGM/unknoun_terror.mp3');

        this.load.image('bg_resp', 'files/event/resp.jpg');
        this.load.audio('bgm_resp', 'files/BGM/resporn.mp3');
        this.load.audio('bgm_star', 'files/BGM/star.mp3');
        this.load.audio('bgm_bad', 'files/BGM/bad.mp3');
        this.load.audio('bgm_op', 'files/BGM/001_OP001.mp3');
        this.load.image('op_title', 'files/OP/title.png');
        this.load.audio('op_start', 'files/OP/start.mp3');


        
        // BGM
        this.load.audio('bgm_tarot', 'files/BGM/006_TAROT.mp3');
        this.load.audio('JOIN_US', 'files/BGM/005_JOIN_US.mp3');
        this.load.audio('bgm_hexen', 'files/BGM/004_hexen.mp3');
        this.load.audio('bgm_result', 'files/BGM/008_fan-37.mp3');
        this.load.audio('se_awaken_boss', 'files/SOUND/awaken_boss.mp3');
        this.load.audio('se_bossbomb', 'files/SOUND/bossbomb002x.mp3');
        this.load.audio('bgm_camp', 'files/BGM/camp_BGM.mp3');
        
        for (let i = 1; i <= 4; i++) {
            this.load.audio(`bgm_battle${i}`, `files/BGM/battole_00${i}.mp3`);
        }
        for (let i = 1; i <= 3; i++) {
            this.load.audio(`bgm_boss${i}`, `files/BGM/BOSS00${i}.mp3`);
        }
    }

    create() {
        // キャラクターの初期ステータスとストック経験値を初期化 (まだ初期化されていなければ)
        if (this.registry.get('charStats') === undefined) {
            const initialStats = {};
            for (let i = 1; i <= 5; i++) {
                initialStats[`00${i}`] = { level: 1, exp: 0 };
            }
            this.registry.set('charStats', initialStats);
            this.registry.set('stockExp', 0);
        }

        // タイトル動画を非表示にする（他シーンから戻ってきた場合も含む）
        const video = document.getElementById('title-video');
        if (video) video.style.display = 'none';

        TransitionManager.fadeIn(this);

        const { width, height } = this.scale;

        this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a1a);
        
        // 実際のゲームではTitleSceneへ
        this.time.delayedCall(1000, () => {
            this.scene.start('TitleScene', {
                loadedAt: new Date().toISOString()
            });
        });

        this.add.text(width / 2, height / 2, 'Loading...', {
            fontFamily: FONT_MAIN,
            fontSize: fontSize.medium(width),
            color: '#ffffff'
        }).setOrigin(0.5);

        // ── フォント読み込み完了を待ってからタイトルへ遷移 ──
        // document.fonts.ready は Google Fonts 含む全フォントが
        // 読み込まれた後に解決する Promise。
        // これを待つことで「フォント未ロードのままテキスト描画」を防ぐ。
        document.fonts.ready.then(() => {
            // フォント読み込み完了後、少し待ってからタイトルへ
            this.time.delayedCall(300, () => {
                TransitionManager.transitionTo(this, 'TitleScene');
            });
        });
    }
}
