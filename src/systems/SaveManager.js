import { GlobalState } from './GlobalState';

const SAVE_KEY = 'antigravity_game_save';

export class SaveManager {
    /**
     * セーブデータが存在するか確認
     */
    static hasSaveData() {
        try {
            return localStorage.getItem(SAVE_KEY) !== null;
        } catch (e) {
            console.error('[SaveManager] hasSaveData error:', e);
            return false;
        }
    }

    /**
     * 現在のゲーム状態を保存
     * @param {Phaser.Scene} adventureScene 
     */
    static saveGame(adventureScene) {
        try {
            const gs = GlobalState.getInstance();

            // GlobalState の主要データをシリアライズ
            const globalData = {
                stockExp: gs.stockExp,
                stockSp: gs.stockSp,
                food: gs.food,
                inventory: gs.inventory,
                characters: gs.characters,
                savedFormation: gs.savedFormation ? JSON.parse(JSON.stringify(gs.savedFormation)) : {},
                activeTarots: gs.activeTarots,
                event1207Played: gs.event1207Played,
                event1214Played: gs.event1214Played,
                extraEnemyLevel: gs.extraEnemyLevel,
                extraWitchLevel: gs.extraWitchLevel,
                extraWaves: gs.extraWaves,
                enemySpeedHalf: gs.enemySpeedHalf,
                expMultiplier: gs.expMultiplier,
                spMultiplier: gs.spMultiplier
            };

            // AdventureScene のマップ状況をシリアライズ
            let adventureData = null;
            if (adventureScene) {
                const hexStates = [];
                if (adventureScene.hexes) {
                    for (const h of adventureScene.hexes) {
                        const cell = h.cellData || {};
                        hexStates.push({
                            col: h.col,
                            row: h.row,
                            visited: cell.visited !== undefined ? cell.visited : (h.isExplored ? 1 : 0),
                            revealed: cell.revealed !== undefined ? cell.revealed : 0,
                            isExplored: h.isExplored || cell.visited > 0 || false,
                            enemyLevel: cell.enemyLevel !== undefined ? cell.enemyLevel : 0,
                            witchLevel: cell.witchLevel !== undefined ? cell.witchLevel : 0,
                            enemyAttr: cell.enemyAttr !== undefined ? cell.enemyAttr : 1,
                            cleared: cell.cleared || false
                        });
                    }
                }

                adventureData = {
                    playerCol: adventureScene.playerCol !== undefined ? adventureScene.playerCol : 3,
                    playerRow: adventureScene.playerRow !== undefined ? adventureScene.playerRow : 6,
                    currentMonth: adventureScene.currentMonth || 12,
                    currentDay: adventureScene.currentDay || 1,
                    timeOfDay: adventureScene.timeOfDay || '午前',
                    timePeriodIndex: adventureScene.timePeriodIndex || 0,
                    globalWaveCount: adventureScene.globalWaveCount || 1,
                    party: adventureScene.party || ['001'],
                    hexStates: hexStates
                };
            } else {
                const existing = SaveManager.loadGameData();
                if (existing && existing.adventureState) {
                    adventureData = existing.adventureState;
                    if (gs.savedFormation && Object.keys(gs.savedFormation).length > 0) {
                        const formationChars = Object.keys(gs.savedFormation);
                        const currentPartySet = new Set(adventureData.party || []);
                        for (const charId of formationChars) {
                            currentPartySet.add(charId);
                        }
                        adventureData.party = Array.from(currentPartySet);
                    }
                }
            }


            const saveData = {
                timestamp: Date.now(),
                saveDateTimeStr: new Date().toLocaleString('ja-JP', {
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                }),
                globalState: globalData,
                adventureState: adventureData
            };

            localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
            console.log('[SaveManager] Game saved successfully!');
            return true;
        } catch (e) {
            console.error('[SaveManager] Save error:', e);
            return false;
        }
    }

    /**
     * セーブデータを読み込む
     */
    static loadGameData() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            console.error('[SaveManager] Load error:', e);
            return null;
        }
    }

    /**
     * GlobalState にセーブデータを復元
     */
    static restoreGlobalState(saveData) {
        if (!saveData || !saveData.globalState) return false;

        const gs = GlobalState.getInstance();
        const d = saveData.globalState;

        if (d.stockExp !== undefined) gs.stockExp = d.stockExp;
        if (d.stockSp !== undefined) gs.stockSp = d.stockSp;
        if (d.food !== undefined) gs.food = d.food;
        if (d.inventory) gs.inventory = d.inventory;
        if (d.characters) gs.characters = d.characters;
        if (d.savedFormation) gs.savedFormation = d.savedFormation;
        if (d.activeTarots) gs.activeTarots = d.activeTarots;
        if (d.event1207Played !== undefined) gs.event1207Played = d.event1207Played;
        if (d.event1214Played !== undefined) gs.event1214Played = d.event1214Played;
        if (d.extraEnemyLevel !== undefined) gs.extraEnemyLevel = d.extraEnemyLevel;
        if (d.extraWitchLevel !== undefined) gs.extraWitchLevel = d.extraWitchLevel;
        if (d.extraWaves !== undefined) gs.extraWaves = d.extraWaves;
        if (d.enemySpeedHalf !== undefined) gs.enemySpeedHalf = d.enemySpeedHalf;
        if (d.expMultiplier !== undefined) gs.expMultiplier = d.expMultiplier;
        if (d.spMultiplier !== undefined) gs.spMultiplier = d.spMultiplier;

        console.log('[SaveManager] GlobalState restored!');
        return true;
    }

    /**
     * セーブデータをクリア
     */
    static clearSaveData() {
        try {
            localStorage.removeItem(SAVE_KEY);
            console.log('[SaveManager] Save data cleared.');
        } catch (e) {
            console.error('[SaveManager] Clear error:', e);
        }
    }
}
