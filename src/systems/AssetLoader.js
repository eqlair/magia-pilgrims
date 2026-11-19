import { LoadingOverlay } from './LoadingOverlay';
import { GlobalState } from './GlobalState';

/**
 * AssetLoader.js
 * ゲーム全体のアセット遅延（オンデマンド）ロードおよびメモリ管理システム
 */

export const BGM_MANIFEST = {
    // タイトル・メニュー
    'bgm_op': 'files/BGM/001_OP001.mp3',
    'op_start': 'files/OP/start.mp3',
    '002_menu': 'files/BGM/002_menu.mp3',
    'bgm_menu': 'files/BGM/002_menu.mp3',

    // 地上マップ・探索
    'bgm_hexen': 'files/BGM/004_hexen.mp3',
    'bgm_toppa': 'files/BGM/toppa.mp3',
    'bgm_camp': 'files/BGM/camp_BGM.mp3',
    'bgm_result': 'files/BGM/008_fan-37.mp3',
    'bgm_tarot': 'files/BGM/006_TAROT.mp3',
    'JOIN_US': 'files/BGM/005_JOIN_US.mp3',

    // 戦闘（地上・汎用）
    'bgm_battle1': 'files/BGM/battole_001.mp3',
    'bgm_battle2': 'files/BGM/battole_002.mp3',
    'bgm_battle3': 'files/BGM/battole_003.mp3',
    'bgm_battle4': 'files/BGM/battole_004.mp3',
    'bgm_boss1': 'files/BGM/BOSS001.mp3',
    'bgm_boss2': 'files/BGM/BOSS002.mp3',
    'bgm_boss3': 'files/BGM/BOSS003.mp3',
    'bgm_boss_kraken': 'files/BGM/BOSS002.mp3',

    // イベント・特殊戦闘
    'bgm_resp': 'files/BGM/resporn.mp3',
    'bgm_star': 'files/BGM/star.mp3',
    'bgm_bad': 'files/BGM/bad.mp3',
    'bgm_wildhunt': 'files/BGM/wildhunt.mp3',
    'unknoun_terror': 'files/BGM/unknoun_terror.mp3',
    'tow_Kraken': 'files/BGM/tow_Kraken.mp3',

    // タワーBGM
    'tow_frozen_silence': 'files/BGM/tow_Frozen Silence.mp3',
    'tow_frozen_silence_b': 'files/BGM/tow_Frozen SilenceB.mp3',
    'tow_magma_core': 'files/BGM/tow_Magma Core.mp3',
    'tow_magma_core_b': 'files/BGM/tow_Magma CoreB.mp3',
    'tow_black_onyx': 'files/BGM/tow_Black Onyx area.mp3',
    'tow_black_onyx_b': 'files/BGM/tow_Black Onyx areaB.mp3',
    'tow_sakura': 'files/BGM/tow_sakura.mp3',
    'bgm_inferno_shredder_x': 'files/BGM/Inferno Shredder X.mp3',
};

export const TOWER_AREA_MANIFEST = {
    '街': { hex: 'files/MAP/hex_01city.webp', bg: 'files/MAP/01city.webp', battleBg: 'files/BG_battle/街.webp', bgm: 'bgm_toppa' },
    '石': { hex: 'files/MAP/hex_02boulder.webp', bg: 'files/MAP/02boulder.webp', battleBg: 'files/BG_battle/石.webp', bgm: 'bgm_toppa' },
    '樹': { hex: 'files/MAP/hex_03tree.webp', bg: 'files/MAP/03tree.webp', battleBg: 'files/BG_battle/樹.webp', bgm: 'bgm_toppa' },
    '骨': { hex: 'files/MAP/hex_06skal.webp', bg: 'files/MAP/06skal.webp', battleBg: 'files/BG_battle/骨.webp', bgm: 'bgm_toppa' },
    '氷': { hex: 'files/MAP/hex_04ice.webp', bg: 'files/MAP/04ice.webp', battleBg: 'files/BG_battle/氷.webp', bgm: 'tow_frozen_silence' },
    '顔': { hex: 'files/MAP/hex_07face.webp', bg: 'files/MAP/07face.webp', battleBg: 'files/BG_battle/顔.webp', bgm: 'bgm_toppa' },
    '炎': { hex: 'files/MAP/hex_05fire.webp', bg: 'files/MAP/05fire.webp', battleBg: 'files/BG_battle/炎.webp', bgm: 'tow_magma_core' },
    '金': { hex: 'files/MAP/hex_08gold.webp', bg: 'files/MAP/08gold.webp', battleBg: 'files/BG_battle/金.webp', bgm: 'bgm_toppa' },
    '異': { hex: 'files/MAP/hex_09al.webp', bg: 'files/MAP/09al.webp', battleBg: 'files/BG_battle/異.webp', bgm: 'bgm_toppa' },
    '外': { hex: 'files/MAP/hex_10out.webp', bg: 'files/MAP/10out.webp', battleBg: 'files/BG_battle/外.webp', bgm: 'bgm_toppa' },
    '黒': { hex: 'files/MAP/hex_11black.webp', bg: 'files/MAP/11black.webp', battleBg: 'files/BG_battle/黒.webp', bgm: 'tow_black_onyx' },
    '赤': { hex: 'files/MAP/hex_12red.webp', bg: 'files/MAP/12red.webp', battleBg: 'files/BG_battle/赤.webp', bgm: 'tow_black_onyx' },
    '青': { hex: 'files/MAP/hex_16blue.webp', bg: 'files/MAP/16blue.webp', battleBg: 'files/BG_battle/青.webp', bgm: 'tow_black_onyx' },
    '黄': { hex: 'files/MAP/hex_15yerrow.webp', bg: 'files/MAP/15yerrow.webp', battleBg: 'files/BG_battle/黄.webp', bgm: 'tow_black_onyx' },
    '緑': { hex: 'files/MAP/hex_14green.webp', bg: 'files/MAP/14green.webp', battleBg: 'files/BG_battle/緑.webp', bgm: 'tow_black_onyx' },
    '紫': { hex: 'files/MAP/hex_13purple.webp', bg: 'files/MAP/13purple.webp', battleBg: 'files/BG_battle/紫.webp', bgm: 'tow_black_onyx' },
    '白': { hex: 'files/MAP/hex_17white.webp', bg: 'files/MAP/17white.webp', battleBg: 'files/BG_battle/白.webp', bgm: 'tow_sakura' },
    'top of tower': { hex: 'files/MAP/hex_top_of_tower.webp', bg: 'files/MAP/17white.webp', battleBg: 'files/BG_battle/白.webp', bgm: 'tow_sakura' }
};

export class AssetLoader {
    /**
     * 指定した複数のアセットがロード済みかチェックし、未ロードのものだけを画面オーバーレイ付きでロード
     * @param {Phaser.Scene} scene 
     * @param {Array<{type: 'image'|'audio'|'json'|'spritesheet', key: string, url: string, [config]: any}>} assetList 
     * @param {Function} onComplete 
     * @param {string} [loadingText='Now Loading...'] 
     */
    static ensureAssets(scene, assetList, onComplete, loadingText = 'Now Loading...') {
        if (!scene || !scene.load) {
            if (onComplete) onComplete();
            return;
        }

        // 未ロードのアセットをフィルタリング
        const unLoaded = (assetList || []).filter(item => {
            if (!item || !item.key) return false;
            switch (item.type) {
                case 'image':
                    return !scene.textures.exists(item.key);
                case 'audio':
                    return !scene.cache.audio.exists(item.key);
                case 'json':
                    return !scene.cache.json.exists(item.key);
                case 'spritesheet':
                    return !scene.textures.exists(item.key);
                default:
                    return !scene.textures.exists(item.key);
            }
        });

        if (unLoaded.length === 0) {
            if (onComplete) onComplete();
            return;
        }

        // ローディング画面を表示
        LoadingOverlay.show(scene, loadingText);
        LoadingOverlay.setProgress(scene, 10);

        // キューに追加
        unLoaded.forEach(item => {
            try {
                if (item.type === 'image') {
                    scene.load.image(item.key, item.url);
                } else if (item.type === 'audio') {
                    scene.load.audio(item.key, item.url);
                } else if (item.type === 'json') {
                    scene.load.json(item.key, item.url);
                } else if (item.type === 'spritesheet') {
                    scene.load.spritesheet(item.key, item.url, item.config || { frameWidth: 150, frameHeight: 150 });
                }
            } catch (e) {
                console.warn('[AssetLoader] Failed to queue asset:', item.key, e);
            }
        });

        // 進捗リスナー
        const onProgress = (val) => {
            LoadingOverlay.setProgress(scene, 10 + val * 85);
        };
        scene.load.on('progress', onProgress);

        // 完了リスナー
        scene.load.once('complete', () => {
            scene.load.off('progress', onProgress);
            LoadingOverlay.setProgress(scene, 100);
            scene.time.delayedCall(120, () => {
                LoadingOverlay.hide(scene, () => {
                    if (onComplete) onComplete();
                });
            });
        });

        // ロード開始
        scene.load.start();
    }

    /**
     * BGMの遅延ロードを安全に実行
     * @param {Phaser.Scene} scene 
     * @param {string} bgmKey 
     * @param {Function} [onReady] 
     * @param {boolean} [showOverlay=false] 
     */
    static ensureBgm(scene, bgmKey, onReady, showOverlay = false) {
        if (!scene || !scene.load) {
            if (onReady) onReady();
            return;
        }

        // 既にキャッシュにあれば即座に完了
        if (scene.cache.audio.exists(bgmKey)) {
            if (onReady) onReady();
            return;
        }

        const path = BGM_MANIFEST[bgmKey];
        if (!path) {
            console.warn(`[AssetLoader] Unknown BGM key: ${bgmKey}`);
            if (onReady) onReady();
            return;
        }

        const asset = [{ type: 'audio', key: bgmKey, url: path }];
        if (showOverlay) {
            this.ensureAssets(scene, asset, onReady, 'Audio Loading...');
        } else {
            // オーバーレイなし（バックグラウンドロード）
            try {
                let called = false;
                const done = () => {
                    if (called) return;
                    called = true;
                    scene.load.off(`filecomplete-audio-${bgmKey}`, done);
                    scene.load.off('complete', done);
                    scene.load.off('loaderror', onError);
                    if (onReady) onReady();
                };
                const onError = (fileObj) => {
                    if (fileObj && fileObj.key === bgmKey) {
                        console.warn(`[AssetLoader] Load error for BGM: ${bgmKey}`);
                        done();
                    }
                };
                scene.load.audio(bgmKey, path);
                scene.load.once(`filecomplete-audio-${bgmKey}`, done);
                scene.load.once('complete', done);
                scene.load.on('loaderror', onError);
                if (!scene.load.isLoading()) {
                    scene.load.start();
                }
            } catch (e) {
                console.warn('[AssetLoader] Failed to load BGM:', bgmKey, e);
                if (onReady) onReady();
            }
        }
    }

    /**
     * タワー指定エリアのアセット（hex, bg, battleBg, bgm）をロード
     * @param {Phaser.Scene} scene 
     * @param {string} areaName 
     * @param {Function} [onComplete] 
     */
    static ensureTowerAreaAssets(scene, areaName, onComplete) {
        const manifest = TOWER_AREA_MANIFEST[areaName] || TOWER_AREA_MANIFEST['街'];
        const assets = [
            { type: 'image', key: `hex_map_${areaName}`, url: manifest.hex },
            { type: 'image', key: `tower_bg_${areaName}`, url: manifest.bg },
            { type: 'image', key: `battle_bg_${areaName}`, url: manifest.battleBg },
        ];
        if (manifest.bgm && BGM_MANIFEST[manifest.bgm]) {
            assets.push({ type: 'audio', key: manifest.bgm, url: BGM_MANIFEST[manifest.bgm] });
        }

        this.ensureAssets(scene, assets, onComplete, `Loading Tower ${areaName}...`);
    }

    /**
     * タロットカード全23枚の遅延ロード
     * @param {Phaser.Scene} scene 
     * @param {Function} [onComplete] 
     */
    static ensureTarotAssets(scene, onComplete) {
        const assets = [];
        for (let i = 0; i <= 22; i++) {
            assets.push({ type: 'image', key: `tarot_${i}`, url: `files/tarot/tc (${i}).webp` });
        }
        if (BGM_MANIFEST['bgm_tarot']) {
            assets.push({ type: 'audio', key: 'bgm_tarot', url: BGM_MANIFEST['bgm_tarot'] });
        }

        this.ensureAssets(scene, assets, onComplete, 'Loading Tarot...');
    }

    /**
     * クラーケン戦闘アセット（敵画像・背景・BGM）の遅延ロード
     * @param {Phaser.Scene} scene 
     * @param {Function} [onComplete] 
     */
    static ensureKrakenAssets(scene, onComplete) {
        const assets = [
            { type: 'image', key: 'KrakenBG', url: 'files/BG_battle/KrakenBG.jpg' },
            { type: 'image', key: 'kraken_bg', url: 'files/BG_battle/KrakenBG.jpg' },
            { type: 'image', key: 'KrakenA', url: 'files/ENEMY/KrakenA.png' },
            { type: 'image', key: 'KrakenB', url: 'files/ENEMY/KrakenB.png' },
            { type: 'image', key: 'KrakenC', url: 'files/ENEMY/KrakenC.png' },
            { type: 'image', key: 'kraken_a', url: 'files/ENEMY/KrakenA.png' },
            { type: 'image', key: 'kraken_b', url: 'files/ENEMY/KrakenB.png' },
            { type: 'image', key: 'kraken_c', url: 'files/ENEMY/KrakenC.png' },
            { type: 'audio', key: 'tow_Kraken', url: 'files/BGM/tow_Kraken.mp3' },
            { type: 'audio', key: 'unknoun_terror', url: 'files/BGM/unknoun_terror.mp3' },
        ];
        this.ensureAssets(scene, assets, onComplete, 'Loading Kraken Battle...');
    }

    /**
     * ワイルドハント（12/21夜）イベントアセット（背景・BGM）の直前遅延ロード
     * @param {Phaser.Scene} scene 
     * @param {Function} [onComplete] 
     */
    static ensureWildhuntAssets(scene, onComplete) {
        const assets = [
            { type: 'image', key: 'bg_wildhunt', url: 'files/event/wildhunt.webp' },
            { type: 'audio', key: 'bgm_wildhunt', url: 'files/BGM/wildhunt.mp3' },
        ];
        this.ensureAssets(scene, assets, onComplete, 'Now Loading Wildhunt...');
    }

    /**
     * バッドエンド・リスポーン（event_resp / event_tow_res）アセットの直前遅延ロード
     * @param {Phaser.Scene} scene 
     * @param {boolean} [isTower=false]
     * @param {Function} [onComplete] 
     */
    static ensureRespawnAssets(scene, isTower = false, onComplete) {
        const assets = [];
        if (isTower) {
            assets.push({ type: 'image', key: 'bg_tow_spo01', url: 'files/event/tou_spo01.webp' });
            assets.push({ type: 'audio', key: 'unknoun_terror', url: 'files/BGM/unknoun_terror.mp3' });
        } else {
            const gs = GlobalState.getInstance();
            const currentLoop = gs.loopCount || 1;
            if (currentLoop >= 3) {
                assets.push({ type: 'audio', key: 'bgm_op', url: 'files/BGM/001_OP001.mp3' });
                let imgKey = '';
                if (currentLoop === 3) imgKey = '06紫苑×さくら(表)Ar';
                else if (currentLoop === 4) imgKey = '07紫苑×さくら(裏)Ar';
                else if (currentLoop === 5) imgKey = '06紫苑×さくら(表)Br';
                else if (currentLoop === 6) imgKey = '07紫苑×さくら(裏)Br';
                else if (currentLoop % 2 === 1) imgKey = '06紫苑×さくら(表)Br';
                else imgKey = '07紫苑×さくら(裏)Br';

                assets.push({ type: 'image', key: imgKey, url: `files/event2/${imgKey}.jpg` });
            } else {
                assets.push({ type: 'image', key: 'bg_resp', url: 'files/event/resp.webp' });
                assets.push({ type: 'audio', key: 'bgm_resp', url: 'files/BGM/resporn.mp3' });
            }
        }
        this.ensureAssets(scene, assets, onComplete, 'Now Loading...');
    }

    /**
     * 未使用BGMのオーディオキャッシュ（PCM生データ）を解放し、モバイル端末のRAM圧迫を防止する
     * @param {Phaser.Scene} scene 対象シーン
     * @param {Array<string>|string} [preserveKeys=[]] 解放から除外するBGMキー（再生中など）
     */
    static cleanupUnusedBgms(scene, preserveKeys = []) {
        if (!scene || !scene.cache || !scene.cache.audio) return;

        const keepList = Array.isArray(preserveKeys) ? [...preserveKeys] : [preserveKeys];
        // 常に常駐させておきたい基幹サウンド（タイトル、地上基本、メニュー、基本SE、戦闘・ボス・リザルト等）
        const CORE_KEYS = new Set([
            'bgm_op', 'bgm_menu', 'bgm_hexen', 'bgm_camp', 'bgm_resp', 'bgm_battle1', 'bgm_battle2', 'bgm_battle3', 'bgm_battle4',
            'bgm_boss1', 'bgm_boss2', 'bgm_boss3', 'bgm_boss_kraken', 'bgm_toppa', 'bgm_wildhunt',
            'bgm_result', 'bgm_tarot', 'JOIN_US', 'op_start',
            'se_get', 'se_bomb', 'se_click', 'se_powerup', 'se_card', 'se_awaken_boss'
        ]);

        // 現在シーンで実際に鳴っているサウンドのキーを収集
        if (scene.sound && scene.sound.sounds) {
            scene.sound.sounds.forEach(snd => {
                if (snd && snd.isPlaying && snd.key) {
                    keepList.push(snd.key);
                }
            });
        }

        const keepSet = new Set(keepList.filter(Boolean));

        // BGM_MANIFEST に登録されている全BGMを走査
        let releasedCount = 0;
        for (const [bgmKey] of Object.entries(BGM_MANIFEST)) {
            if (CORE_KEYS.has(bgmKey) || keepSet.has(bgmKey)) {
                continue;
            }

            // キャッシュに存在し、現在再生中でないなら解放
            if (scene.cache.audio.exists(bgmKey)) {
                try {
                    // もしインスタンスがあれば停止＆破棄
                    if (scene.sound) {
                        const existing = scene.sound.get(bgmKey);
                        if (existing) {
                            if (existing.isPlaying) continue;
                            existing.destroy();
                        }
                    }
                    scene.cache.audio.remove(bgmKey);
                    releasedCount++;
                } catch (e) {
                    // ignore
                }
            }
        }

        if (releasedCount > 0) {
            console.log(`[AssetLoader] 🧹 Released ${releasedCount} unused BGM PCM buffers from RAM.`);
        }
    }
}
