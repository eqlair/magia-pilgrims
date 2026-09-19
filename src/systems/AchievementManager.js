/**
 * AchievementManager.js
 * 🏆 実績解除（アチーブメント）システム
 */
import { GlobalState } from './GlobalState.js';
import { SaveManager } from './SaveManager.js';

export const CHAR_LIST = [
    { id: '001', name: '紫苑', kanji: '紫' },
    { id: '002', name: '蒼樹', kanji: '蒼' },
    { id: '003', name: '紅華', kanji: '紅' },
    { id: '004', name: '黄蘭', kanji: '黄' },
    { id: '005', name: '李乃果', kanji: '果' },
    { id: '006', name: '撫子', kanji: '撫' },
    { id: '007', name: '桔梗', kanji: '桔' },
    { id: '008', name: '睡蓮', kanji: '蓮' },
    { id: '009', name: 'リフィエル', kanji: '羽' },
    { id: '010', name: '白蓮', kanji: '白' },
    { id: '011', name: '牡丹', kanji: '丹' }
];

// ── 全実績定義リスト ──
const list = [];

// 1. ロスト系実績（※ポップアップ非表示 silent: true）
list.push({
    id: 'lost_sion',
    title: '散り逝く紫',
    desc: '紫苑が力尽きる',
    icon: '💀',
    silent: true
});

CHAR_LIST.filter(c => c.id !== '001').forEach(c => {
    list.push({
        id: `lost_char_${c.id}`,
        title: `散り逝く${c.kanji}`,
        desc: `${c.name}をロストする`,
        icon: '🥀',
        silent: true
    });
});

// 2. LV13到達実績（各キャラごと）
CHAR_LIST.forEach(c => {
    list.push({
        id: `reach_lv13_${c.id}`,
        title: `高みへの到達【${c.name}】`,
        desc: `${c.name}がレベル13に到達する`,
        icon: '⭐'
    });
});

// 3. 好感度10以上（各キャラごと）
CHAR_LIST.forEach(c => {
    list.push({
        id: `friendship_10_${c.id}`,
        title: `芽生えた絆【${c.name}】`,
        desc: `${c.name}の好感度が10以上に達する`,
        icon: '💖'
    });
});

// 4. 好感度20以上（各キャラごと）
CHAR_LIST.forEach(c => {
    list.push({
        id: `friendship_20_${c.id}`,
        title: `深き魂の契り【${c.name}】`,
        desc: `${c.name}の好感度が20以上に達する`,
        icon: '💍'
    });
});

// 5. 必殺技・戦闘・合成系実績
list.push(
    { id: 'combo_double', title: 'デュアルアサルト', desc: 'コンビネーションダブル必殺技を発生させる', icon: '⚔️' },
    { id: 'combo_triple', title: 'トリニティストライク', desc: 'コンビネーショントリプル必殺技を発生させる', icon: '🔱' },
    { id: 'craft_ur', title: '奇跡の錬成', desc: 'URレリクスを合成で作成する', icon: '🔮' },
    { id: 'craft_mr', title: '神話の創造', desc: 'MRレリクスを合成で作成する', icon: '👑' },
    { id: 'total_exp_1m', title: '千の記憶の紡ぎ手', desc: '最高獲得経験値が1,000,000に達する', icon: '📜' },
    { id: 'wlv_max', title: '武道の極致', desc: 'いずれかのキャラのWLVが7/7に達する', icon: '🥋' },
    { id: 'team_dps_10k', title: '猛火の一撃', desc: '最高DPSが10,000に達する', icon: '💥' },
    { id: 'team_dps_30k', title: '焦土の暴嵐', desc: '最高DPSが30,000超', icon: '🔥' },
    { id: 'team_dps_100k', title: '天変地異', desc: '最高DPSが100,000超', icon: '⚡' },
    { id: 'solo_dps_5k', title: '一騎当千', desc: '個人最高DPSが5,000超', icon: '🗡️' },
    { id: 'solo_dps_15k', title: '無双の煌めき', desc: '個人最高DPSが15,000超', icon: '✨' },
    { id: 'solo_dps_35k', title: '神速の破壊神', desc: '個人最高DPSが35,000超', icon: '🌟' }
);

export const ACHIEVEMENTS = list;

export class AchievementManager {
    /**
     * 実績を解除
     * @param {string} id 実績ID
     * @param {Phaser.Scene} scene トースト表示用シーン（省略可）
     */
    static unlock(id, scene = null) {
        const gs = GlobalState.getInstance();
        if (!gs.achievements) gs.achievements = {};

        if (gs.achievements[id]) {
            return false; // 既に解除済み
        }

        const ach = ACHIEVEMENTS.find(a => a.id === id);
        if (!ach) {
            console.warn(`[AchievementManager] Unknown achievement ID: ${id}`);
            return false;
        }

        gs.achievements[id] = {
            unlockedAt: new Date().toISOString()
        };

        try {
            SaveManager.saveGame();
        } catch (e) {
            console.warn('[AchievementManager] Save error:', e);
        }

        // トースト通知の表示（※silentフラグがあるものはトーストを表示しない）
        if (scene && scene.add && !ach.silent) {
            this.showUnlockToast(scene, ach);
        }

        return true;
    }

    /** 解除済みかどうか */
    static isUnlocked(id) {
        const gs = GlobalState.getInstance();
        return !!(gs.achievements && gs.achievements[id]);
    }

    /** 解除済み実績の総数を取得 */
    static getUnlockedCount() {
        const gs = GlobalState.getInstance();
        if (!gs.achievements) return 0;
        return Object.keys(gs.achievements).length;
    }

    /** 新規解除があるか（通知バッジ用） */
    static hasNewUnlocks() {
        return false;
    }

    /** 実績解除の金枠ポップアップ演出 */
    static showUnlockToast(scene, ach) {
        const { width } = scene.scale;
        const container = scene.add.container(width / 2, -60).setDepth(25000).setScrollFactor(0);

        const toastW = 380;
        const toastH = 50;

        const bg = scene.add.graphics();
        bg.fillStyle(0x1a1505, 0.95);
        bg.fillRoundedRect(-toastW / 2, -toastH / 2, toastW, toastH, 10);
        bg.lineStyle(2, 0xffd700, 1.0);
        bg.strokeRoundedRect(-toastW / 2, -toastH / 2, toastW, toastH, 10);
        container.add(bg);

        const text = scene.add.text(0, 0, `🏆 実績解除！【${ach.title}】`, {
            fontFamily: 'sans-serif',
            fontSize: '15px',
            fontStyle: 'bold',
            color: '#ffee66'
        }).setOrigin(0.5);
        container.add(text);

        // 下からスライドイン
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

    /**
     * UIモーダル表示用の一覧を取得
     */
    static getStatusList() {
        const gs = GlobalState.getInstance();
        const unlockedMap = gs.achievements || {};

        return ACHIEVEMENTS.map(ach => {
            const isDone = !!unlockedMap[ach.id];
            return {
                id: ach.id,
                title: ach.title,
                description: ach.desc,
                icon: ach.icon,
                unlocked: isDone,
                unlockedAt: isDone ? unlockedMap[ach.id].unlockedAt : null
            };
        });
    }

    /**
     * キャラクターステータス（Lv、WLV、好感度）に基づく実績を一括チェック
     */
    static checkCharacterAchievements(scene = null) {
        const gs = GlobalState.getInstance();
        if (!gs.characters) return;

        CHAR_LIST.forEach(c => {
            const char = gs.characters[c.id];
            if (!char) return;

            // Lv13以上（各キャラごと）
            if ((char.level || 1) >= 13) {
                this.unlock(`reach_lv13_${c.id}`, scene);
            }

            // 好感度 10以上 / 20以上（各キャラごと）
            let maxFriendship = 0;
            if (char.friendships) {
                for (const targetId in char.friendships) {
                    const val = char.friendships[targetId] || 0;
                    if (val > maxFriendship) maxFriendship = val;
                }
            }
            if (maxFriendship >= 10) {
                this.unlock(`friendship_10_${c.id}`, scene);
            }
            if (maxFriendship >= 20) {
                this.unlock(`friendship_20_${c.id}`, scene);
            }
        });

        // WLV 7/7（いずれかのキャラ）
        for (const id in gs.characters) {
            const char = gs.characters[id];
            if (!char) continue;
            if ((char.meleeLevel || 1) >= 7 && (char.rangedLevel || 1) >= 7) {
                this.unlock('wlv_max', scene);
                break;
            }
        }

        // 最高獲得経験値 100万
        if ((gs.maxPastExp || 0) >= 1000000 || (gs.currentRunTotalExp || 0) >= 1000000) {
            this.unlock('total_exp_1m', scene);
        }
    }
}
