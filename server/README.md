# Magia Pilgrims プレイレポート集計サーバー (AlmaLinux 9 / Node.js 22)

本サーバーは、自作ゲーム『Magia Pilgrims』の起動時ステータスおよびバトル全滅時の詳細レポートを収集・蓄積するAPIサーバーです。

---

## 1. サーバーへの配置

サーバー上の任意のディレクトリ（例: `/var/www/magia-server` や `~/magia-server`）に本 `server` ディレクトリの内容を配置します。

```bash
# ディレクトリ作成
mkdir -p ~/magia-server
cd ~/magia-server

# ファイル一式（package.json, index.js, ecosystem.config.cjs）を配置
```

---

## 2. 依存関係のインストール

```bash
npm install
```
※ Node.js 22.x に組み込まれている `node:sqlite` を自動検出して SQLite (`data/telemetry.db`) に保存します。組み込み機能がない場合でも自動的に `data/reports.jsonl` に保存されるため、ネイティブコンパイル等の失敗リスクがありません。

---

## 3. ファイアウォールの開放（ポート 4000）

AlmaLinux 9 では `firewalld` が標準で稼働しているため、社内LANからアクセスできるようにポート4000番を開放します。

```bash
sudo firewall-cmd --add-port=4000/tcp --permanent
sudo firewall-cmd --reload
sudo firewall-cmd --list-ports
```

---

## 4. PM2 による常時起動・自動起動設定

PM2 を使用してプロセスをデーモン化します。

```bash
# 起動
pm2 start ecosystem.config.cjs

# 状態確認
pm2 status

# ログ確認
pm2 logs magia-telemetry

# サーバー再起動時にも自動起動するように登録
pm2 save
pm2 startup
```

---

## 5. 動作確認

ブラウザから以下のURLを開いて確認できます。

- **ダッシュボード（直近レポート一覧）**:  
  `http://192.168.24.27:4000/api/reports/recent`

- **ヘルスチェック**:  
  `http://192.168.24.27:4000/health`

- **生JSONデータ**:  
  `http://192.168.24.27:4000/api/reports/raw`
