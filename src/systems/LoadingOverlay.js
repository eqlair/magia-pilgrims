import { FONT_MAIN } from '../config/GameFont';

/**
 * LoadingOverlay.js
 * ゲーム中の追加アセットロード時に画面最前面に表示するローディングUI
 */
export class LoadingOverlay {
    /**
     * ローディング画面を表示
     * @param {Phaser.Scene} scene 
     * @param {string} [text='Now Loading...'] 
     * @returns {Phaser.GameObjects.Container}
     */
    static show(scene, text = 'Now Loading...') {
        if (!scene || !scene.add) return null;

        // 既に表示中なら再利用してテキストを更新
        if (scene._loadingOverlayContainer && scene._loadingOverlayContainer.active) {
            if (scene._loadingOverlayText) {
                scene._loadingOverlayText.setText(text);
            }
            return scene._loadingOverlayContainer;
        }

        const { width, height } = scene.scale;
        const container = scene.add.container(0, 0).setDepth(999999).setScrollFactor(0);
        scene._loadingOverlayContainer = container;

        // 半透明黒背景（タップ遮断）
        const bg = scene.add.rectangle(width / 2, height / 2, width, height, 0x0a0a16, 0.85)
            .setInteractive();
        bg.on('pointerdown', (pointer) => {
            if (pointer && pointer.event) pointer.event.stopPropagation();
        });
        container.add(bg);

        // タイトル / メッセージテキスト
        const titleText = scene.add.text(width / 2, height / 2 - 35, text, {
            fontFamily: FONT_MAIN,
            fontSize: '18px',
            color: '#ffea77',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        scene._loadingOverlayText = titleText;
        container.add(titleText);

        // プログレスバー背景
        const barWidth = 220;
        const barHeight = 6;
        const barBg = scene.add.rectangle(width / 2, height / 2 + 15, barWidth, barHeight, 0x1a1a2e).setOrigin(0.5);
        const barFill = scene.add.rectangle(width / 2 - barWidth / 2, height / 2 + 15, 0, barHeight, 0xffea77).setOrigin(0, 0.5);
        scene._loadingOverlayBarFill = barFill;
        scene._loadingOverlayBarWidth = barWidth;
        container.add([barBg, barFill]);

        // パーセント表示テキスト
        const percentText = scene.add.text(width / 2, height / 2 + 35, '0%', {
            fontFamily: FONT_MAIN,
            fontSize: '12px',
            color: '#aaaacc'
        }).setOrigin(0.5);
        scene._loadingOverlayPercentText = percentText;
        container.add(percentText);

        // テキストのほんのり明滅アニメーション
        scene.tweens.add({
            targets: titleText,
            alpha: 0.6,
            duration: 700,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // コンテナ表示（即座に不透明化）
        container.setAlpha(1);

        return container;
    }

    /**
     * 進捗パーセンテージを更新 (0〜100)
     * @param {Phaser.Scene} scene 
     * @param {number} percent 
     */
    static setProgress(scene, percent) {
        if (!scene || !scene._loadingOverlayContainer || !scene._loadingOverlayContainer.active) return;
        const clamped = Math.max(0, Math.min(100, Math.floor(percent)));
        if (scene._loadingOverlayBarFill && scene._loadingOverlayBarWidth) {
            scene._loadingOverlayBarFill.width = (scene._loadingOverlayBarWidth * clamped) / 100;
        }
        if (scene._loadingOverlayPercentText) {
            scene._loadingOverlayPercentText.setText(`${clamped}%`);
        }
    }

    /**
     * ローディング画面をフェードアウトして非表示
     * @param {Phaser.Scene} scene 
     * @param {Function|number} [onCompleteOrCallback] コールバックまたはフェード時間(ms)
     */
    static hide(scene, onCompleteOrCallback) {
        let duration = 250;
        let callback = null;
        if (typeof onCompleteOrCallback === 'number') {
            duration = onCompleteOrCallback;
        } else if (typeof onCompleteOrCallback === 'function') {
            callback = onCompleteOrCallback;
        }

        if (!scene || !scene._loadingOverlayContainer || !scene._loadingOverlayContainer.active) {
            if (typeof callback === 'function') callback();
            return;
        }

        const container = scene._loadingOverlayContainer;
        scene._loadingOverlayContainer = null;
        scene._loadingOverlayText = null;
        scene._loadingOverlayBarFill = null;
        scene._loadingOverlayPercentText = null;

        scene.tweens.add({
            targets: container,
            alpha: 0,
            duration: duration,
            ease: 'Power1',
            onComplete: () => {
                try { container.destroy(); } catch (e) {}
                if (typeof callback === 'function') callback();
            }
        });
    }
}
