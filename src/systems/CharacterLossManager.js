import { GlobalState } from './GlobalState';
import { EventEngine } from './EventEngine';
import { SaveManager } from './SaveManager';

/**
 * 仲間キャラクター喪失（死亡・離脱）マネージャー
 */
export class CharacterLossManager {
    static LOSS_IMAGE_MAP = {
        '002': 'evx_002', // 蒼樹
        '003': 'evx_003', // 紅華
        '004': 'evx_004', // 黄蘭
        '005': 'evx_005', // 李乃果
        '010': 'evx_010'  // 白蓮
    };

    /**
     * パーティ内のキャラクターの精神力をチェックし、1/5以下のキャラを喪失イベント経由で離脱させる
     * @param {Phaser.Scene} scene 実行シーン
     * @param {Array<string>} party パーティ配列
     * @param {Function} onComplete 完了コールバック
     */
    static checkAndTriggerLoss(scene, party, onComplete = null) {
        const gs = GlobalState.getInstance();
        const currentParty = party || gs.party || ['001'];
        
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
        const imgKey = CharacterLossManager.LOSS_IMAGE_MAP[charId] || 'evx_002';

        console.log(`🥀 [CharacterLossManager] 喪失イベント開始: ${charName} (${charId})`);

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
                // 3. EXP返還
                if (charData.exp) {
                    gs.stockExp += charData.exp;
                    charData.exp = 0;
                }
            }

            // 4. パーティ・隊列（同行メンバー）から除外（※キャラデータ・友好度は大切に保持！）
            if (gs.party) {
                gs.party = gs.party.filter(id => id !== charId);
            }
            if (scene.party) {
                scene.party = scene.party.filter(id => id !== charId);
            }
            delete gs.savedFormation[charId];
            
            // AdventureSceneが起動中・バックグラウンドに存在する場合はそちらのpartyからも同期除外
            const advScene = scene.scene ? scene.scene.get('AdventureScene') : null;
            if (advScene && advScene.party) {
                advScene.party = advScene.party.filter(id => id !== charId);
            }

            // 5. 即時自動セーブ
            SaveManager.saveGame(scene);

            console.log(`🥀 [CharacterLossManager] 離脱・返還処理完了(友好度は保持): ${charName}`);

            if (onComplete) onComplete();
        });

        engine.start();
    }
}
