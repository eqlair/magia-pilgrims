import Phaser from 'phaser';
import { TransitionManager } from '../systems/TransitionManager';
import { FONT_MAIN, fontSize } from '../config/GameFont';

/**
 * OP終了後のフェイクタイトル画面
 * （本来はここからチュートリアル戦闘へ遷移）
 */
export default class OpEndScene extends Phaser.Scene {
    constructor() {
        super('OpEndScene');
    }

    create() {
        TransitionManager.fadeIn(this);

        const { width, height } = this.scale;

        // 25%グレー（0x404040）の背景
        this.add.rectangle(width / 2, height / 2, width, height, 0x404040);

        // タイトルロゴ（Boot/TitleSceneでキャッシュ済みの前提）
        if (this.cache.image.exists('title_logo')) {
            const logo = this.add.image(width / 2, height / 2, 'title_logo');
            logo.setScale((width * 0.8) / logo.width);
        } else {
            this.add.text(width / 2, height / 2, 'TITLE LOGO', {
                fontFamily: FONT_MAIN, fontSize: '40px', color: '#ffffff'
            }).setOrigin(0.5);
        }

        // タップを促すテキスト
        const tapText = this.add.text(width / 2, height * 0.8, 'TAP TO RETURN MENU', {
            fontFamily: FONT_MAIN,
            fontSize: fontSize.small(width),
            color: '#aaaaaa'
        }).setOrigin(0.5);
        
        this.tweens.add({ targets: tapText, alpha: 0.3, duration: 800, yoyo: true, repeat: -1 });

        // タップでデモシーンへ戻る
        this.input.once('pointerdown', () => {
            TransitionManager.transitionTo(this, 'DemoScene');
        });
    }
}
