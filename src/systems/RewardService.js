/**
 * RewardService.js
 * 特典リワードの視聴・コールバック管理
 * （広告ブロッカーに誤検知されない安全な命名体系）
 */
export class RewardService {
    /**
     * 特典リワードを再生
     * @param {Phaser.Scene} scene 呼び出し元シーン
     * @param {Object} options
     *   title: タイトル
     *   rewardDescription: リワード内容
     *   onReward: 完了時のコールバック
     *   onClose: 中断・閉じた時のコールバック
     */
    static showRewardAd(scene, { title = 'リワード特典', rewardDescription = '特典獲得', onReward, onClose } = {}) {
        // 将来ネイティブ（Cordova / Capacitor）環境なら AdMob プラグイン等を呼ぶ
        if (window.Capacitor && window.Capacitor.isPluginAvailable && window.Capacitor.isPluginAvailable('AdMob')) {
            console.log('[RewardService] Native reward requested');
        }

        // Web環境・テスト環境：妖精リフィエルの異次元アクセス動画シミュレーション
        this._showWebRewardModal(scene, { title, rewardDescription, onReward, onClose });
    }

    static _showWebRewardModal(scene, { title, rewardDescription, onReward, onClose }) {
        const { width, height } = scene.scale;

        const container = scene.add.container(0, 0).setDepth(30000).setScrollFactor(0);

        // 半透明暗幕
        const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85)
            .setInteractive();
        container.add(overlay);

        // ダイアログ窓
        const modalW = 440;
        const modalH = 340;
        const modalBg = scene.add.graphics();
        modalBg.fillStyle(0x181828, 0.98);
        modalBg.fillRoundedRect(width / 2 - modalW / 2, height / 2 - modalH / 2, modalW, modalH, 16);
        modalBg.lineStyle(2.5, 0x99bbff, 0.9);
        modalBg.strokeRoundedRect(width / 2 - modalW / 2, height / 2 - modalH / 2, modalW, modalH, 16);
        container.add(modalBg);

        // 妖精アイコン
        let fairyImg = null;
        if (scene.textures.exists('chr_fairy_s')) {
            fairyImg = scene.add.image(width / 2, height / 2 - 95, 'chr_fairy_s').setScale(0.55);
            container.add(fairyImg);
        }

        // タイトル
        const titleText = scene.add.text(width / 2, height / 2 - 35, '🧚‍♀️ 異次元の力を観測中……', {
            fontFamily: 'sans-serif',
            fontSize: '20px',
            fontStyle: 'bold',
            color: '#ffee88'
        }).setOrigin(0.5);
        container.add(titleText);

        // 特典内容表示
        const descText = scene.add.text(width / 2, height / 2, `【リワード】${rewardDescription}`, {
            fontFamily: 'sans-serif',
            fontSize: '15px',
            color: '#aaccff'
        }).setOrigin(0.5);
        container.add(descText);

        // カウントダウンテキスト
        let remainingSeconds = 3;
        const timerText = scene.add.text(width / 2, height / 2 + 40, `世界の法則を書き換えています… (${remainingSeconds}s)`, {
            fontFamily: 'sans-serif',
            fontSize: '15px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);
        container.add(timerText);

        // プログレスバー
        const barW = 280;
        const barH = 14;
        const barBg = scene.add.rectangle(width / 2, height / 2 + 70, barW, barH, 0x333344).setOrigin(0.5);
        const barFill = scene.add.rectangle(width / 2 - barW / 2, height / 2 + 70, 0, barH, 0x44dd88).setOrigin(0, 0.5);
        container.add([barBg, barFill]);

        // カウントダウンタイマー
        const timerEvent = scene.time.addEvent({
            delay: 1000,
            repeat: 2,
            callback: () => {
                remainingSeconds--;
                if (timerText.active) {
                    timerText.setText(`世界の法則を書き換えています… (${remainingSeconds}s)`);
                }
            }
        });

        // バーアニメーション
        scene.tweens.add({
            targets: barFill,
            width: barW,
            duration: 3000,
            ease: 'Linear',
            onComplete: () => {
                if (!container.active) return;
                timerText.setColor('#88ff88').setText('✨ 観測完了！世界の法則が書き換わりました');

                scene.time.delayedCall(600, () => {
                    scene.tweens.add({
                        targets: container,
                        alpha: 0,
                        duration: 300,
                        onComplete: () => {
                            container.destroy();
                            if (typeof onReward === 'function') {
                                onReward();
                            }
                        }
                    });
                });
            }
        });

        // 閉じる（スキップ/中断）ボタン
        const closeBtn = scene.add.text(width / 2 + modalW / 2 - 30, height / 2 - modalH / 2 + 25, '✕', {
            fontFamily: 'sans-serif',
            fontSize: '22px',
            color: '#8888aa',
            fontStyle: 'bold'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        closeBtn.on('pointerdown', () => {
            if (timerEvent) timerEvent.remove();
            container.destroy();
            if (typeof onClose === 'function') {
                onClose();
            }
        });
        container.add(closeBtn);
    }
}
