/**
 * 画面遷移の汎用システム「明転」
 *
 * 動作フロー:
 *   [現在シーン] 白スクリーン 0%→100% (1秒)
 *     → scene.start() でシーン切り替え（この瞬間に新画面を描画）
 *   [新しいシーン] create()先頭でfadeIn()を呼ぶ → 白スクリーン 100%→0% (1秒)
 *   ※ タップはフェード中ずっと無効
 *
 * 使い方:
 *   // 遷移元シーンで:
 *   TransitionManager.transitionTo(this, 'NextSceneName');
 *   TransitionManager.transitionTo(this, 'NextSceneName', { someData: 123 });
 *
 *   // 遷移先シーンのcreate()先頭で:
 *   TransitionManager.fadeIn(this);
 */
export class TransitionManager {

    // フェード時間（ミリ秒）。変更したい場合はここだけ直せばOK
    static DURATION = 1000;

    /**
     * 現在シーンから指定シーンへ明転遷移する。
     * 白スクリーンが 0%→100% になった瞬間にシーンを切り替える。
     *
     * @param {Phaser.Scene} scene       - 現在のシーン
     * @param {string}       nextSceneKey - 遷移先シーンのキー
     * @param {object}       [data={}]   - 遷移先シーンのinit()に渡すデータ
     */
    static transitionTo(scene, nextSceneKey, data = {}) {
        // タップを即座に無効化
        scene.input.enabled = false;

        const { width, height } = scene.scale;

        // 白いスクリーンを最前面に生成（初期は完全透明）
        // ズームアウト時にも画面を覆い尽くすよう、サイズを3倍にし、スクロールしないように設定する
        const whiteScreen = scene.add.rectangle(width / 2, height / 2, width * 3, height * 3, 0xffffff)
            .setAlpha(0)
            .setDepth(9999)
            .setScrollFactor(0);

        // 透明→白（DURATION秒）
        scene.tweens.add({
            targets: whiteScreen,
            alpha: 1,
            duration: TransitionManager.DURATION,
            ease: 'Linear',
            onComplete: () => {
                // 完全に白くなった瞬間にシーンを切り替え
                // この時点で新シーンのpreload→create()が走る
                scene.scene.start(nextSceneKey, data);
            }
        });
    }

    /**
     * 新しいシーンのcreate()の一番最初に呼ぶ。
     * 真っ白な状態から始まり、DURATION秒かけて透明になる。
     * フェード完了後にタップを有効化する。
     *
     * @param {Phaser.Scene} scene - 新しいシーン（遷移先）
     */
    static fadeIn(scene) {
        // フェード中はタップ無効
        scene.input.enabled = false;

        const { width, height } = scene.scale;

        // 最前面に白いスクリーンを配置
        // ズームアウト時にも画面を覆い尽くすよう、サイズを3倍にし、スクロールしないように設定する
        const whiteScreen = scene.add.rectangle(width / 2, height / 2, width * 3, height * 3, 0xffffff)
            .setAlpha(1)
            .setDepth(9999)
            .setScrollFactor(0);

        // 白→透明（DURATION秒）
        scene.tweens.add({
            targets: whiteScreen,
            alpha: 0,
            duration: TransitionManager.DURATION,
            ease: 'Linear',
            onComplete: () => {
                whiteScreen.destroy();
                scene.input.enabled = true; // タップ有効化
            }
        });
    }

    /**
     * 現在シーンを白くフェードアウトし、コールバックを実行する
     */
    static fadeOut(scene, callback) {
        scene.input.enabled = false;
        const { width, height } = scene.scale;
        const whiteScreen = scene.add.rectangle(width / 2, height / 2, width, height, 0xffffff)
            .setAlpha(0)
            .setDepth(9999);

        scene.tweens.add({
            targets: whiteScreen,
            alpha: 1,
            duration: TransitionManager.DURATION,
            ease: 'Linear',
            onComplete: () => {
                if (callback) callback();
            }
        });
    }

    /**
     * 同一シーン内で明転(ホワイトアウト ➔ 画面切り替え ➔ 明転あけ)を行う。
     * @param {Phaser.Scene} scene - 対象シーン
     * @param {Function} onWhiteoutComplete - 画面が真っ白になった瞬間(切り替え時)に実行する処理
     * @param {number} [duration=1000] - フェード時間(ms)
     */
    static meitenInPlace(scene, onWhiteoutComplete, duration = 1000) {
        if (scene.input) scene.input.enabled = false;

        const { width, height } = scene.scale;
        const whiteScreen = scene.add.rectangle(width / 2, height / 2, width * 3, height * 3, 0xffffff)
            .setAlpha(0)
            .setDepth(9999)
            .setScrollFactor(0);

        // 1. 徐々にホワイトアウト (0 -> 100%)
        scene.tweens.add({
            targets: whiteScreen,
            alpha: 1,
            duration: duration,
            ease: 'Linear',
            onComplete: () => {
                // 2. 真っ白になった瞬間に画面・レイヤー切替処理を実行
                if (onWhiteoutComplete) {
                    onWhiteoutComplete();
                }

                // 3. 徐々にホワイトアウトを消す (100% -> 0%)
                scene.tweens.add({
                    targets: whiteScreen,
                    alpha: 0,
                    duration: duration,
                    ease: 'Linear',
                    onComplete: () => {
                        whiteScreen.destroy();
                        if (scene.input) scene.input.enabled = true;
                    }
                });
            }
        });
    }
}

