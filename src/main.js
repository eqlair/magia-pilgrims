import Phaser from 'phaser';
import { App } from '@capacitor/app';

import BootScene from './scenes/BootScene';
import TitleScene from './scenes/TitleScene';
import DemoScene from './scenes/DemoScene';
import TransitionTestScene from './scenes/TransitionTestScene';
import OpScene from './scenes/OpScene';
import OpEndScene from './scenes/OpEndScene';
import MapTestScene from './scenes/MapTestScene';
import AdventureScene from './scenes/AdventureScene';
import EquipmentScene from './scenes/EquipmentScene';
import BattleScene from './scenes/BattleScene';
import EventScene from './scenes/EventScene';
import TarotScene from './scenes/TarotScene';
import ResultScene from './scenes/ResultScene';
import CampScene from './scenes/CampScene';
import RestScene from './scenes/RestScene';
import FormationScene from './scenes/FormationScene';
import { DebugMenuScene } from './scenes/DebugMenuScene';

// --- 画面上エラーオーバーレイシステム ---

window.__DEBUG_ERRORS__ = [];
window.showOnScreenError = function(msg, stack) {
    try {
        console.warn("[ON-SCREEN-ERROR]", msg, stack);
        window.__DEBUG_ERRORS__.push({ msg: String(msg), stack: String(stack || ''), time: new Date().toLocaleTimeString() });
        
        let el = document.getElementById('debug-error-overlay');
        if (!el) {
            el = document.createElement('div');
            el.id = 'debug-error-overlay';
            el.style.cssText = 'position:fixed;top:0;left:0;width:100%;max-height:60vh;overflow-y:auto;background:rgba(180,0,0,0.95);color:#fff;font-family:monospace;font-size:11px;padding:10px;z-index:9999999;box-sizing:border-box;border-bottom:4px solid #ff8888;word-break:break-all;box-shadow:0 4px 12px rgba(0,0,0,0.5);';
            document.body.appendChild(el);
        }
        
        let html = '<div style="font-weight:bold;font-size:13px;">🚨 [実機画面エラーログ表示] <button onclick="document.getElementById(\'debug-error-overlay\').remove()" style="float:right;background:#fff;color:#d00;font-weight:bold;border:none;padding:2px 8px;border-radius:4px;">閉じる</button></div><hr style="border-color:#ffaaaa;margin:4px 0;">';
        window.__DEBUG_ERRORS__.slice(-5).reverse().forEach(err => {
            html += `<div style="margin-bottom:8px;border-bottom:1px dashed #ffaaaa;padding-bottom:4px;">
                <span style="color:#ffff88;font-weight:bold;">[${err.time}]</span> <b style="color:#ffffff;">${err.msg}</b><br>
                <pre style="margin:2px 0;font-size:10px;color:#ffdddd;white-space:pre-wrap;background:rgba(0,0,0,0.4);padding:4px;border-radius:3px;">${err.stack || ''}</pre>
            </div>`;
        });
        el.innerHTML = html;
    } catch (e) {
        // fallback
    }
};

window.onerror = function(message, source, lineno, colno, error) {
    const stack = error && error.stack ? error.stack : `${source}:${lineno}:${colno}`;
    window.showOnScreenError(message, stack);
};

window.addEventListener('unhandledrejection', function(e) {
    const msg = e.reason ? (e.reason.message || e.reason) : 'Unhandled Rejection';
    const stack = e.reason && e.reason.stack ? e.reason.stack : '';
    window.showOnScreenError(msg, stack);
});

const config = {

    type: Phaser.AUTO,
    parent: 'game-container',
    width: 540,
    height: 960,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        orientation: Phaser.Scale.Orientation.PORTRAIT
    },
    // スプライト縮小時のアンチエイリアス（バイリニアフィルタリング）
    antialias: true,
    antialiasGL: true,
    // ピクセルアートモードOFF（ドット絵ではなく滑らかな縮小補間を使用）
    pixelArt: false,
    // canvasは透明にして背面の動画が見えるようにする
    transparent: true,
    scene: [BootScene, TitleScene, DemoScene, TransitionTestScene, OpScene, OpEndScene, MapTestScene, AdventureScene, BattleScene, EventScene, TarotScene, ResultScene, CampScene, EquipmentScene, RestScene, FormationScene, DebugMenuScene]
};


export const game = new Phaser.Game(config);
window.game = game;

// ── バックグラウンド自動消音・一時停止（App LifeCycle & Web Visibility API）──
const handleAppPause = () => {
    console.log('[App] Background paused - stopping audio');
    if (game && game.sound) {
        game.sound.pauseAll();
    }
};

const handleAppResume = () => {
    console.log('[App] Foreground resumed - resuming audio');
    if (game && game.sound) {
        game.sound.resumeAll();
    }
};

// 1. Capacitor アプリライフサイクルイベント
App.addListener('pause', handleAppPause);
App.addListener('resume', handleAppResume);

// 2. ブラウザ / WebView 標準の Visibility Change イベント（タスク切替・ホーム画面移動の確実な検知）
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        handleAppPause();
    } else {
        handleAppResume();
    }
});

// 3. ウィンドウフォーカス喪失時も保険で一時停止
window.addEventListener('blur', handleAppPause);
window.addEventListener('focus', handleAppResume);

