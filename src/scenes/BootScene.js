import Phaser from 'phaser';
import { TransitionManager } from '../systems/TransitionManager';
import { FONT_MAIN, fontSize } from '../config/GameFont';
import { AudioOptimizer } from '../systems/AudioOptimizer';

export default class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        const { width, height } = this.scale;

        // ── 🎨 初期ローディング画面（システムフォント＆軽量図形で即時描画） ──
        this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a16);

        const titleText = this.add.text(width / 2, height / 2 - 50, 'Magia Pilgrims', {
            fontFamily: 'sans-serif',
            fontSize: '22px',
            color: '#ffea77',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const barWidth = 240;
        const barHeight = 8;
        const barBg = this.add.rectangle(width / 2, height / 2 + 10, barWidth, barHeight, 0x1a1a2e).setOrigin(0.5);
        const barFill = this.add.rectangle(width / 2 - barWidth / 2, height / 2 + 10, 0, barHeight, 0xffea77).setOrigin(0, 0.5);

        const progressText = this.add.text(width / 2, height / 2 + 35, 'Now Loading... 0%', {
            fontFamily: 'sans-serif',
            fontSize: '13px',
            color: '#aaaacc'
        }).setOrigin(0.5);

        // HTML側の最速ローディング画面とも連動
        const htmlBar = document.getElementById('loading-bar-fill');
        const htmlText = document.getElementById('loading-text');

        this.load.on('progress', (value) => {
            const percent = Math.floor(value * 100);
            barFill.width = barWidth * value;
            progressText.setText(`Now Loading... ${percent}%`);
            if (htmlBar) htmlBar.style.width = `${percent}%`;
            if (htmlText) htmlText.innerText = `Now Loading... ${percent}%`;
        });

        this.load.on('complete', () => {
            progressText.setText('Now Loading... 100%');
            if (htmlBar) htmlBar.style.width = '100%';
            if (htmlText) htmlText.innerText = 'Now Loading... 100%';
        });

        // キャラクター立ち絵画像（portrait_XXX: アドベンチャー/UI用）
        this.load.image('map_witch', 'files/MAP/map_witch.png');
        this.load.image('daily_roulette', 'files/OP/rour.png');
        this.load.image('dojo_banner', 'files/MAP/dojo.jpg');
        this.load.image('dojo_icon', 'files/MAP/dojo2.jpg');
        this.load.image('jikukan_icon', 'files/MAP/jiku2.jpg');   // 時空館マップボタン
        this.load.image('jikukan_banner', 'files/MAP/jiku.jpg');  // 時空館内部バナー
        
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
        this.load.image('portrait_006', 'files/CHR/006001.png');
        this.load.image('portrait_007', 'files/CHR/007001.png');
        this.load.image('portrait_008', 'files/CHR/008001.png');
        this.load.image('portrait_009', 'files/CHR/009001.png');
        this.load.image('portrait_010', 'files/CHR/010001.png');
        this.load.image('portrait_011', 'files/CHR/011001.png');

        // 2人目用立ち絵 (001001b.png ~ 005001b.png, 007001b.png, 011001b.png)
        this.load.image('portrait_001_b', 'files/CHR/001001b.png');
        this.load.image('portrait_002_b', 'files/CHR/002001b.png');
        this.load.image('portrait_003_b', 'files/CHR/003001b.png');
        this.load.image('portrait_004_b', 'files/CHR/004001b.png');
        this.load.image('portrait_005_b', 'files/CHR/005001b.png');
        this.load.image('portrait_006_b', 'files/CHR/006001b.png');
        this.load.image('portrait_007_b', 'files/CHR/007001.png');
        this.load.image('portrait_008_b', 'files/CHR/008001.png');
        this.load.image('portrait_009_b', 'files/CHR/009001.png');
        this.load.image('portrait_010_b', 'files/CHR/010001b.png');
        this.load.image('portrait_011_b', 'files/CHR/011001b.png');
        this.load.spritesheet('mini_006', 'files/CHR/006002.png', { frameWidth: 150, frameHeight: 150 });
        this.load.spritesheet('mini_006_b', 'files/CHR/006002b.png', { frameWidth: 150, frameHeight: 150 });
        this.load.spritesheet('battle_006_c', 'files/CHR/006002c.png', { frameWidth: 150, frameHeight: 150 });
        this.load.image('shockwave_006', 'files/CHR/006003.png');
        this.load.image('weapon_006_bunker', 'files/CHR/006003b.png');
        this.load.spritesheet('mini_007', 'files/CHR/007002.png', { frameWidth: 150, frameHeight: 150 });
        this.load.spritesheet('mini_008', 'files/CHR/008002.png', { frameWidth: 150, frameHeight: 150 });
        this.load.spritesheet('mini_009', 'files/CHR/009002.png', { frameWidth: 150, frameHeight: 150 });
        this.load.spritesheet('mini_009_adult', 'files/CHR/009002c.png', { frameWidth: 150, frameHeight: 150 });
        this.load.spritesheet('mini_010', 'files/CHR/010002.png', { frameWidth: 150, frameHeight: 150 });
        this.load.spritesheet('mini_010_b', 'files/CHR/010002b.png', { frameWidth: 150, frameHeight: 150 });
        this.load.spritesheet('mini_011', 'files/CHR/011002.png', { frameWidth: 150, frameHeight: 150 });
        this.load.image('weapon_007', 'files/CHR/007003.png');
        this.load.image('weapon_008_orb', 'files/CHR/008003.png');
        this.load.image('weapon_008_bullet', 'files/CHR/008004.png');
        this.load.image('weapon_008_ult_a', 'files/CHR/008004a.png');
        this.load.image('weapon_009', 'files/CHR/090003.png');
        this.load.image('weapon_009_spear', 'files/CHR/090003.png');
        this.load.image('weapon_009_pollen', 'files/CHR/090004.png');
        this.load.image('weapon_010_icicle', 'files/CHR/010003.png');
        this.load.image('weapon_010_iceblock', 'files/CHR/010004.png');
        this.load.image('weapon_011', 'files/CHR/011003.png');
        this.load.image('weapon_011b', 'files/CHR/011003b.png');

        // 戦闘用ミニキャラ・モーション・武器の事前ロード（初回バトル突入時の通信遅延を防止）
        const battleCharIds = ['001', '002', '003', '004', '005', '006', '007', '008', '009', '010', '011'];
        for (const cid of battleCharIds) {
            this.load.spritesheet(`battle_${cid}`, `files/CHR/${cid}002.png`, { frameWidth: 150, frameHeight: 150 });
            this.load.spritesheet(`battle_${cid}_b`, `files/CHR/${cid}002b.png`, { frameWidth: 150, frameHeight: 150 });
        }
        this.load.spritesheet('battle_009_adult', 'files/CHR/009002c.png', { frameWidth: 150, frameHeight: 150 });
        this.load.spritesheet('battle_009_adult_b', 'files/CHR/009002d.png', { frameWidth: 150, frameHeight: 150 });
        this.load.image('weapon_002', 'files/CHR/002003.png');
        this.load.image('weapon_003', 'files/CHR/003003.png');
        this.load.image('weapon_004', 'files/CHR/004003.png');
        this.load.image('weapon_004_ribbon', 'files/CHR/004003b.png');
        this.load.image('weapon_005', 'files/CHR/005003.png');
        this.load.image('weapon_008_ult_b', 'files/CHR/008004b.png');
        this.load.image('nrg', 'files/EFFECT/nrg.png');
        this.load.image('bullet', 'files/CHR/001004.png');
        this.load.image('enemy_bullet', 'files/EFFECT/ball.png');
        this.load.image('bomb', 'files/EFFECT/bomb.png');
        this.load.image('grenade', 'files/CHR/001003.png');
        this.load.image('grenade_explosion', 'files/EFFECT/grenade.png');
        for (let i = 1; i <= 6; i++) {
            this.load.image(`hit_effect${i}`, `files/EFFECT/hit_effect${i}.png`);
        }
        for (let i = 1; i <= 3; i++) {
            this.load.spritesheet(`en00${i}`, `files/ENEMY/en00${i}.png`, { frameWidth: 300, frameHeight: 300 });
            this.load.image(`bg00${i}`, `files/BG_battle/bg00${i}.png`);
        }
        for (let i = 1; i <= 4; i++) {
            this.load.spritesheet(`boss00${i}`, `files/ENEMY/boss00${i}.png`, { frameWidth: 1000, frameHeight: 1000 });
        }
        for (let i = 1; i <= 5; i++) {
            this.load.image(`BG_0${i}`, `files/BG_battle/BG_0${i}.png`);
        }
        this.load.image('floor_a', 'files/BG_battle/floor_a.jpg');
        this.load.image('yuka_enkin01', 'files/BG_battle/yuka_enkin01.jpg');
        this.load.image('yuka_enkin02', 'files/BG_battle/yuka_enkin02.jpg');
        this.load.image('yukamas', 'files/BG_battle/yukamas.jpg');
        this.load.image('toppa_bg_1', 'files/BG_battle/yuka_enkin02.jpg');
        this.load.image('toppa_bg_2', 'files/BG_battle/road_enkin02.jpg');
        this.load.image('toppa_bg_3', 'files/BG_battle/grat_bg01.png');



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
        this.load.image('face_006', 'files/CHR/006p.jpg');
        this.load.image('face_007', 'files/CHR/007p.jpg');
        this.load.image('face_008', 'files/CHR/008p.jpg');
        this.load.image('face_009', 'files/CHR/009p.jpg');
        this.load.image('face_010', 'files/CHR/010p.jpg');
        this.load.image('face_011', 'files/CHR/011p.jpg');
        
        // キャラクター固有トークデータ(JSON)
        this.load.json('talk_001', 'files/CHR/talk_紫苑.json');
        this.load.json('talk_002', 'files/CHR/talk_青樹.json');
        this.load.json('talk_003', 'files/CHR/talk_紅華.json');
        this.load.json('talk_004', 'files/CHR/talk_黄蘭.json');
        this.load.json('talk_005', 'files/CHR/talk_李乃果.json');
        this.load.json('talk_007', 'files/CHR/talk_ななよ.json');
        this.load.json('talk_008', 'files/CHR/talk_ノア.json');
        this.load.json('talk_009', 'files/CHR/talk_リフィエル.json');
        this.load.json('talk_010', 'files/CHR/talk_プロセル.json');
        this.load.json('talk_011', 'files/CHR/talk_白蓮.json');
        
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
        
        // イベント一枚絵 (実在するevp002 ~ 008, 011をロード)
        const validEvpNums = [2, 3, 4, 5, 6, 7, 8, 11];
        for (const i of validEvpNums) {
            const numStr = i.toString().padStart(3, '0');
            this.load.image(`evp${numStr}`, `files/event/evp${numStr}.jpg`);
        }

        // 好感度イベント一枚絵 (evl001 ~ evl011) & イベントデータ
        for (let i = 1; i <= 11; i++) {
            const numStr = i.toString().padStart(3, '0');
            this.load.image(`evl${numStr}`, `files/event/evl${numStr}.jpg`);
        }
        this.load.json('love_events', 'files/DATA/love_events.json');

        // 探索・休息イベント画像
        this.load.image('ev_expr', 'files/event/ev_expr.jpg');
        this.load.image('ev_exprX', 'files/event/ev_exprX.jpg');
        this.load.image('ev_daycamp', 'files/event/ev_daycamp.jpg');
        this.load.image('ev_camp', 'files/event/ev_camp.jpg');
        this.load.image('ev_multiply', 'files/event/multiply.png');

        // 仲間喪失（死亡・離脱）一枚絵
        this.load.image('evx_002', 'files/event/evx002.jpg');
        this.load.image('evx_003', 'files/event/evx003.jpg');
        this.load.image('evx_004', 'files/event/evx005.jpg');
        this.load.image('evx_005', 'files/event/evx006.jpg');
        this.load.image('evx_009', 'files/event/evx009.jpg');
        this.load.image('evx_010', 'files/event/evx011.jpg');
        
        // 12/7, 12/14, 12/21, 周回イベント画像とBGM
        this.load.json('event_1207', 'files/DATA/event_1207.json');
        this.load.image('bg_1207a', 'files/event/1207a.jpg');
        this.load.image('bg_1207b', 'files/event/1207b.jpg');
        this.load.json('event_1214', 'files/DATA/event_1214.json');
        this.load.image('bg_1214a', 'files/event/1214a.jpg');
        this.load.image('bg_1214b', 'files/event/1214b.jpg');
        this.load.json('event_1217', 'files/DATA/event_1217.json');
        this.load.image('bg_1217a', 'files/event/1217a.jpg');
        this.load.image('bg_1217b', 'files/event/1217b.jpg');
        this.load.json('event_1221', 'files/DATA/event_1221.json');
        this.load.json('event_1221wildhunt', 'files/DATA/event_1221wildhunt.json');
        this.load.image('bg_1221a', 'files/event/1221a.jpg');
        this.load.image('bg_1221b', 'files/event/1221b.jpg');
        this.load.image('bg_1221c', 'files/event/1221c.jpg');
        this.load.image('bg_wildhunt', 'files/event/wildhunt.jpg');
        this.load.json('event_resp', 'files/DATA/event_resp.json');
        this.load.json('event_2r1201', 'files/DATA/event_2r1201.json');
        this.load.json('event_2rdevil', 'files/DATA/event_2rdevil.json');
        this.load.json('event_dojo', 'files/DATA/event_dojo.json');
        this.load.json('event_jiku', 'files/DATA/event_jiku.json');
        this.load.image('jiku_cg', 'files/MAP/jiku-.jpg');
        this.load.image('bg_img_m(k,11)r.jpg', 'files/MAP/m(k,11)r.jpg');
        this.load.image('bg_tokyo_d7', 'files/MAP/m(d,7).jpg');
        this.load.image('bg_tow_spo01', 'files/event/tou_spo01.jpg');
        this.load.json('event_tow_res', 'files/DATA/event_tow_res.json');

        // 池袋イベントアセット
        this.load.json('event_ikebukuro01', 'files/DATA/event_ikebukuro01.json');
        this.load.json('event_ikebukuro02', 'files/DATA/event_ikebukuro02.json');
        this.load.image('ikebukuro01', 'files/event/ikebukuro01.jpg');
        this.load.image('ikebukuro02', 'files/event/ikebukuro02.jpg');
        this.load.audio('unknoun_terror', 'files/BGM/unknoun_terror.mp3');

        // タワー21階ボス（プロセル氷像）イベント＆敵アセット
        this.load.json('event_tow21', 'files/DATA/event_tow21.json');
        this.load.json('event_tow21b', 'files/DATA/event_tow21b.json');
        this.load.image('event_tow_21', 'files/event/tow_21.jpg');
        this.load.image('event_tow_21b', 'files/event/tow_21b.jpg');
        this.load.audio('tow_frozen_silence', 'files/BGM/tow_Frozen Silence.mp3');
        this.load.audio('tow_magma_core', 'files/BGM/tow_Magma Core.mp3');
        this.load.audio('tow_black_onyx', 'files/BGM/tow_Black Onyx area.mp3');
        this.load.audio('tow_sakura', 'files/BGM/tow_sakura.mp3');
        this.load.image('enemy_prc_a', 'files/ENEMY/prc_a.png');
        this.load.image('enemy_prc_b', 'files/ENEMY/prc_b.png');

        // タワー編アセット
        this.load.json('map_tower', 'files/DATA/MAP002.json');
        this.load.json('tower_enemies', 'files/DATA/tower_enemies.json');
        this.load.json('hint_53f', 'files/DATA/53Fhint.json');
        this.load.image('bg_tower01', 'files/MAP/tower01.jpg');
        this.load.image('bg_tow1', 'files/MAP/tow1.jpg');
        this.load.image('bg_tow2', 'files/MAP/tow2.jpg');
        this.load.image('bg_tow3', 'files/MAP/tow3.jpg');
        this.load.image('bg_tow4', 'files/MAP/tow4.jpg');
        this.load.image('tow1', 'files/MAP/tow1.jpg');
        this.load.image('tow2', 'files/MAP/tow2.jpg');
        this.load.image('tow3', 'files/MAP/tow3.jpg');
        this.load.image('tow4', 'files/MAP/tow4.jpg');

        // タワー用エリア画像 (ヘクス用 200x200六角形PNG & 画面背景用JPG)
        const towerAreaAssets = {
            '街': { hex: 'files/MAP/hex_01city.png', bg: 'files/MAP/01city.jpg' },
            '石': { hex: 'files/MAP/hex_02boulder.png', bg: 'files/MAP/02boulder.jpg' },
            '樹': { hex: 'files/MAP/hex_03tree.png', bg: 'files/MAP/03tree.jpg' },
            '骨': { hex: 'files/MAP/hex_06skal.png', bg: 'files/MAP/06skal.jpg' },
            '氷': { hex: 'files/MAP/hex_04ice.png', bg: 'files/MAP/04ice.jpg' },
            '顔': { hex: 'files/MAP/hex_07face.png', bg: 'files/MAP/07face.jpg' },
            '炎': { hex: 'files/MAP/hex_05fire.png', bg: 'files/MAP/05fire.jpg' },
            '金': { hex: 'files/MAP/hex_08gold.png', bg: 'files/MAP/08gold.jpg' },
            '異': { hex: 'files/MAP/hex_09al.png', bg: 'files/MAP/09al.jpg' },
            '外': { hex: 'files/MAP/hex_10out.png', bg: 'files/MAP/10out.jpg' },
            '黒': { hex: 'files/MAP/hex_11black.png', bg: 'files/MAP/11black.jpg' },
            '赤': { hex: 'files/MAP/hex_12red.png', bg: 'files/MAP/12red.jpg' },
            '青': { hex: 'files/MAP/hex_16blue.png', bg: 'files/MAP/16blue.jpg' },
            '黄': { hex: 'files/MAP/hex_15yerrow.png', bg: 'files/MAP/15yerrow.jpg' },
            '緑': { hex: 'files/MAP/hex_14green.png', bg: 'files/MAP/14green.jpg' },
            '紫': { hex: 'files/MAP/hex_13purple.png', bg: 'files/MAP/13purple.jpg' },
            '白': { hex: 'files/MAP/hex_17white.png', bg: 'files/MAP/17white.jpg' },
            'top of tower': { hex: 'files/MAP/hex_top_of_tower.png', bg: 'files/MAP/17white.jpg' }
        };
        for (const [key, paths] of Object.entries(towerAreaAssets)) {
            this.load.image(`hex_map_${key}`, paths.hex);
            this.load.image(`tower_bg_${key}`, paths.bg);
            this.load.image(`tower_map_${key}`, paths.hex); // 互換用
        }

        // タワー戦闘背景用画像 (files/BG_battle/)
        const towerBattleBgs = ['街', '石', '樹', '骨', '氷', '顔', '炎', '金', '異', '外', '黒', '赤', '青', '黄', '緑', '紫', '白'];
        for (const key of towerBattleBgs) {
            this.load.image(`battle_bg_${key}`, `files/BG_battle/${key}.jpg`);
        }
        this.load.image('battle_bg_top of tower', 'files/BG_battle/白.jpg');

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
        this.load.audio('002_menu', 'files/BGM/002_menu.mp3');
        this.load.audio('bgm_menu', 'files/BGM/002_menu.mp3');
        this.load.audio('bgm_hexen', 'files/BGM/004_hexen.mp3');
        this.load.audio('bgm_toppa', 'files/BGM/toppa.mp3');
        this.load.audio('bgm_wildhunt', 'files/BGM/wildhunt.mp3');
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
        this.load.audio('se_get', 'files/SOUND/get.mp3');
    }

    create() {
        // ── スマホ向けサウンド最適化初期化 ──
        AudioOptimizer.init(this.game);

        // キャラクターの初期ステータスとストック経験値を初期化 (まだ初期化されていなければ)
        if (this.registry.get('charStats') === undefined) {
            const initialStats = {};
            for (let i = 1; i <= 5; i++) {
                initialStats[`00${i}`] = { level: 1, exp: 0 };
            }
            this.registry.set('charStats', initialStats);
            this.registry.set('stockExp', 0);
        }

        // プロセル巨大ボス用テクスチャ結合 (enemy_prc_a: 上半身 + enemy_prc_b: 下半身 = 342x584)
        if (this.textures.exists('enemy_prc_a') && this.textures.exists('enemy_prc_b')) {
            if (!this.textures.exists('enemy_prc_full')) {
                const canvas = this.textures.createCanvas('enemy_prc_full', 342, 584);
                if (canvas) {
                    const ctx = canvas.getContext();
                    const imgA = this.textures.get('enemy_prc_a').getSourceImage();
                    const imgB = this.textures.get('enemy_prc_b').getSourceImage();
                    if (imgA && imgB) {
                        ctx.drawImage(imgA, 0, 0);
                        // 下半身は床下に埋まって透けて見えている表現のため半透明(alpha 0.60)で描画
                        ctx.globalAlpha = 0.60;
                        ctx.drawImage(imgB, 0, 292);
                        ctx.globalAlpha = 1.0;
                        canvas.refresh();
                    }
                }
            }
        }

        // タイトル動画を非表示にする（他シーンから戻ってきた場合も含む）
        const video = document.getElementById('title-video');
        if (video) video.style.display = 'none';

        TransitionManager.fadeIn(this);

        const { width, height } = this.scale;

        // HTMLローディング画面のフェードアウト消去
        const hideLoadingScreen = () => {
            const htmlLoading = document.getElementById('loading-screen');
            if (htmlLoading) {
                htmlLoading.style.opacity = '0';
                setTimeout(() => {
                    if (htmlLoading.parentNode) {
                        htmlLoading.parentNode.removeChild(htmlLoading);
                    }
                }, 500);
            }
        };

        // ── フォント読み込み完了を待ってからタイトルへ遷移 ──
        let transitioned = false;
        const goToTitle = () => {
            if (transitioned) return;
            transitioned = true;
            hideLoadingScreen();
            TransitionManager.transitionTo(this, 'TitleScene');
        };

        document.fonts.ready.then(() => {
            this.time.delayedCall(200, goToTitle);
        });

        // フォールバック（フォントイベントが来ない場合でも最大2秒で遷移）
        this.time.delayedCall(2000, goToTitle);
    }
}
