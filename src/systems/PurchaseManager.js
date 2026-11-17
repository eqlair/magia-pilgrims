import { Capacitor } from '@capacitor/core';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { GlobalState } from './GlobalState.js';

/**
 * PurchaseManager.js
 * Google Play 課金（In-App Purchase / IAP）統合マネージャー
 * - RevenueCat SDK またはセーフモックで動作
 * - 広告完全消去VIPパス（No-Ads Pass）、ガチャチケット、魔導石などの課金を一元化
 */

export const PRODUCT_IDS = {
    NO_ADS_PASS: 'magia_pass_no_ads',       // 広告完全消去VIPパス（買い切り）
    STARTER_PACK: 'magia_pack_starter',     // 初心者応援パック
    MAGIC_STONES_100: 'magia_gem_100'       // 魔導石
};

export class PurchaseManager {
    static isInitialized = false;
    static isNative = false;

    /**
     * 課金SDKの初期化
     */
    static async initialize(apiKey = 'goog_sample_api_key_placeholder') {
        this.isNative = Capacitor.isNativePlatform();
        if (!this.isNative) {
            console.log('[PurchaseManager] Web environment: using simulation mode.');
            return;
        }

        try {
            await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
            await Purchases.configure({ apiKey });
            this.isInitialized = true;
            console.log('[PurchaseManager] RevenueCat configured successfully');

            // 復元・既存購入の同期チェック
            await this.syncPurchases();
        } catch (err) {
            console.warn('[PurchaseManager] Initialization skipped or placeholder key used:', err);
        }
    }

    /**
     * 購入状態の同期・復元
     */
    static async syncPurchases() {
        if (!this.isNative || !this.isInitialized) return;

        try {
            const customerInfo = await Purchases.getCustomerInfo();
            this._applyCustomerEntitlements(customerInfo);
        } catch (err) {
            console.warn('[PurchaseManager] syncPurchases error:', err);
        }
    }

    /**
     * 購入済み権限（Entitlements）をゲーム内に反映
     */
    static _applyCustomerEntitlements(customerInfo) {
        if (!customerInfo || !customerInfo.customerInfo) return;
        const entitlements = customerInfo.customerInfo.entitlements.active;
        const gs = GlobalState.getInstance();

        // 広告スキップVIPパスが有効かチェック
        if (entitlements['no_ads'] || entitlements[PRODUCT_IDS.NO_ADS_PASS]) {
            console.log('[PurchaseManager] No-Ads entitlement is ACTIVE!');
            if (gs) gs.hasNoAdsPass = true;
        }
    }

    /**
     * 商品を購入
     * @param {string} packageOrProductId
     * @param {Object} callbacks
     */
    static async purchase(productId, { onSuccess, onCancel, onError } = {}) {
        const gs = GlobalState.getInstance();

        // Web環境・テスト環境シミュレーション
        if (!this.isNative || !this.isInitialized) {
            console.log(`[PurchaseManager] Simulating purchase for: ${productId}`);
            if (productId === PRODUCT_IDS.NO_ADS_PASS) {
                if (gs) gs.hasNoAdsPass = true;
            }
            if (typeof onSuccess === 'function') {
                onSuccess({ simulated: true, productId });
            }
            return;
        }

        try {
            // ネイティブ購入処理
            const offerings = await Purchases.getOfferings();
            let targetPackage = null;

            if (offerings && offerings.current && offerings.current.availablePackages) {
                targetPackage = offerings.current.availablePackages.find(
                    pkg => pkg.product.identifier === productId
                );
            }

            if (!targetPackage) {
                console.warn('[PurchaseManager] Target package not found, attempting direct purchase');
            }

            const purchaseResult = await Purchases.purchasePackage({ aPackage: targetPackage });
            this._applyCustomerEntitlements(purchaseResult);

            if (typeof onSuccess === 'function') {
                onSuccess(purchaseResult);
            }
        } catch (err) {
            if (err && err.userCancelled) {
                console.log('[PurchaseManager] User cancelled purchase');
                if (typeof onCancel === 'function') onCancel();
            } else {
                console.error('[PurchaseManager] Purchase error:', err);
                if (typeof onError === 'function') onError(err);
            }
        }
    }

    /**
     * 購入の復元（機種変時・再インストール時）
     */
    static async restorePurchases({ onSuccess, onError } = {}) {
        if (!this.isNative || !this.isInitialized) {
            if (typeof onSuccess === 'function') onSuccess({ restored: true });
            return;
        }

        try {
            const customerInfo = await Purchases.restorePurchases();
            this._applyCustomerEntitlements(customerInfo);
            if (typeof onSuccess === 'function') onSuccess(customerInfo);
        } catch (err) {
            console.error('[PurchaseManager] Restore error:', err);
            if (typeof onError === 'function') onError(err);
        }
    }
}
