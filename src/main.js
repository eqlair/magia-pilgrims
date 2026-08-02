import Phaser from 'phaser';
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
