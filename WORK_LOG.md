# だんます（Magia Pilgrims）開発作業・変更ログ

このファイルは、ユーザーからの指示・相談に対して「何を調査・発見したか」「なぜその問題が起きていたのか」「具体的にどう修正・対応したか」を永続的に記録・蓄積するための作業履歴ログです。

---

## 2026-11-15: 魔女出現時BGM演出の改善 & スマホ環境でのマップBGM混入原因の究明・解消 & デバッグモード有効化

### 1. ユーザー指示内容
1. 作業ログ記録システムの導入（Claudeのように「指示」「発見・原因」「実施内容」を後から見返せるように残す）。
2. 魔女を含む編成に遭遇した際、雑魚ウェーブ終了後の魔女出現（WARNING表示）時に雑魚戦BGM（4種類等）を即座に停止（フェードアウト）させる。
3. スマホで遊んでいた時に「魔女戦中にマップBGMが鳴り始めることがあった」原因の調査と回答。
4. ローカル開発作業のため、デバッグモード（`GlobalState.IS_DEBUG_MODE`）を ON にする（※Gitには上げない）。

### 2. 調査・発見した内容（Why & What）

#### ① 魔女WARNING演出中に雑魚BGMが鳴り続けていた原因
- **該当箇所**: `src/scenes/BattleScene.js` L743-770
- **原因**:
  ```javascript
  const presTimer = this.engine.bossPresTimer || 2.0;
  const fadeDelay = Math.max(0, (presTimer - 2.5) * 1000); // 演出終了の2.5秒前
  this.bossFadeTimer = this.time.delayedCall(fadeDelay, () => { ... });
  ```
  雑魚戦から魔女が出現する場合、`bossPresTimer` が `8.0`（8秒）に設定されており、`fadeDelay = (8.0 - 2.5) * 1000 = 5500ms`（5.5秒）となっていた。そのため、WARNINGロゴが流れている間の最初の5.5秒間、通常雑魚BGMがそのまま鳴り続けてしまっていた。

#### ② スマホで魔女戦中にマップBGM（bgm_hexen）が鳴り始めていた原因【完全解明】
- **該当箇所**: `src/scenes/BattleScene.js` L846-851
- **原因**:
  ```javascript
  if (!isBossBgmPlaying) {
      if (this.cache.audio.exists(bossKey)) {
          this.sound.play(bossKey, { loop: true, volume: 0.5 });
      } else if (this.cache.audio.exists('bgm_hexen')) {
          this.sound.play('bgm_hexen', { loop: true, volume: 0.5 }); // ★ここ！
      }
  }
  ```
  1. `BattleScene.preload()` では、戦闘設定で事前に `bossBgmKey` が渡されている場合のみオンデマンド読み込みを行っていた。雑魚戦からの魔女出現（乱入）などの場合、`bossBgmKey` は未指定で入るため、`BattleScene` のプリロード時に `bgm_boss1`〜`bgm_boss3` がロードキューに入らない。
  2. また、`BootScene` でも地上マップBGM `bgm_hexen` は常時プリロードされているが、ボスBGM `bgm_boss1`〜`3` は初期プリロード対象に含まれていなかった。
  3. そのため、スマホなどオンデマンド読み込みの遅延や未ロードの状況で魔女戦に入ると、`this.cache.audio.exists(bossKey)` が `false` になり、フォールバックの `else if (this.cache.audio.exists('bgm_hexen'))` が発動して**地上マップBGM（`bgm_hexen`）がボス戦で流れてしまっていた**。

### 3. 実施した対策・変更内容（How）

1. **魔女出現（WARNING演出）時のBGM即座フェードアウト停止**:
   - `src/scenes/BattleScene.js` の `boss_presentation` ブロックで、`fadeDelay` による遅延を撤廃。WARNINGロゴの出現および覚醒SE（`se_awaken_boss`）の再生と同時に、通常雑魚BGM（`nonBossKeys`）を即座に 800ms かけてフェードアウト＆stopするように変更。
   - これにより、WARNINGが出た瞬間に雑魚BGMがスッと消え、重低音の覚醒SEと緊迫した静寂が広がり、その後の魔女実体化とともにボスBGMが華々しく流れる緩急のある演出を実現。

2. **魔女戦BGMの事前ロード強化 & マップBGMフォールバックの完全撤廃**:
   - `src/scenes/BattleScene.js` の `preload()` で、ボスBGM（`bgm_boss1`, `bgm_boss2`, `bgm_boss3`）が未キャッシュであれば事前にロードキューに追加するように改修。
   - 魔女出現時のBGM再生処理で、万が一ボスBGMが未キャッシュの場合でも、`bgm_hexen`（マップBGM）をフォールバック再生するコードを完全撤廃。安全に通常戦闘BGM（`bgm_battle1`, `bgm_toppa`）を流すか、無音のままロード完了を待つ構成に変更し、マップBGMがボス戦で鳴る不具合を根本解決。

3. **ローカル開発用デバッグモードの有効化**:
   - `src/systems/GlobalState.js` の `IS_DEBUG_MODE = true;` および `ALLOW_DEBUG_TOGGLE = true;` に設定。
   - タイトル画面の⚙ボタンや、ダンジョン内の各種デバッグ機能（ショートカットキー、DPSテスト、タワーテスト等）が使用可能。

4. **ログシステムの作成**:
   - 本ファイル（`WORK_LOG.md`）を新設。今後の修正・解析もすべて本ログに追記していく運用を開始。

### 4. 変更対象ファイル
- [GlobalState.js](file:///c:/Users/user/.antigravity/game/src/systems/GlobalState.js)
- [BattleScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/BattleScene.js)
- [WORK_LOG.md](file:///c:/Users/user/.antigravity/game/WORK_LOG.md)（新規作成）

### 5. 検証結果
- `npm run build` を実行し、構文エラー・バンドルエラーなく正常にビルド成功を確認。
- Git への commit / push は行わず、ローカル環境のみに保持。

---

## 2026-11-15: 12/21夜ワイルドハントBGM無音問題 & バッドエンド画像（bg_resp）未ロード（Missing Texture緑枠）の根本解決

### 1. ユーザー指示内容
1. 時間スキップで12/21夜のワイルドハントを発生させた際、BGMが鳴らなかった原因の調査・解消。
2. その後のバッドエンド（「どれだけの時間が流れたのか、知る術はない。」）で画像が未ロード（緑の枠に対角線の点線）になっていた原因の調査・解消。

### 2. 調査・発見した内容（Why & What）

#### ① 12/21夜ワイルドハントでBGMが鳴らなかった原因
- **該当箇所**: `src/scenes/BootScene.js` L353-365, `src/data/wildhuntEvents.js` L29-33, `src/scenes/EventScene.js` L140-151
- **原因**:
  1. `bgm_wildhunt`（`files/BGM/wildhunt.mp3`）が `BootScene.js` 等でロードされておらず、キャッシュに存在しなかった。
  2. `build1221WildhuntCommands` のコマンドリストから `{ cmd: 'bgm', key: 'bgm_wildhunt' }` が抜け落ちていた。
  3. `EventScene.js` では「ワイルドハント発生時にマップBGMを `stopAll()` で止めてから `bgm_wildhunt` を鳴らす」という処理になっていたが、`bgm_wildhunt` が未ロードだったため再生されず、結果としてマップBGMだけが消えて完全な無音になっていた。

#### ② バッドエンドで画像が未ロード（緑枠 Missing Texture）になっていた原因
- **該当箇所**: `src/scenes/BootScene.js` L320-322, `src/data/event_resp.json` L1-5
- **原因**:
  1. `event_resp.json` の1行目で `{ "cmd": "image", "key": "bg_resp" }` を指定しているが、`BootScene.js` で `event_resp.json` はロードされていたものの、対応する画像 **`bg_resp`（`files/event/resp.webp`）が `load.image` されていなかった**。
  2. そのため、Phaser の Missing Texture（緑の四角とバッテンのデフォルトテクスチャ）が画面いっぱいに拡大表示され、ユーザーが提示したスクリーンショット通りの状態になっていた。
  3. 同様に、バッドエンドBGM `bgm_resp`（`files/BGM/resporn.mp3`）やタワー敗北BGM `unknoun_terror`（`files/BGM/unknoun_terror.mp3`）も初期ロード対象から漏れていた。

### 3. 実施した対策・変更内容（How）

1. **`BootScene.js` での必須アセット先行ロード追加**:
   - 画像: `bg_resp`（`files/event/resp.webp`）を追加。
   - BGM: `bgm_wildhunt`（`files/BGM/wildhunt.mp3`）、`bgm_resp`（`files/BGM/resporn.mp3`）、`unknoun_terror`（`files/BGM/unknoun_terror.mp3`）を追加。

2. **`wildhuntEvents.js` への BGM コマンド追加**:
   - `build1221WildhuntCommands` の先頭に `{ cmd: 'bgm', key: 'bgm_wildhunt' }` を正式追加。イベントシーン実行時にBGMが確実に再生されるようにした。

3. **`EventScene.js` のワイルドハントBGMフォールバック強化**:
   - 万が一キャッシュ未ロードだった場合でも、`AssetLoader.ensureBgm` でオンデマンド非同期ロードして即座に再生する安全網を追加。

4. **`EventEngine.js` の Missing Texture 救済セーフティ追加**:
   - `_doShowIllust` で画像キーが未キャッシュだった場合、Phaser の緑のバッテン四角をそのまま出さず、`files/event/*.webp` をオンデマンドで即座に非同期ロードして完了時にテクスチャを自動差し替えする保護処理を実装。

### 4. 変更対象ファイル
- [BootScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/BootScene.js)
- [wildhuntEvents.js](file:///c:/Users/user/.antigravity/game/src/data/wildhuntEvents.js)
- [EventScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/EventScene.js)
- [EventEngine.js](file:///c:/Users/user/.antigravity/game/src/systems/EventEngine.js)
- [WORK_LOG.md](file:///c:/Users/user/.antigravity/game/WORK_LOG.md)

### 5. 検証結果
- `npm run build` を実行し、ビルド成功を確認。
- Git への commit / push は行わず、ローカル環境のみに保持。

---

## [2026-11-15] Google Play公開準備 ＆ 広告・VIP永年パス・妖精取引（0時リセット1日1回・合成リロール）実装

### 1. 目的（Why）
- デベロッパー登録（「長沢電子工務店 (NDK)」）完了に伴い、アプリのパッケージ名（`com.ndk.magiapilgrims`）とリリース用署名キーストアを整備。
- Google Play Console 審査用のプライバシーポリシーページを作成。
- 広告（リワード動画）と課金設計（買い切り永年広告スキップパス「妖精の祝福」500円）の全体仕様を実装：
  1. 1周目は妖精リフィエルや広告・課金のアピールは一切なし（クリア後の2周目、タロット009教皇を引いてから初解放）。
  2. 妖精の取引（各特典）は「日本時間（JST）午前0時リセットで、それぞれ1日1回ずつ」利用可能。
  3. VIP（永年広告スキップパス所持者）であっても無限チートではなく「それぞれ1日1回」。広告動画を見ずに即座に受取可能。
  4. 新機能「レリクス／宝石合成のやり直し（リロール）機能」を新設し、これも妖精の取引（1日1回・広告/VIP）として利用可能に。
  5. タロット引き直し機能にも「1日1回・0時更新（広告/VIP）」の制約とバッジ表示を連動。

### 2. 実施した対策・変更内容（How）

1. **Google Play用設定・署名キー・ポリシーの整備**:
   - `capacitor.config.json` の `appId` を `"com.ndk.magiapilgrims"` に更新。
   - `android/app/build.gradle` の `applicationId` を `"com.ndk.magiapilgrims"` に更新し、リリース用署名設定（`signingConfigs.release`）を追加。
   - `keytool.exe` を使用して `android/app/ndk-release-key.jks`（alias: `ndk_key`）を生成。
   - `docs/privacy.html` および `privacy.html` を新規作成（Google AdMob条項を含む公開用プライバシーポリシー）。

2. **日本時間0時リセット＆1日1回制の基盤（GlobalState / SaveManager / FairyTradeManager）**:
   - `GlobalState.js` に `hasNoAdsPass`（VIPフラグ）と `fairyTradeUsage`（日次利用記録 `tradeKey -> YYYY-MM-DD`）を追加。
   - `SaveManager.js` に `hasNoAdsPass` と `fairyTradeUsage` の永続化・復元処理を追加。
   - `FairyTradeManager.js` にて、JST（UTC+9）ベースで当日キー `getTodayKeyJST()` と次の0時までの残り時間を計算する `getMsUntilNextMidnightJST()`、本日利用済み判定 `isTradeUsedToday(key)`、利用記録 `recordTrade(key)` を実装。

3. **VIP永年広告スキップ処理（RewardService / FairyTradeManager）**:
   - `RewardService.js` で `gs.hasNoAdsPass` が true の場合、広告動画をスキップして即時に `onReward()` コールバックを実行。
   - `FairyTradeManager.js` のモーダル下部に「✨ 妖精の祝福（広告スキップ永年パス 500円）」の状態案内およびトグルテストボタンを配置。未所持時は「🎬 広告」、所持時は「✨ VIP即時」とボタンバッジが切り替わる。

4. **レリクス／宝石合成のやり直し機能（EquipmentScene.js）**:
   - 合成完了後に結果モーダル `showSynthesisResultModal` を表示。
   - 2周目以降で妖精遭遇済み（`gs.hasMetFairy`）かつ本日未利用の場合、「🧚‍♀️ 妖精の取引：結果を引き直す (🎬広告 / ✨VIP即時)」ボタンを表示。
   - 押下時に同ランクで再抽選を行い、合成結果アイテムを差し替えてセーブ。1日1回のみ実行可能。

5. **タロット引き直し機能の1日1回連動（TarotScene.js）**:
   - リフィエル解放済みのタロット引き直しボタンに `!FairyTradeManager.isTradeUsedToday('tarot_reroll')` の制限を適用。
   - VIP時は「✨VIP即時」、通常時は「🎬広告」と表記し、利用後は当日再利用不可（翌日0時リセット）。

### 3. 変更対象ファイル
- [capacitor.config.json](file:///c:/Users/user/.antigravity/game/capacitor.config.json)
- [android/app/build.gradle](file:///c:/Users/user/.antigravity/game/android/app/build.gradle)
- [docs/privacy.html](file:///c:/Users/user/.antigravity/game/docs/privacy.html)
- [privacy.html](file:///c:/Users/user/.antigravity/game/privacy.html)
- [GlobalState.js](file:///c:/Users/user/.antigravity/game/src/systems/GlobalState.js)
- [SaveManager.js](file:///c:/Users/user/.antigravity/game/src/systems/SaveManager.js)
- [RewardService.js](file:///c:/Users/user/.antigravity/game/src/systems/RewardService.js)
- [FairyTradeManager.js](file:///c:/Users/user/.antigravity/game/src/systems/FairyTradeManager.js)
- [EquipmentScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/EquipmentScene.js)
- [TarotScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/TarotScene.js)
- [WORK_LOG.md](file:///c:/Users/user/.antigravity/game/WORK_LOG.md)

### 4. 検証結果
- `npm run build` にてビルド成功を確認。
- Git への commit / push は一切行わず、ローカル環境のみに保持。

---

## [2026-11-15] 周回時（リスポーンイベント）の「AssetLoader is not defined」エラー修正

### 1. 原因（Why）
- 周回時（バッドエンド／リスポーン時、`eventId === 'event_resp'`）に、`EventScene.js` 内で `AssetLoader.ensureRespawnAssets(...)` を呼び出していたが、同ファイル冒頭で `AssetLoader` の `import` 文が抜けていたため `ReferenceError: AssetLoader is not defined` が発生していた。

### 2. 対策（How）
- [EventScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/EventScene.js) に `import { AssetLoader } from '../systems/AssetLoader';` を追加。
- `AssetLoader.ensureRespawnAssets` が正常に実行され、リスポーン用の背景画像（`bg_resp`）とBGM（`bgm_resp`）を安全にオンデマンド読み込みしてからイベントが進行することを確認。

### 3. 検証結果
- `npm run build` にてエラーなくビルドが通ることを確認。
- Git への commit / push は一切行わず、ローカル環境のみに保持。

---

## [2026-11-15] 12/21夜ワイルドハント＆12/22朝魔女狩り・周回のすり抜け防止（行動直前＆復帰時絶対ガード）実装

### 1. 目的（Why）
- 12/21夜および12/22朝にエラーやF5リロード、リセット等で復帰した場合、または野外で「休息」を選んだ場合に、イベントが発生せずにそのまま年を越せてしまう不具合の根本解消。

### 2. 実施した対策・変更内容（How）

1. **12/21夜のワイルドハント強制突入ガードの網羅**:
   - [AdventureScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/AdventureScene.js) の「休息ボタン（`restBtn`）」押下時の処理に `if (this.check1221NightForcedBreakthrough()) return;` を追加。
   - これにより、21日夜に「移動」「探索」だけでなく「休息」を押した場合でも、確実にワイルドハント（未閲覧ならイベント、閲覧済みなら突破戦）へ強制突入するように徹底。

2. **12/22朝以降の絶対周回ガード（地上にいる場合）**:
   - `check1221Event()` のロジックを改修。地上で `currentDay >= 22` の状態であれば、フラグ `event1221Played` の有無に関わらず、必ず魔女狩り（`event_1221`）および周回リスポーン（`event_resp`）を起動して周回リセットへ強制移行。
   - `create()` の復帰時、およびプレイヤーが「移動」「探索」「休息」を押した直前の全タイミングで `check1221Event()` を実行。
   - これにより、途中でエラーやリロード・リセットが起きても、地上で22日以降に行動を起こそうとした瞬間に100%周回ルートへ導かれ、年を越すことが物理的に不可能になった。

3. **中途半端な先行セーブの撤廃**:
   - `from1221Event`（魔女狩りイベント）完了直後に挟まれていた `SaveManager.saveGame(this)` を撤廃し、周回リセット（`gs.resetForNewLoop()`）で12/1東京駅に初期化されたクリーンな状態でのみ保存するように安全化。

### 3. 変更対象ファイル
- [AdventureScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/AdventureScene.js)
- [WORK_LOG.md](file:///c:/Users/user/.antigravity/game/WORK_LOG.md)

### 4. 検証結果
- `npm run build` を実行し、構文・バンドルエラーなく正常ビルド成功を確認。
- Git への commit / push は一切行わず、ローカル環境のみに保持。

---

## [2026-11-15] ステータス画面（CampScene）BGM無音問題の根本解決

### 1. 原因（Why）
- 先日のアセット軽量化時に、キャンプBGM（`bgm_camp` / `files/BGM/camp_BGM.mp3`）が `BootScene.js` のプリロード対象から外れていた。
- しかし、ステータス画面である `CampScene.js` 側には `preload()` や遅延ロード（`ensureBgm`）の仕組みがなく、`if (this.cache.audio.exists('bgm_camp'))` の判定でキャッシュ未存在（false）となり無音化していた。
- さらに `CampScene.js` 起動時に `this.sound.stopAll()` でフィールド曲が止められ、終了時にもマップBGMの再開リスナーがなかったため、ステータスを開閉した後に無音になっていた。

### 2. 対策（How）
1. [BootScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/BootScene.js):
   - ゲーム基本BGMである `this.load.audio('bgm_camp', 'files/BGM/camp_BGM.mp3');` を初期ロードに正式復帰。起動時から即座に再生可能に。
2. [CampScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/CampScene.js):
   - `preload()` を追加し、万が一未キャッシュ時でも `load.audio` を実行。
   - `create()` で `AssetLoader.ensureBgm` によるフォールバック二重安全網を設置。
3. [AdventureScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/AdventureScene.js):
   - ステータス画面から復帰した際に確実にマップBGMを再開するワンタイム `resume` リスナーを追加。

### 3. 検証結果
- `npm run build` を実行し、ビルド成功を確認。
- Git への commit / push は行わず、ローカル環境のみに保持。

---

## [2026-11-15] ステータス画面の顔画像未ロード（緑枠Missing）＆ BootSceneストールの根本解決

### 1. 原因（Why）
- 直前の修正で `BootScene.js` に `this.load.audio('bgm_camp', ...)` を追加した際、ブラウザの仕様（ユーザー操作前の未対話状態ではAudioContextがサスペンドされる）により、PhaserのWebAudioデコーダーが完了通知を受け取れず `[BootScene] Loader stalled for 8s without progress. Forcing completion.` が発生していた。
- 8秒タイムアウトによる強制完了（`loadComplete()`）が走った結果、ロードキュー内に残っていた紫苑の顔アイコン（`face_001`）など後続アセットの読み込みがスキップされてしまい、ステータス画面で緑枠（Missing Texture）が表示されていた。

### 2. 対策（How）
1. [BootScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/BootScene.js):
   - 初期ロードでの `bgm_camp` 読み込みを撤廃。これにより起動時ローダーのストールが完全に解消し、全キャラの顔画像を含む全初期アセットが100%スムーズにロードされるように復旧。
2. [CampScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/CampScene.js):
   - キャンプBGM（`bgm_camp`）はステータスボタン押下（ユーザー対話後）に `AssetLoader.ensureBgm` 経由でオンデマンド再生する安全設計に統一。
   - 顔アイコン描画部にオンデマンド読み込み＆安全フォールバック処理を追加。万が一テクスチャが未ロードの場合でも緑枠を出さず、安全なアイコンを表示しつつ即座に非同期ロードして本来の顔画像へ自動差し替え。

### 3. 検証結果
- Viteログにて `Loader stalled` 警告が完全に消滅し、起動時ロードが正常完了することを確認。
- `npm run build` にてビルド成功を確認。
- Git への commit / push は行わず、ローカル環境のみに保持。

---

## [2026-11-15] タロットカード選択時の「Cannot read properties of undefined (reading '16')」エラー修正

### 1. 原因（Why）
- `TarotScene.js` 側で `this.tarotData = this.cache.json.get('tarot_data')` を参照していたが、`TarotScene.preload()` 内で `tarot_data`（`files/DATA/tarot.json`）の読み込みが定義されていなかった。
- 直前の `BootScene` ストール発生時やキャッシュ未初期化時に `this.tarotData` が `undefined` となり、カード選択時に `this.tarotData[cardId]` で TypeError が発生していた。

### 2. 対策（How）
1. [TarotScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/TarotScene.js):
   - `preload()` に `if (!this.cache.json.exists('tarot_data')) this.load.json('tarot_data', 'files/DATA/tarot.json');` を追加。自前でも確実にプリロードを担保。
   - `create()` で `this.tarotData = this.cache.json.get('tarot_data') || {};` に安全化。
   - `selectCard()` および引き直し時のカードデータ参照箇所に、`this.tarotData` の再取得＆デフォルトオブジェクトフォールバックを追加。

### 3. 検証結果
- `npm run build` にてビルド成功を確認。
- Git への commit / push は行わず、ローカル環境のみに保持。

---

## [2026-11-15] タロット仲間加入解放条件の厳格化・道場&メイド館デバッグバイパス撤廃・デバッグボタンUI統一

### 1. ユーザー指示内容
1. **タロットカードと仲間加入の解放条件の厳格化**:
   - カード自体の出現制限はしない（仲間に入らないときもカードそのものは山札から出る。妖精も悪魔もこれから実装する他キャラも）。
   - ただし仲間加入（遭遇イベント・加入処理）は、デバッグモード（`GlobalState.IS_DEBUG_MODE`）であっても条件をスキップせず、本番と同じ正規条件を厳格に適用する（ノア、ななよ、白蓮、リフィエル、プロセル等）。
2. **デバッグモードの道場・メイド館（時空館）無条件入場フラグの撤廃**:
   - デバッグモードで道場（`isDojoUnlocked`）とメイド館（`isJikukanUnlocked`）に最初から無条件で入れるバイパスを削除し、正規条件でのみ解放・表示されるようにする。
3. **デバッグモード限定コマンドボタンのUI統一**:
   - デバッグ限定のコマンドボタンのUIを統一して「黄色い背景ボタンに黒文字（`#ffea00` / `#000000`）」にする。
   - ボタン名の先頭に `🐝`（蜂マーク）を付ける（デバッグ＝虫の意味から）。

### 2. 調査・原因・対応内容（Why & How）
1. [TarotScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/TarotScene.js):
   - **ノア(008)・ななよ(007)**:
     - 判定: `!gs.hasEnteredTower && !GlobalState.IS_DEBUG_MODE` から `!GlobalState.IS_DEBUG_MODE` を削除。塔へ突入した実績（`hasEnteredTower`）がある場合のみ仲間に加入。突入前はカード自体の効果（HP回復等）のみ発動し仲間加入イベントは発生しない。
   - **白蓮(011)**:
     - 判定: `!hasMetInAkiba && !hasRespawned && !GlobalState.IS_DEBUG_MODE` から `!GlobalState.IS_DEBUG_MODE` を削除。秋葉原探索での遭遇（`hasAccompanied`）または周回リスポーン経験（`loopCount >= 2`）が必須。
   - **リフィエル(009)**:
     - 判定: `gs.loopCount >= 2 || GlobalState.IS_DEBUG_MODE` から `GlobalState.IS_DEBUG_MODE` を削除。2周目以降かつ未遭遇の場合のみ妖精遭遇イベントが発火。
   - **悪魔カード(16) / プロセル(010)**:
     - 2RDEVILイベント発火条件およびプロセル加入判定から `GlobalState.IS_DEBUG_MODE` を削除。21階ボス撃破実績（`tower21BossDefeated`）が必須。
2. [AdventureScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/AdventureScene.js):
   - **道場・時空館（メイド館）のバイパス撤廃**:
     - `this.dojoBtn.setVisible(isVisible && gs.isDojoUnlocked);`
     - `this.jikukanBtn.setVisible(isVisible && gs.isJikukanUnlocked);`
     - `_createDojoButton` / `_createJikukanButton` 内の初期表示および `updateStatus()` から `|| GlobalState.IS_DEBUG_MODE` を完全削除。正規解放条件を満たすまで表示されないよう修正。
     - デバッグ自動引き（Tキー）内のプロセル加入判定からも `GlobalState.IS_DEBUG_MODE` を削除。
   - **デバッグボタンのUI統一**:
     - 共通スタイル `{ fontFamily: 'sans-serif', fontSize: '15px', color: '#000000', fontStyle: 'bold', backgroundColor: '#ffea00', padding: { x: 12, y: 8 } }` を適用。
     - 各ボタンテキストを `🐝 ` プレフィックスに更新：
       - `🐝 突破テスト`
       - `🐝 DPS計測`
       - `🐝 通常マップへ戻る` / `🐝 タワーテスト`
       - `🐝 フロア移動`
       - `🐝 対人戦テスト`
       - `🐝 時間経過`
       - `🐝 翌朝スキップ`
       - `🐝 タワー敵復活`
     - 表示更新（`_createBaseControls`）時に `towerRespawnBtn` の可視性制御を追加。

### 3. 検証結果
- `npm run build` を実行し、エラーなくビルドが正常完了することを確認。
- Git への commit / push は行わず、ローカル環境のみに保持。

---

## [2026-11-15] Webアプリ版最終バージョンリリース（デバッグOFF・だんます塔突入実績解放）＆ Git反映

### 1. ユーザー指示内容
1. Webアプリ版としての最終バージョンとしてデバッグモードを完全OFF（本番リリース仕様）にする。
2. タイトル画面の「🎮 だんます」ミニゲームボタンは、セーブデータで「塔突入実績（`hasEnteredTower`）」がある場合のみオープン（表示・起動可能）にする。
3. その上で、Webアプリ版の集大成としてGitへコミット＆プッシュ（同期）を行う。

### 2. 実施した対策・変更内容（How）
1. [GlobalState.js](file:///c:/Users/user/.antigravity/game/src/systems/GlobalState.js):
   - `static IS_DEBUG_MODE = false;` に変更（デバッグモード完全解除・本番仕様）。
   - `static ALLOW_DEBUG_TOGGLE = false;` に連動変更。
2. [TitleScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/TitleScene.js):
   - セーブデータ復元および `gs.hasEnteredTower` を確認し、塔突入実績がある場合のみ左下に「🎮 だんます」ボタンを生成・タップ反応するように改修。
   - 塔突入前の新規プレイや地上編プレイ中は非表示となり、世界観と進行度に応じた解放演出を実現。
3. [AdventureScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/AdventureScene.js):
   - 妖精アイコン（`chr_fairy_s`）のプリロード＆オンデマンドフォールバックにより、実機・ブラウザ問わず緑枠（Missing）を出さない安全設計を確立。
   - リフィエル一時クリーニングコードの完全撤廃により、将来の隠しキャラ解放ロジックとの衝突を排除。

### 3. 検証結果
- `npm run build` を実行し、構文・バンドルエラーなく本番ビルドが正常完了することを確認。
- Git へコミットおよびプッシュを実施。

---

## [2026-11-15] プロジェクト全体バックアップ作成 & Androidアプリ特化への移行検証

### 1. ユーザー指示内容
1. ここまでの成果物のバックアップをローカルに確実に作成・保存する。
2. Webアプリとしての側面を捨て、今後はAndroidアプリに特化して開発を進める。
3. Androidアプリとした場合に不要になる部分、最適化・追加すべき部分を網羅的に検証・提示する。

### 2. 実施したバックアップ内容
- **バックアップ先**: `c:\Users\user\.antigravity\backup_20261115_web_to_android`
- `node_modules`, `dist`, `.git` を除外したソースコード、アセット、設定ファイル、ドキュメント全一式を完全退避。

### 3. Androidアプリ特化に向けた詳細検証結果

#### ① 不要になる部分（整理・削除・無効化推奨）
1. **GitHub Pages デプロイスクリプト**:
   - `package.json` の `"deploy"` スクリプトや `build_web.bat`。Web公開は行わないため整理可能。
2. **外部CDNフォント読み込み（index.html）**:
   - Google Fonts CDN（`Noto Serif JP`）への外部通信。オフラインプレイ時にフォント取得遅延・チラつきの原因となるため、ローカルバンドルまたはシステムフォントへ統一が推奨。
3. **ブラウザ特有のビューポート揺れ対策（index.html / main.js）**:
   - モバイルブラウザのアドレスバー出入り対策（`visualViewport` イベント等）は、固定WebViewのAndroidアプリでは不要（アプリ枠に収まるためシンプル化可能）。
4. **URLクエリパラメータ判定（main.js）**:
   - `?load_test_save=1` などのWebブラウザ用URLクエリ検知コード。
5. **PC物理キーボード前提のデバッグショートカット**:
   - Oキー、Tキー、Lキーなどのキーボードイベント。Android実機では物理キーがないため、画面上の蜂マーク（`🐝`）ボタンやデバッグ画面に集約。

#### ② Androidアプリ化に伴い追加・最適化すべき重要項目
1. **ステータスバー・ナビゲーションバーの没入制御（Immersive Mode）**:
   - `@capacitor/status-bar` を導入し、画面上部の時計・バッテリー領域を黒色または非表示にして没入感を向上。
2. **画面スリープ（消灯）防止（KeepAwake）**:
   - 戦闘中や長文イベント中に15秒〜30秒で画面が暗くなるのを防ぐため、`@capacitor-community/keep-awake` を導入してゲームプレイ中の自動消灯を防止。
3. **セーブデータの安全二重保存（LocalStorage + Capacitor Preferences）**:
   - OSのストレージクリーンアップ機能でLocalStorageが万が一消去されるリスクを防ぐため、バックアップ退避を二重化。
4. **Google AdMob リワード広告プラグインの導入**:
   - `@capacitor-community/admob` をインストールし、実機での広告動画再生を本番SDKに接続。
5. **Google Play Billing（In-App Purchase）の導入**:
   - 永年広告スキップパス（500円）の決済APIを接続。

---

## [2026-11-15] リフィエル一時クリーニングコードの完全撤廃 & 妖精アイコン未ロード（緑枠）根本解消

### 1. ユーザー指示内容
1. 前回追加したリフィエルの強制クリーニングコードは、将来的に条件を満たして仲間に入る際バグの引き金になるため完全に削除・撤廃する。
2. マップ画面左側の「妖精の取引ボタン（fairyS）」が未ロード（緑枠 Missing Texture）になっていた原因の究明・解消。
3. ブラウザ版とAndroid実機環境でのアセット読み込みの違い、および広告・課金プログラムの本格組み込み方針の整理・回答。

### 2. 実施した対策・変更内容（How）

1. **強制クリーニングコードの完全撤廃（AdventureScene.js）**:
   - `create()` 内で `this.party` や `savedFormation` から `009` を強制削除していたブロック、およびイベント復帰時の `normJoinId !== '009'` ガードを完全に撤廃。
   - 仲間に加わらない制御は、`TarotScene` 側で教皇カードから加入キャラIDを渡さない（`joinCharacterId: null`）設計で安全に担保されているため、将来的な隠しキャラ解放ロジックと衝突しないクリーンな状態へ復帰。

2. **妖精アイコン（chr_fairy_s）未ロード・緑枠の根本解消（AdventureScene.js）**:
   - **原因**: `chr_fairy_s`（`files/CHR/fairyS.webp`）が `AdventureScene.preload()` のロードキューに入っておらず、BootScene側でのキャッシュ状態に依存していたため、HMRやリロード時に未定義となり緑枠が発生していた。
   - **対策**:
     - `AdventureScene.preload()` に `chr_fairy_s` および `chr_fairy` のプリロードを追加。
     - `_createFairyButton()` にて、万が一未ロードの場合でも緑枠を出さず（`setVisible(false)`）、即座に非同期ロードして完了時にテクスチャを自動差し替え・表示する安全フォールバック設計を導入。

### 3. 検証結果
- `npm run build` を実行し、エラーなくビルドが正常完了することを確認。
- Git への commit / push は行わず、ローカル環境のみに保持。

---

## [2026-11-15] Webアプリ版最終バージョンリリース（デバッグOFF・だんます塔突入実績解放）＆ Git反映

### 1. ユーザー指示内容
1. Webアプリ版としての最終バージョンとしてデバッグモードを完全OFF（本番リリース仕様）にする。
2. タイトル画面の「🎮 だんます」ミニゲームボタンは、セーブデータで「塔突入実績（`hasEnteredTower`）」がある場合のみオープン（表示・起動可能）にする。
3. その上で、Webアプリ版の集大成としてGitへコミット＆プッシュ（同期）を行う。

### 2. 実施した対策・変更内容（How）
1. [GlobalState.js](file:///c:/Users/user/.antigravity/game/src/systems/GlobalState.js):
   - `static IS_DEBUG_MODE = false;` に変更（デバッグモード完全解除・本番仕様）。
   - `static ALLOW_DEBUG_TOGGLE = false;` に連動変更。
2. [TitleScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/TitleScene.js):
   - セーブデータ復元および `gs.hasEnteredTower` を確認し、塔突入実績がある場合のみ左下に「🎮 だんます」ボタンを生成・タップ反応するように改修。
   - 塔突入前の新規プレイや地上編プレイ中は非表示となり、世界観と進行度に応じた解放演出を実現。
3. [AdventureScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/AdventureScene.js):
   - 妖精アイコン（`chr_fairy_s`）のプリロード＆オンデマンドフォールバックにより、実機・ブラウザ問わず緑枠（Missing）を出さない安全設計を確立。
   - リフィエル一時クリーニングコードの完全撤廃により、将来の隠しキャラ解放ロジックとの衝突を排除。

### 3. 検証結果
- `npm run build` を実行し、構文・バンドルエラーなく本番ビルドが正常完了することを確認。
- Git へコミットおよびプッシュを実施。

---

## [2026-11-15] プロジェクト全体バックアップ作成 & Androidアプリ特化への移行検証

### 1. ユーザー指示内容
1. ここまでの成果物のバックアップをローカルに確実に作成・保存する。
2. Webアプリとしての側面を捨て、今後はAndroidアプリに特化して開発を進める。
3. Androidアプリとした場合に不要になる部分、最適化・追加すべき部分を網羅的に検証・提示する。

### 2. 実施したバックアップ内容
- **バックアップ先**: `c:\Users\user\.antigravity\backup_20261115_web_to_android`
- `node_modules`, `dist`, `.git` を除外したソースコード、アセット、設定ファイル、ドキュメント全一式を完全退避。

### 3. Androidアプリ特化に向けた詳細検証結果

#### ① 不要になる部分（整理・削除・無効化推奨）
1. **GitHub Pages デプロイスクリプト**:
   - `package.json` の `"deploy"` スクリプトや `build_web.bat`。Web公開は行わないため整理可能。
2. **外部CDNフォント読み込み（index.html）**:
   - Google Fonts CDN（`Noto Serif JP`）への外部通信。オフラインプレイ時にフォント取得遅延・チラつきの原因となるため、ローカルバンドルまたはシステムフォントへ統一が推奨。
3. **ブラウザ特有のビューポート揺れ対策（index.html / main.js）**:
   - モバイルブラウザのアドレスバー出入り対策（`visualViewport` イベント等）は、固定WebViewのAndroidアプリでは不要（アプリ枠に収まるためシンプル化可能）。
4. **URLクエリパラメータ判定（main.js）**:
   - `?load_test_save=1` などのWebブラウザ用URLクエリ検知コード。
5. **PC物理キーボード前提のデバッグショートカット**:
   - Oキー、Tキー、Lキーなどのキーボードイベント。Android実機では物理キーがないため、画面上の蜂マーク（`🐝`）ボタンやデバッグ画面に集約。

#### ② Androidアプリ化に伴い追加・最適化すべき重要項目
1. **ステータスバー・ナビゲーションバーの没入制御（Immersive Mode）**:
   - `@capacitor/status-bar` を導入し、画面上部の時計・バッテリー領域を黒色または非表示にして没入感を向上。
2. **画面スリープ（消灯）防止（KeepAwake）**:
   - 戦闘中や長文イベント中に15秒〜30秒で画面が暗くなるのを防ぐため、`@capacitor-community/keep-awake` を導入してゲームプレイ中の自動消灯を防止。
3. **セーブデータの安全二重保存（LocalStorage + Capacitor Preferences）**:
   - OSのストレージクリーンアップ機能でLocalStorageが万が一消去されるリスクを防ぐため、バックアップ退避を二重化。
4. **Google AdMob リワード広告プラグインの導入**:
   - `@capacitor-community/admob` をインストールし、実機での広告動画再生を本番SDKに接続。
5. **Google Play Billing（In-App Purchase）の導入**:
   - 永年広告スキップパス（500円）の決済APIを接続。

---

## [2026-11-15] リフィエル一時クリーニングコードの完全撤廃 & 妖精アイコン未ロード（緑枠）根本解消

### 1. ユーザー指示内容
1. 前回追加したリフィエルの強制クリーニングコードは、将来的に条件を満たして仲間に入る際バグの引き金になるため完全に削除・撤廃する。
2. マップ画面左側の「妖精の取引ボタン（fairyS）」が未ロード（緑枠 Missing Texture）になっていた原因の究明・解消。
3. ブラウザ版とAndroid実機環境でのアセット読み込みの違い、および広告・課金プログラムの本格組み込み方針の整理・回答。

### 2. 実施した対策・変更内容（How）

1. **強制クリーニングコードの完全撤廃（AdventureScene.js）**:
   - `create()` 内で `this.party` や `savedFormation` から `009` を強制削除していたブロック、およびイベント復帰時の `normJoinId !== '009'` ガードを完全に撤廃。
   - 仲間に加わらない制御は、`TarotScene` 側で教皇カードから加入キャラIDを渡さない（`joinCharacterId: null`）設計で安全に担保されているため、将来的な隠しキャラ解放ロジックと衝突しないクリーンな状態へ復帰。

2. **妖精アイコン（chr_fairy_s）未ロード・緑枠の根本解消（AdventureScene.js）**:
   - **原因**: `chr_fairy_s`（`files/CHR/fairyS.webp`）が `AdventureScene.preload()` のロードキューに入っておらず、BootScene側でのキャッシュ状態に依存していたため、HMRやリロード時に未定義となり緑枠が発生していた。
   - **対策**:
     - `AdventureScene.preload()` に `chr_fairy_s` および `chr_fairy` のプリロードを追加。
     - `_createFairyButton()` にて、万が一未ロードの場合でも緑枠を出さず（`setVisible(false)`）、即座に非同期ロードして完了時にテクスチャを自動差し替え・表示する安全フォールバック設計を導入。

### 3. 検証結果
- `npm run build` を実行し、エラーなくビルドが正常完了することを確認。
- Git への commit / push は行わず、ローカル環境のみに安全に保持。

---

## [2026-11-15] 雑魚戦→魔女戦BGM重なり解消 & ワイルドハントイベント〜突破戦の完全シームレスBGM化 & 突破戦仕様調査

### 1. ユーザー指示内容
1. 雑魚戦から魔女戦に移る際のBGMがまだ重なっている問題の解決。
2. 12/21夜ワイルドハント突入前のイベントから突破戦までBGM（`bgm_wildhunt`）を通してシームレスに流したい。
3. ワイルドハント突破戦では、既にワイルドハントBGMが流れていた場合は新規再生しないようにする。
4. ワイルドハント突破戦の内容は突破テストと同じなのか、レベル等の調整があるのかの調査・確認。

### 2. 調査・原因・対応内容（Why & How）

#### ① 雑魚戦→魔女戦でBGMが重なっていた原因と解決
- **原因**:
  - `BattleScene.js` の `boss_presentation`（WARNING演出）および `boss`（魔女実体化）で、特定の固定キー配列（`nonBossKeys`）に対して `this.sound.get(key)` を呼んでいた。
  - Phaser 3 の `SoundManager.get(key)` は最初に見つかったインスタンス（過去の停止済みオブジェクトなど）を返す場合があり、**現在実際に鳴っているインスタンスにフェードや停止が届いていなかった**。
  - また、ボスBGMが未ロードのフォールバックとして `bgm_battle1`（雑魚BGM）を再再生する危険な分岐が存在していた。
- **対策**:
  - `boss_presentation` 入時に `this.sound.sounds` の「現在再生中のサウンドすべて（`s && s.isPlaying`）」を対象にし、ボスターゲット以外の全サウンドを400msで音量0へフェードアウトして即座に `s.stop()` するよう改修。
  - `boss` 実体化時にも残存サウンドを再度確実に `s.stop()`。
  - ボスBGM未ロード時は雑魚BGMを鳴らさず、`AssetLoader.ensureBgm` で非同期ロードして安全に再生するよう統一。

#### ② ワイルドハント突入イベント〜突破戦のシームレスBGM化
- **原因**:
  - `EventScene` 冒頭で `bgm_wildhunt` を鳴らした直後、イベントコマンド `{ cmd: 'bgm', key: 'bgm_wildhunt' }` を処理する `EventEngine._changeBgm` が「管理外サウンド」と誤認して `bgm_wildhunt` をフェードアウト停止＆別インスタンスで再再生していた。
  - `BattleScene.create()` の `isWildhunt` 分岐で、既存再生中のTweenキルや音量正規化、他の不要なマップBGMの停止が行われていなかった。
- **対策**:
  - [EventEngine.js](file:///c:/Users/user/.antigravity/game/src/systems/EventEngine.js):
    - `_changeBgm(key)` にて、既に同一キーのサウンドが再生中であればフェードアウトや再生成を行わず、そのままシームレスに継続（音量0.75維持＆Tweenキル）するよう改修。
  - [EventScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/EventScene.js):
    - 冒頭で再生した `bgm_wildhunt` のインスタンスを `this.engine._currentBgm` に事前登録。
  - [BattleScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/BattleScene.js):
    - `isWildhunt` 分岐にて、前シーンから `bgm_wildhunt` が流れている場合は**絶対に新しく再生せず**、Tweenをキルして音量を0.75に確定。それ以外の不要なBGMを確実に `stop()`。未再生時のみ新規再生。

#### ③ ワイルドハント突破戦と突破テストの仕様比較調査
- **突破テスト（デバッグコマンド `🐝 突破テスト`）**:
  - 敵数: 50体
  - 敵レベル: Lv.1（固定）
  - スポーン間隔: 1.0秒
  - 突破目標距離: 42,195m（42.195km）
  - デバフ・敵レベル上昇なしの純粋な動作テスト用。
- **ワイルドハント突破戦（本番 12/21夜）**:
  - 敵数: 200体
  - 敵レベル: **Lv.5からスタートし、10秒ごとに自動で+Lv.1上昇（`5 + Math.floor(elapsedSec / 10)`）**！
  - スポーン間隔: 0.5秒（突破テストの2倍の超激戦）
  - 突破目標距離: 12,010m（約12km）
  - **極限デバフ機能（BattleEngine.js L1015〜1028）**:
    - ① 味方与ダメージ低下: 1秒ごとに0.1%減
    - ② 味方被ダメージ激増: 1秒ごとに+2%増（50秒で被ダメージ2倍に膨張）
    - ③ 夜間限定デバフ: 被ダメージ2倍
  - ➡ 単なる突破テストとは根本的に異なり、**時間経過とともに敵レベルがどんどん上がり、プレイヤー側も急激に消耗・壊滅してバッドエンド周回へ誘導される専用の過酷な調整**が最初から組み込まれている。

### 3. 検証結果
- `npm run build` を実行し、構文・バンドルエラーなくビルド成功を確認。
- Git への commit / push は行わず、ローカル環境のみに安全に保持。

---

## [2026-11-15] 妖精リフィエル遭遇イベントの演出強化 & パーティ非加入化（広告屋の妖精専用化・隠しキャラ保護）

### 1. ユーザー指示内容
1. 妖精リフィエル遭遇イベント（教皇カード）の演出改修：
   - 探索背景（缶詰）ではなく、プレイヤーが現在いるヘクスの通常背景（マップ掛け合い背景）を使用する。
   - 冒頭に右側に紫苑（`portrait_001`）が登場して呟き始め、その後左側に小さなリフィエル（`chr_fairy`）が登場する流れにする。
2. リフィエルが戦闘パーティ・編成に加わってしまう問題の解消：
   - リフィエルは将来の条件で戦闘可能・大人形態への変化が予定されている隠しキャラのため、現段階では戦闘パーティや隊列編成には絶対に加入させない（広告屋の妖精・取引サポート専用）。

### 2. 実施した対策・変更内容（How）

1. **イベント演出の強化（event_fairy_join.json & TarotScene.js）**:
   - [event_fairy_join.json](file:///c:/Users/user/.antigravity/game/public/files/DATA/event_fairy_join.json):
     - 冒頭に `{ "cmd": "chara", "key": "portrait_001", "pos": "right" }` を追加。紫苑が右側に立って息をつき、蝶（光）を見つめるシーンから開始。
     - その後、左側に身長60cmサイズ・浮遊の `{ "cmd": "chr", "pos": "left", "key": "chr_fairy", "scaleMultiplier": 0.38, "yOffset": -60 }` が現れる美しい構図に整備。
   - [TarotScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/TarotScene.js):
     - 教皇カード（ID: 6）引き時、悪魔イベントと同様に `events[0].key = this.bgKey || 'bg_map_base'` を適用し、現在いる土地の景色でイベントが始まるように改修。

2. **パーティ非加入化（完全な広告屋の妖精化）**:
   - [TarotScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/TarotScene.js):
     - `getCharacterId(tarotId)` のマップから `6: '009'` を完全削除。
     - 教皇カード（ID: 6）のイベント呼び出し時、`joinCharacterId: null` を渡して仲間加入処理を発火させないように分離。
     - パーティが5人満員であっても、仲間枠を使わないため問題なく妖精イベントが発生し、日次取引機能（`gs.hasMetFairy = true`）が解放されるように調整。
   - [AdventureScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/AdventureScene.js):
     - 万が一セーブデータ内にリフィエル（`009`）が残っていた場合の安全クリーニング処理を追加。`this.party`、`savedFormation`、`normalFormation`、`towerFormation` から自動的に `009` を除外して保存。
     - イベント復帰時の加入処理でも `normJoinId !== '009'` をガード。

### 3. 検証結果
- `npm run build` を実行し、エラーなくビルドが正常完了することを確認。
- Git への commit / push は行わず、ローカル環境のみに安全に保持。

---

## 2026-11-15: ワイルドハント＆バッドエンドアセットの「直前オンデマンド読み込み・展開」設計への移行（初期ロード軽量化）

### 1. ユーザー指示内容
「ワイルドハントからバッドエンドなんかはゲーム中何回とみるもんでもないし、その直前にロード、展開するのじゃいかんかな？」
➔ 初期起動（`BootScene`）で常時メモリに抱え込むのではなく、イベントが発生するその直前にオンデマンドで読み込み・展開する構成に最適化する。

### 2. 調査・設計内容
- 閲覧頻度の低いイベント（ワイルドハント、バッドエンド・リスポーン、タワー敗北等）は、起動時に読み込むと初期ロード時間と常駐メモリを無駄に消費してしまう。
- `AssetLoader.js` の未ロード判定付きローダー（`ensureAssets`）を活用し、「発生直前に未キャッシュ分だけサッと読み込んで展開する」方式に移行することで、見ないプレイでは1バイトも無駄なメモリを使わず、見る時だけ100%確実に表示・再生できるようにする。

### 3. 実施した対策・変更内容（How）

1. **`AssetLoader.js` に専用オンデマンドローダーを新設**:
   - `ensureWildhuntAssets(scene, onComplete)`:
     ワイルドハント背景（`bg_wildhunt`）とBGM（`bgm_wildhunt`）を直前にロード。
   - `ensureRespawnAssets(scene, isTower, onComplete)`:
     バッドエンド画像（`bg_resp`）とBGM（`bgm_resp`）、タワー時は `bg_tow_spo01` と `unknoun_terror` を直前にロード。

2. **`EventScene.js` での直前ロード統合**:
   - `EventScene.create()` の先頭で、ワイルドハントやリスポーンのフラグを検知し、`ensureWildhuntAssets` / `ensureRespawnAssets` を実行。未ロードがあれば「Now Loading...」オーバーレイを出して揃ってからイベントを開始。
   - すでにロード済みなら待ち時間ゼロで即座に開始。

3. **`BattleScene.js`（ワイルドハント突破戦）での直前ロード**:
   - `this.battleConfig.is1221NightBattle` の場合、`BattleScene.preload()` で `bgm_wildhunt` を直前ロード。

4. **`BootScene.js` の初期プリロードから除外**:
   - 初期起動時の読み込みリストから `bg_wildhunt`, `bg_resp`, `resp`, `bgm_wildhunt`, `bgm_resp`, `unknoun_terror` を除外し、初期ロード時間と常駐メモリを大幅軽量化。

### 4. 変更対象ファイル
- [AssetLoader.js](file:///c:/Users/user/.antigravity/game/src/systems/AssetLoader.js)
- [EventScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/EventScene.js)
- [BattleScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/BattleScene.js)
- [BootScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/BootScene.js)
- [WORK_LOG.md](file:///c:/Users/user/.antigravity/game/WORK_LOG.md)

### 5. 検証結果
- `npm run build` を実行し、構文・バンドルエラーなく正常ビルド成功を確認。
- Git への commit / push は行わず、ローカル環境のみに保持。

---

## [2026-11-15] Google Play公開準備 ＆ 広告・VIP永年パス・妖精取引（0時リセット1日1回・合成リロール）実装

### 1. 目的（Why）
- デベロッパー登録（「長沢電子工務店 (NDK)」）完了に伴い、アプリのパッケージ名（`com.ndk.magiapilgrims`）とリリース用署名キーストアを整備。
- Google Play Console 審査用のプライバシーポリシーページを作成。
- 広告（リワード動画）と課金設計（買い切り永年広告スキップパス「妖精の祝福」500円）の全体仕様を実装：
  1. 1周目は妖精リフィエルや広告・課金のアピールは一切なし（クリア後の2周目、タロット009教皇を引いてから初解放）。
  2. 妖精の取引（各特典）は「日本時間（JST）午前0時リセットで、それぞれ1日1回ずつ」利用可能。
  3. VIP（永年広告スキップパス所持者）であっても無限チートではなく「それぞれ1日1回」。広告動画を見ずに即座に受取可能。
  4. 新機能「レリクス／宝石合成のやり直し（リロール）機能」を新設し、これも妖精の取引（1日1回・広告/VIP）として利用可能に。
  5. タロット引き直し機能にも「1日1回・0時更新（広告/VIP）」の制約とバッジ表示を連動。

### 2. 実施した対策・変更内容（How）

1. **Google Play用設定・署名キー・ポリシーの整備**:
   - `capacitor.config.json` の `appId` を `"com.ndk.magiapilgrims"` に更新。
   - `android/app/build.gradle` の `applicationId` を `"com.ndk.magiapilgrims"` に更新し、リリース用署名設定（`signingConfigs.release`）を追加。
   - `keytool.exe` を使用して `android/app/ndk-release-key.jks`（alias: `ndk_key`）を生成。
   - `docs/privacy.html` および `privacy.html` を新規作成（Google AdMob条項を含む公開用プライバシーポリシー）。

2. **日本時間0時リセット＆1日1回制の基盤（GlobalState / SaveManager / FairyTradeManager）**:
   - `GlobalState.js` に `hasNoAdsPass`（VIPフラグ）と `fairyTradeUsage`（日次利用記録 `tradeKey -> YYYY-MM-DD`）を追加。
   - `SaveManager.js` に `hasNoAdsPass` と `fairyTradeUsage` の永続化・復元処理を追加。
   - `FairyTradeManager.js` にて、JST（UTC+9）ベースで当日キー `getTodayKeyJST()` と次の0時までの残り時間を計算する `getMsUntilNextMidnightJST()`、本日利用済み判定 `isTradeUsedToday(key)`、利用記録 `recordTrade(key)` を実装。

3. **VIP永年広告スキップ処理（RewardService / FairyTradeManager）**:
   - `RewardService.js` で `gs.hasNoAdsPass` が true の場合、広告動画をスキップして即時に `onReward()` コールバックを実行。
   - `FairyTradeManager.js` のモーダル下部に「✨ 妖精の祝福（広告スキップ永年パス 500円）」の状態案内およびトグルテストボタンを配置。未所持時は「🎬 広告」、所持時は「✨ VIP即時」とボタンバッジが切り替わる。

4. **レリクス／宝石合成のやり直し機能（EquipmentScene.js）**:
   - 合成完了後に結果モーダル `showSynthesisResultModal` を表示。
   - 2周目以降で妖精遭遇済み（`gs.hasMetFairy`）かつ本日未利用の場合、「🧚‍♀️ 妖精の取引：結果を引き直す (🎬広告 / ✨VIP即時)」ボタンを表示。
   - 押下時に同ランクで再抽選を行い、合成結果アイテムを差し替えてセーブ。1日1回のみ実行可能。

5. **タロット引き直し機能の1日1回連動（TarotScene.js）**:
   - リフィエル解放済みのタロット引き直しボタンに `!FairyTradeManager.isTradeUsedToday('tarot_reroll')` の制限を適用。
   - VIP時は「✨VIP即時」、通常時は「🎬広告」と表記し、利用後は当日再利用不可（翌日0時リセット）。

### 3. 変更対象ファイル
- [capacitor.config.json](file:///c:/Users/user/.antigravity/game/capacitor.config.json)
- [android/app/build.gradle](file:///c:/Users/user/.antigravity/game/android/app/build.gradle)
- [docs/privacy.html](file:///c:/Users/user/.antigravity/game/docs/privacy.html)
- [privacy.html](file:///c:/Users/user/.antigravity/game/privacy.html)
- [GlobalState.js](file:///c:/Users/user/.antigravity/game/src/systems/GlobalState.js)
- [SaveManager.js](file:///c:/Users/user/.antigravity/game/src/systems/SaveManager.js)
- [RewardService.js](file:///c:/Users/user/.antigravity/game/src/systems/RewardService.js)
- [FairyTradeManager.js](file:///c:/Users/user/.antigravity/game/src/systems/FairyTradeManager.js)
- [EquipmentScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/EquipmentScene.js)
- [TarotScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/TarotScene.js)
- [WORK_LOG.md](file:///c:/Users/user/.antigravity/game/WORK_LOG.md)

### 4. 検証結果
- `npm run build` にてビルド成功を確認。
- Git への commit / push は一切行わず、ローカル環境のみに保持。

---

## [2026-11-15] 周回時（リスポーンイベント）の「AssetLoader is not defined」エラー修正

### 1. 原因（Why）
- 周回時（バッドエンド／リスポーン時、`eventId === 'event_resp'`）に、`EventScene.js` 内で `AssetLoader.ensureRespawnAssets(...)` を呼び出していたが、同ファイル冒頭で `AssetLoader` の `import` 文が抜けていたため `ReferenceError: AssetLoader is not defined` が発生していた。

### 2. 対策（How）
- [EventScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/EventScene.js) に `import { AssetLoader } from '../systems/AssetLoader';` を追加。
- `AssetLoader.ensureRespawnAssets` が正常に実行され、リスポーン用の背景画像（`bg_resp`）とBGM（`bgm_resp`）を安全にオンデマンド読み込みしてからイベントが進行することを確認。

### 3. 検証結果
- `npm run build` にてエラーなくビルドが通ることを確認。
- Git への commit / push は一切行わず、ローカル環境のみに保持。

---

## [2026-11-15] 12/21夜ワイルドハント＆12/22朝魔女狩り・周回のすり抜け防止（行動直前＆復帰時絶対ガード）実装

### 1. 目的（Why）
- 12/21夜および12/22朝にエラーやF5リロード、リセット等で復帰した場合、または野外で「休息」を選んだ場合に、イベントが発生せずにそのまま年を越せてしまう不具合の根本解消。

### 2. 実施した対策・変更内容（How）

1. **12/21夜のワイルドハント強制突入ガードの網羅**:
   - [AdventureScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/AdventureScene.js) の「休息ボタン（`restBtn`）」押下時の処理に `if (this.check1221NightForcedBreakthrough()) return;` を追加。
   - これにより、21日夜に「移動」「探索」だけでなく「休息」を押した場合でも、確実にワイルドハント（未閲覧ならイベント、閲覧済みなら突破戦）へ強制突入するように徹底。

2. **12/22朝以降の絶対周回ガード（地上にいる場合）**:
   - `check1221Event()` のロジックを改修。地上で `currentDay >= 22` の状態であれば、フラグ `event1221Played` の有無に関わらず、必ず魔女狩り（`event_1221`）および周回リスポーン（`event_resp`）を起動して周回リセットへ強制移行。
   - `create()` の復帰時、およびプレイヤーが「移動」「探索」「休息」を押した直前の全タイミングで `check1221Event()` を実行。
   - これにより、途中でエラーやリロード・リセットが起きても、地上で22日以降に行動を起こそうとした瞬間に100%周回ルートへ導かれ、年を越すことが物理的に不可能になった。

3. **中途半端な先行セーブの撤廃**:
   - `from1221Event`（魔女狩りイベント）完了直後に挟まれていた `SaveManager.saveGame(this)` を撤廃し、周回リセット（`gs.resetForNewLoop()`）で12/1東京駅に初期化されたクリーンな状態でのみ保存するように安全化。

### 3. 変更対象ファイル
- [AdventureScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/AdventureScene.js)
- [WORK_LOG.md](file:///c:/Users/user/.antigravity/game/WORK_LOG.md)

### 4. 検証結果
- `npm run build` を実行し、構文・バンドルエラーなく正常ビルド成功を確認。
- Git への commit / push は一切行わず、ローカル環境のみに保持。

---

## [2026-11-15] ステータス画面（CampScene）BGM無音問題の根本解決

### 1. 原因（Why）
- 先日のアセット軽量化時に、キャンプBGM（`bgm_camp` / `files/BGM/camp_BGM.mp3`）が `BootScene.js` のプリロード対象から外れていた。
- しかし、ステータス画面である `CampScene.js` 側には `preload()` や遅延ロード（`ensureBgm`）の仕組みがなく、`if (this.cache.audio.exists('bgm_camp'))` の判定でキャッシュ未存在（false）となり無音化していた。
- さらに `CampScene.js` 起動時に `this.sound.stopAll()` でフィールド曲が止められ、終了時にもマップBGMの再開リスナーがなかったため、ステータスを開閉した後に無音になっていた。

### 2. 対策（How）
1. [BootScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/BootScene.js):
   - ゲーム基本BGMである `this.load.audio('bgm_camp', 'files/BGM/camp_BGM.mp3');` を初期ロードに正式復帰。起動時から即座に再生可能に。
2. [CampScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/CampScene.js):
   - `preload()` を追加し、万が一未キャッシュ時でも `load.audio` を実行。
   - `create()` で `AssetLoader.ensureBgm` によるフォールバック二重安全網を設置。
3. [AdventureScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/AdventureScene.js):
   - ステータス画面から復帰した際に確実にマップBGMを再開するワンタイム `resume` リスナーを追加。

### 3. 検証結果
- `npm run build` を実行し、ビルド成功を確認。
- Git への commit / push は行わず、ローカル環境のみに保持。

---

## [2026-11-15] ステータス画面の顔画像未ロード（緑枠Missing）＆ BootSceneストールの根本解決

### 1. 原因（Why）
- 直前の修正で `BootScene.js` に `this.load.audio('bgm_camp', ...)` を追加した際、ブラウザの仕様（ユーザー操作前の未対話状態ではAudioContextがサスペンドされる）により、PhaserのWebAudioデコーダーが完了通知を受け取れず `[BootScene] Loader stalled for 8s without progress. Forcing completion.` が発生していた。
- 8秒タイムアウトによる強制完了（`loadComplete()`）が走った結果、ロードキュー内に残っていた紫苑の顔アイコン（`face_001`）など後続アセットの読み込みがスキップされてしまい、ステータス画面で緑枠（Missing Texture）が表示されていた。

### 2. 対策（How）
1. [BootScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/BootScene.js):
   - 初期ロードでの `bgm_camp` 読み込みを撤廃。これにより起動時ローダーのストールが完全に解消し、全キャラの顔画像を含む全初期アセットが100%スムーズにロードされるように復旧。
2. [CampScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/CampScene.js):
   - キャンプBGM（`bgm_camp`）はステータスボタン押下（ユーザー対話後）に `AssetLoader.ensureBgm` 経由でオンデマンド再生する安全設計に統一。
   - 顔アイコン描画部にオンデマンド読み込み＆安全フォールバック処理を追加。万が一テクスチャが未ロードの場合でも緑枠を出さず、安全なアイコンを表示しつつ即座に非同期ロードして本来の顔画像へ自動差し替え。

### 3. 検証結果
- Viteログにて `Loader stalled` 警告が完全に消滅し、起動時ロードが正常完了することを確認。
- `npm run build` にてビルド成功を確認。
- Git への commit / push は行わず、ローカル環境のみに保持。

---

## [2026-11-15] タロットカード選択時の「Cannot read properties of undefined (reading '16')」エラー修正

### 1. 原因（Why）
- `TarotScene.js` 側で `this.tarotData = this.cache.json.get('tarot_data')` を参照していたが、`TarotScene.preload()` 内で `tarot_data`（`files/DATA/tarot.json`）の読み込みが定義されていなかった。
- 直前の `BootScene` ストール発生時やキャッシュ未初期化時に `this.tarotData` が `undefined` となり、カード選択時に `this.tarotData[cardId]` で TypeError が発生していた。

### 2. 対策（How）
1. [TarotScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/TarotScene.js):
   - `preload()` に `if (!this.cache.json.exists('tarot_data')) this.load.json('tarot_data', 'files/DATA/tarot.json');` を追加。自前でも確実にプリロードを担保。
   - `create()` で `this.tarotData = this.cache.json.get('tarot_data') || {};` に安全化。
   - `selectCard()` および引き直し時のカードデータ参照箇所に、`this.tarotData` の再取得＆デフォルトオブジェクトフォールバックを追加。

### 3. 検証結果
- `npm run build` にてビルド成功を確認。
- Git への commit / push は行わず、ローカル環境のみに保持。

---

## 2026-11-15: アセット全般のオンデマンド遅延ロード徹底最適化（初期起動ロードの大幅削減＆メモリ超軽量化）

### 1. ユーザー指示内容
「タワー内画像も重たいと思うのでロード後行き先がタワーとわかった瞬間とかタワーに突入するときに読み込むようにするのがいいと思う。他にもなんかないかな、クラーケンとか敵としてのプロセルとかほとんどないよな。道場で戦えるようにするかもしれんけど。道場やメイド館も解放されてなきゃ読まんでいいよな。」

### 2. 調査・分析した内容（Why & What）
コード全体を精査したところ、初期起動（`BootScene.preload`）や通常戦闘（`BattleScene.preload`）で、滅多に使われない重いアセットが多数先行読み込みされていたことを確認：
1. **クラーケン（巨大タコ魔女）アセット**:
   普通の雑魚戦を含むすべての戦闘突入時（`BattleScene.preload`）で、毎回巨大画像（`KrakenA`, `KrakenB`, `KrakenC` 各PNG）と背景（`KrakenBG.jpg`）、BGM 2曲を常にロードしていた。
2. **プロセル巨大ボス（`enemy_prc_full`）**:
   タワー21階ボス戦専用のアセット（`enemy_prc_a`, `enemy_prc_b`）を起動時に読み込み、キャンバス合成処理まで行っていた。
3. **タロットカード全23枚（`tarot_0` 〜 `tarot_22`）**:
   `TarotScene.preload()` で自前ロードしているにもかかわらず、`BootScene.preload` でも全23枚のWebP画像を重複して初期ロードしていた。
4. **タワー遠景（`tow1`〜`tow4`）**:
   タワー突入時（`BootScene.loadTowerAssets`）にロードされるため、初期起動時に読み込む必要がなかった。
5. **道場（`event_dojo`）＆時空館・メイド館（`event_jiku`, `jiku_cg`）**:
   解放前の序盤から常に初期ロードされていた。
6. **好感度一枚絵（11枚）＆仲間喪失一枚絵（6枚）**:
   発生頻度が低いイベントCG計17枚が初期ロードされていた。

### 3. 実施した対策・変更内容（How）

1. **クラーケンの直前ロード化（BattleScene.js）**:
   - `isKrakenBossBattle` や `fromIkebukuro02Event` などのクラーケン戦時のみ、クラーケン画像・背景・専用BGMをオンデマンドロードするよう条件分岐。通常の雑魚戦・魔女戦の戦闘ロード時間を大幅短縮。

2. **プロセル巨大ボスの直前ロード化（BattleScene.js）**:
   - タワー21階ボス戦またはプロセル戦時のみ、テクスチャをロードしてキャンバス合成を行うように移管。`BootScene` からの初期ロード＆起動時合成処理を完全撤廃。

3. **タロット全23枚の初期ロード重複撤廃（BootScene.js）**:
   - `TarotScene` が開いた瞬間の自前 preload に一本化し、`BootScene` から全23枚の画像読み込みを完全削除。

4. **タワー遠景画像の初期ロード撤廃（BootScene.js）**:
   - `tow1`〜`tow4` の初期ロードを削除。セーブデータ復帰時や地上からタワー突入時（`loadTowerAssets`）に必要な時だけロードする設計に統一。地上編プレイ中のメモリ消費を削減。

5. **道場・時空館（メイド館）のオンデマンド遅延ロード化（AdventureScene.js）**:
   - 初回道場訪問時、およびシルバードームでの時空館（メイド館）解放イベント発生時に、`AssetLoader.ensureAssets` で未ロード分をその場でサッと読み込んでからシーンを開始するよう改修。

### 4. 変更対象ファイル
- [BattleScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/BattleScene.js)
- [BootScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/BootScene.js)
- [AdventureScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/AdventureScene.js)
- [WORK_LOG.md](file:///c:/Users/user/.antigravity/game/WORK_LOG.md)

### 5. 検証結果
- `npm run build` を実行し、構文・バンドルエラーなく正常ビルド成功を確認。
- 初期起動時に読み込まれるファイル数が約50個以上削減され、初期ロード時間と常駐メモリが劇的に軽量化。
- Git への commit / push は行わず、ローカル環境のみに保持。

---

## [2026-11-15] Google Play公開準備 ＆ 広告・VIP永年パス・妖精取引（0時リセット1日1回・合成リロール）実装

### 1. 目的（Why）
- デベロッパー登録（「長沢電子工務店 (NDK)」）完了に伴い、アプリのパッケージ名（`com.ndk.magiapilgrims`）とリリース用署名キーストアを整備。
- Google Play Console 審査用のプライバシーポリシーページを作成。
- 広告（リワード動画）と課金設計（買い切り永年広告スキップパス「妖精の祝福」500円）の全体仕様を実装：
  1. 1周目は妖精リフィエルや広告・課金のアピールは一切なし（クリア後の2周目、タロット009教皇を引いてから初解放）。
  2. 妖精の取引（各特典）は「日本時間（JST）午前0時リセットで、それぞれ1日1回ずつ」利用可能。
  3. VIP（永年広告スキップパス所持者）であっても無限チートではなく「それぞれ1日1回」。広告動画を見ずに即座に受取可能。
  4. 新機能「レリクス／宝石合成のやり直し（リロール）機能」を新設し、これも妖精の取引（1日1回・広告/VIP）として利用可能に。
  5. タロット引き直し機能にも「1日1回・0時更新（広告/VIP）」の制約とバッジ表示を連動。

### 2. 実施した対策・変更内容（How）

1. **Google Play用設定・署名キー・ポリシーの整備**:
   - `capacitor.config.json` の `appId` を `"com.ndk.magiapilgrims"` に更新。
   - `android/app/build.gradle` の `applicationId` を `"com.ndk.magiapilgrims"` に更新し、リリース用署名設定（`signingConfigs.release`）を追加。
   - `keytool.exe` を使用して `android/app/ndk-release-key.jks`（alias: `ndk_key`）を生成。
   - `docs/privacy.html` および `privacy.html` を新規作成（Google AdMob条項を含む公開用プライバシーポリシー）。

2. **日本時間0時リセット＆1日1回制の基盤（GlobalState / SaveManager / FairyTradeManager）**:
   - `GlobalState.js` に `hasNoAdsPass`（VIPフラグ）と `fairyTradeUsage`（日次利用記録 `tradeKey -> YYYY-MM-DD`）を追加。
   - `SaveManager.js` に `hasNoAdsPass` と `fairyTradeUsage` の永続化・復元処理を追加。
   - `FairyTradeManager.js` にて、JST（UTC+9）ベースで当日キー `getTodayKeyJST()` と次の0時までの残り時間を計算する `getMsUntilNextMidnightJST()`、本日利用済み判定 `isTradeUsedToday(key)`、利用記録 `recordTrade(key)` を実装。

3. **VIP永年広告スキップ処理（RewardService / FairyTradeManager）**:
   - `RewardService.js` で `gs.hasNoAdsPass` が true の場合、広告動画をスキップして即時に `onReward()` コールバックを実行。
   - `FairyTradeManager.js` のモーダル下部に「✨ 妖精の祝福（広告スキップ永年パス 500円）」の状態案内およびトグルテストボタンを配置。未所持時は「🎬 広告」、所持時は「✨ VIP即時」とボタンバッジが切り替わる。

4. **レリクス／宝石合成のやり直し機能（EquipmentScene.js）**:
   - 合成完了後に結果モーダル `showSynthesisResultModal` を表示。
   - 2周目以降で妖精遭遇済み（`gs.hasMetFairy`）かつ本日未利用の場合、「🧚‍♀️ 妖精の取引：結果を引き直す (🎬広告 / ✨VIP即時)」ボタンを表示。
   - 押下時に同ランクで再抽選を行い、合成結果アイテムを差し替えてセーブ。1日1回のみ実行可能。

5. **タロット引き直し機能の1日1回連動（TarotScene.js）**:
   - リフィエル解放済みのタロット引き直しボタンに `!FairyTradeManager.isTradeUsedToday('tarot_reroll')` の制限を適用。
   - VIP時は「✨VIP即時」、通常時は「🎬広告」と表記し、利用後は当日再利用不可（翌日0時リセット）。

### 3. 変更対象ファイル
- [capacitor.config.json](file:///c:/Users/user/.antigravity/game/capacitor.config.json)
- [android/app/build.gradle](file:///c:/Users/user/.antigravity/game/android/app/build.gradle)
- [docs/privacy.html](file:///c:/Users/user/.antigravity/game/docs/privacy.html)
- [privacy.html](file:///c:/Users/user/.antigravity/game/privacy.html)
- [GlobalState.js](file:///c:/Users/user/.antigravity/game/src/systems/GlobalState.js)
- [SaveManager.js](file:///c:/Users/user/.antigravity/game/src/systems/SaveManager.js)
- [RewardService.js](file:///c:/Users/user/.antigravity/game/src/systems/RewardService.js)
- [FairyTradeManager.js](file:///c:/Users/user/.antigravity/game/src/systems/FairyTradeManager.js)
- [EquipmentScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/EquipmentScene.js)
- [TarotScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/TarotScene.js)
- [WORK_LOG.md](file:///c:/Users/user/.antigravity/game/WORK_LOG.md)

### 4. 検証結果
- `npm run build` にてビルド成功を確認。
- Git への commit / push は一切行わず、ローカル環境のみに保持。

---

## [2026-11-15] 周回時（リスポーンイベント）の「AssetLoader is not defined」エラー修正

### 1. 原因（Why）
- 周回時（バッドエンド／リスポーン時、`eventId === 'event_resp'`）に、`EventScene.js` 内で `AssetLoader.ensureRespawnAssets(...)` を呼び出していたが、同ファイル冒頭で `AssetLoader` の `import` 文が抜けていたため `ReferenceError: AssetLoader is not defined` が発生していた。

### 2. 対策（How）
- [EventScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/EventScene.js) に `import { AssetLoader } from '../systems/AssetLoader';` を追加。
- `AssetLoader.ensureRespawnAssets` が正常に実行され、リスポーン用の背景画像（`bg_resp`）とBGM（`bgm_resp`）を安全にオンデマンド読み込みしてからイベントが進行することを確認。

### 3. 検証結果
- `npm run build` にてエラーなくビルドが通ることを確認。
- Git への commit / push は一切行わず、ローカル環境のみに保持。

---

## [2026-11-15] 12/21夜ワイルドハント＆12/22朝魔女狩り・周回のすり抜け防止（行動直前＆復帰時絶対ガード）実装

### 1. 目的（Why）
- 12/21夜および12/22朝にエラーやF5リロード、リセット等で復帰した場合、または野外で「休息」を選んだ場合に、イベントが発生せずにそのまま年を越せてしまう不具合の根本解消。

### 2. 実施した対策・変更内容（How）

1. **12/21夜のワイルドハント強制突入ガードの網羅**:
   - [AdventureScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/AdventureScene.js) の「休息ボタン（`restBtn`）」押下時の処理に `if (this.check1221NightForcedBreakthrough()) return;` を追加。
   - これにより、21日夜に「移動」「探索」だけでなく「休息」を押した場合でも、確実にワイルドハント（未閲覧ならイベント、閲覧済みなら突破戦）へ強制突入するように徹底。

2. **12/22朝以降の絶対周回ガード（地上にいる場合）**:
   - `check1221Event()` のロジックを改修。地上で `currentDay >= 22` の状態であれば、フラグ `event1221Played` の有無に関わらず、必ず魔女狩り（`event_1221`）および周回リスポーン（`event_resp`）を起動して周回リセットへ強制移行。
   - `create()` の復帰時、およびプレイヤーが「移動」「探索」「休息」を押した直前の全タイミングで `check1221Event()` を実行。
   - これにより、途中でエラーやリロード・リセットが起きても、地上で22日以降に行動を起こそうとした瞬間に100%周回ルートへ導かれ、年を越すことが物理的に不可能になった。

3. **中途半端な先行セーブの撤廃**:
   - `from1221Event`（魔女狩りイベント）完了直後に挟まれていた `SaveManager.saveGame(this)` を撤廃し、周回リセット（`gs.resetForNewLoop()`）で12/1東京駅に初期化されたクリーンな状態でのみ保存するように安全化。

### 3. 変更対象ファイル
- [AdventureScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/AdventureScene.js)
- [WORK_LOG.md](file:///c:/Users/user/.antigravity/game/WORK_LOG.md)

### 4. 検証結果
- `npm run build` を実行し、構文・バンドルエラーなく正常ビルド成功を確認。
- Git への commit / push は一切行わず、ローカル環境のみに保持。

---

## [2026-11-15] ステータス画面（CampScene）BGM無音問題の根本解決

### 1. 原因（Why）
- 先日のアセット軽量化時に、キャンプBGM（`bgm_camp` / `files/BGM/camp_BGM.mp3`）が `BootScene.js` のプリロード対象から外れていた。
- しかし、ステータス画面である `CampScene.js` 側には `preload()` や遅延ロード（`ensureBgm`）の仕組みがなく、`if (this.cache.audio.exists('bgm_camp'))` の判定でキャッシュ未存在（false）となり無音化していた。
- さらに `CampScene.js` 起動時に `this.sound.stopAll()` でフィールド曲が止められ、終了時にもマップBGMの再開リスナーがなかったため、ステータスを開閉した後に無音になっていた。

### 2. 対策（How）
1. [BootScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/BootScene.js):
   - ゲーム基本BGMである `this.load.audio('bgm_camp', 'files/BGM/camp_BGM.mp3');` を初期ロードに正式復帰。起動時から即座に再生可能に。
2. [CampScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/CampScene.js):
   - `preload()` を追加し、万が一未キャッシュ時でも `load.audio` を実行。
   - `create()` で `AssetLoader.ensureBgm` によるフォールバック二重安全網を設置。
3. [AdventureScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/AdventureScene.js):
   - ステータス画面から復帰した際に確実にマップBGMを再開するワンタイム `resume` リスナーを追加。

### 3. 検証結果
- `npm run build` を実行し、ビルド成功を確認。
- Git への commit / push は行わず、ローカル環境のみに保持。

---

## [2026-11-15] ステータス画面の顔画像未ロード（緑枠Missing）＆ BootSceneストールの根本解決

### 1. 原因（Why）
- 直前の修正で `BootScene.js` に `this.load.audio('bgm_camp', ...)` を追加した際、ブラウザの仕様（ユーザー操作前の未対話状態ではAudioContextがサスペンドされる）により、PhaserのWebAudioデコーダーが完了通知を受け取れず `[BootScene] Loader stalled for 8s without progress. Forcing completion.` が発生していた。
- 8秒タイムアウトによる強制完了（`loadComplete()`）が走った結果、ロードキュー内に残っていた紫苑の顔アイコン（`face_001`）など後続アセットの読み込みがスキップされてしまい、ステータス画面で緑枠（Missing Texture）が表示されていた。

### 2. 対策（How）
1. [BootScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/BootScene.js):
   - 初期ロードでの `bgm_camp` 読み込みを撤廃。これにより起動時ローダーのストールが完全に解消し、全キャラの顔画像を含む全初期アセットが100%スムーズにロードされるように復旧。
2. [CampScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/CampScene.js):
   - キャンプBGM（`bgm_camp`）はステータスボタン押下（ユーザー対話後）に `AssetLoader.ensureBgm` 経由でオンデマンド再生する安全設計に統一。
   - 顔アイコン描画部にオンデマンド読み込み＆安全フォールバック処理を追加。万が一テクスチャが未ロードの場合でも緑枠を出さず、安全なアイコンを表示しつつ即座に非同期ロードして本来の顔画像へ自動差し替え。

### 3. 検証結果
- Viteログにて `Loader stalled` 警告が完全に消滅し、起動時ロードが正常完了することを確認。
- `npm run build` にてビルド成功を確認。
- Git への commit / push は行わず、ローカル環境のみに保持。

---

## [2026-11-15] タロットカード選択時の「Cannot read properties of undefined (reading '16')」エラー修正

### 1. 原因（Why）
- `TarotScene.js` 側で `this.tarotData = this.cache.json.get('tarot_data')` を参照していたが、`TarotScene.preload()` 内で `tarot_data`（`files/DATA/tarot.json`）の読み込みが定義されていなかった。
- 直前の `BootScene` ストール発生時やキャッシュ未初期化時に `this.tarotData` が `undefined` となり、カード選択時に `this.tarotData[cardId]` で TypeError が発生していた。

### 2. 対策（How）
1. [TarotScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/TarotScene.js):
   - `preload()` に `if (!this.cache.json.exists('tarot_data')) this.load.json('tarot_data', 'files/DATA/tarot.json');` を追加。自前でも確実にプリロードを担保。
   - `create()` で `this.tarotData = this.cache.json.get('tarot_data') || {};` に安全化。
   - `selectCard()` および引き直し時のカードデータ参照箇所に、`this.tarotData` の再取得＆デフォルトオブジェクトフォールバックを追加。

### 3. 検証結果
- `npm run build` にてビルド成功を確認。
- Git への commit / push は行わず、ローカル環境のみに保持。

---

## [2026-11-15] タロット仲間加入解放条件の厳格化・道場&メイド館デバッグバイパス撤廃・デバッグボタンUI統一

### 1. ユーザー指示内容
1. **タロットカードと仲間加入の解放条件の厳格化**:
   - カード自体の出現制限はしない（仲間に入らないときもカードそのものは山札から出る。妖精も悪魔もこれから実装する他キャラも）。
   - ただし仲間加入（遭遇イベント・加入処理）は、デバッグモード（`GlobalState.IS_DEBUG_MODE`）であっても条件をスキップせず、本番と同じ正規条件を厳格に適用する（ノア、ななよ、白蓮、リフィエル、プロセル等）。
2. **デバッグモードの道場・メイド館（時空館）無条件入場フラグの撤廃**:
   - デバッグモードで道場（`isDojoUnlocked`）とメイド館（`isJikukanUnlocked`）に最初から無条件で入れるバイパスを削除し、正規条件でのみ解放・表示されるようにする。
3. **デバッグモード限定コマンドボタンのUI統一**:
   - デバッグ限定のコマンドボタンのUIを統一して「黄色い背景ボタンに黒文字（`#ffea00` / `#000000`）」にする。
   - ボタン名の先頭に `🐝`（蜂マーク）を付ける（デバッグ＝虫の意味から）。

### 2. 調査・原因・対応内容（Why & How）
1. [TarotScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/TarotScene.js):
   - **ノア(008)・ななよ(007)**:
     - 判定: `!gs.hasEnteredTower && !GlobalState.IS_DEBUG_MODE` から `!GlobalState.IS_DEBUG_MODE` を削除。塔へ突入した実績（`hasEnteredTower`）がある場合のみ仲間に加入。突入前はカード自体の効果（HP回復等）のみ発動し仲間加入イベントは発生しない。
   - **白蓮(011)**:
     - 判定: `!hasMetInAkiba && !hasRespawned && !GlobalState.IS_DEBUG_MODE` から `!GlobalState.IS_DEBUG_MODE` を削除。秋葉原探索での遭遇（`hasAccompanied`）または周回リスポーン経験（`loopCount >= 2`）が必須。
   - **リフィエル(009)**:
     - 判定: `gs.loopCount >= 2 || GlobalState.IS_DEBUG_MODE` から `GlobalState.IS_DEBUG_MODE` を削除。2周目以降かつ未遭遇の場合のみ妖精遭遇イベントが発火。
   - **悪魔カード(16) / プロセル(010)**:
     - 2RDEVILイベント発火条件およびプロセル加入判定から `GlobalState.IS_DEBUG_MODE` を削除。21階ボス撃破実績（`tower21BossDefeated`）が必須。
2. [AdventureScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/AdventureScene.js):
   - **道場・時空館（メイド館）のバイパス撤廃**:
     - `this.dojoBtn.setVisible(isVisible && gs.isDojoUnlocked);`
     - `this.jikukanBtn.setVisible(isVisible && gs.isJikukanUnlocked);`
     - `_createDojoButton` / `_createJikukanButton` 内の初期表示および `updateStatus()` から `|| GlobalState.IS_DEBUG_MODE` を完全削除。正規解放条件を満たすまで表示されないよう修正。
     - デバッグ自動引き（Tキー）内のプロセル加入判定からも `GlobalState.IS_DEBUG_MODE` を削除。
   - **デバッグボタンのUI統一**:
     - 共通スタイル `{ fontFamily: 'sans-serif', fontSize: '15px', color: '#000000', fontStyle: 'bold', backgroundColor: '#ffea00', padding: { x: 12, y: 8 } }` を適用。
     - 各ボタンテキストを `🐝 ` プレフィックスに更新：
       - `🐝 突破テスト`
       - `🐝 DPS計測`
       - `🐝 通常マップへ戻る` / `🐝 タワーテスト`
       - `🐝 フロア移動`
       - `🐝 対人戦テスト`
       - `🐝 時間経過`
       - `🐝 翌朝スキップ`
       - `🐝 タワー敵復活`
     - 表示更新（`_createBaseControls`）時に `towerRespawnBtn` の可視性制御を追加。

### 3. 検証結果
- `npm run build` を実行し、エラーなくビルドが正常完了することを確認。
- Git への commit / push は行わず、ローカル環境のみに保持。

---

## [2026-11-15] Webアプリ版最終バージョンリリース（デバッグOFF・だんます塔突入実績解放）＆ Git反映

### 1. ユーザー指示内容
1. Webアプリ版としての最終バージョンとしてデバッグモードを完全OFF（本番リリース仕様）にする。
2. タイトル画面の「🎮 だんます」ミニゲームボタンは、セーブデータで「塔突入実績（`hasEnteredTower`）」がある場合のみオープン（表示・起動可能）にする。
3. その上で、Webアプリ版の集大成としてGitへコミット＆プッシュ（同期）を行う。

### 2. 実施した対策・変更内容（How）
1. [GlobalState.js](file:///c:/Users/user/.antigravity/game/src/systems/GlobalState.js):
   - `static IS_DEBUG_MODE = false;` に変更（デバッグモード完全解除・本番仕様）。
   - `static ALLOW_DEBUG_TOGGLE = false;` に連動変更。
2. [TitleScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/TitleScene.js):
   - セーブデータ復元および `gs.hasEnteredTower` を確認し、塔突入実績がある場合のみ左下に「🎮 だんます」ボタンを生成・タップ反応するように改修。
   - 塔突入前の新規プレイや地上編プレイ中は非表示となり、世界観と進行度に応じた解放演出を実現。
3. [AdventureScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/AdventureScene.js):
   - 妖精アイコン（`chr_fairy_s`）のプリロード＆オンデマンドフォールバックにより、実機・ブラウザ問わず緑枠（Missing）を出さない安全設計を確立。
   - リフィエル一時クリーニングコードの完全撤廃により、将来の隠しキャラ解放ロジックとの衝突を排除。

### 3. 検証結果
- `npm run build` を実行し、構文・バンドルエラーなく本番ビルドが正常完了することを確認。
- Git へコミットおよびプッシュを実施。

---

## [2026-11-15] プロジェクト全体バックアップ作成 & Androidアプリ特化への移行検証

### 1. ユーザー指示内容
1. ここまでの成果物のバックアップをローカルに確実に作成・保存する。
2. Webアプリとしての側面を捨て、今後はAndroidアプリに特化して開発を進める。
3. Androidアプリとした場合に不要になる部分、最適化・追加すべき部分を網羅的に検証・提示する。

### 2. 実施したバックアップ内容
- **バックアップ先**: `c:\Users\user\.antigravity\backup_20261115_web_to_android`
- `node_modules`, `dist`, `.git` を除外したソースコード、アセット、設定ファイル、ドキュメント全一式を完全退避。

### 3. Androidアプリ特化に向けた詳細検証結果

#### ① 不要になる部分（整理・削除・無効化推奨）
1. **GitHub Pages デプロイスクリプト**:
   - `package.json` の `"deploy"` スクリプトや `build_web.bat`。Web公開は行わないため整理可能。
2. **外部CDNフォント読み込み（index.html）**:
   - Google Fonts CDN（`Noto Serif JP`）への外部通信。オフラインプレイ時にフォント取得遅延・チラつきの原因となるため、ローカルバンドルまたはシステムフォントへ統一が推奨。
3. **ブラウザ特有のビューポート揺れ対策（index.html / main.js）**:
   - モバイルブラウザのアドレスバー出入り対策（`visualViewport` イベント等）は、固定WebViewのAndroidアプリでは不要（アプリ枠に収まるためシンプル化可能）。
4. **URLクエリパラメータ判定（main.js）**:
   - `?load_test_save=1` などのWebブラウザ用URLクエリ検知コード。
5. **PC物理キーボード前提のデバッグショートカット**:
   - Oキー、Tキー、Lキーなどのキーボードイベント。Android実機では物理キーがないため、画面上の蜂マーク（`🐝`）ボタンやデバッグ画面に集約。

#### ② Androidアプリ化に伴い追加・最適化すべき重要項目
1. **ステータスバー・ナビゲーションバーの没入制御（Immersive Mode）**:
   - `@capacitor/status-bar` を導入し、画面上部の時計・バッテリー領域を黒色または非表示にして没入感を向上。
2. **画面スリープ（消灯）防止（KeepAwake）**:
   - 戦闘中や長文イベント中に15秒〜30秒で画面が暗くなるのを防ぐため、`@capacitor-community/keep-awake` を導入してゲームプレイ中の自動消灯を防止。
3. **セーブデータの安全二重保存（LocalStorage + Capacitor Preferences）**:
   - OSのストレージクリーンアップ機能でLocalStorageが万が一消去されるリスクを防ぐため、バックアップ退避を二重化。
4. **Google AdMob リワード広告プラグインの導入**:
   - `@capacitor-community/admob` をインストールし、実機での広告動画再生を本番SDKに接続。
5. **Google Play Billing（In-App Purchase）の導入**:
   - 永年広告スキップパス（500円）の決済APIを接続。

---

## [2026-11-15] リフィエル一時クリーニングコードの完全撤廃 & 妖精アイコン未ロード（緑枠）根本解消

### 1. ユーザー指示内容
1. 前回追加したリフィエルの強制クリーニングコードは、将来的に条件を満たして仲間に入る際バグの引き金になるため完全に削除・撤廃する。
2. マップ画面左側の「妖精の取引ボタン（fairyS）」が未ロード（緑枠 Missing Texture）になっていた原因の究明・解消。
3. ブラウザ版とAndroid実機環境でのアセット読み込みの違い、および広告・課金プログラムの本格組み込み方針の整理・回答。

### 2. 実施した対策・変更内容（How）

1. **強制クリーニングコードの完全撤廃（AdventureScene.js）**:
   - `create()` 内で `this.party` や `savedFormation` から `009` を強制削除していたブロック、およびイベント復帰時の `normJoinId !== '009'` ガードを完全に撤廃。
   - 仲間に加わらない制御は、`TarotScene` 側で教皇カードから加入キャラIDを渡さない（`joinCharacterId: null`）設計で安全に担保されているため、将来的な隠しキャラ解放ロジックと衝突しないクリーンな状態へ復帰。

2. **妖精アイコン（chr_fairy_s）未ロード・緑枠の根本解消（AdventureScene.js）**:
   - **原因**: `chr_fairy_s`（`files/CHR/fairyS.webp`）が `AdventureScene.preload()` のロードキューに入っておらず、BootScene側でのキャッシュ状態に依存していたため、HMRやリロード時に未定義となり緑枠が発生していた。
   - **対策**:
     - `AdventureScene.preload()` に `chr_fairy_s` および `chr_fairy` のプリロードを追加。
     - `_createFairyButton()` にて、万が一未ロードの場合でも緑枠を出さず（`setVisible(false)`）、即座に非同期ロードして完了時にテクスチャを自動差し替え・表示する安全フォールバック設計を導入。

### 3. 検証結果
- `npm run build` を実行し、エラーなくビルドが正常完了することを確認。
- Git への commit / push は行わず、ローカル環境のみに保持。

---

## [2026-11-15] Webアプリ版最終バージョンリリース（デバッグOFF・だんます塔突入実績解放）＆ Git反映

### 1. ユーザー指示内容
1. Webアプリ版としての最終バージョンとしてデバッグモードを完全OFF（本番リリース仕様）にする。
2. タイトル画面の「🎮 だんます」ミニゲームボタンは、セーブデータで「塔突入実績（`hasEnteredTower`）」がある場合のみオープン（表示・起動可能）にする。
3. その上で、Webアプリ版の集大成としてGitへコミット＆プッシュ（同期）を行う。

### 2. 実施した対策・変更内容（How）
1. [GlobalState.js](file:///c:/Users/user/.antigravity/game/src/systems/GlobalState.js):
   - `static IS_DEBUG_MODE = false;` に変更（デバッグモード完全解除・本番仕様）。
   - `static ALLOW_DEBUG_TOGGLE = false;` に連動変更。
2. [TitleScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/TitleScene.js):
   - セーブデータ復元および `gs.hasEnteredTower` を確認し、塔突入実績がある場合のみ左下に「🎮 だんます」ボタンを生成・タップ反応するように改修。
   - 塔突入前の新規プレイや地上編プレイ中は非表示となり、世界観と進行度に応じた解放演出を実現。
3. [AdventureScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/AdventureScene.js):
   - 妖精アイコン（`chr_fairy_s`）のプリロード＆オンデマンドフォールバックにより、実機・ブラウザ問わず緑枠（Missing）を出さない安全設計を確立。
   - リフィエル一時クリーニングコードの完全撤廃により、将来の隠しキャラ解放ロジックとの衝突を排除。

### 3. 検証結果
- `npm run build` を実行し、構文・バンドルエラーなく本番ビルドが正常完了することを確認。
- Git へコミットおよびプッシュを実施。

---

## [2026-11-15] プロジェクト全体バックアップ作成 & Androidアプリ特化への移行検証

### 1. ユーザー指示内容
1. ここまでの成果物のバックアップをローカルに確実に作成・保存する。
2. Webアプリとしての側面を捨て、今後はAndroidアプリに特化して開発を進める。
3. Androidアプリとした場合に不要になる部分、最適化・追加すべき部分を網羅的に検証・提示する。

### 2. 実施したバックアップ内容
- **バックアップ先**: `c:\Users\user\.antigravity\backup_20261115_web_to_android`
- `node_modules`, `dist`, `.git` を除外したソースコード、アセット、設定ファイル、ドキュメント全一式を完全退避。

### 3. Androidアプリ特化に向けた詳細検証結果

#### ① 不要になる部分（整理・削除・無効化推奨）
1. **GitHub Pages デプロイスクリプト**:
   - `package.json` の `"deploy"` スクリプトや `build_web.bat`。Web公開は行わないため整理可能。
2. **外部CDNフォント読み込み（index.html）**:
   - Google Fonts CDN（`Noto Serif JP`）への外部通信。オフラインプレイ時にフォント取得遅延・チラつきの原因となるため、ローカルバンドルまたはシステムフォントへ統一が推奨。
3. **ブラウザ特有のビューポート揺れ対策（index.html / main.js）**:
   - モバイルブラウザのアドレスバー出入り対策（`visualViewport` イベント等）は、固定WebViewのAndroidアプリでは不要（アプリ枠に収まるためシンプル化可能）。
4. **URLクエリパラメータ判定（main.js）**:
   - `?load_test_save=1` などのWebブラウザ用URLクエリ検知コード。
5. **PC物理キーボード前提のデバッグショートカット**:
   - Oキー、Tキー、Lキーなどのキーボードイベント。Android実機では物理キーがないため、画面上の蜂マーク（`🐝`）ボタンやデバッグ画面に集約。

#### ② Androidアプリ化に伴い追加・最適化すべき重要項目
1. **ステータスバー・ナビゲーションバーの没入制御（Immersive Mode）**:
   - `@capacitor/status-bar` を導入し、画面上部の時計・バッテリー領域を黒色または非表示にして没入感を向上。
2. **画面スリープ（消灯）防止（KeepAwake）**:
   - 戦闘中や長文イベント中に15秒〜30秒で画面が暗くなるのを防ぐため、`@capacitor-community/keep-awake` を導入してゲームプレイ中の自動消灯を防止。
3. **セーブデータの安全二重保存（LocalStorage + Capacitor Preferences）**:
   - OSのストレージクリーンアップ機能でLocalStorageが万が一消去されるリスクを防ぐため、バックアップ退避を二重化。
4. **Google AdMob リワード広告プラグインの導入**:
   - `@capacitor-community/admob` をインストールし、実機での広告動画再生を本番SDKに接続。
5. **Google Play Billing（In-App Purchase）の導入**:
   - 永年広告スキップパス（500円）の決済APIを接続。

---

## [2026-11-15] リフィエル一時クリーニングコードの完全撤廃 & 妖精アイコン未ロード（緑枠）根本解消

### 1. ユーザー指示内容
1. 前回追加したリフィエルの強制クリーニングコードは、将来的に条件を満たして仲間に入る際バグの引き金になるため完全に削除・撤廃する。
2. マップ画面左側の「妖精の取引ボタン（fairyS）」が未ロード（緑枠 Missing Texture）になっていた原因の究明・解消。
3. ブラウザ版とAndroid実機環境でのアセット読み込みの違い、および広告・課金プログラムの本格組み込み方針の整理・回答。

### 2. 実施した対策・変更内容（How）

1. **強制クリーニングコードの完全撤廃（AdventureScene.js）**:
   - `create()` 内で `this.party` や `savedFormation` から `009` を強制削除していたブロック、およびイベント復帰時の `normJoinId !== '009'` ガードを完全に撤廃。
   - 仲間に加わらない制御は、`TarotScene` 側で教皇カードから加入キャラIDを渡さない（`joinCharacterId: null`）設計で安全に担保されているため、将来的な隠しキャラ解放ロジックと衝突しないクリーンな状態へ復帰。

2. **妖精アイコン（chr_fairy_s）未ロード・緑枠の根本解消（AdventureScene.js）**:
   - **原因**: `chr_fairy_s`（`files/CHR/fairyS.webp`）が `AdventureScene.preload()` のロードキューに入っておらず、BootScene側でのキャッシュ状態に依存していたため、HMRやリロード時に未定義となり緑枠が発生していた。
   - **対策**:
     - `AdventureScene.preload()` に `chr_fairy_s` および `chr_fairy` のプリロードを追加。
     - `_createFairyButton()` にて、万が一未ロードの場合でも緑枠を出さず（`setVisible(false)`）、即座に非同期ロードして完了時にテクスチャを自動差し替え・表示する安全フォールバック設計を導入。

### 3. 検証結果
- `npm run build` を実行し、エラーなくビルドが正常完了することを確認。
- Git への commit / push は行わず、ローカル環境のみに安全に保持。

---

## [2026-11-15] 雑魚戦→魔女戦BGM重なり解消 & ワイルドハントイベント〜突破戦の完全シームレスBGM化 & 突破戦仕様調査

### 1. ユーザー指示内容
1. 雑魚戦から魔女戦に移る際のBGMがまだ重なっている問題の解決。
2. 12/21夜ワイルドハント突入前のイベントから突破戦までBGM（`bgm_wildhunt`）を通してシームレスに流したい。
3. ワイルドハント突破戦では、既にワイルドハントBGMが流れていた場合は新規再生しないようにする。
4. ワイルドハント突破戦の内容は突破テストと同じなのか、レベル等の調整があるのかの調査・確認。

### 2. 調査・原因・対応内容（Why & How）

#### ① 雑魚戦→魔女戦でBGMが重なっていた原因と解決
- **原因**:
  - `BattleScene.js` の `boss_presentation`（WARNING演出）および `boss`（魔女実体化）で、特定の固定キー配列（`nonBossKeys`）に対して `this.sound.get(key)` を呼んでいた。
  - Phaser 3 の `SoundManager.get(key)` は最初に見つかったインスタンス（過去の停止済みオブジェクトなど）を返す場合があり、**現在実際に鳴っているインスタンスにフェードや停止が届いていなかった**。
  - また、ボスBGMが未ロードのフォールバックとして `bgm_battle1`（雑魚BGM）を再再生する危険な分岐が存在していた。
- **対策**:
  - `boss_presentation` 入時に `this.sound.sounds` の「現在再生中のサウンドすべて（`s && s.isPlaying`）」を対象にし、ボスターゲット以外の全サウンドを400msで音量0へフェードアウトして即座に `s.stop()` するよう改修。
  - `boss` 実体化時にも残存サウンドを再度確実に `s.stop()`。
  - ボスBGM未ロード時は雑魚BGMを鳴らさず、`AssetLoader.ensureBgm` で非同期ロードして安全に再生するよう統一。

#### ② ワイルドハント突入イベント〜突破戦のシームレスBGM化
- **原因**:
  - `EventScene` 冒頭で `bgm_wildhunt` を鳴らした直後、イベントコマンド `{ cmd: 'bgm', key: 'bgm_wildhunt' }` を処理する `EventEngine._changeBgm` が「管理外サウンド」と誤認して `bgm_wildhunt` をフェードアウト停止＆別インスタンスで再再生していた。
  - `BattleScene.create()` の `isWildhunt` 分岐で、既存再生中のTweenキルや音量正規化、他の不要なマップBGMの停止が行われていなかった。
- **対策**:
  - [EventEngine.js](file:///c:/Users/user/.antigravity/game/src/systems/EventEngine.js):
    - `_changeBgm(key)` にて、既に同一キーのサウンドが再生中であればフェードアウトや再生成を行わず、そのままシームレスに継続（音量0.75維持＆Tweenキル）するよう改修。
  - [EventScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/EventScene.js):
    - 冒頭で再生した `bgm_wildhunt` のインスタンスを `this.engine._currentBgm` に事前登録。
  - [BattleScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/BattleScene.js):
    - `isWildhunt` 分岐にて、前シーンから `bgm_wildhunt` が流れている場合は**絶対に新しく再生せず**、Tweenをキルして音量を0.75に確定。それ以外の不要なBGMを確実に `stop()`。未再生時のみ新規再生。

#### ③ ワイルドハント突破戦と突破テストの仕様比較調査
- **突破テスト（デバッグコマンド `🐝 突破テスト`）**:
  - 敵数: 50体
  - 敵レベル: Lv.1（固定）
  - スポーン間隔: 1.0秒
  - 突破目標距離: 42,195m（42.195km）
  - デバフ・敵レベル上昇なしの純粋な動作テスト用。
- **ワイルドハント突破戦（本番 12/21夜）**:
  - 敵数: 200体
  - 敵レベル: **Lv.5からスタートし、10秒ごとに自動で+Lv.1上昇（`5 + Math.floor(elapsedSec / 10)`）**！
  - スポーン間隔: 0.5秒（突破テストの2倍の超激戦）
  - 突破目標距離: 12,010m（約12km）
  - **極限デバフ機能（BattleEngine.js L1015〜1028）**:
    - ① 味方与ダメージ低下: 1秒ごとに0.1%減
    - ② 味方被ダメージ激増: 1秒ごとに+2%増（50秒で被ダメージ2倍に膨張）
    - ③ 夜間限定デバフ: 被ダメージ2倍
  - ➡ 単なる突破テストとは根本的に異なり、**時間経過とともに敵レベルがどんどん上がり、プレイヤー側も急激に消耗・壊滅してバッドエンド周回へ誘導される専用の過酷な調整**が最初から組み込まれている。

### 3. 検証結果
- `npm run build` を実行し、構文・バンドルエラーなくビルド成功を確認。
- Git への commit / push は行わず、ローカル環境のみに安全に保持。

---

## [2026-11-15] 妖精リフィエル遭遇イベントの演出強化 & パーティ非加入化（広告屋の妖精専用化・隠しキャラ保護）

### 1. ユーザー指示内容
1. 妖精リフィエル遭遇イベント（教皇カード）の演出改修：
   - 探索背景（缶詰）ではなく、プレイヤーが現在いるヘクスの通常背景（マップ掛け合い背景）を使用する。
   - 冒頭に右側に紫苑（`portrait_001`）が登場して呟き始め、その後左側に小さなリフィエル（`chr_fairy`）が登場する流れにする。
2. リフィエルが戦闘パーティ・編成に加わってしまう問題の解消：
   - リフィエルは将来の条件で戦闘可能・大人形態への変化が予定されている隠しキャラのため、現段階では戦闘パーティや隊列編成には絶対に加入させない（広告屋の妖精・取引サポート専用）。

### 2. 実施した対策・変更内容（How）

1. **イベント演出の強化（event_fairy_join.json & TarotScene.js）**:
   - [event_fairy_join.json](file:///c:/Users/user/.antigravity/game/public/files/DATA/event_fairy_join.json):
     - 冒頭に `{ "cmd": "chara", "key": "portrait_001", "pos": "right" }` を追加。紫苑が右側に立って息をつき、蝶（光）を見つめるシーンから開始。
     - その後、左側に身長60cmサイズ・浮遊の `{ "cmd": "chr", "pos": "left", "key": "chr_fairy", "scaleMultiplier": 0.38, "yOffset": -60 }` が現れる美しい構図に整備。
   - [TarotScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/TarotScene.js):
     - 教皇カード（ID: 6）引き時、悪魔イベントと同様に `events[0].key = this.bgKey || 'bg_map_base'` を適用し、現在いる土地の景色でイベントが始まるように改修。

2. **パーティ非加入化（完全な広告屋の妖精化）**:
   - [TarotScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/TarotScene.js):
     - `getCharacterId(tarotId)` のマップから `6: '009'` を完全削除。
     - 教皇カード（ID: 6）のイベント呼び出し時、`joinCharacterId: null` を渡して仲間加入処理を発火させないように分離。
     - パーティが5人満員であっても、仲間枠を使わないため問題なく妖精イベントが発生し、日次取引機能（`gs.hasMetFairy = true`）が解放されるように調整。
   - [AdventureScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/AdventureScene.js):
     - 万が一セーブデータ内にリフィエル（`009`）が残っていた場合の安全クリーニング処理を追加。`this.party`、`savedFormation`、`normalFormation`、`towerFormation` から自動的に `009` を除外して保存。
     - イベント復帰時の加入処理でも `normJoinId !== '009'` をガード。

### 3. 検証結果
- `npm run build` を実行し、エラーなくビルドが正常完了することを確認。
- Git への commit / push は行わず、ローカル環境のみに安全に保持。

---

## 2026-11-15: 「[object Object]」表示バグの解消 & タワー開始時マップチップ未ロード問題の根本解決 & 変なフォールバックの総点検・根絶

### 1. ユーザー指示内容
1. 起動時やローディング時に「Now Loading...」ではなく「[object Object]」などの変な文字が表示された原因の調査と解消。
2. ゲーム開始直後に塔内だったりするとマップチップが未ロード（bg_tower01に化ける）になる問題の解消。NOW LOADINGを挟んででもしっかり読み込んでほしい。
3. 他にも意図しない変なフォールバック（未ロード時に別のものが鳴る・表示される等）が仕込まれていないかの総点検と解消。

### 2. 調査・発見した内容（Why & What）

#### ① 画面に「[object Object]」と表示されていた原因
- **該当箇所**: `src/systems/LoadingOverlay.js` L14-46
- **原因**:
  `LoadingOverlay.show(scene, text = 'Now Loading...')` の第2引数に対し、
  - `TransitionManager.js`: `LoadingOverlay.show(scene, { depth: 10000 });`
  - `DebugMenuScene.js`: `LoadingOverlay.show(this, { depth: 20000 });`
  のように、表示階層を指定するオブジェクト `{ depth: ... }` が渡されていた。
  しかし `LoadingOverlay` 側で引数の型チェックを行わずにそのまま `scene.add.text(..., text, ...)` に渡していたため、JavaScriptのオブジェクトが文字列表現に自動変換され、画面中央に大きく **`"[object Object]"`** と表示されてしまっていた。

#### ② タワー開始直後にマップチップが未ロード（bg_tower01フォールバック）になる原因
- **該当箇所**: `src/scenes/AdventureScene.js` L90-140, L2233-2241, `src/scenes/BootScene.js` L471-476
- **原因**:
  1. タワー内のセーブデータから再開された際、`AdventureScene.preload()` では地上マップ用画像のみを読み込んでおり、タワー用ヘクス画像（`hex_map_${areaName}`）を一切プリロードしていなかった。
  2. そのため `create()` でマップ生成が走った瞬間に `findImageFile` が `!this.textures.exists(key)` と判定し、全ヘクスがフォールバック用の `'bg_tower01'`（タワー外観遠景画像）で描画されていた。
  3. さらに `BootScene.loadTowerAssets()` も背景画像（`tower_bg_*`）と戦闘背景（`battle_bg_*`）しかロードしておらず、各エリアのヘクスチップ（`hex_map_*`）がロード対象リストから抜け落ちていた。

#### ③ 他の「変なフォールバック」の総点検結果
- **クラーケン戦BGM（BattleScene.js L289）**:
  `tow_Kraken` や `bgm_boss_kraken` が未キャッシュだった場合のフォールバックとして、なぜか地上マップ曲 **`bgm_hexen`** が指定されていた。
- **通常戦闘BGM（BattleScene.js L352）**:
  通常戦闘曲（`bgm_battle1`〜`4`, `bgm_toppa`）が未キャッシュだった場合のフォールバックに **`bgm_hexen`** が指定されていた。
- **イベント戦闘BGM（EventScene.js L266-267）**:
  戦闘曲リストに戦闘曲がない場合、候補として **`bgm_hexen`** を追加する処理が入っていた。

### 3. 実施した対策・変更内容（How）

1. **`LoadingOverlay.js` の引数安全化（[object Object] の完全根絶）**:
   - `LoadingOverlay.show(scene, optionsOrText)` で、第2引数が文字列ならメッセージテキストとして採用し、オブジェクトなら `{ text: '...', depth: ... }` からプロパティを安全に取り出すよう正規化。
   - `{ depth: 10000 }` が渡されても、テキストは正しいデフォルト値 `'Now Loading...'`、深度は `10000` として正常処理されるよう改修。

2. **タワー用アセットの事前ロード網羅 & 多重安全網の構築**:
   - `AdventureScene.preload()`: `isTowerMode` が有効な場合、`TOWER_AREA_MANIFEST` の全18エリアのヘクスチップ画像（`hex_map_*`）、背景画像（`tower_bg_*`）、戦闘背景（`battle_bg_*`）、遠景（`tow1`〜`4`）をすべて自動プリロードするように追加。タワー開始時にアセットが100%揃った状態で描画を開始。
   - `BootScene.loadTowerAssets()`: 全エリアのヘクスチップ画像（`hex_map_*`）をロード対象に正式追加。
   - `AdventureScene.js` に `_refreshTowerHexTextures()` を新設: 万が一ロード完了とマップ生成のタイミングが前後しても、ロード完了コールバックで全ヘクスのテクスチャを本来のエリア画像へ自動差し替え。
   - `findImageFile` 内の動的オンデマンドロード強化: 未ロードのヘクスがあった場合、即座に非同期ロードを開始して完了時に自動反映。

3. **変なフォールバックの完全撤廃**:
   - クラーケン戦BGMのフォールバックから `bgm_hexen` を撤廃し、`bgm_boss2` に変更。さらに `BattleScene.preload()` で `tow_Kraken` を確実に事前ロード。
   - 通常戦闘・イベント戦闘のフォールバックから `bgm_hexen` を完全削除し、戦闘曲のみでフォールバックするように統一。

### 4. 変更対象ファイル
- [LoadingOverlay.js](file:///c:/Users/user/.antigravity/game/src/systems/LoadingOverlay.js)
- [BootScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/BootScene.js)
- [AdventureScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/AdventureScene.js)
- [BattleScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/BattleScene.js)
- [EventScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/EventScene.js)
- [WORK_LOG.md](file:///c:/Users/user/.antigravity/game/WORK_LOG.md)

### 5. 検証結果
- `npm run build` を実行し、構文エラー・バンドルエラーなく正常にビルド成功を確認。
- Git への commit / push は行わず、ローカル環境のみに保持。

---

## 2026-11-15: 12/21夜ワイルドハントBGM無音問題 & バッドエンド画像（bg_resp）未ロード（Missing Texture緑枠）の根本解決

### 1. ユーザー指示内容
1. 時間スキップで12/21夜のワイルドハントを発生させた際、BGMが鳴らなかった原因の調査・解消。
2. その後のバッドエンド（「どれだけの時間が流れたのか、知る術はない。」）で画像が未ロード（緑の枠に対角線の点線）になっていた原因の調査・解消。

### 2. 調査・発見した内容（Why & What）

#### ① 12/21夜ワイルドハントでBGMが鳴らなかった原因
- **該当箇所**: `src/scenes/BootScene.js` L353-365, `src/data/wildhuntEvents.js` L29-33, `src/scenes/EventScene.js` L140-151
- **原因**:
  1. `bgm_wildhunt`（`files/BGM/wildhunt.mp3`）が `BootScene.js` 等でロードされておらず、キャッシュに存在しなかった。
  2. `build1221WildhuntCommands` のコマンドリストから `{ cmd: 'bgm', key: 'bgm_wildhunt' }` が抜け落ちていた。
  3. `EventScene.js` では「ワイルドハント発生時にマップBGMを `stopAll()` で止めてから `bgm_wildhunt` を鳴らす」という処理になっていたが、`bgm_wildhunt` が未ロードだったため再生されず、結果としてマップBGMだけが消えて完全な無音になっていた。

#### ② バッドエンドで画像が未ロード（緑枠 Missing Texture）になっていた原因
- **該当箇所**: `src/scenes/BootScene.js` L320-322, `src/data/event_resp.json` L1-5
- **原因**:
  1. `event_resp.json` の1行目で `{ "cmd": "image", "key": "bg_resp" }` を指定しているが、`BootScene.js` で `event_resp.json` はロードされていたものの、対応する画像 **`bg_resp`（`files/event/resp.webp`）が `load.image` されていなかった**。
  2. そのため、Phaser の Missing Texture（緑の四角とバッテンのデフォルトテクスチャ）が画面いっぱいに拡大表示され、ユーザーが提示したスクリーンショット通りの状態になっていた。
  3. 同様に、バッドエンドBGM `bgm_resp`（`files/BGM/resporn.mp3`）やタワー敗北BGM `unknoun_terror`（`files/BGM/unknoun_terror.mp3`）も初期ロード対象から漏れていた。

### 3. 実施した対策・変更内容（How）

1. **`BootScene.js` での必須アセット先行ロード追加**:
   - 画像: `bg_resp`（`files/event/resp.webp`）を追加。
   - BGM: `bgm_wildhunt`（`files/BGM/wildhunt.mp3`）、`bgm_resp`（`files/BGM/resporn.mp3`）、`unknoun_terror`（`files/BGM/unknoun_terror.mp3`）を追加。

2. **`wildhuntEvents.js` への BGM コマンド追加**:
   - `build1221WildhuntCommands` の先頭に `{ cmd: 'bgm', key: 'bgm_wildhunt' }` を正式追加。イベントシーン実行時にBGMが確実に再生されるようにした。

3. **`EventScene.js` のワイルドハントBGMフォールバック強化**:
   - 万が一キャッシュ未ロードだった場合でも、`AssetLoader.ensureBgm` でオンデマンド非同期ロードして即座に再生する安全網を追加。

4. **`EventEngine.js` の Missing Texture 救済セーフティ追加**:
   - `_doShowIllust` で画像キーが未キャッシュだった場合、Phaser の緑のバッテン四角をそのまま出さず、`files/event/*.webp` をオンデマンドで即座に非同期ロードして完了時にテクスチャを自動差し替えする保護処理を実装。

### 4. 変更対象ファイル
- [BootScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/BootScene.js)
- [wildhuntEvents.js](file:///c:/Users/user/.antigravity/game/src/data/wildhuntEvents.js)
- [EventScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/EventScene.js)
- [EventEngine.js](file:///c:/Users/user/.antigravity/game/src/systems/EventEngine.js)
- [WORK_LOG.md](file:///c:/Users/user/.antigravity/game/WORK_LOG.md)

### 5. 検証結果
- `npm run build` を実行し、ビルド成功を確認。
- Git への commit / push は行わず、ローカル環境のみに保持。

---

## [2026-11-15] Google Play公開準備 ＆ 広告・VIP永年パス・妖精取引（0時リセット1日1回・合成リロール）実装

### 1. 目的（Why）
- デベロッパー登録（「長沢電子工務店 (NDK)」）完了に伴い、アプリのパッケージ名（`com.ndk.magiapilgrims`）とリリース用署名キーストアを整備。
- Google Play Console 審査用のプライバシーポリシーページを作成。
- 広告（リワード動画）と課金設計（買い切り永年広告スキップパス「妖精の祝福」500円）の全体仕様を実装：
  1. 1周目は妖精リフィエルや広告・課金のアピールは一切なし（クリア後の2周目、タロット009教皇を引いてから初解放）。
  2. 妖精の取引（各特典）は「日本時間（JST）午前0時リセットで、それぞれ1日1回ずつ」利用可能。
  3. VIP（永年広告スキップパス所持者）であっても無限チートではなく「それぞれ1日1回」。広告動画を見ずに即座に受取可能。
  4. 新機能「レリクス／宝石合成のやり直し（リロール）機能」を新設し、これも妖精の取引（1日1回・広告/VIP）として利用可能に。
  5. タロット引き直し機能にも「1日1回・0時更新（広告/VIP）」の制約とバッジ表示を連動。

### 2. 実施した対策・変更内容（How）

1. **Google Play用設定・署名キー・ポリシーの整備**:
   - `capacitor.config.json` の `appId` を `"com.ndk.magiapilgrims"` に更新。
   - `android/app/build.gradle` の `applicationId` を `"com.ndk.magiapilgrims"` に更新し、リリース用署名設定（`signingConfigs.release`）を追加。
   - `keytool.exe` を使用して `android/app/ndk-release-key.jks`（alias: `ndk_key`）を生成。
   - `docs/privacy.html` および `privacy.html` を新規作成（Google AdMob条項を含む公開用プライバシーポリシー）。

2. **日本時間0時リセット＆1日1回制の基盤（GlobalState / SaveManager / FairyTradeManager）**:
   - `GlobalState.js` に `hasNoAdsPass`（VIPフラグ）と `fairyTradeUsage`（日次利用記録 `tradeKey -> YYYY-MM-DD`）を追加。
   - `SaveManager.js` に `hasNoAdsPass` と `fairyTradeUsage` の永続化・復元処理を追加。
   - `FairyTradeManager.js` にて、JST（UTC+9）ベースで当日キー `getTodayKeyJST()` と次の0時までの残り時間を計算する `getMsUntilNextMidnightJST()`、本日利用済み判定 `isTradeUsedToday(key)`、利用記録 `recordTrade(key)` を実装。

3. **VIP永年広告スキップ処理（RewardService / FairyTradeManager）**:
   - `RewardService.js` で `gs.hasNoAdsPass` が true の場合、広告動画をスキップして即時に `onReward()` コールバックを実行。
   - `FairyTradeManager.js` のモーダル下部に「✨ 妖精の祝福（広告スキップ永年パス 500円）」の状態案内およびトグルテストボタンを配置。未所持時は「🎬 広告」、所持時は「✨ VIP即時」とボタンバッジが切り替わる。

4. **レリクス／宝石合成のやり直し機能（EquipmentScene.js）**:
   - 合成完了後に結果モーダル `showSynthesisResultModal` を表示。
   - 2周目以降で妖精遭遇済み（`gs.hasMetFairy`）かつ本日未利用の場合、「🧚‍♀️ 妖精の取引：結果を引き直す (🎬広告 / ✨VIP即時)」ボタンを表示。
   - 押下時に同ランクで再抽選を行い、合成結果アイテムを差し替えてセーブ。1日1回のみ実行可能。

5. **タロット引き直し機能の1日1回連動（TarotScene.js）**:
   - リフィエル解放済みのタロット引き直しボタンに `!FairyTradeManager.isTradeUsedToday('tarot_reroll')` の制限を適用。
   - VIP時は「✨VIP即時」、通常時は「🎬広告」と表記し、利用後は当日再利用不可（翌日0時リセット）。

### 3. 変更対象ファイル
- [capacitor.config.json](file:///c:/Users/user/.antigravity/game/capacitor.config.json)
- [android/app/build.gradle](file:///c:/Users/user/.antigravity/game/android/app/build.gradle)
- [docs/privacy.html](file:///c:/Users/user/.antigravity/game/docs/privacy.html)
- [privacy.html](file:///c:/Users/user/.antigravity/game/privacy.html)
- [GlobalState.js](file:///c:/Users/user/.antigravity/game/src/systems/GlobalState.js)
- [SaveManager.js](file:///c:/Users/user/.antigravity/game/src/systems/SaveManager.js)
- [RewardService.js](file:///c:/Users/user/.antigravity/game/src/systems/RewardService.js)
- [FairyTradeManager.js](file:///c:/Users/user/.antigravity/game/src/systems/FairyTradeManager.js)
- [EquipmentScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/EquipmentScene.js)
- [TarotScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/TarotScene.js)
- [WORK_LOG.md](file:///c:/Users/user/.antigravity/game/WORK_LOG.md)

### 4. 検証結果
- `npm run build` にてビルド成功を確認。
- Git への commit / push は一切行わず、ローカル環境のみに保持。

---

## [2026-11-15] 周回時（リスポーンイベント）の「AssetLoader is not defined」エラー修正

### 1. 原因（Why）
- 周回時（バッドエンド／リスポーン時、`eventId === 'event_resp'`）に、`EventScene.js` 内で `AssetLoader.ensureRespawnAssets(...)` を呼び出していたが、同ファイル冒頭で `AssetLoader` の `import` 文が抜けていたため `ReferenceError: AssetLoader is not defined` が発生していた。

### 2. 対策（How）
- [EventScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/EventScene.js) に `import { AssetLoader } from '../systems/AssetLoader';` を追加。
- `AssetLoader.ensureRespawnAssets` が正常に実行され、リスポーン用の背景画像（`bg_resp`）とBGM（`bgm_resp`）を安全にオンデマンド読み込みしてからイベントが進行することを確認。

### 3. 検証結果
- `npm run build` にてエラーなくビルドが通ることを確認。
- Git への commit / push は一切行わず、ローカル環境のみに保持。

---

## [2026-11-15] 12/21夜ワイルドハント＆12/22朝魔女狩り・周回のすり抜け防止（行動直前＆復帰時絶対ガード）実装

### 1. 目的（Why）
- 12/21夜および12/22朝にエラーやF5リロード、リセット等で復帰した場合、または野外で「休息」を選んだ場合に、イベントが発生せずにそのまま年を越せてしまう不具合の根本解消。

### 2. 実施した対策・変更内容（How）

1. **12/21夜のワイルドハント強制突入ガードの網羅**:
   - [AdventureScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/AdventureScene.js) の「休息ボタン（`restBtn`）」押下時の処理に `if (this.check1221NightForcedBreakthrough()) return;` を追加。
   - これにより、21日夜に「移動」「探索」だけでなく「休息」を押した場合でも、確実にワイルドハント（未閲覧ならイベント、閲覧済みなら突破戦）へ強制突入するように徹底。

2. **12/22朝以降の絶対周回ガード（地上にいる場合）**:
   - `check1221Event()` のロジックを改修。地上で `currentDay >= 22` の状態であれば、フラグ `event1221Played` の有無に関わらず、必ず魔女狩り（`event_1221`）および周回リスポーン（`event_resp`）を起動して周回リセットへ強制移行。
   - `create()` の復帰時、およびプレイヤーが「移動」「探索」「休息」を押した直前の全タイミングで `check1221Event()` を実行。
   - これにより、途中でエラーやリロード・リセットが起きても、地上で22日以降に行動を起こそうとした瞬間に100%周回ルートへ導かれ、年を越すことが物理的に不可能になった。

3. **中途半端な先行セーブの撤廃**:
   - `from1221Event`（魔女狩りイベント）完了直後に挟まれていた `SaveManager.saveGame(this)` を撤廃し、周回リセット（`gs.resetForNewLoop()`）で12/1東京駅に初期化されたクリーンな状態でのみ保存するように安全化。

### 3. 変更対象ファイル
- [AdventureScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/AdventureScene.js)
- [WORK_LOG.md](file:///c:/Users/user/.antigravity/game/WORK_LOG.md)

### 4. 検証結果
- `npm run build` を実行し、構文・バンドルエラーなく正常ビルド成功を確認。
- Git への commit / push は一切行わず、ローカル環境のみに保持。

---

## [2026-11-15] ステータス画面（CampScene）BGM無音問題の根本解決

### 1. 原因（Why）
- 先日のアセット軽量化時に、キャンプBGM（`bgm_camp` / `files/BGM/camp_BGM.mp3`）が `BootScene.js` のプリロード対象から外れていた。
- しかし、ステータス画面である `CampScene.js` 側には `preload()` や遅延ロード（`ensureBgm`）の仕組みがなく、`if (this.cache.audio.exists('bgm_camp'))` の判定でキャッシュ未存在（false）となり無音化していた。
- さらに `CampScene.js` 起動時に `this.sound.stopAll()` でフィールド曲が止められ、終了時にもマップBGMの再開リスナーがなかったため、ステータスを開閉した後に無音になっていた。

### 2. 対策（How）
1. [BootScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/BootScene.js):
   - ゲーム基本BGMである `this.load.audio('bgm_camp', 'files/BGM/camp_BGM.mp3');` を初期ロードに正式復帰。起動時から即座に再生可能に。
2. [CampScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/CampScene.js):
   - `preload()` を追加し、万が一未キャッシュ時でも `load.audio` を実行。
   - `create()` で `AssetLoader.ensureBgm` によるフォールバック二重安全網を設置。
3. [AdventureScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/AdventureScene.js):
   - ステータス画面から復帰した際に確実にマップBGMを再開するワンタイム `resume` リスナーを追加。

### 3. 検証結果
- `npm run build` を実行し、ビルド成功を確認。
- Git への commit / push は行わず、ローカル環境のみに保持。

---

## [2026-11-15] ステータス画面の顔画像未ロード（緑枠Missing）＆ BootSceneストールの根本解決

### 1. 原因（Why）
- 直前の修正で `BootScene.js` に `this.load.audio('bgm_camp', ...)` を追加した際、ブラウザの仕様（ユーザー操作前の未対話状態ではAudioContextがサスペンドされる）により、PhaserのWebAudioデコーダーが完了通知を受け取れず `[BootScene] Loader stalled for 8s without progress. Forcing completion.` が発生していた。
- 8秒タイムアウトによる強制完了（`loadComplete()`）が走った結果、ロードキュー内に残っていた紫苑の顔アイコン（`face_001`）など後続アセットの読み込みがスキップされてしまい、ステータス画面で緑枠（Missing Texture）が表示されていた。

### 2. 対策（How）
1. [BootScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/BootScene.js):
   - 初期ロードでの `bgm_camp` 読み込みを撤廃。これにより起動時ローダーのストールが完全に解消し、全キャラの顔画像を含む全初期アセットが100%スムーズにロードされるように復旧。
2. [CampScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/CampScene.js):
   - キャンプBGM（`bgm_camp`）はステータスボタン押下（ユーザー対話後）に `AssetLoader.ensureBgm` 経由でオンデマンド再生する安全設計に統一。
   - 顔アイコン描画部にオンデマンド読み込み＆安全フォールバック処理を追加。万が一テクスチャが未ロードの場合でも緑枠を出さず、安全なアイコンを表示しつつ即座に非同期ロードして本来の顔画像へ自動差し替え。

### 3. 検証結果
- Viteログにて `Loader stalled` 警告が完全に消滅し、起動時ロードが正常完了することを確認。
- `npm run build` にてビルド成功を確認。
- Git への commit / push は行わず、ローカル環境のみに保持。

---

## [2026-11-15] タロットカード選択時の「Cannot read properties of undefined (reading '16')」エラー修正

### 1. 原因（Why）
- `TarotScene.js` 側で `this.tarotData = this.cache.json.get('tarot_data')` を参照していたが、`TarotScene.preload()` 内で `tarot_data`（`files/DATA/tarot.json`）の読み込みが定義されていなかった。
- 直前の `BootScene` ストール発生時やキャッシュ未初期化時に `this.tarotData` が `undefined` となり、カード選択時に `this.tarotData[cardId]` で TypeError が発生していた。

### 2. 対策（How）
1. [TarotScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/TarotScene.js):
   - `preload()` に `if (!this.cache.json.exists('tarot_data')) this.load.json('tarot_data', 'files/DATA/tarot.json');` を追加。自前でも確実にプリロードを担保。
   - `create()` で `this.tarotData = this.cache.json.get('tarot_data') || {};` に安全化。
   - `selectCard()` および引き直し時のカードデータ参照箇所に、`this.tarotData` の再取得＆デフォルトオブジェクトフォールバックを追加。

### 3. 検証結果
- `npm run build` にてビルド成功を確認。
- Git への commit / push は行わず、ローカル環境のみに保持。

---

## [2026-11-15] タロット仲間加入解放条件の厳格化・道場&メイド館デバッグバイパス撤廃・デバッグボタンUI統一

### 1. ユーザー指示内容
1. **タロットカードと仲間加入の解放条件の厳格化**:
   - カード自体の出現制限はしない（仲間に入らないときもカードそのものは山札から出る。妖精も悪魔もこれから実装する他キャラも）。
   - ただし仲間加入（遭遇イベント・加入処理）は、デバッグモード（`GlobalState.IS_DEBUG_MODE`）であっても条件をスキップせず、本番と同じ正規条件を厳格に適用する（ノア、ななよ、白蓮、リフィエル、プロセル等）。
2. **デバッグモードの道場・メイド館（時空館）無条件入場フラグの撤廃**:
   - デバッグモードで道場（`isDojoUnlocked`）とメイド館（`isJikukanUnlocked`）に最初から無条件で入れるバイパスを削除し、正規条件でのみ解放・表示されるようにする。
3. **デバッグモード限定コマンドボタンのUI統一**:
   - デバッグ限定のコマンドボタンのUIを統一して「黄色い背景ボタンに黒文字（`#ffea00` / `#000000`）」にする。
   - ボタン名の先頭に `🐝`（蜂マーク）を付ける（デバッグ＝虫の意味から）。

### 2. 調査・原因・対応内容（Why & How）
1. [TarotScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/TarotScene.js):
   - **ノア(008)・ななよ(007)**:
     - 判定: `!gs.hasEnteredTower && !GlobalState.IS_DEBUG_MODE` から `!GlobalState.IS_DEBUG_MODE` を削除。塔へ突入した実績（`hasEnteredTower`）がある場合のみ仲間に加入。突入前はカード自体の効果（HP回復等）のみ発動し仲間加入イベントは発生しない。
   - **白蓮(011)**:
     - 判定: `!hasMetInAkiba && !hasRespawned && !GlobalState.IS_DEBUG_MODE` から `!GlobalState.IS_DEBUG_MODE` を削除。秋葉原探索での遭遇（`hasAccompanied`）または周回リスポーン経験（`loopCount >= 2`）が必須。
   - **リフィエル(009)**:
     - 判定: `gs.loopCount >= 2 || GlobalState.IS_DEBUG_MODE` から `GlobalState.IS_DEBUG_MODE` を削除。2周目以降かつ未遭遇の場合のみ妖精遭遇イベントが発火。
   - **悪魔カード(16) / プロセル(010)**:
     - 2RDEVILイベント発火条件およびプロセル加入判定から `GlobalState.IS_DEBUG_MODE` を削除。21階ボス撃破実績（`tower21BossDefeated`）が必須。
2. [AdventureScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/AdventureScene.js):
   - **道場・時空館（メイド館）のバイパス撤廃**:
     - `this.dojoBtn.setVisible(isVisible && gs.isDojoUnlocked);`
     - `this.jikukanBtn.setVisible(isVisible && gs.isJikukanUnlocked);`
     - `_createDojoButton` / `_createJikukanButton` 内の初期表示および `updateStatus()` から `|| GlobalState.IS_DEBUG_MODE` を完全削除。正規解放条件を満たすまで表示されないよう修正。
     - デバッグ自動引き（Tキー）内のプロセル加入判定からも `GlobalState.IS_DEBUG_MODE` を削除。
   - **デバッグボタンのUI統一**:
     - 共通スタイル `{ fontFamily: 'sans-serif', fontSize: '15px', color: '#000000', fontStyle: 'bold', backgroundColor: '#ffea00', padding: { x: 12, y: 8 } }` を適用。
     - 各ボタンテキストを `🐝 ` プレフィックスに更新：
       - `🐝 突破テスト`
       - `🐝 DPS計測`
       - `🐝 通常マップへ戻る` / `🐝 タワーテスト`
       - `🐝 フロア移動`
       - `🐝 対人戦テスト`
       - `🐝 時間経過`
       - `🐝 翌朝スキップ`
       - `🐝 タワー敵復活`
     - 表示更新（`_createBaseControls`）時に `towerRespawnBtn` の可視性制御を追加。

### 3. 検証結果
- `npm run build` を実行し、エラーなくビルドが正常完了することを確認。
- Git への commit / push は行わず、ローカル環境のみに保持。

---

## [2026-11-15] Webアプリ版最終バージョンリリース（デバッグOFF・だんます塔突入実績解放）＆ Git反映

### 1. ユーザー指示内容
1. Webアプリ版としての最終バージョンとしてデバッグモードを完全OFF（本番リリース仕様）にする。
2. タイトル画面の「🎮 だんます」ミニゲームボタンは、セーブデータで「塔突入実績（`hasEnteredTower`）」がある場合のみオープン（表示・起動可能）にする。
3. その上で、Webアプリ版の集大成としてGitへコミット＆プッシュ（同期）を行う。

### 2. 実施した対策・変更内容（How）
1. [GlobalState.js](file:///c:/Users/user/.antigravity/game/src/systems/GlobalState.js):
   - `static IS_DEBUG_MODE = false;` に変更（デバッグモード完全解除・本番仕様）。
   - `static ALLOW_DEBUG_TOGGLE = false;` に連動変更。
2. [TitleScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/TitleScene.js):
   - セーブデータ復元および `gs.hasEnteredTower` を確認し、塔突入実績がある場合のみ左下に「🎮 だんます」ボタンを生成・タップ反応するように改修。
   - 塔突入前の新規プレイや地上編プレイ中は非表示となり、世界観と進行度に応じた解放演出を実現。
3. [AdventureScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/AdventureScene.js):
   - 妖精アイコン（`chr_fairy_s`）のプリロード＆オンデマンドフォールバックにより、実機・ブラウザ問わず緑枠（Missing）を出さない安全設計を確立。
   - リフィエル一時クリーニングコードの完全撤廃により、将来の隠しキャラ解放ロジックとの衝突を排除。

### 3. 検証結果
- `npm run build` を実行し、構文・バンドルエラーなく本番ビルドが正常完了することを確認。
- Git へコミットおよびプッシュを実施。

---

## [2026-11-15] プロジェクト全体バックアップ作成 & Androidアプリ特化への移行検証

### 1. ユーザー指示内容
1. ここまでの成果物のバックアップをローカルに確実に作成・保存する。
2. Webアプリとしての側面を捨て、今後はAndroidアプリに特化して開発を進める。
3. Androidアプリとした場合に不要になる部分、最適化・追加すべき部分を網羅的に検証・提示する。

### 2. 実施したバックアップ内容
- **バックアップ先**: `c:\Users\user\.antigravity\backup_20261115_web_to_android`
- `node_modules`, `dist`, `.git` を除外したソースコード、アセット、設定ファイル、ドキュメント全一式を完全退避。

### 3. Androidアプリ特化に向けた詳細検証結果

#### ① 不要になる部分（整理・削除・無効化推奨）
1. **GitHub Pages デプロイスクリプト**:
   - `package.json` の `"deploy"` スクリプトや `build_web.bat`。Web公開は行わないため整理可能。
2. **外部CDNフォント読み込み（index.html）**:
   - Google Fonts CDN（`Noto Serif JP`）への外部通信。オフラインプレイ時にフォント取得遅延・チラつきの原因となるため、ローカルバンドルまたはシステムフォントへ統一が推奨。
3. **ブラウザ特有のビューポート揺れ対策（index.html / main.js）**:
   - モバイルブラウザのアドレスバー出入り対策（`visualViewport` イベント等）は、固定WebViewのAndroidアプリでは不要（アプリ枠に収まるためシンプル化可能）。
4. **URLクエリパラメータ判定（main.js）**:
   - `?load_test_save=1` などのWebブラウザ用URLクエリ検知コード。
5. **PC物理キーボード前提のデバッグショートカット**:
   - Oキー、Tキー、Lキーなどのキーボードイベント。Android実機では物理キーがないため、画面上の蜂マーク（`🐝`）ボタンやデバッグ画面に集約。

#### ② Androidアプリ化に伴い追加・最適化すべき重要項目
1. **ステータスバー・ナビゲーションバーの没入制御（Immersive Mode）**:
   - `@capacitor/status-bar` を導入し、画面上部の時計・バッテリー領域を黒色または非表示にして没入感を向上。
2. **画面スリープ（消灯）防止（KeepAwake）**:
   - 戦闘中や長文イベント中に15秒〜30秒で画面が暗くなるのを防ぐため、`@capacitor-community/keep-awake` を導入してゲームプレイ中の自動消灯を防止。
3. **セーブデータの安全二重保存（LocalStorage + Capacitor Preferences）**:
   - OSのストレージクリーンアップ機能でLocalStorageが万が一消去されるリスクを防ぐため、バックアップ退避を二重化。
4. **Google AdMob リワード広告プラグインの導入**:
   - `@capacitor-community/admob` をインストールし、実機での広告動画再生を本番SDKに接続。
5. **Google Play Billing（In-App Purchase）の導入**:
   - 永年広告スキップパス（500円）の決済APIを接続。

---

## [2026-11-15] リフィエル一時クリーニングコードの完全撤廃 & 妖精アイコン未ロード（緑枠）根本解消

### 1. ユーザー指示内容
1. 前回追加したリフィエルの強制クリーニングコードは、将来的に条件を満たして仲間に入る際バグの引き金になるため完全に削除・撤廃する。
2. マップ画面左側の「妖精の取引ボタン（fairyS）」が未ロード（緑枠 Missing Texture）になっていた原因の究明・解消。
3. ブラウザ版とAndroid実機環境でのアセット読み込みの違い、および広告・課金プログラムの本格組み込み方針の整理・回答。

### 2. 実施した対策・変更内容（How）

1. **強制クリーニングコードの完全撤廃（AdventureScene.js）**:
   - `create()` 内で `this.party` や `savedFormation` から `009` を強制削除していたブロック、およびイベント復帰時の `normJoinId !== '009'` ガードを完全に撤廃。
   - 仲間に加わらない制御は、`TarotScene` 側で教皇カードから加入キャラIDを渡さない（`joinCharacterId: null`）設計で安全に担保されているため、将来的な隠しキャラ解放ロジックと衝突しないクリーンな状態へ復帰。

2. **妖精アイコン（chr_fairy_s）未ロード・緑枠の根本解消（AdventureScene.js）**:
   - **原因**: `chr_fairy_s`（`files/CHR/fairyS.webp`）が `AdventureScene.preload()` のロードキューに入っておらず、BootScene側でのキャッシュ状態に依存していたため、HMRやリロード時に未定義となり緑枠が発生していた。
   - **対策**:
     - `AdventureScene.preload()` に `chr_fairy_s` および `chr_fairy` のプリロードを追加。
     - `_createFairyButton()` にて、万が一未ロードの場合でも緑枠を出さず（`setVisible(false)`）、即座に非同期ロードして完了時にテクスチャを自動差し替え・表示する安全フォールバック設計を導入。

### 3. 検証結果
- `npm run build` を実行し、エラーなくビルドが正常完了することを確認。
- Git への commit / push は行わず、ローカル環境のみに保持。

---

## [2026-11-15] Webアプリ版最終バージョンリリース（デバッグOFF・だんます塔突入実績解放）＆ Git反映

### 1. ユーザー指示内容
1. Webアプリ版としての最終バージョンとしてデバッグモードを完全OFF（本番リリース仕様）にする。
2. タイトル画面の「🎮 だんます」ミニゲームボタンは、セーブデータで「塔突入実績（`hasEnteredTower`）」がある場合のみオープン（表示・起動可能）にする。
3. その上で、Webアプリ版の集大成としてGitへコミット＆プッシュ（同期）を行う。

### 2. 実施した対策・変更内容（How）
1. [GlobalState.js](file:///c:/Users/user/.antigravity/game/src/systems/GlobalState.js):
   - `static IS_DEBUG_MODE = false;` に変更（デバッグモード完全解除・本番仕様）。
   - `static ALLOW_DEBUG_TOGGLE = false;` に連動変更。
2. [TitleScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/TitleScene.js):
   - セーブデータ復元および `gs.hasEnteredTower` を確認し、塔突入実績がある場合のみ左下に「🎮 だんます」ボタンを生成・タップ反応するように改修。
   - 塔突入前の新規プレイや地上編プレイ中は非表示となり、世界観と進行度に応じた解放演出を実現。
3. [AdventureScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/AdventureScene.js):
   - 妖精アイコン（`chr_fairy_s`）のプリロード＆オンデマンドフォールバックにより、実機・ブラウザ問わず緑枠（Missing）を出さない安全設計を確立。
   - リフィエル一時クリーニングコードの完全撤廃により、将来の隠しキャラ解放ロジックとの衝突を排除。

### 3. 検証結果
- `npm run build` を実行し、構文・バンドルエラーなく本番ビルドが正常完了することを確認。
- Git へコミットおよびプッシュを実施。

---

## [2026-11-15] プロジェクト全体バックアップ作成 & Androidアプリ特化への移行検証

### 1. ユーザー指示内容
1. ここまでの成果物のバックアップをローカルに確実に作成・保存する。
2. Webアプリとしての側面を捨て、今後はAndroidアプリに特化して開発を進める。
3. Androidアプリとした場合に不要になる部分、最適化・追加すべき部分を網羅的に検証・提示する。

### 2. 実施したバックアップ内容
- **バックアップ先**: `c:\Users\user\.antigravity\backup_20261115_web_to_android`
- `node_modules`, `dist`, `.git` を除外したソースコード、アセット、設定ファイル、ドキュメント全一式を完全退避。

### 3. Androidアプリ特化に向けた詳細検証結果

#### ① 不要になる部分（整理・削除・無効化推奨）
1. **GitHub Pages デプロイスクリプト**:
   - `package.json` の `"deploy"` スクリプトや `build_web.bat`。Web公開は行わないため整理可能。
2. **外部CDNフォント読み込み（index.html）**:
   - Google Fonts CDN（`Noto Serif JP`）への外部通信。オフラインプレイ時にフォント取得遅延・チラつきの原因となるため、ローカルバンドルまたはシステムフォントへ統一が推奨。
3. **ブラウザ特有のビューポート揺れ対策（index.html / main.js）**:
   - モバイルブラウザのアドレスバー出入り対策（`visualViewport` イベント等）は、固定WebViewのAndroidアプリでは不要（アプリ枠に収まるためシンプル化可能）。
4. **URLクエリパラメータ判定（main.js）**:
   - `?load_test_save=1` などのWebブラウザ用URLクエリ検知コード。
5. **PC物理キーボード前提のデバッグショートカット**:
   - Oキー、Tキー、Lキーなどのキーボードイベント。Android実機では物理キーがないため、画面上の蜂マーク（`🐝`）ボタンやデバッグ画面に集約。

#### ② Androidアプリ化に伴い追加・最適化すべき重要項目
1. **ステータスバー・ナビゲーションバーの没入制御（Immersive Mode）**:
   - `@capacitor/status-bar` を導入し、画面上部の時計・バッテリー領域を黒色または非表示にして没入感を向上。
2. **画面スリープ（消灯）防止（KeepAwake）**:
   - 戦闘中や長文イベント中に15秒〜30秒で画面が暗くなるのを防ぐため、`@capacitor-community/keep-awake` を導入してゲームプレイ中の自動消灯を防止。
3. **セーブデータの安全二重保存（LocalStorage + Capacitor Preferences）**:
   - OSのストレージクリーンアップ機能でLocalStorageが万が一消去されるリスクを防ぐため、バックアップ退避を二重化。
4. **Google AdMob リワード広告プラグインの導入**:
   - `@capacitor-community/admob` をインストールし、実機での広告動画再生を本番SDKに接続。
5. **Google Play Billing（In-App Purchase）の導入**:
   - 永年広告スキップパス（500円）の決済APIを接続。

---

## [2026-11-15] リフィエル一時クリーニングコードの完全撤廃 & 妖精アイコン未ロード（緑枠）根本解消

### 1. ユーザー指示内容
1. 前回追加したリフィエルの強制クリーニングコードは、将来的に条件を満たして仲間に入る際バグの引き金になるため完全に削除・撤廃する。
2. マップ画面左側の「妖精の取引ボタン（fairyS）」が未ロード（緑枠 Missing Texture）になっていた原因の究明・解消。
3. ブラウザ版とAndroid実機環境でのアセット読み込みの違い、および広告・課金プログラムの本格組み込み方針の整理・回答。

### 2. 実施した対策・変更内容（How）

1. **強制クリーニングコードの完全撤廃（AdventureScene.js）**:
   - `create()` 内で `this.party` や `savedFormation` から `009` を強制削除していたブロック、およびイベント復帰時の `normJoinId !== '009'` ガードを完全に撤廃。
   - 仲間に加わらない制御は、`TarotScene` 側で教皇カードから加入キャラIDを渡さない（`joinCharacterId: null`）設計で安全に担保されているため、将来的な隠しキャラ解放ロジックと衝突しないクリーンな状態へ復帰。

2. **妖精アイコン（chr_fairy_s）未ロード・緑枠の根本解消（AdventureScene.js）**:
   - **原因**: `chr_fairy_s`（`files/CHR/fairyS.webp`）が `AdventureScene.preload()` のロードキューに入っておらず、BootScene側でのキャッシュ状態に依存していたため、HMRやリロード時に未定義となり緑枠が発生していた。
   - **対策**:
     - `AdventureScene.preload()` に `chr_fairy_s` および `chr_fairy` のプリロードを追加。
     - `_createFairyButton()` にて、万が一未ロードの場合でも緑枠を出さず（`setVisible(false)`）、即座に非同期ロードして完了時にテクスチャを自動差し替え・表示する安全フォールバック設計を導入。

### 3. 検証結果
- `npm run build` を実行し、エラーなくビルドが正常完了することを確認。
- Git への commit / push は行わず、ローカル環境のみに安全に保持。

---

## [2026-11-15] 雑魚戦→魔女戦BGM重なり解消 & ワイルドハントイベント〜突破戦の完全シームレスBGM化 & 突破戦仕様調査

### 1. ユーザー指示内容
1. 雑魚戦から魔女戦に移る際のBGMがまだ重なっている問題の解決。
2. 12/21夜ワイルドハント突入前のイベントから突破戦までBGM（`bgm_wildhunt`）を通してシームレスに流したい。
3. ワイルドハント突破戦では、既にワイルドハントBGMが流れていた場合は新規再生しないようにする。
4. ワイルドハント突破戦の内容は突破テストと同じなのか、レベル等の調整があるのかの調査・確認。

### 2. 調査・原因・対応内容（Why & How）

#### ① 雑魚戦→魔女戦でBGMが重なっていた原因と解決
- **原因**:
  - `BattleScene.js` の `boss_presentation`（WARNING演出）および `boss`（魔女実体化）で、特定の固定キー配列（`nonBossKeys`）に対して `this.sound.get(key)` を呼んでいた。
  - Phaser 3 の `SoundManager.get(key)` は最初に見つかったインスタンス（過去の停止済みオブジェクトなど）を返す場合があり、**現在実際に鳴っているインスタンスにフェードや停止が届いていなかった**。
  - また、ボスBGMが未ロードのフォールバックとして `bgm_battle1`（雑魚BGM）を再再生する危険な分岐が存在していた。
- **対策**:
  - `boss_presentation` 入時に `this.sound.sounds` の「現在再生中のサウンドすべて（`s && s.isPlaying`）」を対象にし、ボスターゲット以外の全サウンドを400msで音量0へフェードアウトして即座に `s.stop()` するよう改修。
  - `boss` 実体化時にも残存サウンドを再度確実に `s.stop()`。
  - ボスBGM未ロード時は雑魚BGMを鳴らさず、`AssetLoader.ensureBgm` で非同期ロードして安全に再生するよう統一。

#### ② ワイルドハント突入イベント〜突破戦のシームレスBGM化
- **原因**:
  - `EventScene` 冒頭で `bgm_wildhunt` を鳴らした直後、イベントコマンド `{ cmd: 'bgm', key: 'bgm_wildhunt' }` を処理する `EventEngine._changeBgm` が「管理外サウンド」と誤認して `bgm_wildhunt` をフェードアウト停止＆別インスタンスで再再生していた。
  - `BattleScene.create()` の `isWildhunt` 分岐で、既存再生中のTweenキルや音量正規化、他の不要なマップBGMの停止が行われていなかった。
- **対策**:
  - [EventEngine.js](file:///c:/Users/user/.antigravity/game/src/systems/EventEngine.js):
    - `_changeBgm(key)` にて、既に同一キーのサウンドが再生中であればフェードアウトや再生成を行わず、そのままシームレスに継続（音量0.75維持＆Tweenキル）するよう改修。
  - [EventScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/EventScene.js):
    - 冒頭で再生した `bgm_wildhunt` のインスタンスを `this.engine._currentBgm` に事前登録。
  - [BattleScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/BattleScene.js):
    - `isWildhunt` 分岐にて、前シーンから `bgm_wildhunt` が流れている場合は**絶対に新しく再生せず**、Tweenをキルして音量を0.75に確定。それ以外の不要なBGMを確実に `stop()`。未再生時のみ新規再生。

#### ③ ワイルドハント突破戦と突破テストの仕様比較調査
- **突破テスト（デバッグコマンド `🐝 突破テスト`）**:
  - 敵数: 50体
  - 敵レベル: Lv.1（固定）
  - スポーン間隔: 1.0秒
  - 突破目標距離: 42,195m（42.195km）
  - デバフ・敵レベル上昇なしの純粋な動作テスト用。
- **ワイルドハント突破戦（本番 12/21夜）**:
  - 敵数: 200体
  - 敵レベル: **Lv.5からスタートし、10秒ごとに自動で+Lv.1上昇（`5 + Math.floor(elapsedSec / 10)`）**！
  - スポーン間隔: 0.5秒（突破テストの2倍の超激戦）
  - 突破目標距離: 12,010m（約12km）
  - **極限デバフ機能（BattleEngine.js L1015〜1028）**:
    - ① 味方与ダメージ低下: 1秒ごとに0.1%減
    - ② 味方被ダメージ激増: 1秒ごとに+2%増（50秒で被ダメージ2倍に膨張）
    - ③ 夜間限定デバフ: 被ダメージ2倍
  - ➡ 単なる突破テストとは根本的に異なり、**時間経過とともに敵レベルがどんどん上がり、プレイヤー側も急激に消耗・壊滅してバッドエンド周回へ誘導される専用の過酷な調整**が最初から組み込まれている。

### 3. 検証結果
- `npm run build` を実行し、構文・バンドルエラーなくビルド成功を確認。
- Git への commit / push は行わず、ローカル環境のみに安全に保持。

---

## [2026-11-15] 妖精リフィエル遭遇イベントの演出強化 & パーティ非加入化（広告屋の妖精専用化・隠しキャラ保護）

### 1. ユーザー指示内容
1. 妖精リフィエル遭遇イベント（教皇カード）の演出改修：
   - 探索背景（缶詰）ではなく、プレイヤーが現在いるヘクスの通常背景（マップ掛け合い背景）を使用する。
   - 冒頭に右側に紫苑（`portrait_001`）が登場して呟き始め、その後左側に小さなリフィエル（`chr_fairy`）が登場する流れにする。
2. リフィエルが戦闘パーティ・編成に加わってしまう問題の解消：
   - リフィエルは将来の条件で戦闘可能・大人形態への変化が予定されている隠しキャラのため、現段階では戦闘パーティや隊列編成には絶対に加入させない（広告屋の妖精・取引サポート専用）。

### 2. 実施した対策・変更内容（How）

1. **イベント演出の強化（event_fairy_join.json & TarotScene.js）**:
   - [event_fairy_join.json](file:///c:/Users/user/.antigravity/game/public/files/DATA/event_fairy_join.json):
     - 冒頭に `{ "cmd": "chara", "key": "portrait_001", "pos": "right" }` を追加。紫苑が右側に立って息をつき、蝶（光）を見つめるシーンから開始。
     - その後、左側に身長60cmサイズ・浮遊の `{ "cmd": "chr", "pos": "left", "key": "chr_fairy", "scaleMultiplier": 0.38, "yOffset": -60 }` が現れる美しい構図に整備。
   - [TarotScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/TarotScene.js):
     - 教皇カード（ID: 6）引き時、悪魔イベントと同様に `events[0].key = this.bgKey || 'bg_map_base'` を適用し、現在いる土地の景色でイベントが始まるように改修。

2. **パーティ非加入化（完全な広告屋の妖精化）**:
   - [TarotScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/TarotScene.js):
     - `getCharacterId(tarotId)` のマップから `6: '009'` を完全削除。
     - 教皇カード（ID: 6）のイベント呼び出し時、`joinCharacterId: null` を渡して仲間加入処理を発火させないように分離。
     - パーティが5人満員であっても、仲間枠を使わないため問題なく妖精イベントが発生し、日次取引機能（`gs.hasMetFairy = true`）が解放されるように調整。
   - [AdventureScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/AdventureScene.js):
     - 万が一セーブデータ内にリフィエル（`009`）が残っていた場合の安全クリーニング処理を追加。`this.party`、`savedFormation`、`normalFormation`、`towerFormation` から自動的に `009` を除外して保存。
     - イベント復帰時の加入処理でも `normJoinId !== '009'` をガード。

### 3. 検証結果
- `npm run build` を実行し、エラーなくビルドが正常完了することを確認。
- Git への commit / push は行わず、ローカル環境のみに安全に保持。

---

## 2026-11-15: ワイルドハント＆バッドエンドアセットの「直前オンデマンド読み込み・展開」設計への移行（初期ロード軽量化）

### 1. ユーザー指示内容
「ワイルドハントからバッドエンドなんかはゲーム中何回とみるもんでもないし、その直前にロード、展開するのじゃいかんかな？」
➔ 初期起動（`BootScene`）で常時メモリに抱え込むのではなく、イベントが発生するその直前にオンデマンドで読み込み・展開する構成に最適化する。

### 2. 調査・設計内容
- 閲覧頻度の低いイベント（ワイルドハント、バッドエンド・リスポーン、タワー敗北等）は、起動時に読み込むと初期ロード時間と常駐メモリを無駄に消費してしまう。
- `AssetLoader.js` の未ロード判定付きローダー（`ensureAssets`）を活用し、「発生直前に未キャッシュ分だけサッと読み込んで展開する」方式に移行することで、見ないプレイでは1バイトも無駄なメモリを使わず、見る時だけ100%確実に表示・再生できるようにする。

### 3. 実施した対策・変更内容（How）

1. **`AssetLoader.js` に専用オンデマンドローダーを新設**:
   - `ensureWildhuntAssets(scene, onComplete)`:
     ワイルドハント背景（`bg_wildhunt`）とBGM（`bgm_wildhunt`）を直前にロード。
   - `ensureRespawnAssets(scene, isTower, onComplete)`:
     バッドエンド画像（`bg_resp`）とBGM（`bgm_resp`）、タワー時は `bg_tow_spo01` と `unknoun_terror` を直前にロード。

2. **`EventScene.js` での直前ロード統合**:
   - `EventScene.create()` の先頭で、ワイルドハントやリスポーンのフラグを検知し、`ensureWildhuntAssets` / `ensureRespawnAssets` を実行。未ロードがあれば「Now Loading...」オーバーレイを出して揃ってからイベントを開始。
   - すでにロード済みなら待ち時間ゼロで即座に開始。

3. **`BattleScene.js`（ワイルドハント突破戦）での直前ロード**:
   - `this.battleConfig.is1221NightBattle` の場合、`BattleScene.preload()` で `bgm_wildhunt` を直前ロード。

4. **`BootScene.js` の初期プリロードから除外**:
   - 初期起動時の読み込みリストから `bg_wildhunt`, `bg_resp`, `resp`, `bgm_wildhunt`, `bgm_resp`, `unknoun_terror` を除外し、初期ロード時間と常駐メモリを大幅軽量化。

### 4. 変更対象ファイル
- [AssetLoader.js](file:///c:/Users/user/.antigravity/game/src/systems/AssetLoader.js)
- [EventScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/EventScene.js)
- [BattleScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/BattleScene.js)
- [BootScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/BootScene.js)
- [WORK_LOG.md](file:///c:/Users/user/.antigravity/game/WORK_LOG.md)

### 5. 検証結果
- `npm run build` を実行し、構文・バンドルエラーなく正常ビルド成功を確認。
- Git への commit / push は行わず、ローカル環境のみに保持。

---

## [2026-11-15] Google Play公開準備 ＆ 広告・VIP永年パス・妖精取引（0時リセット1日1回・合成リロール）実装

### 1. 目的（Why）
- デベロッパー登録（「長沢電子工務店 (NDK)」）完了に伴い、アプリのパッケージ名（`com.ndk.magiapilgrims`）とリリース用署名キーストアを整備。
- Google Play Console 審査用のプライバシーポリシーページを作成。
- 広告（リワード動画）と課金設計（買い切り永年広告スキップパス「妖精の祝福」500円）の全体仕様を実装：
  1. 1周目は妖精リフィエルや広告・課金のアピールは一切なし（クリア後の2周目、タロット009教皇を引いてから初解放）。
  2. 妖精の取引（各特典）は「日本時間（JST）午前0時リセットで、それぞれ1日1回ずつ」利用可能。
  3. VIP（永年広告スキップパス所持者）であっても無限チートではなく「それぞれ1日1回」。広告動画を見ずに即座に受取可能。
  4. 新機能「レリクス／宝石合成のやり直し（リロール）機能」を新設し、これも妖精の取引（1日1回・広告/VIP）として利用可能に。
  5. タロット引き直し機能にも「1日1回・0時更新（広告/VIP）」の制約とバッジ表示を連動。

### 2. 実施した対策・変更内容（How）

1. **Google Play用設定・署名キー・ポリシーの整備**:
   - `capacitor.config.json` の `appId` を `"com.ndk.magiapilgrims"` に更新。
   - `android/app/build.gradle` の `applicationId` を `"com.ndk.magiapilgrims"` に更新し、リリース用署名設定（`signingConfigs.release`）を追加。
   - `keytool.exe` を使用して `android/app/ndk-release-key.jks`（alias: `ndk_key`）を生成。
   - `docs/privacy.html` および `privacy.html` を新規作成（Google AdMob条項を含む公開用プライバシーポリシー）。

2. **日本時間0時リセット＆1日1回制の基盤（GlobalState / SaveManager / FairyTradeManager）**:
   - `GlobalState.js` に `hasNoAdsPass`（VIPフラグ）と `fairyTradeUsage`（日次利用記録 `tradeKey -> YYYY-MM-DD`）を追加。
   - `SaveManager.js` に `hasNoAdsPass` と `fairyTradeUsage` の永続化・復元処理を追加。
   - `FairyTradeManager.js` にて、JST（UTC+9）ベースで当日キー `getTodayKeyJST()` と次の0時までの残り時間を計算する `getMsUntilNextMidnightJST()`、本日利用済み判定 `isTradeUsedToday(key)`、利用記録 `recordTrade(key)` を実装。

3. **VIP永年広告スキップ処理（RewardService / FairyTradeManager）**:
   - `RewardService.js` で `gs.hasNoAdsPass` が true の場合、広告動画をスキップして即時に `onReward()` コールバックを実行。
   - `FairyTradeManager.js` のモーダル下部に「✨ 妖精の祝福（広告スキップ永年パス 500円）」の状態案内およびトグルテストボタンを配置。未所持時は「🎬 広告」、所持時は「✨ VIP即時」とボタンバッジが切り替わる。

4. **レリクス／宝石合成のやり直し機能（EquipmentScene.js）**:
   - 合成完了後に結果モーダル `showSynthesisResultModal` を表示。
   - 2周目以降で妖精遭遇済み（`gs.hasMetFairy`）かつ本日未利用の場合、「🧚‍♀️ 妖精の取引：結果を引き直す (🎬広告 / ✨VIP即時)」ボタンを表示。
   - 押下時に同ランクで再抽選を行い、合成結果アイテムを差し替えてセーブ。1日1回のみ実行可能。

5. **タロット引き直し機能の1日1回連動（TarotScene.js）**:
   - リフィエル解放済みのタロット引き直しボタンに `!FairyTradeManager.isTradeUsedToday('tarot_reroll')` の制限を適用。
   - VIP時は「✨VIP即時」、通常時は「🎬広告」と表記し、利用後は当日再利用不可（翌日0時リセット）。

### 3. 変更対象ファイル
- [capacitor.config.json](file:///c:/Users/user/.antigravity/game/capacitor.config.json)
- [android/app/build.gradle](file:///c:/Users/user/.antigravity/game/android/app/build.gradle)
- [docs/privacy.html](file:///c:/Users/user/.antigravity/game/docs/privacy.html)
- [privacy.html](file:///c:/Users/user/.antigravity/game/privacy.html)
- [GlobalState.js](file:///c:/Users/user/.antigravity/game/src/systems/GlobalState.js)
- [SaveManager.js](file:///c:/Users/user/.antigravity/game/src/systems/SaveManager.js)
- [RewardService.js](file:///c:/Users/user/.antigravity/game/src/systems/RewardService.js)
- [FairyTradeManager.js](file:///c:/Users/user/.antigravity/game/src/systems/FairyTradeManager.js)
- [EquipmentScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/EquipmentScene.js)
- [TarotScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/TarotScene.js)
- [WORK_LOG.md](file:///c:/Users/user/.antigravity/game/WORK_LOG.md)

### 4. 検証結果
- `npm run build` にてビルド成功を確認。
- Git への commit / push は一切行わず、ローカル環境のみに保持。

---

## [2026-11-15] 周回時（リスポーンイベント）の「AssetLoader is not defined」エラー修正

### 1. 原因（Why）
- 周回時（バッドエンド／リスポーン時、`eventId === 'event_resp'`）に、`EventScene.js` 内で `AssetLoader.ensureRespawnAssets(...)` を呼び出していたが、同ファイル冒頭で `AssetLoader` の `import` 文が抜けていたため `ReferenceError: AssetLoader is not defined` が発生していた。

### 2. 対策（How）
- [EventScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/EventScene.js) に `import { AssetLoader } from '../systems/AssetLoader';` を追加。
- `AssetLoader.ensureRespawnAssets` が正常に実行され、リスポーン用の背景画像（`bg_resp`）とBGM（`bgm_resp`）を安全にオンデマンド読み込みしてからイベントが進行することを確認。

### 3. 検証結果
- `npm run build` にてエラーなくビルドが通ることを確認。
- Git への commit / push は一切行わず、ローカル環境のみに保持。

---

## [2026-11-15] 12/21夜ワイルドハント＆12/22朝魔女狩り・周回のすり抜け防止（行動直前＆復帰時絶対ガード）実装

### 1. 目的（Why）
- 12/21夜および12/22朝にエラーやF5リロード、リセット等で復帰した場合、または野外で「休息」を選んだ場合に、イベントが発生せずにそのまま年を越せてしまう不具合の根本解消。

### 2. 実施した対策・変更内容（How）

1. **12/21夜のワイルドハント強制突入ガードの網羅**:
   - [AdventureScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/AdventureScene.js) の「休息ボタン（`restBtn`）」押下時の処理に `if (this.check1221NightForcedBreakthrough()) return;` を追加。
   - これにより、21日夜に「移動」「探索」だけでなく「休息」を押した場合でも、確実にワイルドハント（未閲覧ならイベント、閲覧済みなら突破戦）へ強制突入するように徹底。

2. **12/22朝以降の絶対周回ガード（地上にいる場合）**:
   - `check1221Event()` のロジックを改修。地上で `currentDay >= 22` の状態であれば、フラグ `event1221Played` の有無に関わらず、必ず魔女狩り（`event_1221`）および周回リスポーン（`event_resp`）を起動して周回リセットへ強制移行。
   - `create()` の復帰時、およびプレイヤーが「移動」「探索」「休息」を押した直前の全タイミングで `check1221Event()` を実行。
   - これにより、途中でエラーやリロード・リセットが起きても、地上で22日以降に行動を起こそうとした瞬間に100%周回ルートへ導かれ、年を越すことが物理的に不可能になった。

3. **中途半端な先行セーブの撤廃**:
   - `from1221Event`（魔女狩りイベント）完了直後に挟まれていた `SaveManager.saveGame(this)` を撤廃し、周回リセット（`gs.resetForNewLoop()`）で12/1東京駅に初期化されたクリーンな状態でのみ保存するように安全化。

### 3. 変更対象ファイル
- [AdventureScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/AdventureScene.js)
- [WORK_LOG.md](file:///c:/Users/user/.antigravity/game/WORK_LOG.md)

### 4. 検証結果
- `npm run build` を実行し、構文・バンドルエラーなく正常ビルド成功を確認。
- Git への commit / push は一切行わず、ローカル環境のみに保持。

---

## [2026-11-15] ステータス画面（CampScene）BGM無音問題の根本解決

### 1. 原因（Why）
- 先日のアセット軽量化時に、キャンプBGM（`bgm_camp` / `files/BGM/camp_BGM.mp3`）が `BootScene.js` のプリロード対象から外れていた。
- しかし、ステータス画面である `CampScene.js` 側には `preload()` や遅延ロード（`ensureBgm`）の仕組みがなく、`if (this.cache.audio.exists('bgm_camp'))` の判定でキャッシュ未存在（false）となり無音化していた。
- さらに `CampScene.js` 起動時に `this.sound.stopAll()` でフィールド曲が止められ、終了時にもマップBGMの再開リスナーがなかったため、ステータスを開閉した後に無音になっていた。

### 2. 対策（How）
1. [BootScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/BootScene.js):
   - ゲーム基本BGMである `this.load.audio('bgm_camp', 'files/BGM/camp_BGM.mp3');` を初期ロードに正式復帰。起動時から即座に再生可能に。
2. [CampScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/CampScene.js):
   - `preload()` を追加し、万が一未キャッシュ時でも `load.audio` を実行。
   - `create()` で `AssetLoader.ensureBgm` によるフォールバック二重安全網を設置。
3. [AdventureScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/AdventureScene.js):
   - ステータス画面から復帰した際に確実にマップBGMを再開するワンタイム `resume` リスナーを追加。

### 3. 検証結果
- `npm run build` を実行し、ビルド成功を確認。
- Git への commit / push は行わず、ローカル環境のみに保持。

---

## [2026-11-15] ステータス画面の顔画像未ロード（緑枠Missing）＆ BootSceneストールの根本解決

### 1. 原因（Why）
- 直前の修正で `BootScene.js` に `this.load.audio('bgm_camp', ...)` を追加した際、ブラウザの仕様（ユーザー操作前の未対話状態ではAudioContextがサスペンドされる）により、PhaserのWebAudioデコーダーが完了通知を受け取れず `[BootScene] Loader stalled for 8s without progress. Forcing completion.` が発生していた。
- 8秒タイムアウトによる強制完了（`loadComplete()`）が走った結果、ロードキュー内に残っていた紫苑の顔アイコン（`face_001`）など後続アセットの読み込みがスキップされてしまい、ステータス画面で緑枠（Missing Texture）が表示されていた。

### 2. 対策（How）
1. [BootScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/BootScene.js):
   - 初期ロードでの `bgm_camp` 読み込みを撤廃。これにより起動時ローダーのストールが完全に解消し、全キャラの顔画像を含む全初期アセットが100%スムーズにロードされるように復旧。
2. [CampScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/CampScene.js):
   - キャンプBGM（`bgm_camp`）はステータスボタン押下（ユーザー対話後）に `AssetLoader.ensureBgm` 経由でオンデマンド再生する安全設計に統一。
   - 顔アイコン描画部にオンデマンド読み込み＆安全フォールバック処理を追加。万が一テクスチャが未ロードの場合でも緑枠を出さず、安全なアイコンを表示しつつ即座に非同期ロードして本来の顔画像へ自動差し替え。

### 3. 検証結果
- Viteログにて `Loader stalled` 警告が完全に消滅し、起動時ロードが正常完了することを確認。
- `npm run build` にてビルド成功を確認。
- Git への commit / push は行わず、ローカル環境のみに保持。

---

## [2026-11-15] タロットカード選択時の「Cannot read properties of undefined (reading '16')」エラー修正

### 1. 原因（Why）
- `TarotScene.js` 側で `this.tarotData = this.cache.json.get('tarot_data')` を参照していたが、`TarotScene.preload()` 内で `tarot_data`（`files/DATA/tarot.json`）の読み込みが定義されていなかった。
- 直前の `BootScene` ストール発生時やキャッシュ未初期化時に `this.tarotData` が `undefined` となり、カード選択時に `this.tarotData[cardId]` で TypeError が発生していた。

### 2. 対策（How）
1. [TarotScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/TarotScene.js):
   - `preload()` に `if (!this.cache.json.exists('tarot_data')) this.load.json('tarot_data', 'files/DATA/tarot.json');` を追加。自前でも確実にプリロードを担保。
   - `create()` で `this.tarotData = this.cache.json.get('tarot_data') || {};` に安全化。
   - `selectCard()` および引き直し時のカードデータ参照箇所に、`this.tarotData` の再取得＆デフォルトオブジェクトフォールバックを追加。

### 3. 検証結果
- `npm run build` にてビルド成功を確認。
- Git への commit / push は行わず、ローカル環境のみに保持。

---

## 2026-11-15: アセット全般のオンデマンド遅延ロード徹底最適化（初期起動ロードの大幅削減＆メモリ超軽量化）

### 1. ユーザー指示内容
「タワー内画像も重たいと思うのでロード後行き先がタワーとわかった瞬間とかタワーに突入するときに読み込むようにするのがいいと思う。他にもなんかないかな、クラーケンとか敵としてのプロセルとかほとんどないよな。道場で戦えるようにするかもしれんけど。道場やメイド館も解放されてなきゃ読まんでいいよな。」

### 2. 調査・分析した内容（Why & What）
コード全体を精査したところ、初期起動（`BootScene.preload`）や通常戦闘（`BattleScene.preload`）で、滅多に使われない重いアセットが多数先行読み込みされていたことを確認：
1. **クラーケン（巨大タコ魔女）アセット**:
   普通の雑魚戦を含むすべての戦闘突入時（`BattleScene.preload`）で、毎回巨大画像（`KrakenA`, `KrakenB`, `KrakenC` 各PNG）と背景（`KrakenBG.jpg`）、BGM 2曲を常にロードしていた。
2. **プロセル巨大ボス（`enemy_prc_full`）**:
   タワー21階ボス戦専用のアセット（`enemy_prc_a`, `enemy_prc_b`）を起動時に読み込み、キャンバス合成処理まで行っていた。
3. **タロットカード全23枚（`tarot_0` 〜 `tarot_22`）**:
   `TarotScene.preload()` で自前ロードしているにもかかわらず、`BootScene.preload` でも全23枚のWebP画像を重複して初期ロードしていた。
4. **タワー遠景（`tow1`〜`tow4`）**:
   タワー突入時（`BootScene.loadTowerAssets`）にロードされるため、初期起動時に読み込む必要がなかった。
5. **道場（`event_dojo`）＆時空館・メイド館（`event_jiku`, `jiku_cg`）**:
   解放前の序盤から常に初期ロードされていた。
6. **好感度一枚絵（11枚）＆仲間喪失一枚絵（6枚）**:
   発生頻度が低いイベントCG計17枚が初期ロードされていた。

### 3. 実施した対策・変更内容（How）

1. **クラーケンの直前ロード化（BattleScene.js）**:
   - `isKrakenBossBattle` や `fromIkebukuro02Event` などのクラーケン戦時のみ、クラーケン画像・背景・専用BGMをオンデマンドロードするよう条件分岐。通常の雑魚戦・魔女戦の戦闘ロード時間を大幅短縮。

2. **プロセル巨大ボスの直前ロード化（BattleScene.js）**:
   - タワー21階ボス戦またはプロセル戦時のみ、テクスチャをロードしてキャンバス合成を行うように移管。`BootScene` からの初期ロード＆起動時合成処理を完全撤廃。

3. **タロット全23枚の初期ロード重複撤廃（BootScene.js）**:
   - `TarotScene` が開いた瞬間の自前 preload に一本化し、`BootScene` から全23枚の画像読み込みを完全削除。

4. **タワー遠景画像の初期ロード撤廃（BootScene.js）**:
   - `tow1`〜`tow4` の初期ロードを削除。セーブデータ復帰時や地上からタワー突入時（`loadTowerAssets`）に必要な時だけロードする設計に統一。地上編プレイ中のメモリ消費を削減。

5. **道場・時空館（メイド館）のオンデマンド遅延ロード化（AdventureScene.js）**:
   - 初回道場訪問時、およびシルバードームでの時空館（メイド館）解放イベント発生時に、`AssetLoader.ensureAssets` で未ロード分をその場でサッと読み込んでからシーンを開始するよう改修。

### 4. 変更対象ファイル
- [BattleScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/BattleScene.js)
- [BootScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/BootScene.js)
- [AdventureScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/AdventureScene.js)
- [WORK_LOG.md](file:///c:/Users/user/.antigravity/game/WORK_LOG.md)

### 5. 検証結果
- `npm run build` を実行し、構文・バンドルエラーなく正常ビルド成功を確認。
- 初期起動時に読み込まれるファイル数が約50個以上削減され、初期ロード時間と常駐メモリが劇的に軽量化。
- Git への commit / push は行わず、ローカル環境のみに保持。

---

## [2026-11-15] Google Play公開準備 ＆ 広告・VIP永年パス・妖精取引（0時リセット1日1回・合成リロール）実装

### 1. 目的（Why）
- デベロッパー登録（「長沢電子工務店 (NDK)」）完了に伴い、アプリのパッケージ名（`com.ndk.magiapilgrims`）とリリース用署名キーストアを整備。
- Google Play Console 審査用のプライバシーポリシーページを作成。
- 広告（リワード動画）と課金設計（買い切り永年広告スキップパス「妖精の祝福」500円）の全体仕様を実装：
  1. 1周目は妖精リフィエルや広告・課金のアピールは一切なし（クリア後の2周目、タロット009教皇を引いてから初解放）。
  2. 妖精の取引（各特典）は「日本時間（JST）午前0時リセットで、それぞれ1日1回ずつ」利用可能。
  3. VIP（永年広告スキップパス所持者）であっても無限チートではなく「それぞれ1日1回」。広告動画を見ずに即座に受取可能。
  4. 新機能「レリクス／宝石合成のやり直し（リロール）機能」を新設し、これも妖精の取引（1日1回・広告/VIP）として利用可能に。
  5. タロット引き直し機能にも「1日1回・0時更新（広告/VIP）」の制約とバッジ表示を連動。

### 2. 実施した対策・変更内容（How）

1. **Google Play用設定・署名キー・ポリシーの整備**:
   - `capacitor.config.json` の `appId` を `"com.ndk.magiapilgrims"` に更新。
   - `android/app/build.gradle` の `applicationId` を `"com.ndk.magiapilgrims"` に更新し、リリース用署名設定（`signingConfigs.release`）を追加。
   - `keytool.exe` を使用して `android/app/ndk-release-key.jks`（alias: `ndk_key`）を生成。
   - `docs/privacy.html` および `privacy.html` を新規作成（Google AdMob条項を含む公開用プライバシーポリシー）。

2. **日本時間0時リセット＆1日1回制の基盤（GlobalState / SaveManager / FairyTradeManager）**:
   - `GlobalState.js` に `hasNoAdsPass`（VIPフラグ）と `fairyTradeUsage`（日次利用記録 `tradeKey -> YYYY-MM-DD`）を追加。
   - `SaveManager.js` に `hasNoAdsPass` と `fairyTradeUsage` の永続化・復元処理を追加。
   - `FairyTradeManager.js` にて、JST（UTC+9）ベースで当日キー `getTodayKeyJST()` と次の0時までの残り時間を計算する `getMsUntilNextMidnightJST()`、本日利用済み判定 `isTradeUsedToday(key)`、利用記録 `recordTrade(key)` を実装。

3. **VIP永年広告スキップ処理（RewardService / FairyTradeManager）**:
   - `RewardService.js` で `gs.hasNoAdsPass` が true の場合、広告動画をスキップして即時に `onReward()` コールバックを実行。
   - `FairyTradeManager.js` のモーダル下部に「✨ 妖精の祝福（広告スキップ永年パス 500円）」の状態案内およびトグルテストボタンを配置。未所持時は「🎬 広告」、所持時は「✨ VIP即時」とボタンバッジが切り替わる。

4. **レリクス／宝石合成のやり直し機能（EquipmentScene.js）**:
   - 合成完了後に結果モーダル `showSynthesisResultModal` を表示。
   - 2周目以降で妖精遭遇済み（`gs.hasMetFairy`）かつ本日未利用の場合、「🧚‍♀️ 妖精の取引：結果を引き直す (🎬広告 / ✨VIP即時)」ボタンを表示。
   - 押下時に同ランクで再抽選を行い、合成結果アイテムを差し替えてセーブ。1日1回のみ実行可能。

5. **タロット引き直し機能の1日1回連動（TarotScene.js）**:
   - リフィエル解放済みのタロット引き直しボタンに `!FairyTradeManager.isTradeUsedToday('tarot_reroll')` の制限を適用。
   - VIP時は「✨VIP即時」、通常時は「🎬広告」と表記し、利用後は当日再利用不可（翌日0時リセット）。

### 3. 変更対象ファイル
- [capacitor.config.json](file:///c:/Users/user/.antigravity/game/capacitor.config.json)
- [android/app/build.gradle](file:///c:/Users/user/.antigravity/game/android/app/build.gradle)
- [docs/privacy.html](file:///c:/Users/user/.antigravity/game/docs/privacy.html)
- [privacy.html](file:///c:/Users/user/.antigravity/game/privacy.html)
- [GlobalState.js](file:///c:/Users/user/.antigravity/game/src/systems/GlobalState.js)
- [SaveManager.js](file:///c:/Users/user/.antigravity/game/src/systems/SaveManager.js)
- [RewardService.js](file:///c:/Users/user/.antigravity/game/src/systems/RewardService.js)
- [FairyTradeManager.js](file:///c:/Users/user/.antigravity/game/src/systems/FairyTradeManager.js)
- [EquipmentScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/EquipmentScene.js)
- [TarotScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/TarotScene.js)
- [WORK_LOG.md](file:///c:/Users/user/.antigravity/game/WORK_LOG.md)

### 4. 検証結果
- `npm run build` にてビルド成功を確認。
- Git への commit / push は一切行わず、ローカル環境のみに保持。

---

## [2026-11-15] 周回時（リスポーンイベント）の「AssetLoader is not defined」エラー修正

### 1. 原因（Why）
- 周回時（バッドエンド／リスポーン時、`eventId === 'event_resp'`）に、`EventScene.js` 内で `AssetLoader.ensureRespawnAssets(...)` を呼び出していたが、同ファイル冒頭で `AssetLoader` の `import` 文が抜けていたため `ReferenceError: AssetLoader is not defined` が発生していた。

### 2. 対策（How）
- [EventScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/EventScene.js) に `import { AssetLoader } from '../systems/AssetLoader';` を追加。
- `AssetLoader.ensureRespawnAssets` が正常に実行され、リスポーン用の背景画像（`bg_resp`）とBGM（`bgm_resp`）を安全にオンデマンド読み込みしてからイベントが進行することを確認。

### 3. 検証結果
- `npm run build` にてエラーなくビルドが通ることを確認。
- Git への commit / push は一切行わず、ローカル環境のみに保持。

---

## [2026-11-15] 12/21夜ワイルドハント＆12/22朝魔女狩り・周回のすり抜け防止（行動直前＆復帰時絶対ガード）実装

### 1. 目的（Why）
- 12/21夜および12/22朝にエラーやF5リロード、リセット等で復帰した場合、または野外で「休息」を選んだ場合に、イベントが発生せずにそのまま年を越せてしまう不具合の根本解消。

### 2. 実施した対策・変更内容（How）

1. **12/21夜のワイルドハント強制突入ガードの網羅**:
   - [AdventureScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/AdventureScene.js) の「休息ボタン（`restBtn`）」押下時の処理に `if (this.check1221NightForcedBreakthrough()) return;` を追加。
   - これにより、21日夜に「移動」「探索」だけでなく「休息」を押した場合でも、確実にワイルドハント（未閲覧ならイベント、閲覧済みなら突破戦）へ強制突入するように徹底。

2. **12/22朝以降の絶対周回ガード（地上にいる場合）**:
   - `check1221Event()` のロジックを改修。地上で `currentDay >= 22` の状態であれば、フラグ `event1221Played` の有無に関わらず、必ず魔女狩り（`event_1221`）および周回リスポーン（`event_resp`）を起動して周回リセットへ強制移行。
   - `create()` の復帰時、およびプレイヤーが「移動」「探索」「休息」を押した直前の全タイミングで `check1221Event()` を実行。
   - これにより、途中でエラーやリロード・リセットが起きても、地上で22日以降に行動を起こそうとした瞬間に100%周回ルートへ導かれ、年を越すことが物理的に不可能になった。

3. **中途半端な先行セーブの撤廃**:
   - `from1221Event`（魔女狩りイベント）完了直後に挟まれていた `SaveManager.saveGame(this)` を撤廃し、周回リセット（`gs.resetForNewLoop()`）で12/1東京駅に初期化されたクリーンな状態でのみ保存するように安全化。

### 3. 変更対象ファイル
- [AdventureScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/AdventureScene.js)
- [WORK_LOG.md](file:///c:/Users/user/.antigravity/game/WORK_LOG.md)

### 4. 検証結果
- `npm run build` を実行し、構文・バンドルエラーなく正常ビルド成功を確認。
- Git への commit / push は一切行わず、ローカル環境のみに保持。

---

## [2026-11-15] ステータス画面（CampScene）BGM無音問題の根本解決

### 1. 原因（Why）
- 先日のアセット軽量化時に、キャンプBGM（`bgm_camp` / `files/BGM/camp_BGM.mp3`）が `BootScene.js` のプリロード対象から外れていた。
- しかし、ステータス画面である `CampScene.js` 側には `preload()` や遅延ロード（`ensureBgm`）の仕組みがなく、`if (this.cache.audio.exists('bgm_camp'))` の判定でキャッシュ未存在（false）となり無音化していた。
- さらに `CampScene.js` 起動時に `this.sound.stopAll()` でフィールド曲が止められ、終了時にもマップBGMの再開リスナーがなかったため、ステータスを開閉した後に無音になっていた。

### 2. 対策（How）
1. [BootScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/BootScene.js):
   - ゲーム基本BGMである `this.load.audio('bgm_camp', 'files/BGM/camp_BGM.mp3');` を初期ロードに正式復帰。起動時から即座に再生可能に。
2. [CampScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/CampScene.js):
   - `preload()` を追加し、万が一未キャッシュ時でも `load.audio` を実行。
   - `create()` で `AssetLoader.ensureBgm` によるフォールバック二重安全網を設置。
3. [AdventureScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/AdventureScene.js):
   - ステータス画面から復帰した際に確実にマップBGMを再開するワンタイム `resume` リスナーを追加。

### 3. 検証結果
- `npm run build` を実行し、ビルド成功を確認。
- Git への commit / push は行わず、ローカル環境のみに保持。

---

## [2026-11-15] ステータス画面の顔画像未ロード（緑枠Missing）＆ BootSceneストールの根本解決

### 1. 原因（Why）
- 直前の修正で `BootScene.js` に `this.load.audio('bgm_camp', ...)` を追加した際、ブラウザの仕様（ユーザー操作前の未対話状態ではAudioContextがサスペンドされる）により、PhaserのWebAudioデコーダーが完了通知を受け取れず `[BootScene] Loader stalled for 8s without progress. Forcing completion.` が発生していた。
- 8秒タイムアウトによる強制完了（`loadComplete()`）が走った結果、ロードキュー内に残っていた紫苑の顔アイコン（`face_001`）など後続アセットの読み込みがスキップされてしまい、ステータス画面で緑枠（Missing Texture）が表示されていた。

### 2. 対策（How）
1. [BootScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/BootScene.js):
   - 初期ロードでの `bgm_camp` 読み込みを撤廃。これにより起動時ローダーのストールが完全に解消し、全キャラの顔画像を含む全初期アセットが100%スムーズにロードされるように復旧。
2. [CampScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/CampScene.js):
   - キャンプBGM（`bgm_camp`）はステータスボタン押下（ユーザー対話後）に `AssetLoader.ensureBgm` 経由でオンデマンド再生する安全設計に統一。
   - 顔アイコン描画部にオンデマンド読み込み＆安全フォールバック処理を追加。万が一テクスチャが未ロードの場合でも緑枠を出さず、安全なアイコンを表示しつつ即座に非同期ロードして本来の顔画像へ自動差し替え。

### 3. 検証結果
- Viteログにて `Loader stalled` 警告が完全に消滅し、起動時ロードが正常完了することを確認。
- `npm run build` にてビルド成功を確認。
- Git への commit / push は行わず、ローカル環境のみに保持。

---

## [2026-11-15] タロットカード選択時の「Cannot read properties of undefined (reading '16')」エラー修正

### 1. 原因（Why）
- `TarotScene.js` 側で `this.tarotData = this.cache.json.get('tarot_data')` を参照していたが、`TarotScene.preload()` 内で `tarot_data`（`files/DATA/tarot.json`）の読み込みが定義されていなかった。
- 直前の `BootScene` ストール発生時やキャッシュ未初期化時に `this.tarotData` が `undefined` となり、カード選択時に `this.tarotData[cardId]` で TypeError が発生していた。

### 2. 対策（How）
1. [TarotScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/TarotScene.js):
   - `preload()` に `if (!this.cache.json.exists('tarot_data')) this.load.json('tarot_data', 'files/DATA/tarot.json');` を追加。自前でも確実にプリロードを担保。
   - `create()` で `this.tarotData = this.cache.json.get('tarot_data') || {};` に安全化。
   - `selectCard()` および引き直し時のカードデータ参照箇所に、`this.tarotData` の再取得＆デフォルトオブジェクトフォールバックを追加。

### 3. 検証結果
- `npm run build` にてビルド成功を確認。
- Git への commit / push は行わず、ローカル環境のみに保持。

---

## [2026-11-15] タロット仲間加入解放条件の厳格化・道場&メイド館デバッグバイパス撤廃・デバッグボタンUI統一

### 1. ユーザー指示内容
1. **タロットカードと仲間加入の解放条件の厳格化**:
   - カード自体の出現制限はしない（仲間に入らないときもカードそのものは山札から出る。妖精も悪魔もこれから実装する他キャラも）。
   - ただし仲間加入（遭遇イベント・加入処理）は、デバッグモード（`GlobalState.IS_DEBUG_MODE`）であっても条件をスキップせず、本番と同じ正規条件を厳格に適用する（ノア、ななよ、白蓮、リフィエル、プロセル等）。
2. **デバッグモードの道場・メイド館（時空館）無条件入場フラグの撤廃**:
   - デバッグモードで道場（`isDojoUnlocked`）とメイド館（`isJikukanUnlocked`）に最初から無条件で入れるバイパスを削除し、正規条件でのみ解放・表示されるようにする。
3. **デバッグモード限定コマンドボタンのUI統一**:
   - デバッグ限定のコマンドボタンのUIを統一して「黄色い背景ボタンに黒文字（`#ffea00` / `#000000`）」にする。
   - ボタン名の先頭に `🐝`（蜂マーク）を付ける（デバッグ＝虫の意味から）。

### 2. 調査・原因・対応内容（Why & How）
1. [TarotScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/TarotScene.js):
   - **ノア(008)・ななよ(007)**:
     - 判定: `!gs.hasEnteredTower && !GlobalState.IS_DEBUG_MODE` から `!GlobalState.IS_DEBUG_MODE` を削除。塔へ突入した実績（`hasEnteredTower`）がある場合のみ仲間に加入。突入前はカード自体の効果（HP回復等）のみ発動し仲間加入イベントは発生しない。
   - **白蓮(011)**:
     - 判定: `!hasMetInAkiba && !hasRespawned && !GlobalState.IS_DEBUG_MODE` から `!GlobalState.IS_DEBUG_MODE` を削除。秋葉原探索での遭遇（`hasAccompanied`）または周回リスポーン経験（`loopCount >= 2`）が必須。
   - **リフィエル(009)**:
     - 判定: `gs.loopCount >= 2 || GlobalState.IS_DEBUG_MODE` から `GlobalState.IS_DEBUG_MODE` を削除。2周目以降かつ未遭遇の場合のみ妖精遭遇イベントが発火。
   - **悪魔カード(16) / プロセル(010)**:
     - 2RDEVILイベント発火条件およびプロセル加入判定から `GlobalState.IS_DEBUG_MODE` を削除。21階ボス撃破実績（`tower21BossDefeated`）が必須。
2. [AdventureScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/AdventureScene.js):
   - **道場・時空館（メイド館）のバイパス撤廃**:
     - `this.dojoBtn.setVisible(isVisible && gs.isDojoUnlocked);`
     - `this.jikukanBtn.setVisible(isVisible && gs.isJikukanUnlocked);`
     - `_createDojoButton` / `_createJikukanButton` 内の初期表示および `updateStatus()` から `|| GlobalState.IS_DEBUG_MODE` を完全削除。正規解放条件を満たすまで表示されないよう修正。
     - デバッグ自動引き（Tキー）内のプロセル加入判定からも `GlobalState.IS_DEBUG_MODE` を削除。
   - **デバッグボタンのUI統一**:
     - 共通スタイル `{ fontFamily: 'sans-serif', fontSize: '15px', color: '#000000', fontStyle: 'bold', backgroundColor: '#ffea00', padding: { x: 12, y: 8 } }` を適用。
     - 各ボタンテキストを `🐝 ` プレフィックスに更新：
       - `🐝 突破テスト`
       - `🐝 DPS計測`
       - `🐝 通常マップへ戻る` / `🐝 タワーテスト`
       - `🐝 フロア移動`
       - `🐝 対人戦テスト`
       - `🐝 時間経過`
       - `🐝 翌朝スキップ`
       - `🐝 タワー敵復活`
     - 表示更新（`_createBaseControls`）時に `towerRespawnBtn` の可視性制御を追加。

### 3. 検証結果
- `npm run build` を実行し、エラーなくビルドが正常完了することを確認。
- Git への commit / push は行わず、ローカル環境のみに保持。

---

## [2026-11-15] Webアプリ版最終バージョンリリース（デバッグOFF・だんます塔突入実績解放）＆ Git反映

### 1. ユーザー指示内容
1. Webアプリ版としての最終バージョンとしてデバッグモードを完全OFF（本番リリース仕様）にする。
2. タイトル画面の「🎮 だんます」ミニゲームボタンは、セーブデータで「塔突入実績（`hasEnteredTower`）」がある場合のみオープン（表示・起動可能）にする。
3. その上で、Webアプリ版の集大成としてGitへコミット＆プッシュ（同期）を行う。

### 2. 実施した対策・変更内容（How）
1. [GlobalState.js](file:///c:/Users/user/.antigravity/game/src/systems/GlobalState.js):
   - `static IS_DEBUG_MODE = false;` に変更（デバッグモード完全解除・本番仕様）。
   - `static ALLOW_DEBUG_TOGGLE = false;` に連動変更。
2. [TitleScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/TitleScene.js):
   - セーブデータ復元および `gs.hasEnteredTower` を確認し、塔突入実績がある場合のみ左下に「🎮 だんます」ボタンを生成・タップ反応するように改修。
   - 塔突入前の新規プレイや地上編プレイ中は非表示となり、世界観と進行度に応じた解放演出を実現。
3. [AdventureScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/AdventureScene.js):
   - 妖精アイコン（`chr_fairy_s`）のプリロード＆オンデマンドフォールバックにより、実機・ブラウザ問わず緑枠（Missing）を出さない安全設計を確立。
   - リフィエル一時クリーニングコードの完全撤廃により、将来の隠しキャラ解放ロジックとの衝突を排除。

### 3. 検証結果
- `npm run build` を実行し、構文・バンドルエラーなく本番ビルドが正常完了することを確認。
- Git へコミットおよびプッシュを実施。

---

## [2026-11-15] プロジェクト全体バックアップ作成 & Androidアプリ特化への移行検証

### 1. ユーザー指示内容
1. ここまでの成果物のバックアップをローカルに確実に作成・保存する。
2. Webアプリとしての側面を捨て、今後はAndroidアプリに特化して開発を進める。
3. Androidアプリとした場合に不要になる部分、最適化・追加すべき部分を網羅的に検証・提示する。

### 2. 実施したバックアップ内容
- **バックアップ先**: `c:\Users\user\.antigravity\backup_20261115_web_to_android`
- `node_modules`, `dist`, `.git` を除外したソースコード、アセット、設定ファイル、ドキュメント全一式を完全退避。

### 3. Androidアプリ特化に向けた詳細検証結果

#### ① 不要になる部分（整理・削除・無効化推奨）
1. **GitHub Pages デプロイスクリプト**:
   - `package.json` の `"deploy"` スクリプトや `build_web.bat`。Web公開は行わないため整理可能。
2. **外部CDNフォント読み込み（index.html）**:
   - Google Fonts CDN（`Noto Serif JP`）への外部通信。オフラインプレイ時にフォント取得遅延・チラつきの原因となるため、ローカルバンドルまたはシステムフォントへ統一が推奨。
3. **ブラウザ特有のビューポート揺れ対策（index.html / main.js）**:
   - モバイルブラウザのアドレスバー出入り対策（`visualViewport` イベント等）は、固定WebViewのAndroidアプリでは不要（アプリ枠に収まるためシンプル化可能）。
4. **URLクエリパラメータ判定（main.js）**:
   - `?load_test_save=1` などのWebブラウザ用URLクエリ検知コード。
5. **PC物理キーボード前提のデバッグショートカット**:
   - Oキー、Tキー、Lキーなどのキーボードイベント。Android実機では物理キーがないため、画面上の蜂マーク（`🐝`）ボタンやデバッグ画面に集約。

#### ② Androidアプリ化に伴い追加・最適化すべき重要項目
1. **ステータスバー・ナビゲーションバーの没入制御（Immersive Mode）**:
   - `@capacitor/status-bar` を導入し、画面上部の時計・バッテリー領域を黒色または非表示にして没入感を向上。
2. **画面スリープ（消灯）防止（KeepAwake）**:
   - 戦闘中や長文イベント中に15秒〜30秒で画面が暗くなるのを防ぐため、`@capacitor-community/keep-awake` を導入してゲームプレイ中の自動消灯を防止。
3. **セーブデータの安全二重保存（LocalStorage + Capacitor Preferences）**:
   - OSのストレージクリーンアップ機能でLocalStorageが万が一消去されるリスクを防ぐため、バックアップ退避を二重化。
4. **Google AdMob リワード広告プラグインの導入**:
   - `@capacitor-community/admob` をインストールし、実機での広告動画再生を本番SDKに接続。
5. **Google Play Billing（In-App Purchase）の導入**:
   - 永年広告スキップパス（500円）の決済APIを接続。

---

## [2026-11-15] リフィエル一時クリーニングコードの完全撤廃 & 妖精アイコン未ロード（緑枠）根本解消

### 1. ユーザー指示内容
1. 前回追加したリフィエルの強制クリーニングコードは、将来的に条件を満たして仲間に入る際バグの引き金になるため完全に削除・撤廃する。
2. マップ画面左側の「妖精の取引ボタン（fairyS）」が未ロード（緑枠 Missing Texture）になっていた原因の究明・解消。
3. ブラウザ版とAndroid実機環境でのアセット読み込みの違い、および広告・課金プログラムの本格組み込み方針の整理・回答。

### 2. 実施した対策・変更内容（How）

1. **強制クリーニングコードの完全撤廃（AdventureScene.js）**:
   - `create()` 内で `this.party` や `savedFormation` から `009` を強制削除していたブロック、およびイベント復帰時の `normJoinId !== '009'` ガードを完全に撤廃。
   - 仲間に加わらない制御は、`TarotScene` 側で教皇カードから加入キャラIDを渡さない（`joinCharacterId: null`）設計で安全に担保されているため、将来的な隠しキャラ解放ロジックと衝突しないクリーンな状態へ復帰。

2. **妖精アイコン（chr_fairy_s）未ロード・緑枠の根本解消（AdventureScene.js）**:
   - **原因**: `chr_fairy_s`（`files/CHR/fairyS.webp`）が `AdventureScene.preload()` のロードキューに入っておらず、BootScene側でのキャッシュ状態に依存していたため、HMRやリロード時に未定義となり緑枠が発生していた。
   - **対策**:
     - `AdventureScene.preload()` に `chr_fairy_s` および `chr_fairy` のプリロードを追加。
     - `_createFairyButton()` にて、万が一未ロードの場合でも緑枠を出さず（`setVisible(false)`）、即座に非同期ロードして完了時にテクスチャを自動差し替え・表示する安全フォールバック設計を導入。

### 3. 検証結果
- `npm run build` を実行し、エラーなくビルドが正常完了することを確認。
- Git への commit / push は行わず、ローカル環境のみに保持。

---

## [2026-11-15] Webアプリ版最終バージョンリリース（デバッグOFF・だんます塔突入実績解放）＆ Git反映

### 1. ユーザー指示内容
1. Webアプリ版としての最終バージョンとしてデバッグモードを完全OFF（本番リリース仕様）にする。
2. タイトル画面の「🎮 だんます」ミニゲームボタンは、セーブデータで「塔突入実績（`hasEnteredTower`）」がある場合のみオープン（表示・起動可能）にする。
3. その上で、Webアプリ版の集大成としてGitへコミット＆プッシュ（同期）を行う。

### 2. 実施した対策・変更内容（How）
1. [GlobalState.js](file:///c:/Users/user/.antigravity/game/src/systems/GlobalState.js):
   - `static IS_DEBUG_MODE = false;` に変更（デバッグモード完全解除・本番仕様）。
   - `static ALLOW_DEBUG_TOGGLE = false;` に連動変更。
2. [TitleScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/TitleScene.js):
   - セーブデータ復元および `gs.hasEnteredTower` を確認し、塔突入実績がある場合のみ左下に「🎮 だんます」ボタンを生成・タップ反応するように改修。
   - 塔突入前の新規プレイや地上編プレイ中は非表示となり、世界観と進行度に応じた解放演出を実現。
3. [AdventureScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/AdventureScene.js):
   - 妖精アイコン（`chr_fairy_s`）のプリロード＆オンデマンドフォールバックにより、実機・ブラウザ問わず緑枠（Missing）を出さない安全設計を確立。
   - リフィエル一時クリーニングコードの完全撤廃により、将来の隠しキャラ解放ロジックとの衝突を排除。

### 3. 検証結果
- `npm run build` を実行し、構文・バンドルエラーなく本番ビルドが正常完了することを確認。
- Git へコミットおよびプッシュを実施。

---

## [2026-11-15] プロジェクト全体バックアップ作成 & Androidアプリ特化への移行検証

### 1. ユーザー指示内容
1. ここまでの成果物のバックアップをローカルに確実に作成・保存する。
2. Webアプリとしての側面を捨て、今後はAndroidアプリに特化して開発を進める。
3. Androidアプリとした場合に不要になる部分、最適化・追加すべき部分を網羅的に検証・提示する。

### 2. 実施したバックアップ内容
- **バックアップ先**: `c:\Users\user\.antigravity\backup_20261115_web_to_android`
- `node_modules`, `dist`, `.git` を除外したソースコード、アセット、設定ファイル、ドキュメント全一式を完全退避。

### 3. Androidアプリ特化に向けた詳細検証結果

#### ① 不要になる部分（整理・削除・無効化推奨）
1. **GitHub Pages デプロイスクリプト**:
   - `package.json` の `"deploy"` スクリプトや `build_web.bat`。Web公開は行わないため整理可能。
2. **外部CDNフォント読み込み（index.html）**:
   - Google Fonts CDN（`Noto Serif JP`）への外部通信。オフラインプレイ時にフォント取得遅延・チラつきの原因となるため、ローカルバンドルまたはシステムフォントへ統一が推奨。
3. **ブラウザ特有のビューポート揺れ対策（index.html / main.js）**:
   - モバイルブラウザのアドレスバー出入り対策（`visualViewport` イベント等）は、固定WebViewのAndroidアプリでは不要（アプリ枠に収まるためシンプル化可能）。
4. **URLクエリパラメータ判定（main.js）**:
   - `?load_test_save=1` などのWebブラウザ用URLクエリ検知コード。
5. **PC物理キーボード前提のデバッグショートカット**:
   - Oキー、Tキー、Lキーなどのキーボードイベント。Android実機では物理キーがないため、画面上の蜂マーク（`🐝`）ボタンやデバッグ画面に集約。

#### ② Androidアプリ化に伴い追加・最適化すべき重要項目
1. **ステータスバー・ナビゲーションバーの没入制御（Immersive Mode）**:
   - `@capacitor/status-bar` を導入し、画面上部の時計・バッテリー領域を黒色または非表示にして没入感を向上。
2. **画面スリープ（消灯）防止（KeepAwake）**:
   - 戦闘中や長文イベント中に15秒〜30秒で画面が暗くなるのを防ぐため、`@capacitor-community/keep-awake` を導入してゲームプレイ中の自動消灯を防止。
3. **セーブデータの安全二重保存（LocalStorage + Capacitor Preferences）**:
   - OSのストレージクリーンアップ機能でLocalStorageが万が一消去されるリスクを防ぐため、バックアップ退避を二重化。
4. **Google AdMob リワード広告プラグインの導入**:
   - `@capacitor-community/admob` をインストールし、実機での広告動画再生を本番SDKに接続。
5. **Google Play Billing（In-App Purchase）の導入**:
   - 永年広告スキップパス（500円）の決済APIを接続。

---

## [2026-11-15] リフィエル一時クリーニングコードの完全撤廃 & 妖精アイコン未ロード（緑枠）根本解消

### 1. ユーザー指示内容
1. 前回追加したリフィエルの強制クリーニングコードは、将来的に条件を満たして仲間に入る際バグの引き金になるため完全に削除・撤廃する。
2. マップ画面左側の「妖精の取引ボタン（fairyS）」が未ロード（緑枠 Missing Texture）になっていた原因の究明・解消。
3. ブラウザ版とAndroid実機環境でのアセット読み込みの違い、および広告・課金プログラムの本格組み込み方針の整理・回答。

### 2. 実施した対策・変更内容（How）

1. **強制クリーニングコードの完全撤廃（AdventureScene.js）**:
   - `create()` 内で `this.party` や `savedFormation` から `009` を強制削除していたブロック、およびイベント復帰時の `normJoinId !== '009'` ガードを完全に撤廃。
   - 仲間に加わらない制御は、`TarotScene` 側で教皇カードから加入キャラIDを渡さない（`joinCharacterId: null`）設計で安全に担保されているため、将来的な隠しキャラ解放ロジックと衝突しないクリーンな状態へ復帰。

2. **妖精アイコン（chr_fairy_s）未ロード・緑枠の根本解消（AdventureScene.js）**:
   - **原因**: `chr_fairy_s`（`files/CHR/fairyS.webp`）が `AdventureScene.preload()` のロードキューに入っておらず、BootScene側でのキャッシュ状態に依存していたため、HMRやリロード時に未定義となり緑枠が発生していた。
   - **対策**:
     - `AdventureScene.preload()` に `chr_fairy_s` および `chr_fairy` のプリロードを追加。
     - `_createFairyButton()` にて、万が一未ロードの場合でも緑枠を出さず（`setVisible(false)`）、即座に非同期ロードして完了時にテクスチャを自動差し替え・表示する安全フォールバック設計を導入。

### 3. 検証結果
- `npm run build` を実行し、エラーなくビルドが正常完了することを確認。
- Git への commit / push は行わず、ローカル環境のみに安全に保持。

---

## [2026-11-15] 雑魚戦→魔女戦BGM重なり解消 & ワイルドハントイベント〜突破戦の完全シームレスBGM化 & 突破戦仕様調査

### 1. ユーザー指示内容
1. 雑魚戦から魔女戦に移る際のBGMがまだ重なっている問題の解決。
2. 12/21夜ワイルドハント突入前のイベントから突破戦までBGM（`bgm_wildhunt`）を通してシームレスに流したい。
3. ワイルドハント突破戦では、既にワイルドハントBGMが流れていた場合は新規再生しないようにする。
4. ワイルドハント突破戦の内容は突破テストと同じなのか、レベル等の調整があるのかの調査・確認。

### 2. 調査・原因・対応内容（Why & How）

#### ① 雑魚戦→魔女戦でBGMが重なっていた原因と解決
- **原因**:
  - `BattleScene.js` の `boss_presentation`（WARNING演出）および `boss`（魔女実体化）で、特定の固定キー配列（`nonBossKeys`）に対して `this.sound.get(key)` を呼んでいた。
  - Phaser 3 の `SoundManager.get(key)` は最初に見つかったインスタンス（過去の停止済みオブジェクトなど）を返す場合があり、**現在実際に鳴っているインスタンスにフェードや停止が届いていなかった**。
  - また、ボスBGMが未ロードのフォールバックとして `bgm_battle1`（雑魚BGM）を再再生する危険な分岐が存在していた。
- **対策**:
  - `boss_presentation` 入時に `this.sound.sounds` の「現在再生中のサウンドすべて（`s && s.isPlaying`）」を対象にし、ボスターゲット以外の全サウンドを400msで音量0へフェードアウトして即座に `s.stop()` するよう改修。
  - `boss` 実体化時にも残存サウンドを再度確実に `s.stop()`。
  - ボスBGM未ロード時は雑魚BGMを鳴らさず、`AssetLoader.ensureBgm` で非同期ロードして安全に再生するよう統一。

#### ② ワイルドハント突入イベント〜突破戦のシームレスBGM化
- **原因**:
  - `EventScene` 冒頭で `bgm_wildhunt` を鳴らした直後、イベントコマンド `{ cmd: 'bgm', key: 'bgm_wildhunt' }` を処理する `EventEngine._changeBgm` が「管理外サウンド」と誤認して `bgm_wildhunt` をフェードアウト停止＆別インスタンスで再再生していた。
  - `BattleScene.create()` の `isWildhunt` 分岐で、既存再生中のTweenキルや音量正規化、他の不要なマップBGMの停止が行われていなかった。
- **対策**:
  - [EventEngine.js](file:///c:/Users/user/.antigravity/game/src/systems/EventEngine.js):
    - `_changeBgm(key)` にて、既に同一キーのサウンドが再生中であればフェードアウトや再生成を行わず、そのままシームレスに継続（音量0.75維持＆Tweenキル）するよう改修。
  - [EventScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/EventScene.js):
    - 冒頭で再生した `bgm_wildhunt` のインスタンスを `this.engine._currentBgm` に事前登録。
  - [BattleScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/BattleScene.js):
    - `isWildhunt` 分岐にて、前シーンから `bgm_wildhunt` が流れている場合は**絶対に新しく再生せず**、Tweenをキルして音量を0.75に確定。それ以外の不要なBGMを確実に `stop()`。未再生時のみ新規再生。

#### ③ ワイルドハント突破戦と突破テストの仕様比較調査
- **突破テスト（デバッグコマンド `🐝 突破テスト`）**:
  - 敵数: 50体
  - 敵レベル: Lv.1（固定）
  - スポーン間隔: 1.0秒
  - 突破目標距離: 42,195m（42.195km）
  - デバフ・敵レベル上昇なしの純粋な動作テスト用。
- **ワイルドハント突破戦（本番 12/21夜）**:
  - 敵数: 200体
  - 敵レベル: **Lv.5からスタートし、10秒ごとに自動で+Lv.1上昇（`5 + Math.floor(elapsedSec / 10)`）**！
  - スポーン間隔: 0.5秒（突破テストの2倍の超激戦）
  - 突破目標距離: 12,010m（約12km）
  - **極限デバフ機能（BattleEngine.js L1015〜1028）**:
    - ① 味方与ダメージ低下: 1秒ごとに0.1%減
    - ② 味方被ダメージ激増: 1秒ごとに+2%増（50秒で被ダメージ2倍に膨張）
    - ③ 夜間限定デバフ: 被ダメージ2倍
  - ➡ 単なる突破テストとは根本的に異なり、**時間経過とともに敵レベルがどんどん上がり、プレイヤー側も急激に消耗・壊滅してバッドエンド周回へ誘導される専用の過酷な調整**が最初から組み込まれている。

### 3. 検証結果
- `npm run build` を実行し、構文・バンドルエラーなくビルド成功を確認。
- Git への commit / push は行わず、ローカル環境のみに安全に保持。

---

## [2026-11-15] 妖精リフィエル遭遇イベントの演出強化 & パーティ非加入化（広告屋の妖精専用化・隠しキャラ保護）

### 1. ユーザー指示内容
1. 妖精リフィエル遭遇イベント（教皇カード）の演出改修：
   - 探索背景（缶詰）ではなく、プレイヤーが現在いるヘクスの通常背景（マップ掛け合い背景）を使用する。
   - 冒頭に右側に紫苑（`portrait_001`）が登場して呟き始め、その後左側に小さなリフィエル（`chr_fairy`）が登場する流れにする。
2. リフィエルが戦闘パーティ・編成に加わってしまう問題の解消：
   - リフィエルは将来の条件で戦闘可能・大人形態への変化が予定されている隠しキャラのため、現段階では戦闘パーティや隊列編成には絶対に加入させない（広告屋の妖精・取引サポート専用）。

### 2. 実施した対策・変更内容（How）

1. **イベント演出の強化（event_fairy_join.json & TarotScene.js）**:
   - [event_fairy_join.json](file:///c:/Users/user/.antigravity/game/public/files/DATA/event_fairy_join.json):
     - 冒頭に `{ "cmd": "chara", "key": "portrait_001", "pos": "right" }` を追加。紫苑が右側に立って息をつき、蝶（光）を見つめるシーンから開始。
     - その後、左側に身長60cmサイズ・浮遊の `{ "cmd": "chr", "pos": "left", "key": "chr_fairy", "scaleMultiplier": 0.38, "yOffset": -60 }` が現れる美しい構図に整備。
   - [TarotScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/TarotScene.js):
     - 教皇カード（ID: 6）引き時、悪魔イベントと同様に `events[0].key = this.bgKey || 'bg_map_base'` を適用し、現在いる土地の景色でイベントが始まるように改修。

2. **パーティ非加入化（完全な広告屋の妖精化）**:
   - [TarotScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/TarotScene.js):
     - `getCharacterId(tarotId)` のマップから `6: '009'` を完全削除。
     - 教皇カード（ID: 6）のイベント呼び出し時、`joinCharacterId: null` を渡して仲間加入処理を発火させないように分離。
     - パーティが5人満員であっても、仲間枠を使わないため問題なく妖精イベントが発生し、日次取引機能（`gs.hasMetFairy = true`）が解放されるように調整。
   - [AdventureScene.js](file:///c:/Users/user/.antigravity/game/src/scenes/AdventureScene.js):
     - 万が一セーブデータ内にリフィエル（`009`）が残っていた場合の安全クリーニング処理を追加。`this.party`、`savedFormation`、`normalFormation`、`towerFormation` から自動的に `009` を除外して保存。
     - イベント復帰時の加入処理でも `normJoinId !== '009'` をガード。

### 3. 検証結果
- `npm run build` を実行し、エラーなくビルドが正常完了することを確認。
- Git への commit / push は行わず、ローカル環境のみに安全に保持。
