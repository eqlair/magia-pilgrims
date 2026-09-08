import Phaser from 'phaser';
import { GlobalState } from '../systems/GlobalState';
import { RelicGenerator } from '../systems/RelicGenerator';
import { SaveManager } from '../systems/SaveManager';
import { TransitionManager } from '../systems/TransitionManager';

/**
 * 60階到達時エンディング演出シーン
 * 
 * 1. 最初から横向き（90度回転）でローディング画面を表示
 *    「画面をこの方向にして音量を上げて待っててね！」と案内
 * 2. 10秒待機後、横長フルスクリーンで ED.mp4 を再生
 * 3. 映像終了（またはスキップ）後、地上（12/1東京駅）への通常リスポーン処理を実行
 */
export default class EndingScene extends Phaser.Scene {
    constructor() {
        super('EndingScene');
    }

    create() {
        // BGMや効果音を全停止
        if (this.sound) {
            this.sound.stopAll();
        }

        const container = document.getElementById('game-container') || document.body;

        // 全画面オーバーレイ要素（DOM）
        const overlay = document.createElement('div');
        overlay.id = 'ending-overlay';
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = '#000000';
        overlay.style.zIndex = '99999';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.overflow = 'hidden';
        overlay.style.userSelect = 'none';

        // 内部コンテンツ用コンテナ（画面向きに応じて90度回転）
        const contentBox = document.createElement('div');
        contentBox.id = 'ending-content-box';
        contentBox.style.display = 'flex';
        contentBox.style.flexDirection = 'column';
        contentBox.style.justifyContent = 'center';
        contentBox.style.alignItems = 'center';
        contentBox.style.position = 'relative';

        // 画面の向きに応じたスタイル調整（縦長なら90度回転させて全画面フィット）
        const applyOrientationStyle = () => {
            const isPortrait = window.innerHeight > window.innerWidth;
            if (isPortrait) {
                contentBox.style.width = `${window.innerHeight}px`;
                contentBox.style.height = `${window.innerWidth}px`;
                contentBox.style.transform = 'rotate(90deg)';
                contentBox.style.transformOrigin = 'center center';
            } else {
                contentBox.style.width = '100vw';
                contentBox.style.height = '100vh';
                contentBox.style.transform = 'none';
            }
        };
        applyOrientationStyle();
        window.addEventListener('resize', applyOrientationStyle);

        // ── 1. ローディング表示用要素 ──
        const loadingBox = document.createElement('div');
        loadingBox.id = 'ending-loading-box';
        loadingBox.style.display = 'flex';
        loadingBox.style.flexDirection = 'column';
        loadingBox.style.alignItems = 'center';
        loadingBox.style.justifyContent = 'center';
        loadingBox.style.gap = '20px';
        loadingBox.style.textAlign = 'center';
        loadingBox.style.color = '#ffffff';
        loadingBox.style.fontFamily = 'sans-serif';

        // Now Loading テキスト
        const nowLoadingText = document.createElement('div');
        nowLoadingText.style.fontSize = '32px';
        nowLoadingText.style.fontWeight = 'bold';
        nowLoadingText.style.letterSpacing = '3px';
        nowLoadingText.style.color = '#f0f0ff';
        nowLoadingText.textContent = 'Now Loading...';
        loadingBox.appendChild(nowLoadingText);

        // ドットの点滅アニメーション
        const dotStates = ['Now Loading', 'Now Loading .', 'Now Loading ..', 'Now Loading ...', 'Now Loading ･･･'];
        let dotIdx = 3;
        const dotInterval = setInterval(() => {
            dotIdx = (dotIdx + 1) % dotStates.length;
            nowLoadingText.textContent = dotStates[dotIdx];
        }, 350);

        // 案内メッセージ（ユーザー指定）
        const promptText = document.createElement('div');
        promptText.style.fontSize = '22px';
        promptText.style.fontWeight = 'bold';
        promptText.style.color = '#ffff99';
        promptText.style.padding = '12px 28px';
        promptText.style.borderRadius = '30px';
        promptText.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
        promptText.style.border = '2px solid rgba(255, 255, 150, 0.4)';
        promptText.style.marginTop = '15px';
        promptText.style.boxShadow = '0 0 20px rgba(255, 255, 100, 0.2)';
        promptText.textContent = '画面をこの方向にして音量を上げて待っててね！';
        loadingBox.appendChild(promptText);

        contentBox.appendChild(loadingBox);
        overlay.appendChild(contentBox);
        container.appendChild(overlay);

        // ── 2. 10秒待機後に動画再生 ──
        this.time.delayedCall(10000, () => {
            clearInterval(dotInterval);
            loadingBox.remove();

            // 動画要素の作成
            const video = document.createElement('video');
            video.id = 'ending-video-player';
            video.src = '/files/OP/ED.mp4';
            video.playsInline = true;
            video.autoplay = true;
            video.volume = 1.0;
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.objectFit = 'contain';
            video.style.backgroundColor = '#000000';
            video.style.display = 'block';

            // スキップボタン
            const skipBtn = document.createElement('button');
            skipBtn.textContent = 'スキップ ≫';
            skipBtn.style.position = 'absolute';
            skipBtn.style.top = '16px';
            skipBtn.style.right = '24px';
            skipBtn.style.zIndex = '100001';
            skipBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.65)';
            skipBtn.style.color = '#ffffff';
            skipBtn.style.border = '1px solid rgba(255, 255, 255, 0.5)';
            skipBtn.style.borderRadius = '6px';
            skipBtn.style.padding = '8px 18px';
            skipBtn.style.fontSize = '14px';
            skipBtn.style.cursor = 'pointer';

            let finished = false;
            const finishEnding = () => {
                if (finished) return;
                finished = true;
                window.removeEventListener('resize', applyOrientationStyle);

                try {
                    video.pause();
                    overlay.remove();
                } catch (e) {
                    console.error(e);
                }

                this._respawnToEarth();
            };

            video.onended = finishEnding;
            skipBtn.onclick = finishEnding;

            contentBox.appendChild(video);
            contentBox.appendChild(skipBtn);

            // 自動再生（ブラウザの制限対策）
            const playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.catch((err) => {
                    console.warn('[EndingScene] Autoplay blocked, waiting for interaction:', err);
                    const resumePlay = () => {
                        video.play();
                        window.removeEventListener('pointerdown', resumePlay);
                    };
                    window.addEventListener('pointerdown', resumePlay, { once: true });
                });
            }
        });
    }

    _respawnToEarth() {
        const gs = GlobalState.getInstance();
        gs.isTowerMode = false;
        this.isTowerMode = false;
        gs.resetForNewLoop();

        // 周回報酬: URレリクス（Rank 5）を付与
        const urRelic = RelicGenerator.generateRelic(5);
        if (!gs.inventory) gs.inventory = { relics: [], gems: [] };
        if (!gs.inventory.relics) gs.inventory.relics = [];
        gs.inventory.relics.push(urRelic);

        SaveManager.clearAdventureState();
        SaveManager.saveGame();

        // 地上マップシーン（12/1東京駅）へクリーンに再起動遷移！
        TransitionManager.transitionTo(this, 'AdventureScene', {
            isTower: false,
            party: ['001'],
            fromRespawn: true
        });
    }
}
