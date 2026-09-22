import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ログファイル保存先
const JSONL_PATH = path.join(DATA_DIR, 'reports.jsonl');
const DB_PATH = path.join(DATA_DIR, 'telemetry.db');

// SQLiteの初期化（Node 22組み込みの node:sqlite を使用）
let db = null;
try {
    const { DatabaseSync } = await import('node:sqlite');
    db = new DatabaseSync(DB_PATH);
    db.exec(`
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_uuid TEXT,
            event_type TEXT,
            summary TEXT,
            payload_json TEXT,
            created_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_event_type ON reports(event_type);
        CREATE INDEX IF NOT EXISTS idx_player_uuid ON reports(player_uuid);
        CREATE INDEX IF NOT EXISTS idx_created_at ON reports(created_at);
    `);
    console.log('✅ SQLite database initialized using node:sqlite at:', DB_PATH);
} catch (err) {
    console.warn('⚠️ node:sqlite not available, falling back to JSONL file storage:', err.message);
}

// ミドルウェア
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ヘルスチェック
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        sqlite: !!db
    });
});

// レポート受信API
app.post('/api/report', (req, res) => {
    try {
        const body = req.body || {};
        const { player_uuid, event_type, data } = body;

        if (!player_uuid || !event_type) {
            return res.status(400).json({ error: 'Missing required fields: player_uuid and event_type' });
        }

        const now = new Date();
        const jstTimeStr = new Date(now.getTime() + (9 * 60 * 60 * 1000)).toISOString().replace('Z', '+09:00');
        
        // 簡易サマリーの生成
        let summary = '';
        const expVal = data?.current_run_total_exp !== undefined ? data.current_run_total_exp : (data?.max_past_exp || 0);
        const expStr = ` | 累計EXP: ${Number(expVal).toLocaleString()}`;
        if (event_type === 'startup') {
            const mapP = data?.map_progress;
            const dayStr = mapP?.currentMonth ? `${mapP.currentMonth}/${mapP.currentDay || 1}(${mapP.timeOfDay || '午前'})` : '-';
            summary = `起動 | Day: ${dayStr} | Tower: ${data?.tower_progress?.floor || 0}F${expStr}`;
        } else if (event_type === 'wipeout') {
            const enemy = data?.enemy_info;
            const witchHp = (enemy?.witch_hp_remaining !== undefined && enemy?.witch_hp_remaining !== null)
                ? ` (ボスHP: ${enemy.witch_hp_remaining}/${enemy.witch_hp_max || '?'})`
                : '';
            summary = `全滅 | 戦闘: ${enemy?.battle_type || '通常'} | 敵Lv: ${enemy?.enemy_level || 0}${witchHp}${expStr}`;
        } else {
            summary = `イベント: ${event_type}${expStr}`;
        }

        const record = {
            player_uuid,
            event_type,
            summary,
            data,
            created_at: jstTimeStr
        };

        // 1. JSONL に追記保存（常時確実なバックアップ）
        fs.appendFileSync(JSONL_PATH, JSON.stringify(record) + '\n', 'utf-8');

        // 2. SQLite に保存
        let insertId = null;
        if (db) {
            const insert = db.prepare(`
                INSERT INTO reports (player_uuid, event_type, summary, payload_json, created_at)
                VALUES (?, ?, ?, ?, ?)
            `);
            const result = insert.run(player_uuid, event_type, summary, JSON.stringify(data), jstTimeStr);
            insertId = result.lastInsertRowid;
        }

        console.log(`[Report Received] [${event_type}] from ${player_uuid.slice(0, 8)}... - ${summary}`);
        res.json({ success: true, id: insertId, timestamp: jstTimeStr });

    } catch (err) {
        console.error('[Report Error]', err);
        res.status(500).json({ error: 'Internal server error', message: err.message });
    }
});

// JSONでの直近レポート取得
app.get('/api/reports/raw', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 200;
        if (db) {
            const stmt = db.prepare(`
                SELECT id, player_uuid, event_type, summary, payload_json, created_at 
                FROM reports 
                ORDER BY id DESC 
                LIMIT ?
            `);
            const rows = stmt.all(limit);
            const parsed = rows.map(r => ({
                ...r,
                payload: JSON.parse(r.payload_json || '{}')
            }));
            return res.json(parsed);
        }

        // SQLiteがない場合はJSONLから末尾を取得
        if (!fs.existsSync(JSONL_PATH)) return res.json([]);
        const lines = fs.readFileSync(JSONL_PATH, 'utf-8').trim().split('\n').filter(Boolean);
        const recent = lines.slice(-limit).map(l => JSON.parse(l)).reverse();
        res.json(recent);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ヘルパー: キャラクターステータスカードのHTML生成
function renderCharacterCards(characters, battleParty = []) {
    if (!characters || Object.keys(characters).length === 0) {
        return '<div style="color: #888; font-size: 12px;">キャラクターデータなし</div>';
    }

    const cardsHtml = Object.entries(characters).map(([cid, char]) => {
        const isParty = Array.isArray(battleParty) && battleParty.includes(cid);
        const stats = char.stats || {};
        const dojo = char.dojo_progress || {};
        const resists = stats.element_resists || {};

        const partyBadge = isParty 
            ? '<span style="background: #e67e22; color: #fff; font-size: 10px; padding: 1px 5px; border-radius: 3px; font-weight: bold; margin-left: 6px;">出撃</span>' 
            : '';

        // 道場テキスト
        const dojoItems = [];
        if (dojo.waza_B?.stage > 0) dojoItems.push(`技:${dojo.waza_B.stage}段`);
        if (dojo.kokoro_C?.stage > 0) dojoItems.push(`心:${dojo.kokoro_C.stage}段`);
        if (dojo.karada_D?.stage > 0) dojoItems.push(`体:${dojo.karada_D.stage}段`);
        const dojoStr = dojoItems.length > 0 ? dojoItems.join(' / ') : '道場: 未着手';

        return `
            <div style="background: #22252a; border: 1px solid ${isParty ? '#e67e22' : '#3a3f47'}; border-radius: 6px; padding: 10px; width: calc(50% - 10px); min-width: 280px; box-sizing: border-box;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; padding-bottom: 6px; margin-bottom: 8px;">
                    <div style="font-weight: bold; font-size: 13px; color: #fff;">
                        ${char.name || cid} <span style="font-size: 11px; color: #aaa;">(ID: ${cid})</span> ${partyBadge}
                    </div>
                    <div style="color: #f1c40f; font-weight: bold; font-size: 13px;">Lv.${char.level || 1}</div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; font-size: 11px; color: #ccc;">
                    <div>HP: <b style="color: #2ecc71;">${stats.hp ?? '-'}</b></div>
                    <div>MP: <b style="color: #3498db;">${stats.mp ?? '-'}</b></div>
                    <div>攻撃力: <b style="color: #e74c3c;">${stats.atk ?? '-'}</b></div>
                    <div>リロード: <b>${stats.reload_speed ?? '-'}s</b></div>
                    <div>会心率: <b>${stats.crit_rate_pct ?? 0}%</b></div>
                    <div>会心倍率: <b>${stats.crit_multiplier ?? 2.0}x</b></div>
                    <div>回避率: <b>${stats.evade_rate_pct ?? 0}%</b></div>
                    <div>命中率: <b>${stats.hit_rate_pct ?? 100}%</b></div>
                </div>
                <div style="margin-top: 6px; padding-top: 4px; border-top: 1px dashed #333; font-size: 10px; color: #888; display: flex; justify-content: space-between;">
                    <span>${dojoStr}</span>
                    <span title="赤/青/緑/黄/紫 耐性">耐性: ${resists.red ?? 0}/${resists.blue ?? 0}/${resists.green ?? 0}/${resists.yellow ?? 0}/${resists.purple ?? 0}</span>
                </div>
            </div>
        `;
    }).join('');

    return `<div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px;">${cardsHtml}</div>`;
}

// ヘルパー: 敵情報のHTML生成
function renderEnemyCard(enemyInfo) {
    if (!enemyInfo) return '';
    const isWitch = !!enemyInfo.is_witch;
    const battleTypeLabel = {
        'normal_map': '通常探索',
        'tower': '試練の巨塔',
        'night_exploration': '夜間探索',
        'wildhunt': 'ワイルドハント',
        'jikukan': '時空館',
        'snake_boss_test': '大蛇ボス戦'
    }[enemyInfo.battle_type] || enemyInfo.battle_type || '戦闘';

    let hpBarHtml = '';
    if (enemyInfo.witch_hp_remaining !== null && enemyInfo.witch_hp_remaining !== undefined && enemyInfo.witch_hp_max) {
        const pct = Math.max(0, Math.min(100, Math.round((enemyInfo.witch_hp_remaining / enemyInfo.witch_hp_max) * 100)));
        hpBarHtml = `
            <div style="margin-top: 8px;">
                <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
                    <span style="color: #e74c3c; font-weight: bold;">魔女/ボス残HP:</span>
                    <span>${enemyInfo.witch_hp_remaining.toLocaleString()} / ${enemyInfo.witch_hp_max.toLocaleString()} (${pct}%)</span>
                </div>
                <div style="background: #444; border-radius: 4px; height: 10px; overflow: hidden; position: relative;">
                    <div style="background: linear-gradient(90deg, #e74c3c, #c0392b); width: ${pct}%; height: 100%;"></div>
                </div>
            </div>
        `;
    }

    return `
        <div style="background: #2b1f1f; border: 1px solid #772b2b; border-radius: 6px; padding: 10px; margin-top: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: bold; color: #ff7675; font-size: 13px;">⚔️ 対戦相手: ${battleTypeLabel}</span>
                <span style="font-size: 12px; color: #ddd;">敵Lv: <b>${enemyInfo.enemy_level || '-'}</b> ${enemyInfo.enemy_count ? `(${enemyInfo.enemy_count}体)` : ''}</span>
            </div>
            ${hpBarHtml}
            ${enemyInfo.jikukan_detail ? `<div style="font-size: 11px; color: #aaa; margin-top: 4px;">時空館モード: ${enemyInfo.jikukan_detail.mode} / ${enemyInfo.jikukan_detail.type} ${enemyInfo.jikukan_detail.floor}F</div>` : ''}
        </div>
    `;
}

// ブラウザで見れるダッシュボード (HTML)
app.get('/api/reports/recent', (req, res) => {
    try {
        const limit = 500;
        let records = [];

        if (db) {
            const stmt = db.prepare(`
                SELECT id, player_uuid, event_type, summary, payload_json, created_at 
                FROM reports 
                ORDER BY id DESC 
                LIMIT ?
            `);
            const rows = stmt.all(limit);
            records = rows.map(r => ({
                id: r.id,
                player_uuid: r.player_uuid,
                event_type: r.event_type,
                summary: r.summary,
                created_at: r.created_at,
                data: JSON.parse(r.payload_json || '{}')
            }));
        } else if (fs.existsSync(JSONL_PATH)) {
            const lines = fs.readFileSync(JSONL_PATH, 'utf-8').trim().split('\n').filter(Boolean);
            records = lines.slice(-limit).map((l, i) => ({ id: i + 1, ...JSON.parse(l) })).reverse();
        }

        // プレイヤーごとにグループ化（同一個体の集約）
        const playerMap = new Map();
        for (const r of records) {
            const uuid = r.player_uuid || 'unknown';
            if (!playerMap.has(uuid)) {
                playerMap.set(uuid, []);
            }
            playerMap.get(uuid).push(r);
        }

        // プレイヤーサマリーの構築（最新受信日時の降順でソート）
        const playersList = [];
        for (const [uuid, list] of playerMap.entries()) {
            // listはすでに降順（最新がインデックス0）
            const latest = list[0];
            const oldest = list[list.length - 1];
            
            // 最高EXP・最新EXP・進行度などを抽出
            let highestExp = 0;
            let currentExp = 0;
            for (const item of list) {
                const itemExp = item.data?.current_run_total_exp || item.data?.max_past_exp || 0;
                if (itemExp > highestExp) highestExp = itemExp;
            }
            currentExp = latest.data?.current_run_total_exp || latest.data?.max_past_exp || 0;

            const mapP = latest.data?.map_progress;
            const towerP = latest.data?.tower_progress;
            let locationStr = '-';
            if (towerP?.floor > 0) {
                locationStr = `塔 ${towerP.floor}F`;
            } else if (mapP?.currentMonth) {
                locationStr = `${mapP.currentMonth}/${mapP.currentDay || 1} ${mapP.timeOfDay || '午前'}`;
            }

            playersList.push({
                uuid,
                reportCount: list.length,
                latestReport: latest,
                oldestReport: oldest,
                currentExp,
                highestExp,
                locationStr,
                reports: list // 降順（最新から過去へ）
            });
        }

        // 最新の活動順にソート
        playersList.sort((a, b) => new Date(b.latestReport.created_at) - new Date(a.latestReport.created_at));

        // プレイヤー別アコーディオンHTMLの生成
        const playersHtml = playersList.map((p, pIdx) => {
            const latest = p.latestReport;
            const badgeColor = latest.event_type === 'wipeout' ? '#e74c3c' : (latest.event_type === 'startup' ? '#3498db' : '#2ecc71');
            const shortUuid = p.uuid.slice(0, 8);

            // 履歴タイムラインのHTML
            const timelineHtml = p.reports.map((r, rIdx) => {
                const rBadgeColor = r.event_type === 'wipeout' ? '#e74c3c' : (r.event_type === 'startup' ? '#3498db' : '#2ecc71');
                const rExp = r.data?.current_run_total_exp || r.data?.max_past_exp || 0;
                const rMap = r.data?.map_progress;
                const rTower = r.data?.tower_progress;
                const rLocation = rTower?.floor > 0 ? `塔 ${rTower.floor}F` : (rMap?.currentMonth ? `${rMap.currentMonth}/${rMap.currentDay || 1} (${rMap.timeOfDay || '午前'})` : '-');
                
                const enemyHtml = r.event_type === 'wipeout' ? renderEnemyCard(r.data?.enemy_info) : '';
                const charCardsHtml = renderCharacterCards(r.data?.characters, r.data?.battle_party || []);
                const jsonStr = JSON.stringify(r.data, null, 2);

                return `
                    <div style="border-left: 3px solid ${rBadgeColor}; background: #181b20; border-radius: 0 8px 8px 0; padding: 12px; margin-bottom: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; border-bottom: 1px solid #2a2e35; padding-bottom: 8px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="background: ${rBadgeColor}; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">${r.event_type.toUpperCase()}</span>
                                <span style="font-size: 12px; color: #bbb; font-family: monospace;">${r.created_at}</span>
                                <span style="font-size: 12px; color: #888;">(ID: #${r.id || '-'})</span>
                            </div>
                            <div style="font-size: 12px; display: flex; gap: 12px;">
                                <span>場所: <b style="color: #4aa3df;">${rLocation}</b></span>
                                <span>累計EXP: <b style="color: #f1c40f;">${Number(rExp).toLocaleString()}</b></span>
                            </div>
                        </div>

                        ${enemyHtml}

                        <div style="margin-top: 10px;">
                            <div style="font-size: 12px; font-weight: bold; color: #aaa; margin-bottom: 4px;">👥 キャラクターステータス</div>
                            ${charCardsHtml}
                        </div>

                        <div style="margin-top: 10px;">
                            <details style="font-size: 11px;">
                                <summary style="cursor: pointer; color: #888;">🔍 生JSONデータ</summary>
                                <pre style="background: #101215; color: #bbb; padding: 8px; border-radius: 4px; max-height: 200px; overflow: auto; margin-top: 4px;">${jsonStr}</pre>
                            </details>
                        </div>
                    </div>
                `;
            }).join('');

            return `
                <div style="background: #1f232a; border: 1px solid #333a44; border-radius: 8px; margin-bottom: 14px; overflow: hidden;">
                    <!-- プレイヤーヘッダー行（クリックで開閉） -->
                    <div onclick="togglePlayer('player-${pIdx}')" style="cursor: pointer; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; background: #242932; border-bottom: 1px solid #2e3440; transition: background 0.2s;" onmouseover="this.style.background='#2d3440'" onmouseout="this.style.background='#242932'">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span id="icon-player-${pIdx}" style="font-size: 14px; color: #4aa3df; transition: transform 0.2s;">▶</span>
                            <div>
                                <span style="font-weight: bold; font-size: 15px; color: #fff;">個体: <code style="color: #58a6ff;">${shortUuid}</code></span>
                                <span style="font-size: 11px; color: #777; margin-left: 6px;">(${p.uuid})</span>
                            </div>
                            <span style="background: #3a4250; color: #ddd; font-size: 11px; padding: 2px 7px; border-radius: 12px; font-weight: bold;">
                                記録: ${p.reportCount}件
                            </span>
                        </div>

                        <div style="display: flex; align-items: center; gap: 16px; font-size: 13px;">
                            <div>最終活動: <span style="font-family: monospace; color: #ccc;">${latest.created_at.slice(5, 16)}</span></div>
                            <span style="background: ${badgeColor}; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">${latest.event_type}</span>
                            <div>場所: <b style="color: #4aa3df;">${p.locationStr}</b></div>
                            <div>累計EXP: <b style="color: #f1c40f;">${Number(p.currentExp).toLocaleString()}</b></div>
                        </div>
                    </div>

                    <!-- プレイヤー履歴タイムライン（折りたたみ部分） -->
                    <div id="player-${pIdx}" style="display: none; padding: 16px; background: #16181d;">
                        <div style="margin-bottom: 12px; font-size: 13px; color: #888; display: flex; justify-content: space-between; align-items: center;">
                            <span>📜 この個体の成長履歴タイムライン（新しい順）</span>
                            <span style="font-size: 11px;">初回記録: ${p.oldestReport.created_at} ➔ 最終記録: ${p.latestReport.created_at}</span>
                        </div>
                        ${timelineHtml}
                    </div>
                </div>
            `;
        }).join('');

        // 全件フラットログ行
        const allRowsHtml = records.map(r => {
            const badgeColor = r.event_type === 'wipeout' ? '#e74c3c' : (r.event_type === 'startup' ? '#3498db' : '#2ecc71');
            const dataStr = JSON.stringify(r.data, null, 2);
            return `
                <tr style="border-bottom: 1px solid #2a2e35;">
                    <td style="padding: 8px;">${r.id || '-'}</td>
                    <td style="padding: 8px; font-size: 11px; font-family: monospace;">${r.created_at}</td>
                    <td style="padding: 8px;"><span style="background: ${badgeColor}; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold;">${r.event_type}</span></td>
                    <td style="padding: 8px; font-size: 12px;">${r.summary}</td>
                    <td style="padding: 8px; font-family: monospace; font-size: 11px;"><code style="color: #58a6ff;">${r.player_uuid.slice(0, 8)}</code></td>
                    <td style="padding: 8px;">
                        <details>
                            <summary style="cursor: pointer; color: #4aa3df; font-size: 11px;">JSON</summary>
                            <pre style="background: #101215; color: #eee; padding: 8px; border-radius: 4px; font-size: 10px; max-height: 200px; overflow: auto;">${dataStr}</pre>
                        </details>
                    </td>
                </tr>
            `;
        }).join('');

        const html = `
            <!DOCTYPE html>
            <html lang="ja">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Magia Pilgrims プレイレポート分析ダッシュボード</title>
                <style>
                    * { box-sizing: border-box; }
                    body { background: #0f1115; color: #d1d5db; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif; padding: 20px; margin: 0; line-height: 1.5; }
                    h1 { color: #fff; margin: 0 0 10px 0; font-size: 22px; display: flex; align-items: center; gap: 10px; }
                    .header-box { background: #1a1e24; border: 1px solid #2a303a; border-radius: 8px; padding: 16px 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
                    .stats-badges { display: flex; gap: 12px; }
                    .stat-item { background: #222832; border: 1px solid #323a48; border-radius: 6px; padding: 6px 14px; text-align: center; }
                    .stat-label { font-size: 11px; color: #888; }
                    .stat-val { font-size: 18px; font-weight: bold; color: #4aa3df; }
                    .tab-btn { background: #222832; border: 1px solid #333d4b; color: #aaa; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold; }
                    .tab-btn.active { background: #4aa3df; color: #fff; border-color: #4aa3df; }
                    table { width: 100%; border-collapse: collapse; background: #181b20; border-radius: 6px; overflow: hidden; }
                    th { background: #222832; padding: 10px; text-align: left; font-size: 12px; color: #aaa; border-bottom: 1px solid #323a48; }
                    code { background: #222630; padding: 2px 5px; border-radius: 3px; }
                </style>
            </head>
            <body>
                <div class="header-box">
                    <div>
                        <h1>📊 Magia Pilgrims プレイレポート分析</h1>
                        <div style="color: #778; font-size: 13px;">プレイヤー個体別の最新ステータスと成長ログを集計表示中 (ポート: ${PORT})</div>
                    </div>
                    <div class="stats-badges">
                        <div class="stat-item">
                            <div class="stat-label">総プレイヤー(個体)数</div>
                            <div class="stat-val" style="color: #2ecc71;">${playersList.length}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">受信レポート総数</div>
                            <div class="stat-val">${records.length}</div>
                        </div>
                    </div>
                </div>

                <div style="display: flex; gap: 8px; margin-bottom: 16px;">
                    <button id="btn-group" class="tab-btn active" onclick="switchTab('group')">👥 個体別集約ビュー (${playersList.length}人)</button>
                    <button id="btn-all" class="tab-btn" onclick="switchTab('all')">📜 全件ログ (${records.length}件)</button>
                </div>

                <!-- プレイヤー別集約ビュー -->
                <div id="view-group">
                    ${playersHtml || '<div style="background: #181b20; padding: 40px; text-align: center; color: #666; border-radius: 8px;">まだレポートデータがありません</div>'}
                </div>

                <!-- 全件フラットログビュー -->
                <div id="view-all" style="display: none;">
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 50px;">ID</th>
                                <th style="width: 170px;">受信日時 (JST)</th>
                                <th style="width: 90px;">種別</th>
                                <th>サマリー</th>
                                <th style="width: 110px;">個体UUID</th>
                                <th style="width: 80px;">詳細</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${allRowsHtml || '<tr><td colspan="6" style="padding: 20px; text-align: center; color: #666;">まだレポートはありません</td></tr>'}
                        </tbody>
                    </table>
                </div>

                <script>
                    function switchTab(mode) {
                        const viewGroup = document.getElementById('view-group');
                        const viewAll = document.getElementById('view-all');
                        const btnGroup = document.getElementById('btn-group');
                        const btnAll = document.getElementById('btn-all');

                        if (mode === 'group') {
                            viewGroup.style.display = 'block';
                            viewAll.style.display = 'none';
                            btnGroup.classList.add('active');
                            btnAll.classList.remove('active');
                        } else {
                            viewGroup.style.display = 'none';
                            viewAll.style.display = 'block';
                            btnGroup.classList.remove('active');
                            btnAll.classList.add('active');
                        }
                    }

                    function togglePlayer(id) {
                        const el = document.getElementById(id);
                        const icon = document.getElementById('icon-' + id);
                        if (!el) return;
                        if (el.style.display === 'none') {
                            el.style.display = 'block';
                            if (icon) {
                                icon.innerText = '▼';
                                icon.style.color = '#2ecc71';
                            }
                        } else {
                            el.style.display = 'none';
                            if (icon) {
                                icon.innerText = '▶';
                                icon.style.color = '#4aa3df';
                            }
                        }
                    }
                </script>
            </body>
            </html>
        `;

        res.send(html);
    } catch (err) {
        res.status(500).send('Error rendering dashboard: ' + err.message);
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`=========================================`);
    console.log(`🚀 Telemetry Server running on port ${PORT}`);
    console.log(`📡 Endpoint: http://localhost:${PORT}/api/report`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/api/reports/recent`);
    console.log(`=========================================`);
});
