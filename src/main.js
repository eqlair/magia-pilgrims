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

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 540,
    height: 960,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
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

