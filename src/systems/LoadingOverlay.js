import Phaser from 'phaser';
import { FONT_MAIN } from '../config/GameFont';

/**
 * 汎用ローディング画面オーバーレイ
 * 
 * 画面中央に「Now Loading ･･･」と表示し、
 * その横で実装済みキャラのミニキャラがランダムで手前向きにトコトコ走り、
 * 少し下にTIPSをランダムで表示する。
 */
export class LoadingOverlay {
    /**
     * ローディングオーバーレイを生成して表示する
     * @param {Phaser.Scene} scene - 対象シーン
     * @param {object} [options={}] - オプション設定
     * @returns {object} { container, destroy }
     */
    static show(scene, options = {}) {
        const { width, height } = scene.scale;

        // すでに表示中のものがあれば二重生成防止
        if (scene._loadingOverlayContainer && scene._loadingOverlayContainer.active) {
            return scene._loadingOverlayContainer;
        }

        const container = scene.add.container(0, 0).setDepth(options.depth || 10000).setScrollFactor(0);

        // 1. 全面暗幕背景（半透明〜ダーク調）
        const bg = scene.add.rectangle(width / 2, height / 2, width * 2, height * 2, 0x0a0a14, 0.94);
        container.add(bg);

        // 2. 実装済みキャラクターIDリスト（ランダム選出）
        const implementedCharIds = ['001', '002', '003', '004', '005', '007', '008', '009', '010', '011'];
        const randomCharId = implementedCharIds[Math.floor(Math.random() * implementedCharIds.length)];
        const miniSpriteKey = `mini_${randomCharId}`;

        // 3. 中央レイアウトの計算
        const centerY = height * 0.44;
        const miniScale = Math.min(width / 600, 1.0) * 0.75;

        // ミニキャラ（テクスチャが存在する場合のみ生成）
        let miniSprite = null;
        let runTimer = null;
        if (scene.textures.exists(miniSpriteKey)) {
            // Now Loading テキストの左横に配置
            miniSprite = scene.add.sprite(width / 2 - 110, centerY, miniSpriteKey, 0)
                .setScale(miniScale)
                .setOrigin(0.5, 0.5);
            container.add(miniSprite);

            // 正面走りアニメーション（フレーム 0, 1, 0, 2）
            const runFrames = [0, 1, 0, 2];
            let frameIdx = 0;
            runTimer = scene.time.addEvent({
                delay: 130,
                callback: () => {
                    if (miniSprite && miniSprite.active) {
                        frameIdx = (frameIdx + 1) % runFrames.length;
                        miniSprite.setFrame(runFrames[frameIdx]);
                    }
                },
                loop: true
            });

            // 走る上下の軽い揺れ
            scene.tweens.add({
                targets: miniSprite,
                y: centerY - 4,
                duration: 260,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }

        // 4. 「Now Loading ･･･」テキスト
        const textX = miniSprite ? width / 2 + 30 : width / 2;
        const loadingFontSize = Math.max(18, Math.floor(width / 24));
        const loadingText = scene.add.text(textX, centerY, 'Now Loading .', {
            fontFamily: FONT_MAIN,
            fontSize: `${loadingFontSize}px`,
            color: '#f0f0f5',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0.5);
        container.add(loadingText);

        // ドットのポンポン点滅アニメーション
        const dotStates = ['Now Loading', 'Now Loading .', 'Now Loading ..', 'Now Loading ...', 'Now Loading ･･･'];
        let dotIdx = 1;
        const dotTimer = scene.time.addEvent({
            delay: 350,
            callback: () => {
                if (loadingText && loadingText.active) {
                    dotIdx = (dotIdx + 1) % dotStates.length;
                    loadingText.setText(dotStates[dotIdx]);
                }
            },
            loop: true
        });

        // 5. TIPS データの取得と表示
        let tipList = [];
        const tipsData = scene.cache.json.get('tips');
        const tipsBattleData = scene.cache.json.get('tips_battle');
        if (tipsData && tipsData.tips) tipList.push(...tipsData.tips);
        if (tipsBattleData && tipsBattleData.tips) tipList.push(...tipsBattleData.tips);

        if (tipList.length === 0) {
            tipList = [
                "赤色は「衝動」、紫色は「混沌」、緑色は「調和」、黄色は「犠牲」、青色は「統制」のエネルギー。",
                "前衛にいると近接攻撃、後衛にいると遠隔攻撃を行います。",
                "休息時に食料が無いと、精神力を失います。"
            ];
        }

        const selectedTip = tipList[Math.floor(Math.random() * tipList.length)];

        // TIPS枠とテキスト（Now Loadingの少し下）
        const tipBoxY = height * 0.62;
        const tipBoxWidth = Math.min(width * 0.88, 540);
        
        // TIPS 装飾枠
        const tipHeaderSize = Math.max(12, Math.floor(width / 40));
        const tipHeader = scene.add.text(width / 2, tipBoxY - 22, '─ TIPS ─', {
            fontFamily: FONT_MAIN,
            fontSize: `${tipHeaderSize}px`,
            color: '#d4af37',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0.5);
        container.add(tipHeader);

        const tipBodySize = Math.max(13, Math.floor(width / 34));
        const tipText = scene.add.text(width / 2, tipBoxY + 12, selectedTip, {
            fontFamily: FONT_MAIN,
            fontSize: `${tipBodySize}px`,
            color: '#dcdce5',
            align: 'center',
            wordWrap: { width: tipBoxWidth - 30 }
        }).setOrigin(0.5, 0.5).setLineSpacing(6);
        container.add(tipText);

        // フェードイン
        container.setAlpha(0);
        scene.tweens.add({
            targets: container,
            alpha: 1,
            duration: 200,
            ease: 'Linear'
        });

        // 破棄用ヘルパー
        const destroyOverlay = (duration = 200, onComplete = null) => {
            if (!container || !container.active) {
                if (onComplete) onComplete();
                return;
            }
            if (runTimer) runTimer.remove();
            if (dotTimer) dotTimer.remove();

            scene.tweens.add({
                targets: container,
                alpha: 0,
                duration: duration,
                ease: 'Linear',
                onComplete: () => {
                    container.destroy();
                    scene._loadingOverlayContainer = null;
                    if (onComplete) onComplete();
                }
            });
        };

        scene._loadingOverlayContainer = {
            container,
            destroy: destroyOverlay
        };

        return scene._loadingOverlayContainer;
    }

    /**
     * 表示中のローディングオーバーレイを消去する
     */
    static hide(scene, duration = 200, onComplete = null) {
        if (scene._loadingOverlayContainer && scene._loadingOverlayContainer.destroy) {
            scene._loadingOverlayContainer.destroy(duration, onComplete);
        } else if (onComplete) {
            onComplete();
        }
    }
}
