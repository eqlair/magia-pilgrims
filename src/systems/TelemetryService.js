import { GlobalState } from './GlobalState.js';

const UUID_STORAGE_KEY = 'magia_telemetry_player_uuid';
const DEFAULT_SERVER_URL = 'http://192.168.24.27:4000/api/report';

export class TelemetryService {
    /**
     * 端末固有のUUIDを取得または生成（localStorageに永続化）
     */
    static getPlayerUuid() {
        try {
            let uuid = localStorage.getItem(UUID_STORAGE_KEY);
            if (!uuid) {
                if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                    uuid = crypto.randomUUID();
                } else {
                    uuid = 'player_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
                }
                localStorage.setItem(UUID_STORAGE_KEY, uuid);
            }
            return uuid;
        } catch (e) {
            return 'anonymous_' + Date.now();
        }
    }

    /**
     * APIエンドポイントURLを取得
     */
    static getServerUrl() {
        try {
            return localStorage.getItem('magia_telemetry_server_url') || DEFAULT_SERVER_URL;
        } catch (e) {
            return DEFAULT_SERVER_URL;
        }
    }

    /**
     * キャラクター全員（またはパーティ）の要求ステータスを抽出
     * - レベル
     * - 装備補正後: HP, MP, 攻撃力, リロード速度, 回避率, 命中率, CH率, CH倍率, 各属性防御力
     * - 道場進行段階（A学科以外）
     */
    static extractAllCharactersStats(isJikukan = false, targetParty = null) {
        const gs = GlobalState.getInstance();
        const chars = gs.characters || {};
        const result = {};

        // 対象キャラ（パーティ指定があればパーティ、なければ全登録キャラ）
        const charIds = targetParty || Object.keys(chars);

        for (const cid of charIds) {
            const char = chars[cid];
            if (!char) continue;

            const partyForCalc = targetParty || (isJikukan ? null : (gs.isTowerMode ? gs.towerParty : gs.normalParty));
            const eff = gs.calcStats(cid, partyForCalc || [], null, isJikukan);
            if (!eff) continue;

            // 回避率・命中率・CH率・CH倍率の実効値計算
            const evadeRate = Math.round((0.05 + (eff.evadeRateBonus || 0)) * 1000) / 10; // %表記（例: 12.5%）
            const hitRate = Math.round((1.0 + (eff.hitRateBonus || 0)) * 1000) / 10;     // %表記（例: 110.0%）
            const critRate = Math.round((0.05 + (eff.critRateBonus || 0)) * 1000) / 10;   // %表記（例: 15.0%）
            const critMult = Math.round((2.0 + (eff.critMultBonus || 0)) * 100) / 100;    // 倍率（例: 2.30）

            // 道場進行段階（A基礎学科 以外: B, C, D）
            const dojo = char.dojo || {};
            const completedStages = dojo.completedStages || {};
            const currentSubjects = dojo.currentSubjects || {};
            const dojoNonBaseProgress = {
                waza_B: {
                    stage: completedStages.B || 0,
                    completedSubjects: currentSubjects.B || []
                },
                kokoro_C: {
                    stage: completedStages.C || 0,
                    completedSubjects: currentSubjects.C || []
                },
                karada_D: {
                    stage: completedStages.D || 0,
                    completedSubjects: currentSubjects.D || []
                }
            };

            result[cid] = {
                name: char.name || cid,
                level: eff.level || char.level || 1,
                stats: {
                    hp: eff.maxHp,
                    mp: eff.maxSp,
                    atk: eff.atk,
                    reload_speed: eff.reload,
                    evade_rate_pct: evadeRate,
                    hit_rate_pct: hitRate,
                    crit_rate_pct: critRate,
                    crit_multiplier: critMult,
                    element_resists: {
                        red: eff.elemMods?.red || 0,
                        blue: eff.elemMods?.blue || 0,
                        green: eff.elemMods?.green || 0,
                        yellow: eff.elemMods?.yellow || 0,
                        purple: eff.elemMods?.purple || 0
                    }
                },
                dojo_progress: dojoNonBaseProgress
            };
        }

        return result;
    }

    /**
     * 時空館の各コンテンツ進行状況を抽出
     */
    static extractJikukanProgress() {
        const gs = GlobalState.getInstance();
        const j = gs.getJikukanState ? gs.getJikukanState() : (gs.jikukanState || {});
        return {
            sharedLevel: j.sharedLevel || 1,
            sharedMeleeLevel: j.sharedMeleeLevel || 1,
            sharedRangedLevel: j.sharedRangedLevel || 1,
            limitedSp: j.limitedSp || 0,
            solo: {
                waspFloor: j.solo?.waspFloor || 1,
                witchFloor: j.solo?.witchFloor || 1
            },
            trio: {
                waspFloor: j.trio?.waspFloor || 1,
                witchFloor: j.trio?.witchFloor || 1
            },
            quintuple: {
                waspFloor: j.quintuple?.waspFloor || 1,
                witchFloor: j.quintuple?.witchFloor || 1
            }
        };
    }

    /**
     * マップ・タワーの進行度を抽出
     */
    static extractMapAndTowerProgress() {
        const gs = GlobalState.getInstance();
        const timeOfDayList = ['午前', '午後', '夜'];
        return {
            map: {
                currentMonth: gs.currentMonth || 12,
                currentDay: gs.currentDay || 1,
                timeOfDay: timeOfDayList[gs.timePeriodIndex || 0] || '午前',
                timePeriodIndex: gs.timePeriodIndex || 0,
                isOpCompleted: !!gs.isOpCompleted
            },
            tower: {
                floor: gs.towerPlayerRow !== undefined ? Math.max(0, 59 - gs.towerPlayerRow) : 0,
                boss21Defeated: !!gs.tower21BossDefeated,
                hasEnteredTower: !!gs.hasEnteredTower
            }
        };
    }

    /**
     * 起動時レポートを送信（1セッションにつき1回のみ実行）
     */
    static sendStartupReport() {
        if (this._startupSent) return;
        this._startupSent = true;

        try {
            const gs = GlobalState.getInstance();
            // セーブデータが存在する場合は一度読み込んで状態を反映してから抽出
            if (typeof localStorage !== 'undefined') {
                const raw = localStorage.getItem('antigravity_game_save');
                if (raw) {
                    try {
                        const parsed = JSON.parse(raw);
                        if (parsed && parsed.globalState) {
                            // 最新ステータスで報告
                        }
                    } catch (e) {}
                }
            }

            const mapAndTower = this.extractMapAndTowerProgress();

            const payload = {
                characters: this.extractAllCharactersStats(false),
                map_progress: mapAndTower.map,
                tower_progress: mapAndTower.tower,
                jikukan_progress: this.extractJikukanProgress(),
                max_past_exp: gs.maxPastExp || 0,
                stock_exp: gs.stockExp || 0,
                stock_sp: gs.stockSp || 0
            };

            this.postReport('startup', payload);
        } catch (e) {
            console.warn('[Telemetry] sendStartupReport error (ignored):', e);
        }
    }

    /**
     * 全滅時レポートを送信
     * @param {Phaser.Scene} battleScene 
     * @param {BattleEngine} engine 
     */
    static sendWipeoutReport(battleScene, engine) {
        try {
            const bConfig = battleScene?.battleConfig || {};
            const isJikukan = !!bConfig.isJikukan;
            const party = battleScene?.party || [];

            // 敵情報の抽出
            let battleType = 'normal_map';
            if (isJikukan) battleType = 'jikukan';
            else if (battleScene?.isTowerMode) battleType = 'tower';
            else if (bConfig.isNightExploration) battleType = 'night_exploration';
            else if (bConfig.isWildhunt) battleType = 'wildhunt';
            else if (bConfig.isSnakeBossTest) battleType = 'snake_boss_test';

            let remainingWitchHp = null;
            let maxWitchHp = null;
            if (engine?.witch) {
                remainingWitchHp = Math.max(0, Math.floor(engine.witch.hp));
                maxWitchHp = engine.witch.maxHp;
            } else if (engine?.snakeBoss) {
                remainingWitchHp = Math.max(0, Math.floor(engine.snakeBoss.hp));
                maxWitchHp = engine.snakeBoss.maxHp;
            }

            const enemyInfo = {
                battle_type: battleType,
                enemy_level: bConfig.enemyLevel || engine?.enemyLevel || 0,
                enemy_count: bConfig.enemyCount || 0,
                is_witch: !!(bConfig.isWitch || engine?.witch || engine?.snakeBoss),
                witch_level: bConfig.majoLevel || (engine?.witch ? bConfig.majoLevel : null),
                witch_hp_remaining: remainingWitchHp,
                witch_hp_max: maxWitchHp,
                jikukan_detail: isJikukan ? {
                    mode: bConfig.jikukanMode || 'solo',
                    type: bConfig.jikukanType || 'wasp',
                    floor: bConfig.jikukanFloor || 1
                } : null
            };

            const payload = {
                battle_party: party,
                characters: this.extractAllCharactersStats(isJikukan, party.length > 0 ? party : null),
                enemy_info: enemyInfo,
                jikukan_progress: this.extractJikukanProgress()
            };

            this.postReport('wipeout', payload);
        } catch (e) {
            console.warn('[Telemetry] sendWipeoutReport error (ignored):', e);
        }
    }

    /**
     * レポート送信コア（Fire-and-Forget / リトライなし / ゲームを止めない）
     */
    static postReport(eventType, data) {
        const url = this.getServerUrl();
        const playerUuid = this.getPlayerUuid();

        const body = {
            player_uuid: playerUuid,
            event_type: eventType,
            data
        };

        // バックグラウンドで非同期送信（失敗しても一切何もしない）
        try {
            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body),
                // タイムアウト用（長時間ハング防止）
                signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined
            })
            .then(res => {
                if (res.ok) {
                    console.log(`[Telemetry] Sent ${eventType} report successfully.`);
                } else {
                    console.warn(`[Telemetry] Server returned status ${res.status}`);
                }
            })
            .catch(err => {
                // オフラインや社外など未到達でも完全に無視（リトライしない）
                console.log(`[Telemetry] Report delivery skipped (offline or unreachable): ${err.message}`);
            });
        } catch (err) {
            // fetch呼び出し自体の例外も無視
        }
    }
}
