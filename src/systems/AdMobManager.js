import { Capacitor } from '@capacitor/core';
import { AdMob, RewardAdPluginEvents } from '@capacitor-community/admob';

/**
 * AdMobManager.js
 * Google AdMob公式テストIDと本番IDを統合管理するネイティブ広告マネージャー
 */

// Google公式 Android用 テスト広告ユニットID
export const TEST_AD_UNITS = {
    BANNER: 'ca-app-pub-3940256099942544/6300978111',
    INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712',
    REWARD_VIDEO: 'ca-app-pub-3940256099942544/5224354917',
    REWARD_INTERSTITIAL: 'ca-app-pub-3940256099942544/5354046379'
};

export class AdMobManager {
    static isInitialized = false;
    static isNative = false;
    static rewardPrepared = false;

    /**
     * AdMob初期化
     */
    static async initialize() {
        this.isNative = Capacitor.isNativePlatform();
        if (!this.isNative) {
            console.log('[AdMobManager] Running in Web environment (using simulation).');
            return;
        }

        try {
            await AdMob.initialize({
                testingDevices: ['EMULATOR'],
                initializeForTesting: true
            });
            this.isInitialized = true;
            console.log('[AdMobManager] AdMob initialized successfully');

            // リワード広告を事前ロード
            this.prepareRewardVideo();
        } catch (err) {
            console.warn('[AdMobManager] Initialization error:', err);
        }
    }

    /**
     * リワード動画広告をプリロード
     */
    static async prepareRewardVideo(adUnitId = TEST_AD_UNITS.REWARD_VIDEO) {
        if (!this.isNative) return;

        try {
            await AdMob.prepareRewardVideoAd({
                adId: adUnitId,
                isTesting: true
            });
            this.rewardPrepared = true;
            console.log('[AdMobManager] Reward video prepared');
        } catch (err) {
            console.warn('[AdMobManager] Prepare reward video error:', err);
            this.rewardPrepared = false;
        }
    }

    /**
     * リワード広告を表示
     * @param {Object} callbacks
     *   onReward: 特典付与コールバック
     *   onClose: 閉じた時のコールバック
     *   onFail: 失敗時のフォールバックコールバック
     */
    static async showRewardVideo({ onReward, onClose, onFail } = {}) {
        if (!this.isNative) {
            if (onFail) onFail();
            return;
        }

        try {
            let rewarded = false;

            // 特典獲得リスナー
            const rewardListener = await AdMob.addListener(
                RewardAdPluginEvents.Rewarded,
                (rewardItem) => {
                    console.log('[AdMobManager] User rewarded:', rewardItem);
                    rewarded = true;
                    if (typeof onReward === 'function') {
                        onReward(rewardItem);
                    }
                }
            );

            // 閉じた時のリスナー
            const dismissListener = await AdMob.addListener(
                RewardAdPluginEvents.Dismissed,
                () => {
                    console.log('[AdMobManager] Reward ad dismissed');
                    rewardListener.remove();
                    dismissListener.remove();
                    this.rewardPrepared = false;
                    // 次回用にあらかじめプリロードしておく
                    this.prepareRewardVideo();
                    if (typeof onClose === 'function') {
                        onClose(rewarded);
                    }
                }
            );

            // 失敗リスナー
            const failedListener = await AdMob.addListener(
                RewardAdPluginEvents.FailedToShow,
                (error) => {
                    console.warn('[AdMobManager] Reward ad failed to show:', error);
                    rewardListener.remove();
                    dismissListener.remove();
                    failedListener.remove();
                    this.rewardPrepared = false;
                    if (typeof onFail === 'function') {
                        onFail(error);
                    }
                }
            );

            // 表示実行
            await AdMob.showRewardVideoAd();
        } catch (err) {
            console.warn('[AdMobManager] Show reward error:', err);
            if (typeof onFail === 'function') {
                onFail(err);
            }
        }
    }
}
