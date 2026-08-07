import Phaser from 'phaser';
import { TransitionManager } from '../systems/TransitionManager';
import { EventEngine } from '../systems/EventEngine';

export default class OpScene extends Phaser.Scene {
    constructor() {
        super('OpScene');
    }

    preload() {
        // OP用のアセットをロード
        this.load.image('ev001', '/files/OP/ev001.jpg');
        this.load.image('ev002', '/files/OP/ev002.jpg');
        this.load.image('ev003', '/files/OP/ev003.jpg');
        this.load.image('evp001', '/files/OP/evp001.jpg');
        
        this.load.audio('bgm_hoshi', '/files/BGM/003_hoshihuru.mp3');
        this.load.audio('bgm_mad', '/files/BGM/007_stage_mad.mp3');
        this.load.audio('se_bomb', '/files/OP/bomb.mp3');

        // シナリオデータをロード
        this.load.json('op_event', '/files/OP/op_event.json');
    }

    create() {
        // デモシーンのBGMを止める
        if (this.sound.get('bgm_menu')) {
            this.sound.get('bgm_menu').stop();
        }

        TransitionManager.fadeIn(this);

        // キャッシュからJSONデータを取得
        const eventData = this.cache.json.get('op_event');

        this.engine = new EventEngine(this, eventData, () => {
            this.engine.cleanup();
            if (this.sound) this.sound.stopAll();
            // OP会話終了後、紫苑一人(LV1, 中央後衛)でレベル1の雑魚敵(10体)・魔女ボスとのチュートリアル戦闘へ突入
            TransitionManager.transitionTo(this, 'BattleScene', {
                party: ['001'],
                rule: 1,
                enemyLevel: 1,
                majoLevel: 1,
                enemyCount: 10,
                isTutorial: true,
                returnScene: 'AdventureScene'
            });
        });


        
        this.engine.start();
    }
}
