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
        if (event_type === 'startup') {
            summary = `起動 | Day: ${data?.map_progress?.currentMonth || '-'}/${data?.map_progress?.currentDay || '-'} | Tower: ${data?.tower_progress?.floor || 0}F | MaxExp: ${data?.max_past_exp || 0}`;
        } else if (event_type === 'wipeout') {
            const enemy = data?.enemy_info;
            summary = `全滅 | 戦闘: ${enemy?.battle_type || '通常'} | 敵Lv: ${enemy?.enemy_level || 0} | 魔女残HP: ${enemy?.witch_hp_remaining !== undefined ? enemy.witch_hp_remaining : 'なし'}`;
        } else {
            summary = `イベント: ${event_type}`;
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
        const limit = parseInt(req.query.limit) || 50;
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

// ブラウザで見れる簡易ダッシュボード (HTML)
app.get('/api/reports/recent', (req, res) => {
    try {
        const limit = 50;
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

        const rowsHtml = records.map(r => {
            const badgeColor = r.event_type === 'wipeout' ? '#e74c3c' : (r.event_type === 'startup' ? '#3498db' : '#2ecc71');
            const dataStr = JSON.stringify(r.data, null, 2);
            return `
                <tr style="border-bottom: 1px solid #333;">
                    <td style="padding: 8px;">${r.id || '-'}</td>
                    <td style="padding: 8px; font-size: 11px; font-family: monospace;">${r.created_at}</td>
                    <td style="padding: 8px;"><span style="background: ${badgeColor}; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-weight: bold;">${r.event_type}</span></td>
                    <td style="padding: 8px; font-weight: bold;">${r.summary}</td>
                    <td style="padding: 8px; font-family: monospace; font-size: 11px;">${r.player_uuid.slice(0, 8)}...</td>
                    <td style="padding: 8px;">
                        <details>
                            <summary style="cursor: pointer; color: #4aa3df;">詳細JSON</summary>
                            <pre style="background: #1e1e1e; color: #eee; padding: 10px; border-radius: 4px; font-size: 11px; max-height: 250px; overflow: auto;">${dataStr}</pre>
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
                <title>Magia Pilgrims レポートダッシュボード</title>
                <style>
                    body { background: #121212; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; }
                    table { width: 100%; border-collapse: collapse; background: #1a1a1a; border-radius: 6px; overflow: hidden; }
                    th { background: #252525; padding: 10px; text-align: left; font-size: 13px; color: #aaa; }
                    h1 { color: #fff; display: flex; align-items: center; gap: 10px; }
                    .stats { margin-bottom: 15px; color: #888; font-size: 14px; }
                </style>
            </head>
            <body>
                <h1>📊 Magia Pilgrims プレイレポート収集サーバー</h1>
                <div class="stats">直近 ${records.length} 件のレポートを表示中 (ポート: ${PORT})</div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 50px;">ID</th>
                            <th style="width: 170px;">受信日時 (JST)</th>
                            <th style="width: 90px;">種別</th>
                            <th>サマリー</th>
                            <th style="width: 100px;">UUID</th>
                            <th style="width: 90px;">詳細</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml || '<tr><td colspan="6" style="padding: 20px; text-align: center; color: #666;">まだレポートはありません</td></tr>'}
                    </tbody>
                </table>
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
