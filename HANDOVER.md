# Magia Pilgrims (マギア・ピルグリム) 開発・ビルド・運用 総合引継ぎ書

本書は、ゲームプロジェクト『Magia Pilgrims』の開発環境、データ更新、Android版APKビルド、Web/PWA公開、およびGitHub Actionsを用いたiPhone(iOS)向けIPAアプリの自動製造手順をまとめた総合引継ぎマニュアルです。

---

## 1. プロジェクト基本情報 & 技術スタック

- **プロジェクト名**: Magia Pilgrims (マギア・ピルグリム / 魔法少女最終防衛線)
- **ゲームエンジン**: Phaser 4.2.0 (HTML5 Canvas / Web Audio)
- **ビルドツール**: Vite 8.x
- **ネイティブアプリ化**: Capacitor 8.1.1 (Android / iOS)
- **GitHubリポジトリ**: `https://github.com/eqlair/magia-pilgrims`
- **GitHub Pages 公開URL**: `https://eqlair.github.io/magia-pilgrims/`

---

## 2. 日常の開発・ローカル確認手順

### 2.1 開発サーバーの起動
```bash
# 作業ディレクトリ: c:\Users\user\.antigravity\game
npm run dev
```
起動後、ブラウザで `http://localhost:5173/` にアクセスして動作確認を行います。

### 2.2 Excelデータ・セリフデータの反映手順
キャラクター性能や会話イベントをExcelで編集した場合、Node.jsスクリプトでJSONに変換・同期します。
```bash
# 会話データ (files/CHR/talk_*.xlsx) の変換
node convert_talks.cjs

# 加入イベント等 (files/DATA/join_events.json 等) の同期
node scripts/convert_join_events.cjs
```

### 2.3 バージョン番号の自動採番仕様
- `vite.config.js` にて、ビルド日時（JST: `YYMMDDHHmm`）を16進数大文字コードに変換し、`__APP_VERSION__`（例: `ver.0.19B7722DC`）として自動生成・タイトル画面右下に描画されます。

---

## 3. Android版 (APK) のビルド手順

### 3.1 Webアセットのビルド & Androidプロジェクト同期
```bash
npm run build:android
# (内部で vite build && cap sync android が実行されます)
```

### 3.2 Android Studio でのAPK生成
1. **Android Studio** で `c:\Users\user\.antigravity\game\android` を開く。
2. 上部メニューの **[Build] ➔ [Build Bundle(s) / APK(s)] ➔ [Build APK(s)]** を実行。
3. 生成されるファイル:
   - パス: `android/app/build/outputs/apk/debug/magia_pilgrims-debug.apk`
   - （`android/app/build.gradle` の `archivesBaseName` 設定により、自動で `magia_pilgrims-*.apk` 名で出力されます）

### 3.3 アプリアイコン・表示名
- **アプリ表示名**: `android/app/src/main/res/values/strings.xml` の `app_name`
- **アイコン画像**: `android/app/src/main/res/mipmap-*`

---

## 4. Web版 / iPhone (PWA) の公開・更新手順

誰でもiPhoneのSafariからアクセスして「ホーム画面に追加」するだけで遊べるWeb版の更新手順です。

```bash
# ビルド & GitHub Pages (gh-pagesブランチ) への自動公開
npm run build
npx gh-pages -d dist
```

- **公開URL**: `https://eqlair.github.io/magia-pilgrims/`
- **iPhoneでの遊び方**:
  1. iPhoneのSafariで上記URLを開く。
  2. 画面下の共有ボタン（⎋）➔ **「ホーム画面に追加」** をタップ。
  3. ホーム画面にアイコンが作成され、URLバーのない全画面アプリとして起動可能。

---

## 5. iPhone版 (iOS / IPA) の製造手順（大きなアップデート時）

Windows PC環境のみで、クラウド上のMac（GitHub Actions）を利用して `.ipa` アプリパッケージを完全自動生成する手順です。

### 5.1 クラウドビルドの実行（2通りの方法）

#### 【方法A：Git Pushで自動ビルド】
コードの変更をGitHubの `main` ブランチにプッシュすると、GitHub Actionsが自動検知してビルドを開始します。
```bash
git add .
git commit -m "Update game version"
git push origin main
```

#### 【方法B：GitHubの画面からボタン1つで手動実行】
1. ブラウザでリポジトリのActions画面を開く:  
   👉 `https://github.com/eqlair/magia-pilgrims/actions/workflows/build-ios.yml`
2. 右上の **[Run workflow]** ボタンをクリック ➔ 緑の **[Run workflow]** を押す。

---

### 5.2 IPAファイルのダウンロード手順

1. Actions画面（`https://github.com/eqlair/magia-pilgrims/actions`）で、一番上の完了したビルド（緑のチェックマーク ✅）をクリック。
2. 画面最下部の **「Artifacts」** 欄にある **`magia_pilgrims_ios_ipa`** をクリックしてPCにダウンロード。
3. ダウンロードした zip を解凍すると、中に **`magia_pilgrims.ipa`** が入っています。

---

### 5.3 iPhone実機へのインストール手順（Sideloadly使用）

脱獄不要でiPhoneに直接アプリを入れる無料ツールを使用します。

1. **ツールの準備**:
   - PCで **[Sideloadly](https://sideloadly.io/)**（無料）をインストールして起動。
2. **PCとiPhoneの接続**:
   - iPhoneをケーブルでPCに接続（画面で「このコンピュータを信頼」をタップ）。
3. **IPAの転送**:
   - 解凍した `magia_pilgrims.ipa` を Sideloadly の画面にドラッグ＆ドロップ。
   - **Apple account**: 自分の無料Apple IDを入力。
   - **[Start]** をクリック（約1〜2分でiPhoneのホーム画面にアプリがインストールされます）。
4. **iPhone側での初回起動許可（必須）**:
   - iPhoneの **[設定] ➔ [一般] ➔ [VPNとデバイス管理]** を開く。
   - [デベロッパAPP] 欄の自分のApple IDをタップし、**「〇〇を信頼」** をタップ。
   - ホーム画面からアプリを起動してプレイ可能になります。

---

## 6. 保守・トラブルシューティング

### 6.1 GitHub Personal Access Token (PAT) の期限切れ時
Git Push時に認証エラーが発生した場合は、トークンを再発行します。
1. `https://github.com/settings/tokens` を開く。
2. **Generate new token (classic)** を選択。
3. スコープで **`repo`** と **`workflow`** の2箇所に必ずチェックを入れて発行。
4. ローカルでリモートURLを更新:
   ```bash
   git remote set-url origin https://ghp_新トークン@github.com/eqlair/magia-pilgrims.git
   ```

### 6.2 主要ファイル構成
- `src/main.js`: ゲームエントリーポイント・シーン登録
- `src/scenes/`: 各ゲーム画面（Title, Camp, Adventure, Battle, Equipment, Tarot, Result）
- `src/systems/`: バトルエンジン、描画、状態管理（BattleEngine, BattleRenderer, GlobalState, SaveManager）
- `files/DATA/`: マスターデータ（キャラ、敵、アイテム、バトルシステム）
- `files/CHR/`: キャラ立ち絵・セリフデータ
- `android/`: Android Studio プロジェクト一式
- `ios/`: Capacitor iOS プロジェクト一式
- `.github/workflows/build-ios.yml`: クラウドMac用IPAビルド定義
