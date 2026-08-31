import { GlobalState } from './GlobalState.js';
import charDataJson from '../data/characters.json' with { type: 'json' };

const SAVE_KEY = 'antigravity_game_save';

export class SaveManager {
    /**
     * 有効なセーブデータが存在するか確認（OP戦を完了しているデータのみ有効と判定）
     */
    static hasSaveData() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return false;
            const data = JSON.parse(raw);
            if (!data || !data.globalState) return false;
            // OP戦が完了している正常なデータのみ「続きから可能」と判定
            return data.globalState.isOpCompleted === true;
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
                isOpCompleted: gs.isOpCompleted !== undefined ? gs.isOpCompleted : true,
                isDojoUnlocked: gs.isDojoUnlocked || false,
                stockExp: gs.stockExp,
                stockSp: gs.stockSp,
                devilStockSp: gs.devilStockSp || 0,
                maxPastExp: gs.maxPastExp || 0,
                currentRunTotalExp: gs.currentRunTotalExp || 0,
                food: gs.food,
                currentMonth: gs.currentMonth,
                currentDay: gs.currentDay,
                timePeriodIndex: gs.timePeriodIndex,
                inventory: gs.inventory,
                characters: gs.characters,
                dailyRewardMonth: gs.dailyRewardMonth || '',
                dailyRewardCount: gs.dailyRewardCount || 0,
                lastDailyRewardDate: gs.lastDailyRewardDate || '',
                savedFormation: gs.savedFormation ? JSON.parse(JSON.stringify(gs.savedFormation)) : {},
                autoLanes: gs.autoLanes ? JSON.parse(JSON.stringify(gs.autoLanes)) : { '-2': false, '-1': false, '0': false, '1': false, '2': false },
                isBattleAutoEnabled: gs.isBattleAutoEnabled !== undefined ? gs.isBattleAutoEnabled : true,
                pvpDamageDenominator: gs.pvpDamageDenominator !== undefined ? gs.pvpDamageDenominator : 30,
                activeTarots: gs.activeTarots,
                drawnTarotCards: gs.drawnTarotCards || [],
                event1207Played: gs.event1207Played,
                event1214Played: gs.event1214Played,
                event1217Played: gs.event1217Played,
                event1221Played: gs.event1221Played,
                event1221WildhuntPlayed: gs.event1221WildhuntPlayed || false,
                ikebukuro01Played: gs.ikebukuro01Played || false,
                ikebukuro02Played: gs.ikebukuro02Played || false,
                isTowerMode: gs.isTowerMode || false,
                hasEnteredTower: gs.hasEnteredTower || false,

                extraEnemyLevel: gs.extraEnemyLevel,
                extraWitchLevel: gs.extraWitchLevel,
                extraWaves: gs.extraWaves,
                enemySpeedHalf: gs.enemySpeedHalf,
                expMultiplier: gs.expMultiplier,
                hideBattleTips: gs.hideBattleTips,
                isTutorialMode: gs.isTutorialMode,
                tutorialMorningSeen: gs.tutorialMorningSeen,
                tutorialAfternoonSeen: gs.tutorialAfternoonSeen,
                tutorialNightSeen: gs.tutorialNightSeen,
                tutorialTarotSeen: gs.tutorialTarotSeen,
                tutorialRestSeen: gs.tutorialRestSeen,
                tutorialGameOverSeen: gs.tutorialGameOverSeen,
                tutorialStep: gs.tutorialStep,
                guideTappedFormationBtn: gs.guideTappedFormationBtn || false,
                guideTappedSionFace: gs.guideTappedSionFace || false,
                guideTappedElementResistBtn: gs.guideTappedElementResistBtn || false,
                guideTappedFriendshipBtn: gs.guideTappedFriendshipBtn || false,
                guideTappedEffectBtn: gs.guideTappedEffectBtn || false,
                guideTappedHealBtn: gs.guideTappedHealBtn || false,
                relicSortKeys: gs.relicSortKeys || ['lock', 'rank', 'max_val'],
                seenEventHistory: gs.seenEventHistory || []
            };







            // AdventureScene のマップ状況をシリアライズ
            const existing = SaveManager.loadGameData();
            let adventureData = existing ? existing.adventureState : null;
            let towerData = existing ? existing.towerState : null;

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
                            cleared: cell.cleared || false,
                            exists: cell.exists !== undefined ? cell.exists : true
                        });
                    }
                }

                if (adventureScene.isTowerMode) {
                    // タワーモード時のセーブ
                    gs.towerPlayerCol = adventureScene.playerCol;
                    gs.towerPlayerRow = adventureScene.playerRow;
                    gs.towerHexStates = hexStates;
                    towerData = {
                        towerPlayerCol: adventureScene.playerCol !== undefined ? adventureScene.playerCol : 2,
                        towerPlayerRow: adventureScene.playerRow !== undefined ? adventureScene.playerRow : 59,
                        towerFloor: 59 - (adventureScene.playerRow !== undefined ? adventureScene.playerRow : 59),
                        towerStairsFound: gs.towerStairsFound ? JSON.parse(JSON.stringify(gs.towerStairsFound)) : {},
                        towerSearchCount: gs.towerSearchCount ? JSON.parse(JSON.stringify(gs.towerSearchCount)) : {},
                        towerClearedHexes: gs.towerClearedHexes ? JSON.parse(JSON.stringify(gs.towerClearedHexes)) : {},
                        towerHexStates: hexStates
                    };
                    if (existing && existing.adventureState) {
                        adventureData = existing.adventureState;
                    }
                } else {
                    // 通常マップ時のセーブ
                    gs.normalPlayerCol = adventureScene.playerCol;
                    gs.normalPlayerRow = adventureScene.playerRow;
                    adventureData = {
                        playerCol: adventureScene.playerCol !== undefined ? adventureScene.playerCol : 3,
                        playerRow: adventureScene.playerRow !== undefined ? adventureScene.playerRow : 6,
                        currentMonth: gs.currentMonth || 12,
                        currentDay: gs.currentDay || 1,
                        timeOfDay: (adventureScene && adventureScene.timePeriods) ? adventureScene.timePeriods[gs.timePeriodIndex || 0] : '午前',
                        timePeriodIndex: gs.timePeriodIndex || 0,
                        globalWaveCount: adventureScene.globalWaveCount || 2,
                        globalEnemyCount: adventureScene.globalEnemyCount !== undefined ? adventureScene.globalEnemyCount : 10,
                        party: adventureScene.party || ['001'],
                        previousPartySize: adventureScene.party ? adventureScene.party.length : 1,
                        inRestMode: adventureScene.inRestMode || false,
                        hexStates: hexStates
                    };
                    // タワーの状態は既存データまたはGlobalStateから必ず保持・保存！
                    if (gs.towerHexStates && gs.towerHexStates.length > 0) {
                        towerData = {
                            towerPlayerCol: gs.towerPlayerCol !== undefined ? gs.towerPlayerCol : 2,
                            towerPlayerRow: gs.towerPlayerRow !== undefined ? gs.towerPlayerRow : 59,
                            towerFloor: 59 - (gs.towerPlayerRow !== undefined ? gs.towerPlayerRow : 59),
                            towerStairsFound: gs.towerStairsFound ? JSON.parse(JSON.stringify(gs.towerStairsFound)) : {},
                            towerSearchCount: gs.towerSearchCount ? JSON.parse(JSON.stringify(gs.towerSearchCount)) : {},
                            towerClearedHexes: gs.towerClearedHexes ? JSON.parse(JSON.stringify(gs.towerClearedHexes)) : {},
                            towerHexStates: gs.towerHexStates
                        };
                    } else if (existing && existing.towerState) {
                        towerData = existing.towerState;
                    }
                }
            } else if (existing && existing.adventureState) {
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

            const saveData = {
                timestamp: Date.now(),
                saveDateTimeStr: new Date().toLocaleString('ja-JP', {
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                }),
                globalState: globalData,
                adventureState: adventureData,
                towerState: towerData
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

        if (d.isOpCompleted !== undefined) gs.isOpCompleted = d.isOpCompleted;
        if (d.isDojoUnlocked !== undefined) gs.isDojoUnlocked = d.isDojoUnlocked;
        if (d.stockExp !== undefined) gs.stockExp = d.stockExp;
        if (d.stockSp !== undefined) gs.stockSp = d.stockSp;
        if (d.devilStockSp !== undefined) gs.devilStockSp = d.devilStockSp;
        if (d.maxPastExp !== undefined) gs.maxPastExp = d.maxPastExp;
        if (d.currentRunTotalExp !== undefined) gs.currentRunTotalExp = d.currentRunTotalExp;
        if (d.food !== undefined) gs.food = d.food;
        if (d.currentMonth !== undefined) gs.currentMonth = d.currentMonth;
        if (d.currentDay !== undefined) gs.currentDay = d.currentDay;
        if (d.timePeriodIndex !== undefined) gs.timePeriodIndex = d.timePeriodIndex;
        if (d.inventory) gs.inventory = d.inventory;
        if (d.relicSortKeys) gs.relicSortKeys = d.relicSortKeys;
        if (d.dailyRewardMonth !== undefined) gs.dailyRewardMonth = d.dailyRewardMonth;
        if (d.dailyRewardCount !== undefined) gs.dailyRewardCount = d.dailyRewardCount;
        if (d.lastDailyRewardDate !== undefined) gs.lastDailyRewardDate = d.lastDailyRewardDate;

        if (d.characters) {
            gs.characters = d.characters;
            // 未登録キャラクターの自動補完
            const requiredChars = [
                { id: '001', name: '紫苑' },
                { id: '002', name: '蒼樹' },
                { id: '003', name: '紅華' },
                { id: '004', name: '黄蘭' },
                { id: '005', name: '李乃果' },
                { id: '007', name: 'ななよ' },
                { id: '008', name: 'ノア' },
                { id: '010', name: '白蓮' }
            ];
            for (const req of requiredChars) {
                if (!gs.characters[req.id]) {
                    gs.characters[req.id] = gs.createInitialCharData(req.id, req.name, 1);
                }
            }
            // 既存キャラの基礎ステータス最新同期＆hasAccompanied 自動補完
            for (const cid in gs.characters) {
                const c = gs.characters[cid];
                if (c) {
                    const def = charDataJson.characters[cid] || {};
                    if (def.baseHp !== undefined) c.baseHp = def.baseHp;
                    if (def.baseSp !== undefined) c.baseSp = def.baseSp;
                    if (def.baseAtk !== undefined) c.baseAtk = def.baseAtk;
                    if (cid === '001') c.hasAccompanied = true;
                    if (c.hasAccompanied === undefined) {
                        const hasFriendship = c.friendships && Object.keys(c.friendships).length > 0;
                        const hasMet = c.metCharacters && c.metCharacters.length > 0;
                        c.hasAccompanied = !!(hasFriendship || hasMet || c.isJoined);
                    }
                }
            }
        }
        if (d.savedFormation) gs.savedFormation = d.savedFormation;
        if (d.autoLanes) gs.autoLanes = d.autoLanes;
        if (d.isBattleAutoEnabled !== undefined) gs.isBattleAutoEnabled = d.isBattleAutoEnabled;
        if (d.pvpDamageDenominator !== undefined) gs.pvpDamageDenominator = d.pvpDamageDenominator;
        if (d.activeTarots) gs.activeTarots = d.activeTarots;
        if (d.drawnTarotCards) gs.drawnTarotCards = d.drawnTarotCards;
        if (d.event1207Played !== undefined) gs.event1207Played = d.event1207Played;
        if (d.event1214Played !== undefined) gs.event1214Played = d.event1214Played;
        if (d.event1217Played !== undefined) gs.event1217Played = d.event1217Played;
        if (d.event1221Played !== undefined) gs.event1221Played = d.event1221Played;
        if (d.event1221WildhuntPlayed !== undefined) gs.event1221WildhuntPlayed = d.event1221WildhuntPlayed;
        if (d.ikebukuro01Played !== undefined) gs.ikebukuro01Played = d.ikebukuro01Played;
        if (d.ikebukuro02Played !== undefined) gs.ikebukuro02Played = d.ikebukuro02Played;
        if (d.isTowerMode !== undefined) gs.isTowerMode = d.isTowerMode;
        if (d.hasEnteredTower !== undefined) gs.hasEnteredTower = d.hasEnteredTower;
        if (d.seenEventHistory !== undefined) gs.seenEventHistory = d.seenEventHistory || [];

        if (d.extraEnemyLevel !== undefined) gs.extraEnemyLevel = d.extraEnemyLevel;
        if (d.extraWitchLevel !== undefined) gs.extraWitchLevel = d.extraWitchLevel;
        if (d.extraWaves !== undefined) gs.extraWaves = d.extraWaves;
        if (d.enemySpeedHalf !== undefined) gs.enemySpeedHalf = d.enemySpeedHalf;
        if (d.expMultiplier !== undefined) gs.expMultiplier = d.expMultiplier;
        if (d.spMultiplier !== undefined) gs.spMultiplier = d.spMultiplier;
        if (d.hideBattleTips !== undefined) gs.hideBattleTips = d.hideBattleTips;
        if (d.isTutorialMode !== undefined) gs.isTutorialMode = d.isTutorialMode;
        if (d.tutorialMorningSeen !== undefined) gs.tutorialMorningSeen = d.tutorialMorningSeen;
        if (d.tutorialAfternoonSeen !== undefined) gs.tutorialAfternoonSeen = d.tutorialAfternoonSeen;
        if (d.tutorialNightSeen !== undefined) gs.tutorialNightSeen = d.tutorialNightSeen;
        if (d.tutorialTarotSeen !== undefined) gs.tutorialTarotSeen = d.tutorialTarotSeen;
        if (d.tutorialRestSeen !== undefined) gs.tutorialRestSeen = d.tutorialRestSeen;
        if (d.tutorialGameOverSeen !== undefined) gs.tutorialGameOverSeen = d.tutorialGameOverSeen;
        if (d.tutorialStep !== undefined) gs.tutorialStep = d.tutorialStep;
        if (d.guideTappedFormationBtn !== undefined) gs.guideTappedFormationBtn = d.guideTappedFormationBtn;
        if (d.guideTappedSionFace !== undefined) gs.guideTappedSionFace = d.guideTappedSionFace;
        if (d.guideTappedElementResistBtn !== undefined) gs.guideTappedElementResistBtn = d.guideTappedElementResistBtn;
        if (d.guideTappedFriendshipBtn !== undefined) gs.guideTappedFriendshipBtn = d.guideTappedFriendshipBtn;
        if (d.guideTappedEffectBtn !== undefined) gs.guideTappedEffectBtn = d.guideTappedEffectBtn;
        if (d.guideTappedHealBtn !== undefined) gs.guideTappedHealBtn = d.guideTappedHealBtn;

        // タワー状態の復元
        if (saveData.towerState) {
            const ts = saveData.towerState;
            if (ts.towerPlayerCol !== undefined) gs.towerPlayerCol = ts.towerPlayerCol;
            if (ts.towerPlayerRow !== undefined) gs.towerPlayerRow = ts.towerPlayerRow;
            if (ts.towerHexStates) gs.towerHexStates = ts.towerHexStates;
            if (ts.towerStairsFound) gs.towerStairsFound = ts.towerStairsFound;
            if (ts.towerSearchCount) gs.towerSearchCount = ts.towerSearchCount;
            if (ts.towerClearedHexes) gs.towerClearedHexes = ts.towerClearedHexes;
        }

        // 通常マップ座標の復元
        if (saveData.adventureState) {
            const as = saveData.adventureState;
            if (as.playerCol !== undefined) gs.normalPlayerCol = as.playerCol;
            if (as.playerRow !== undefined) gs.normalPlayerRow = as.playerRow;
        }

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
