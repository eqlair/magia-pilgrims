import { FONT_MAIN, fontSize } from '../config/GameFont';

/**
 * 解説表示システム
 *
 * 使い方:
 *   TutorialUI.show(this, '解説テキスト', () => { // 閉じた後の処理 });
 *
 * 仕様:
 *   - 画面全体に50%半透明ブラックをかぶせる（0.5秒でフェードイン）
 *   - 透明な全画面レイヤーで下のボタン等へのタップを遮断
 *   - 解説テキストと「tap to continue」を表示
 *   - 画面をタップすると0.5秒でフェードアウトして終了
 *
 * 注意:
 *   scene.input.enabled は一切触らない。
 *   下のUIをブロックするのは「最前面の透明レイヤー」で行う。
 */
export class TutorialUI {
    /**
     * @param {Phaser.Scene} scene        - 現在のシーン
     * @param {string}       text         - 解説テキスト（25文字で自動改行）
     * @param {Function}     [onComplete] - 閉じた後のコールバック
     */
    static show(scene, text, onComplete = null) {
        const { width, height } = scene.scale;
        const DEPTH = 5000;

        // ──────────────────────────────────────────────────────
        // ① 最前面に透明な全画面ブロッカーを置く
        //    → これより下のオブジェクト（ボタン等）へのタップを遮断
        //    → かつ「このレイヤー自身」がタップを受け取る
        // ──────────────────────────────────────────────────────
        const blocker = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000)
            .setAlpha(0)           // 初期は完全透明
            .setDepth(DEPTH)
            .setInteractive();     // タップを受け取る & 下へ貫通させない

        // ── 解説テキスト ──
        const label = scene.add.text(width / 2, height * 0.22, TutorialUI._wrapText(text, 25), {
            fontFamily: FONT_MAIN,
            fontSize: fontSize.body(width),
            color: '#ffffff',
            align: 'left',
            lineSpacing: 10,
            wordWrap: { width: width - 60 }
        }).setOrigin(0.5, 0).setDepth(DEPTH + 1).setAlpha(0);

        // ── 「tap to continue」テキスト（画面下部） ──
        const tapLabel = scene.add.text(width / 2, height - 70, 'tap to continue', {
            fontFamily: FONT_MAIN,
            fontSize: fontSize.small(width),
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#333333',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(DEPTH + 2).setAlpha(0);

        // ── フェードイン（blockerを半透明ブラックに） ──
        scene.tweens.add({
            targets: blocker,
            alpha: 0.5,
            duration: 500,
            onComplete: () => {
                // テキスト表示
                label.setAlpha(1);

                // tap to continueを表示してから点滅
                tapLabel.setAlpha(1);
                scene.tweens.add({
                    targets: tapLabel,
                    alpha: 0.25,
                    duration: 750,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });

                // ── blockerへのタップ1回でフェードアウト ──
                blocker.once('pointerdown', () => {
                    // 連打防止：即座にインタラクティブを解除
                    blocker.disableInteractive();

                    scene.tweens.add({
                        targets: [blocker, label, tapLabel],
                        alpha: 0,
                        duration: 500,
                        onComplete: () => {
                            blocker.destroy();
                            label.destroy();
                            tapLabel.destroy();
                            if (onComplete) onComplete();
                        }
                    });
                });
            }
        });
    }

    /**
     * テキストを最大maxChars文字で折り返す
     */
    static _wrapText(text, maxChars) {
        const lines = text.split('\n');
        const result = [];
        for (const line of lines) {
            if (line.length === 0) { result.push(''); continue; }
            let rem = line;
            while (rem.length > maxChars) {
                result.push(rem.substring(0, maxChars));
                rem = rem.substring(maxChars);
            }
            if (rem.length > 0) result.push(rem);
        }
        return result.join('\n');
    }
}
