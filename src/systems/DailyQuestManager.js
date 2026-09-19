/**
 * DailyQuestManager.js
 * 📅 デイリークエスト（日次ミッション）システム
 */
import { GlobalState } from './GlobalState.js';
import { SaveManager } from './SaveManager.js';

export const DAILY_QUEST_DEFS = [
    { id: 'battle', title: '戦闘に一回勝利する', max: 2, icon: '⚔️' },
    { id: 'rest', title: '1回休息する', max: 2, icon: '☕' },
    { id: 'explore', title: '1回探索する', max: 2, icon: '🔍' },
    { id: 'synth', title: 'レリクスを合成する', max: 2, icon: '🔮' },
    { id: 'enhance', title: 'レリクスを強化する', max: 2, icon: '✨' }
];

export class DailyQuestManager {
    /**
     * 当日の日付文字列 (YYYY-MM-DD)
     */
    static getTodayStr() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    /**
     * 日付変更に伴うデイリークエスト初期化チェック
     */
    static checkDayReset() {
        const gs = GlobalState.getInstance();
        const today = this.getTodayStr();

        if (!gs.dailyQuests || gs.dailyQuests.date !== today) {
            gs.dailyQuests = {
                date: today,
                counts: {
                    battle: 0,
                    rest: 0,
                    explore: 0,
                    synth: 0,
                    enhance: 0
                },
                bonusClaimed: false
            };
            try { SaveManager.saveGame(); } catch (e) {}
        }
        return gs.dailyQuests;
    }

    /**
     * クエスト進捗を加算
     * @param {string} type 'battle'|'rest'|'explore'|'synth'|'enhance'
     * @param {number} amount 加算数 (デフォルト1)
     * @param {Phaser.Scene} scene トースト表示用（省略可）
     */
    static addProgress(type, amount = 1, scene = null) {
        const data = this.checkDayReset();
        const def = DAILY_QUEST_DEFS.find(d => d.id === type);
        if (!def) return;

        const prev = data.counts[type] || 0;
        if (prev >= def.max) return; // 既に達成済み

        data.counts[type] = Math.min(def.max, prev + amount);

        // 達成トースト
        if (data.counts[type] >= def.max && prev < def.max && scene && scene.add) {
            this.showQuestCompleteToast(scene, `📅 デイリー達成！【${def.title}】`);
        }

        // 全10項目完了チェック
        if (this.isAllCompleted() && !data.bonusClaimed) {
            data.bonusClaimed = true;
            const gs = GlobalState.getInstance();
            gs.extraDailyGachaCount = (gs.extraDailyGachaCount || 0) + 1;
            if (scene && scene.add) {
                this.showQuestCompleteToast(scene, `🎉 全デイリー達成！デイリーガチャ+1回獲得！`);
            }
        }

        try { SaveManager.saveGame(); } catch (e) {}
    }

    /**
     * 10項目すべて達成したか判定
     */
    static isAllCompleted() {
        const data = this.checkDayReset();
        return DAILY_QUEST_DEFS.every(def => (data.counts[def.id] || 0) >= def.max);
    }

    /**
     * 未受け取りの達成ボーナスがあるか（通知バッジ用）
     */
    static hasClaimable() {
        const data = this.checkDayReset();
        return this.isAllCompleted() && !data.bonusClaimed;
    }

    /**
     * UI表示用のクエスト情報オブジェクトを取得
     */
    static getQuests() {
        const data = this.checkDayReset();
        const list = DAILY_QUEST_DEFS.map(def => ({
            id: def.id,
            name: def.title,
            icon: def.icon,
            count: data.counts[def.id] || 0,
            target: def.max
        }));
        return {
            allCompleted: this.isAllCompleted(),
            bonusClaimed: !!data.bonusClaimed,
            list: list
        };
    }

    /**
     * 達成済みのカウント総数 (0〜10)
     */
    static getTotalCompletedCount() {
        const data = this.checkDayReset();
        let sum = 0;
        DAILY_QUEST_DEFS.forEach(def => {
            sum += Math.min(def.max, data.counts[def.id] || 0);
        });
        return sum;
    }

    /**
     * トースト通知表示
     */
    static showQuestCompleteToast(scene, text) {
        const { width } = scene.scale;
        const container = scene.add.container(width / 2, -60).setDepth(25000).setScrollFactor(0);

        const toastW = 400;
        const toastH = 46;

        const bg = scene.add.graphics();
        bg.fillStyle(0x0a2215, 0.95);
        bg.fillRoundedRect(-toastW / 2, -toastH / 2, toastW, toastH, 10);
        bg.lineStyle(2, 0x44ee88, 1.0);
        bg.strokeRoundedRect(-toastW / 2, -toastH / 2, toastW, toastH, 10);
        container.add(bg);

        const label = scene.add.text(0, 0, text, {
            fontFamily: 'sans-serif',
            fontSize: '15px',
            fontStyle: 'bold',
            color: '#aaffcc'
        }).setOrigin(0.5);
        container.add(label);

        scene.tweens.add({
            targets: container,
            y: 50,
            duration: 400,
            ease: 'Back.easeOut',
            onComplete: () => {
                scene.time.delayedCall(3000, () => {
                    scene.tweens.add({
                        targets: container,
                        y: -60,
                        alpha: 0,
                        duration: 350,
                        ease: 'Sine.easeIn',
                        onComplete: () => container.destroy()
                    });
                });
            }
        });
    }
}
