import { GlobalState } from './GlobalState';
import { EventEngine } from './EventEngine';
import { SaveManager } from './SaveManager';
import { AchievementManager } from './AchievementManager';

/**
 * 仲間キャラクター喪失（死亡・離脱）マネージャー
 */
export class CharacterLossManager {
    static LOSS_IMAGE_MAP = {
        '002': 'evx002', // 蒼樹
        '003': 'evx003', // 紅華
        '004': 'evp005', // 黄蘭 (※evp004は紅華のご挨拶スチルのため、黄蘭加入スチルのevp005を指定)
        '005': 'evx005', // 李乃果
        '006': 'evx006', // さくら
        '007': 'evx007', // ななよ
        '008': 'evx008', // ノア
        '009': 'evx009', // リフィエル
        '010': 'evx010', // プロセル
        '011': 'evx011'  // 白蓮
    };

    /**
     * パーティ内のキャラクターの精神力をチェックし、1/5以下のキャラを喪失イベント経由で離脱させる
     * @param {Phaser.Scene} scene 実行シーン
     * @param {Array<string>} party パーティ配列
     * @param {Function} onComplete 完了コールバック
     */
    static checkAndTriggerLoss(scene, party, onComplete = null) {
        // ★ 精神力1/5以下による即時キャラロストは一時凍結
        if (onComplete) onComplete(false);
        return;
        
        // 紫苑(001)以外の仲間で、精神力が1/5以下のキャラを抽出
        const lossCandidates = [];
        for (const charId of currentParty) {
            if (charId === '001') continue; // 紫苑は喪失しない
            
            const charData = gs.characters[charId];
            if (!charData) continue;

            const stats = gs.calcStats(charId, currentParty);
            const maxSp = stats ? stats.maxSp : (charData.baseSp || 500);
            const curSp = charData.currentSp !== undefined ? charData.currentSp : maxSp;

            // 精神力が最大値の 1/5 (20%) 以下か？
            if (curSp <= (maxSp / 5)) {
                lossCandidates.push(charId);
            }
        }

        if (lossCandidates.length === 0) {
            if (onComplete) onComplete(false);
            return;
        }

        console.log(`🥀 [CharacterLossManager] 喪失対象キャラ検出:`, lossCandidates);

        // 1人ずつ順番に喪失イベントを再生
        const processNextLoss = (index) => {
            if (index >= lossCandidates.length) {
                if (onComplete) onComplete(true);
                return;
            }
            const charId = lossCandidates[index];
            CharacterLossManager.triggerSingleLoss(scene, charId, () => {
                processNextLoss(index + 1);
            });
        };

        processNextLoss(0);
    }

    /**
     * 特定のキャラクターの喪失イベントを再生し、離脱処理を行う
     * @param {Phaser.Scene} scene 実行シーン
     * @param {string} charId キャラクターID
     * @param {Function} onComplete 完了コールバック
     */
    static triggerSingleLoss(scene, charId, onComplete = null) {
        const gs = GlobalState.getInstance();
        const charData = gs.characters[charId];
        const charName = charData ? charData.name.replace(/^[0-9]+/, '').replace(/data$/, '') : '仲間';
        const normId = gs.normalizeCharId ? gs.normalizeCharId(charId) : charId;
        const imgKey = CharacterLossManager.LOSS_IMAGE_MAP[normId] || CharacterLossManager.LOSS_IMAGE_MAP[charId] || `evx${normId}`;

        console.log(`🥀 [CharacterLossManager] 喪失イベント開始: ${charName} (${charId}, key: ${imgKey})`);
        AchievementManager.unlock(`lost_char_${normId}`, scene);

        // イベントデータ構築
        const eventData = [
            { cmd: 'bg', key: null }, // 暗転（黒背景）
            { cmd: 'image', key: imgKey }, // 各キャラ固有一枚絵
            { cmd: 'text', name: '', body: `${charName}は同行を続けることができなくなりました。` },
            { cmd: 'clearText' },
            { cmd: 'end' }
        ];

        const engine = new EventEngine(scene, eventData, () => {
            engine.cleanup();

            // 離脱・返還処理
            if (charData) {
                // 1. 宝石返還
                if (charData.equipGem) {
                    gs.inventory.gems.push(charData.equipGem);
                    charData.equipGem = null;
                }
                // 2. レリクス返還
                if (charData.equipRelics && Array.isArray(charData.equipRelics)) {
                    for (let i = 0; i < charData.equipRelics.length; i++) {
                        if (charData.equipRelics[i]) {
                            gs.inventory.relics.push(charData.equipRelics[i]);
                            charData.equipRelics[i] = null;
                        }
                    }
                }
                // 3. 時空館装備の初期化
                charData.jikukanEquipGem = null;
                charData.jikukanEquipRelics = [null, null, null, null, null];

                // 4. EXP返還
                if (charData.exp) {
                    gs.stockExp += charData.exp;
                    charData.exp = 0;
                }
            }
            gs.cleanupJikukanEquipsOnInventoryChange();

            // 4. パーティ・隊列（同行メンバー）から完全除外（※キャラデータ・友好度は保持）
            gs.removeCharacterCompletely(charId, scene);

            // 🕊️ 今周回での離脱キャラリストに記録（同一ループ中の再加入を防止）
            if (!gs.lostCharacterIdsInCurrentLoop) gs.lostCharacterIdsInCurrentLoop = [];
            if (!gs.lostCharacterIdsInCurrentLoop.includes(normId)) {
                gs.lostCharacterIdsInCurrentLoop.push(normId);
            }

            // 🕊️ 喪失を目撃した生存パーティメンバー全員に、最後にロストしたキャラ名を記憶
            const remainingParty = (scene.party || gs.party || []).filter(id => id !== charId);
            for (const rid of remainingParty) {
                if (gs.characters[rid]) {
                    gs.characters[rid].lastSeenLostCharacterName = charName;
                }
            }

            // 5. 即時自動セーブ
            SaveManager.saveGame(scene);

            console.log(`🥀 [CharacterLossManager] 離脱・返還処理完了(友好度は保持): ${charName}`);

            if (onComplete) onComplete();
        });

        engine.start();
    }
}
