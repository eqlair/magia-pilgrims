import { FONT_MAIN, fontSize } from '../config/GameFont';

/**
 * 時報システム
 *
 * 使い方:
 *   // month, day は数値、timePhase は '午前'|'午後'|'夜'
 *   TimeReporter.show(scene, 12, 1, '午前', () => { // 終了後の処理 });
 *
 * 表示例: 「12月1日  午前」
 *
 * 動作フロー:
 *   1. タップをブロック（最前面にblockerを配置）
 *   2. グレーの帯が中心線から上下に広がる（scaleY: 0→1）
 *   3. 日付テキストが右からスライドして中央で止まる
 *   4. 0.7秒停止
 *   5. テキストが左へ流れて消える
 *   6. 帯が中心に向かって上下から縮む（scaleY: 1→0）
 *   7. blockerを除去してタップ有効化、コールバック呼び出し
 */
export class TimeReporter {
    /**
     * @param {Phaser.Scene} scene        - 現在のシーン
     * @param {number}       month        - 月（例: 12）
     * @param {number}       day          - 日（例: 1）
     * @param {string}       timePhase    - '午前' | '午後' | '夜'
     * @param {Function}     [onComplete] - 演出終了後のコールバック
     */
    static show(scene, month, day, timePhase, onComplete = null) {
        const { width, height } = scene.scale;
        const DEPTH      = 6000;
        const BAND_H     = Math.floor(height / 5); // 帯の最終高さ
        const CX = width / 2;
        const CY = height / 2;

        // 表示テキスト: 「12月1日　午前」
        const displayText = `${month}月${day}日　${timePhase}`;

        // ── タップブロッカー（最前面・透明・インタラクティブ）──
        // 演出中に下のUIが触れないようにする
        const blocker = scene.add.rectangle(CX, CY, width, height, 0x000000)
            .setAlpha(0.001)
            .setDepth(DEPTH - 1)
            .setScrollFactor(0)
            .setInteractive();

        // ── グレーの帯（最終サイズで作り、scaleYを0に近い値からスタート）──
        // scaleY tween を使うことで origin(中心)から上下均等に広がる
        const band = scene.add.rectangle(CX, CY, width * 2, BAND_H, 0x555555)
            .setAlpha(0)
            .setDepth(DEPTH)
            .setScrollFactor(0)
            .setScale(1, 0.01); // ほぼ0から始める

        // ── 日付テキスト（帯上下中央にピッタリ配置・setOrigin 0.5, 0.5）──
        const label = scene.add.text(width + 400, CY, displayText, {
            fontFamily: FONT_MAIN,
            fontSize: Math.floor(height / 13) + 'px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4,
            shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 8, fill: true }
        }).setOrigin(0.5, 0.5).setDepth(DEPTH + 1).setScrollFactor(0).setAlpha(0);

        if (scene.cameras.main && scene.uiCamera) {
            scene.cameras.main.ignore([blocker, band, label]);
        }

        // ──────────────────────────────
        // ステップ1: 帯が中心から上下に広がる (不透明度80%) + テキストが右から来る
        // ──────────────────────────────
        scene.tweens.add({
            targets: band,
            alpha: 0.8, // 不透明度80%
            scaleY: 1,  // 上下均等に広がる
            duration: 500,
            ease: 'Quad.easeOut'
        });

        scene.tweens.add({
            targets: label,
            x: CX,
            alpha: 1,
            duration: 450,
            ease: 'Back.easeOut',

            // ステップ2: 中央で1.7秒静止（1秒延長） → テキストが左へ流れる
            onComplete: () => {
                scene.time.delayedCall(1700, () => {

                    scene.tweens.add({
                        targets: label,
                        x: -400,
                        alpha: 0,
                        duration: 400,
                        ease: 'Quad.easeIn',

                        // ステップ3: 帯が中心に向かって縮む
                        onComplete: () => {
                            scene.tweens.add({
                                targets: band,
                                scaleY: 0,
                                duration: 300,
                                ease: 'Quad.easeIn',
                                onComplete: () => {
                                    blocker.destroy();
                                    band.destroy();
                                    label.destroy();
                                    if (onComplete) onComplete();
                                }
                            });
                        }
                    });
                });
            }
        });
    }
}
