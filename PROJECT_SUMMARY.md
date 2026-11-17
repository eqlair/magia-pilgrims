# 『Magia Pilgrims（マギア・ピルグリム）』プロジェクト概要シート（開発・運用引継書）

本書は、ゲームプロジェクト『Magia Pilgrims』の概要、技術スタック、Git/CI環境、システムアーキテクチャ、ビルド手順、および開発上の重要ルールをまとめた引き継ぎ用ドキュメントです。

---

## 1. プロジェクト基本情報

| 項目 | 内容 |
| :--- | :--- |
| **タイトル** | Magia Pilgrims (マギア・ピルグリム / 魔法少女最終防衛線) |
| **ジャンル** | 魔法少女ローグライト＆リアルタイムオートバトルRPG |
| **対象プラットフォーム** | Web (PC / スマホブラウザ / PWA), Android (APK), iOS (IPA / PWA) |
| **アプリID (Package ID)** | `com.ndk.magiapilgrims` |
| **アプリ表示名** | `Magia_Pilgrims` |
| **製作者 / ブランド** | 長沢電子工務店 (NDK) |
| **公開Web版 (GitHub Pages)** | [https://eqlair.github.io/magia-pilgrims/](https://eqlair.github.io/magia-pilgrims/) |

---

## 2. Git & リポジトリ情報

- **リモートリポジトリ (GitHub)**:  
  `https://github.com/eqlair/magia-pilgrims.git`
- **主要ブランチ**:
  - `main`: 開発・リリースのメインブランチ（Push時にCI/CD自動トリガー）
  - `gh-pages`: Web版公開ホスティングブランチ（`npm run deploy` で自動更新）
- **CI/CD (GitHub Actions)**:
  - `.github/workflows/build-android.yml`: Android APKのクラウド自動ビルド
  - `.github/workflows/build-ios.yml`: クラウドMacによるiOS `.ipa` の自動製造

> [!NOTE]
> GitHubへのPush時にPersonal Access Token (PAT) 期限切れで認証エラーになる場合は、GitHubの Developer Settings から `repo` と `workflow` スコープを有効にしたトークンを再発行し、`git remote set-url origin https://ghp_新トークン@github.com/eqlair/magia-pilgrims.git` で更新してください。

---

## 3. 技術スタック & 動作環境

| レイヤー | 使用技術 / バージョン | 用途・詳細 |
| :--- | :--- | :--- |
| **ゲームエンジン** | **Phaser 4.2.0** | HTML5 Canvas / Web Audio ベースの2Dゲームコア |
| **フロントエンド** | **Vite 8.x (Vanilla JS)** | 高速ローカルサーバー & ES Modules バンドラー |
| **ネイティブ基盤** | **Capacitor 8.5.0** | Android / iOS ネイティブブリッジ |
| **広告・収益化** | `@capacitor-community/admob` | バナー・インタースティシャル・リワード広告 |
| **アプリ内課金** | `@revenuecat/purchases-capacitor` | 課金アイテム・機能解放管理 |
| **ユーティリティ** | `@capacitor-community/keep-awake` | バトル中・イベント中の画面スリープ防止 |
| **データ管理** | `xlsx` / `canvas` / Node.js | ExcelデータからJSONへの自動変換スクリプト |
| **開発環境** | Node.js (v20+推奨) / JDK 21 / Android SDK | ローカルビルドおよび `adb` デバッグ |

---

## 4. プロジェクト構成 & アーキテクチャ

```text
c:\Users\user\.antigravity\game\
├── src/
│   ├── main.js                  # エントリーポイント・Phaserゲーム設定・シーン登録
│   ├── config/GameFont.js       # フォント・サイズ共通定義
│   ├── scenes/                  # ゲームシーン一覧
│   │   ├── BootScene.js         # アセットロード、安全ガード、タイトル遷移
│   │   ├── TitleScene.js        # タイトル画面、OP動画再生、セーブ読込
│   │   ├── AdventureScene.js    # ヘクスマップ探索、移動、ダンジョン進行
│   │   ├── BattleScene.js       # リアルタイム戦闘画面
│   │   ├── CampScene.js         # キャンプ拠点画面（編成、回復、取引）
│   │   ├── EquipmentScene.js    # 装備・レリクス・宝石管理・合成・強化
│   │   ├── TarotScene.js        # タロット選択、バフ付与画面
│   │   ├── RestScene.js         # 休息・会話・好感度イベント画面
│   │   └── EndingScene.js       # クリア・エンディング演出画面
│   ├── systems/                 # ゲームロジック・コアシステム
│   │   ├── GlobalState.js       # 全体ゲームステート（パーティ、インベントリ、周回状況）
│   │   ├── SaveManager.js       # セーブ/ロード（localStorage & Capacitor Preferences）
│   │   ├── BattleEngine.js      # バトルのダメージ計算・AI・当たり判定
│   │   ├── BattleRenderer.js    # バトルのスプライト描画・エフェクト
│   │   ├── CharacterLossManager.js # 仲間喪失・離脱・専用イベント制御
│   │   ├── EventEngine.js       # ノベル形式アドベンチャー・会話再生エンジン
│   │   ├── FairyTradeManager.js # 妖精リフィエルとの取引・強化モーダル
│   │   ├── AudioOptimizer.js    # BGM/SE管理、シームレスループ、音声最適化
│   │   ├── AdMobManager.js      # 広告配信システム
│   │   └── PurchaseManager.js   # 課金購入システム
│   └── data/                    # キャラクター・敵データJSON
├── files/                       # ゲームマスターデータ・アセットソース
│   ├── DATA/                    # イベントJSON、会話JSON、敵マスタ
│   ├── CHR/                     # キャラクター立ち絵・Excel台詞ソース (`talk_*.xlsx`)
│   ├── event/                   # イベントスチル・一枚絵 (`evp*`, `evx*`, `evl*`)
│   ├── BGM/                     # 音楽ファイル (`.m4a`, `.ogg`)
│   └── SE/                      # 効果音ファイル
├── public/                      # Vite公開静的アセット
├── android/                     # Android Studio プロジェクト (Gradle)
├── ios/                         # Capacitor iOS プロジェクト (Xcode)
└── .github/workflows/           # CI/CD設定 (Android APK / iOS IPA)
```

---

## 5. 日常開発・ビルドコマンド集

```bash
# 1. ローカル開発サーバー起動 (作業ディレクトリ: game/)
npm run dev
# -> http://localhost:5173/ で動作確認

# 2. ExcelデータのJSON変換 (セリフやイベントを更新した際)
node convert_talks.cjs
node scripts/convert_join_events.cjs

# 3. アセット整合性チェック (欠落・パス不整合の監査)
node scripts/optimize-assets.mjs --check

# 4. Web版ビルド & GitHub Pagesへの公開
npm run deploy

# 5. Android Webアセット同期
npm run build:android

# 6. Android APK ローカルビルド
npm run build:apk
# -> 出力先: android/app/build/outputs/apk/debug/magia_pilgrims-debug.apk

# 7. Android実機へのインストール (セーブデータを必ず保持する -r オプション)
adb -s <デバイスID> install -r android/app/build/outputs/apk/debug/magia_pilgrims-debug.apk
```

---

## 6. ゲーム設計上の重要ルール & 実装規約

> [!IMPORTANT]
> **ステータスとダメージ計算の絶対前提**
> - **攻撃力 (ATK)**: ベース値は `100`。すべての攻撃ダメージは「攻撃力」に対する倍率（例: 威力150%の攻撃なら `atk * 1.5`）として算出すること。直接固定ダメージを設定してはならない。
> - **リロード速度 (Reload)**: ベース値は `100`。全攻撃間隔に影響し、実際の待機時間は `基本間隔 * (100 / reload)` で算出。リロード速度が上がるほど間隔が短縮される。

> [!WARNING]
> **アセット管理とAndroid互換性**
> 1. **大文字・小文字の区別**: Windowsでは大文字小文字が同一視されますが、Android (Linux) やWeb (GitHub Pages) では厳密に区別され404エラーの原因になります。ファイル名はすべて小文字統一が基本です。
> 2. **UTF-8 BOMの禁止**: JSONファイル等にUTF-8 BOM (`\uFEFF`) が付与されていると、モバイル環境でパースエラーを引き起こします。保存時は必ず `UTF-8 (BOMなし)` を使用してください。
> 3. **画像テクスチャの安全ガード**: `EventEngine.js` や `BootScene.js` では、画像がキャッシュに存在しない場合に Phaser の Missing Texture（緑枠）が表示されないよう、必ずロード待機またはフォールバック機構を介す設計になっています。

> [!TIP]
> **セーブデータの仕様**
> - プレイヤーデータは `SaveManager.js` を介してローカルストレージおよびネイティブストレージに自動保存されます。
> - APKを実機に上書きする際は、セーブデータ消滅を防ぐため必ず `adb install -r` を使用してください。

---

## 7. 最近の実装機能 & 引き継ぎメモ

1. **2周目以降の追加要素**:
   - タロットプロセル遭遇イベント・道場解放の実装。
   - BGM遷移の最適化および演出タイミング調整。
2. **仲間喪失システム (`CharacterLossManager.js`)**:
   - 精神力低下や特定イベントによる仲間離脱処理。
   - 装備品・宝石の自動返還とストックEXP化。
   - 喪失一枚絵（`evx002`〜`evx011`）の完全事前ロード化。
3. **装備・取引UIのユーザビリティ向上**:
   - `EquipmentScene.js`: レリクス・宝石の合成・強化後に「〇〇を手に入れた」トースト表示および自動選択・詳細表示。
   - `FairyTradeManager.js`: 妖精リフィエルとの取引で、未遭遇のキャラクターが選択肢に出現しないよう同行フラグを厳密化。
4. **収益化・広告**:
   - AdMob（バナー/リワード）および RevenueCat による課金基盤を統合済み。
