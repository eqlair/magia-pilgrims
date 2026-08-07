import Phaser from 'phaser';
import { TransitionManager } from '../systems/TransitionManager';
import { EventEngine } from '../systems/EventEngine';

export default class OpScene extends Phaser.Scene {
    constructor() {
        super('OpScene');
    }

    preload() {
        // OP用のアセットをロード
        this.load.image('ev001', 'files/OP/ev001.jpg');
        this.load.image('ev002', 'files/OP/ev002.jpg');
        this.load.image('ev003', 'files/OP/ev003.jpg');
        this.load.image('evp001', 'files/OP/evp001.jpg');
        
        this.load.audio('bgm_hoshi', 'files/BGM/003_hoshihuru.mp3');
        this.load.audio('bgm_mad', 'files/BGM/007_stage_mad.mp3');
        this.load.audio('se_bomb', 'files/OP/bomb.mp3');

        this.load.image('op_title', 'files/OP/title.png');
        this.load.audio('op_start', 'files/OP/start.mp3');

        // シナリオデータをロード
        this.load.json('op_event', 'files/OP/op_event.json');
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

            // 会話終了後、画面中央に title.png を表示し、start.mp3 を再生
            const width = this.scale.width;
            const height = this.scale.height;

            const overlayBg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000).setDepth(4999);
            const titleImg = this.add.image(width / 2, height / 2, 'op_title')
                .setOrigin(0.5)
                .setDepth(5000);

            if (titleImg.width > 0 && titleImg.height > 0) {
                const scale = Math.min(width / titleImg.width, height / titleImg.height) * 0.9;
                titleImg.setScale(scale);
            }

            if (this.cache.audio.exists('op_start')) {
                this.sound.play('op_start', { volume: 0.8 });
            }

            // 5秒後にチュートリアル戦闘へ突入
            this.time.delayedCall(5000, () => {
                TransitionManager.transitionTo(this, 'BattleScene', {
                    party: ['001'],
                    rule: 1,
                    enemyLevel: 2,
                    totalWaves: 2,
                    waveCount: 2,
                    majoLevel: 1,
                    attribute: 'yellow',
                    bgmKey: 'bgm_battle4',
                    bossBgmKey: 'bgm_boss3',
                    isTutorial: true,
                    canRetreat: false,
                    returnScene: 'AdventureScene'
                });
            });
        });





        
        this.engine.start();
    }
}
