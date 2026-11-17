# 南陵祭2027 Phase 1 実装計画書（精査・レッドチーム監査済版 v2）

本計画書は、[ROADMAP.md](./ROADMAP.md) の **Phase 1（2026年11月〜12月：土台・型・データ自動化・Functions基盤）** を手戻りゼロで実装するための詳細設計図です。すべての仕様は [DECISIONS.md](../DECISIONS.md)（`D-001`〜`D-009`）を唯一の正（SSOT）とし、2026年実データ（企画47件・ステージ24件・屋内51室・屋外11スポット）およびローカル開発ツールチェーンの実機挙動と突き合わせて精査済みです。

---

## 0. Phase 1 のゴール（完了定義 / Definition of Done）

Phase 1 完了時点で、以下の 7 項目がすべてエラー・警告ゼロで通過する状態を作ります。

1. **`npm run typecheck`**（ルートおよび `functions` の `tsc --noEmit`、`strict: true`, `noUncheckedIndexedAccess: true`）がエラー 0 件で通過する。
2. **`npm run lint`** が通過し、かつ **境界違反テスト**（`portal` 層から `mop` や `firebase/auth`・`firebase/functions` を import した際に確実に `exit code 1` で遮断されること）が確認されている。
3. **`npm run test`**（`vitest`）が通過し、`stripLocationHashOnly()`（`?src=` 保護）・SNSハンドル正規化・Zodスキーマ検証・マップ全件突合の単体テストがすべてグリーンである。
4. **`npm run validate:data`** が通過し、正規化済み `campus_map_data.json`（全51室＋11スポット欠損ゼロ）と検証用データの整合性・画像サイズ上限が自動検証される。
5. **`npm run process-assets`** がカバー画像・複数枚ギャラリー画像・商品画像を規定サイズ WebP へリサイズ出力する。
6. **`npm run build`**（`Next.js output: 'export'`）で `out/` が静的生成され、`<Suspense>` 未ラップによる CSR フォールバック退行が 0 件である。
7. **`functions`（Cloud Functions 2nd Gen / `nodejs22` / esbuild）** がビルドでき、Firebase Local Emulator Suite（UI `4000`, Hosting `5000`, Functions `5001`, Firestore `8080`, Auth `9099`）上でスモークページが開き、**ブラウザコンソールに CSP 違反・ハイドレーションエラー・JS エラー 0 件** かつ **GA4（`G-VTX813ECF9`）と `?src=` パラメータ保護が正常動作** する。

---

## 1. ターゲットディレクトリ構成（二層物理分離アーキテクチャ）

既存の管理・設定ファイル（`.git/`, `.firebaserc`, `firebase.json`, `firestore.rules`, `docs/`, `DECISIONS.md`, `CHANGELOG.md`）を壊さずに共存させるため、`npx create-next-app` の上書き初期化は使わず、必要な設定とディレクトリをクリーンに構成します。

```text
nanryosai-2027/
├── .firebaserc                      # 既存（nanryosai-2027）
├── .gitignore                       # 追記: assets/original/, functions/lib/, .env*.local, out/, .next/ 等
├── firebase.json                    # 拡張: trailingSlash:false, functions(nodejs22), Hosting本番CSP/長期キャッシュ
├── firestore.rules                  # 既存（Phase 1中は完全フェイルクローズド維持）
├── firestore.indexes.json           # 既存
├── package.json                     # Next.js本体・データ検証/画像圧縮CLI・Vitest
├── next.config.ts                   # output: 'export', trailingSlash: false, images: { unoptimized: true }
├── tsconfig.json                    # strict: true, noUncheckedIndexedAccess: true
├── eslint.config.mjs                # 二層境界強制 (no-restricted-imports) + XSS危険API禁止
├── vitest.config.ts                 # 単体テスト構成（日本語パス「テキスト」配下での動作検証済）
├── .env.production                  # Git管理: 非機密の公開識別子 (G-VTX813ECF9, Firebase Web設定)
├── .env.example                     # 開発者向けオーバーライド例 (NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true 等)
├── data/                            # 【SSOT 静的マスターデータ】
│   ├── campus_map_data.json         # 2026年全51室+11スポット+廊下/階段/トイレ/外周を正規化IDへ完全移植
│   ├── projects.json                # 企画・模擬店マスタ（Phase 1は全カテゴリ網羅の検証用データ）
│   └── stages.json                  # ステージ出演枠マスタ（有志団体・後夜祭区分を含む検証用データ）
├── assets/
│   └── original/                    # 元写真投入用（Git管理外 / 180MB肥大化防止）
├── public/
│   └── images/
│       ├── projects/                # *_thumb.webp, *_hero.webp, *_{1..9}.webp (ギャラリー)
│       └── items/                   # 商品個別WebP（任意）
├── scripts/
│   ├── migrate-map-2026.ts          # 2026年マップ全要素の明示的1対1辞書変換＆件数完全一致アサート
│   ├── validate-data.ts             # Zod＋RoomId実在＋重複＋SNS正規化＋ステージ整合＋画像容量上限検査
│   └── process-assets.ts            # sharp + heic-convert（カバー2段階＋ギャラリー＋商品画像のWebP変換）
├── src/
│   ├── types/
│   │   ├── domain.ts                # ドメイン型 SSOT（Portal / MOP / Functions 共通参照）
│   │   └── schemas.ts               # Zod バリデーションスキーマ（ビルド・Functionsランタイム兼用）
│   ├── lib/
│   │   ├── env.ts                   # 環境変数 Zod 検証＆Emulator接続判定
│   │   ├── firebase-lite.ts         # 第1層専用（firebase/firestore/lite のみ）
│   │   ├── analytics.ts             # GA4 (G-VTX813ECF9) 独立計測 (<Suspense>対応)
│   │   └── url-safety.ts            # stripLocationHashOnly() + 外部URL(javascript:遮断)/SNS正規化
│   ├── styles/
│   │   └── tokens.css               # P-001対応: テーマカラー着せ替え用 CSS変数1ファイル集約
│   ├── domains/
│   │   ├── portal/                  # 【第1層】mop・venue・auth・functions・通常firestore への import 絶対禁止
│   │   │   ├── components/
│   │   │   │   └── PortalLink.tsx   # デフォルト prefetch={false} 強制ラッパー（校内Wi-Fi帯域保護）
│   │   │   └── hooks/
│   │   │       └── useLiveState.ts  # 単一Doc差分パッチ + 60秒スロットル + localStorageフォールバック土台
│   │   ├── venue/                   # 【会場管理層】ステージ混雑・進行更新用（MOPキルスイッチ非連動・来場者バンドルから分離）
│   │   │   └── lib/firebase-venue.ts
│   │   └── mop/                     # 【第2層】Phase 3で本実装（Phase 1はfirebase初期化・静的ルート殻のみ）
│   │       └── lib/firebase-mop.ts
│   └── app/
│       ├── layout.tsx               # 共通HTML骨格・tokens.css・<Suspense>ラップ済GA4トラッカー
│       ├── (portal)/
│       │   └── page.tsx             # Phase 1 土台・二層分離・Emulator疎通確認用トップ枠
│       ├── (venue)/                 # 会場スタッフ管理画面 (/venue + ?venue= — MOP停止時も単独稼働)
│       └── (mop)/                   # 動的[storeId]を使わず静的シェル(/order, /mop/counter等 + ?store=)で構成
└── functions/                       # 【Cloud Functions 2nd Gen 独立コードベース】
    ├── package.json                 # engines.node: "22", esbuild (--external:firebase-admin/functions)
    ├── tsconfig.json                # ../src/types/* の型共有を許可
    └── src/
        └── index.ts                 # asia-northeast1 / concurrency: 80 ヘルスチェック関数枠
```

---

## 2. 事前精査で特定・解消した重要設計ポイント（8項目）

計画精査により判明した落とし穴と、Phase 1 で確実に組み込む対策は以下の通りです。

### ① `firebase-tools 14.25.0` のランタイム制約（即死エラー回避）
- **実機調査結果**: ローカルの `firebase-tools 14.25.0` 内部定義（`runtimes/supported.js`）を直接確認したところ、CLI が許容する最新ランタイムは **`nodejs22`** までであり、`nodejs24` を指定するとエミュレータ起動・デプロイ時に即座に `FirebaseError: not a supported version` で停止することが判明しました。
- **対策**: `firebase.json` の `functions.runtime` および `functions/package.json` の `engines.node` は **`"22"`（`nodejs22`）** に確定します（将来 `firebase-tools` メジャー更新時に1行で `nodejs24` へ引き上げ可能）。

### ② `functions/` の `esbuild` バンドルと Firebase CLI トリガー検出の両立
- **落とし穴**: `esbuild` で `firebase-functions` や `firebase-admin` まで単一ファイルへ巻き込むと、Firebase CLI のトリガー解析（`findModuleVersion`）や `@google-cloud/firestore` のネイティブ動的解決が壊れます。逆に `tsc` 単体で `../src/types/schemas.ts` を参照すると、`functions/` フォルダ外参照となりデプロイ ZIP 作成時に失敗します。
- **対策**: `esbuild src/index.ts --bundle --platform=node --target=node22 --format=cjs --outfile=lib/index.js --external:firebase-admin --external:firebase-functions` を採用します。これにより、**ルートの共有型・Zodスキーマ（`../src/types/*`）は `lib/index.js` 内に安全にインライン展開しつつ、Firebase 公式 SDK のみ外部解決** させることで、トリガー検出・型共有・高速コールドスタートを完全に両立します。

### ③ 南陵高校の実際の教室配置（1Fに3-6/3-7、4Fの1-7/1-6逆転、管理棟3F視聴覚室）への完全対応
- **実データ調査結果**: 2026年 `campus_map_data.json` の全 51 室・11 スポットを全件確認した結果、単純な「2F=3年、3F=2年、4F=1年連番」ではなく以下の固有構造がありました：
  - **生徒棟 1F**: `記念室`・**`3年6組`**・**`3年7組`**・`選択教室3`・`生徒会室`・`進路指導室`・`食事室・調理室`・`化学準備室`・`化学実験室`・`保健室`（10室）
  - **生徒棟 2F**: **`3年1組`〜`3年5組`**・`リソースルーム準備室`・`コンピュータ室`・`作法室`・`被服室`・`書道室`・`書道準備室`・`物理実験室`・`物理準備室`（13室）＋スポット `生徒棟 2F 渡り廊下`
  - **生徒棟・管理棟 3F**: **`2年1組`〜`2年7組`**・`リソースルーム2`・`選択教室2`・`美術室`・`美術準備室`・`生物実験室`・`生物準備室`・**`管理棟 視聴覚室`**（14室＋棟間渡り廊下 `isOverpass`）
  - **生徒棟 4F**: **`1年1組`〜`1年5組`** → `リソースルーム1` → `選択教室1` → **`1年7組`（`188905_4f`）→ `1年6組`（`203688_4f`）**（並び順が逆！）→ `音楽室`・`音楽準備室`・`教科準備室`・`倉庫`（13室）
  - **生徒棟 5F**: `天空の図書館`（1室）
  - **屋外スポット（11件）**: 2026年は `tent_102`, `tent_301` のように年度クラス番号がスポットIDに直書きされていました。
- **対策**: `scripts/migrate-map-2026.ts` では機械的な連番推測を一切行わず、**全51室＋全11スポットを明示的な1対1変換辞書で正規化** します（例：`student_1f_homeroom_3_6`, `student_4f_homeroom_1_7`, `student_4f_homeroom_1_6`, `admin_3f_av_room`, `courtyard_tent_1`〜`4`, `entrance_tent_1`〜`3`, `gym_stage`, `piloti_1f`, `student_2f_overpass` 等）。さらに `corridors`・`stairs`・`toilets`・`buildings`・`outdoorAreas`・`accessRoutes` を欠損なく保持しつつ冗長な `coordinates` 二重配列と `linkedProjectIds` のみを除去し、変換前後で全要素数が完全一致することをスクリプト内でアサートします。

### ④ 2026年実データ（47企画・24ステージ）のコーナーケース網羅
- **対策**: `domain.ts` / `schemas.ts` / `validate-data.ts` に以下を最初から組み込みます：
  - **企画カテゴリ**: 来場者が屋台系と室内販売系を直感的に絞り込めるよう、2026年実績と同じ 4 区分（`'cooking' | 'shop' | 'exhibit' | 'stage'`）＋ `votingCategory` を採用。
  - **複数場所・マップ非表示企画**: ゲーム同好会（教室＋体育館決勝）等の `subPlaceNote?: string` や `hiddenOnMap?: boolean`、全体アレルギー注記 `menuNote?: string` に対応。
  - **SNSハンドルの自動クレンジング検証**: 2026年に実在した `"笹森ってインスタで打ったら出てきます"` のような自由文混入や `@` 重複によるリンク切れを防ぐため、`instagramHandle?: string` は正規表現 `/^[A-Za-z0-9._]{1,30}$/` で Zod 検証し、自由文はビルド時に弾いて `description` 側へ誘導。
  - **ステージ有志団体＆後夜祭区分**: クラス・部活企画を持たない有志団体（`Onebeat`, `☆神seven☆` 等）のため、`StageSlotMaster.linkedProjectId` は任意（指定時のみ実在突合）とし、さらに `sessionType: 'day1' | 'day2_public' | 'after_festival'`（後夜祭＝在校生限定バッジ表示用）を型定義。

### ⑤ `Next.js (output: 'export')` のルーティング設計と `<Suspense>` 退行防止
- **対策**:
  1. **第1層（`(portal)`）**: `/projects/[id]` は `data/projects.json` から `generateStaticParams()` で全企画分の静的 HTML を事前生成（OGP・高速初期表示）。
  2. **第2層（`(mop)`）＆ 会場管理（`(venue)`）**: `/mop/[storeId]/counter` のような動的パスにすると、ビルド後にテスト店舗等を Firestore 側で追加した際 Hosting が `404` になるほか、朝 8:30 の Service Worker 事前キャッシュも店舗数分ばらけます。そのため第2層は **`/order`, `/mop/qr`, `/mop/kitchen`, `/mop/counter`, `/mop/monitor` の単一静的シェル＋`?store=301` クエリ方式** とし、第1層ステージ運用である会場管理画面は **MOPキルスイッチから独立した `/venue`（`(venue)` ルートグループ＋`?venue=gym_stage` クエリ方式）** として来場者 `(portal)` バンドルから分離配置します（`stripLocationHashOnly()` が `?store=` / `?venue=` を保護して `#t=...` だけ消す設計とも完全に噛み合い、1回のキャッシュでオフライン動作が可能）。
  3. **`<Suspense>` 必須ルール**: Static Export 環境で `useSearchParams()` を `<Suspense>` なしで呼ぶとページ全体が空の CSR シェルへ退行するため、GA4 クエリ計測等は必ず `<Suspense fallback={null}>` で分離します。

### ⑥ 画像パイプライン（`process-assets.ts`）のギャラリー・商品画像・未提出フォールバック対応
- **対策**: 2026年は1企画で最大7枚のギャラリー画像（`207_1.webp`〜`207_7.webp`）を持つ団体と、画像未提出（`gallery: []`）の団体が混在していました。`process-assets.ts` は以下を一括処理します：
  - カバー画像 `{id}.{ext}` → `{id}_thumb.webp`（`400px`, q=75, `<= 45KB`）＋ `{id}_hero.webp`（`800px`, q=80, `<= 90KB`）
  - ギャラリー画像 `{id}_{1..9}.{ext}` → `{id}_{n}.webp`（`800px`, q=80, `<= 90KB`）
  - 商品画像 `items/{itemId}.{ext}` → `public/images/items/{itemId}.webp`（`400px`, q=75, `<= 45KB`）
  - 画像未提出団体向けに `hasCoverImage: false` を許容し、404 リクエストを一切発生させないカテゴリ別軽量プレースホルダー描画に対応。

### ⑦ Static Export と両立する本番 Hosting CSP 設計
- **落とし穴**: Next.js の静的書き出し HTML にはハイドレーション用のインライン `<script>self.__next_f.push(...)</script>` が含まれるため、Hosting 側で `script-src 'self'` のみに絞ると全ページの React ハイドレーションが停止します。
- **対策**:
  - `firebase.json` の CSP は、Static Export が必要とする `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com`、および国土地理院タイル・GA4 を許可する `img-src 'self' data: blob: https://cyberjapandata.gsi.go.jp https://www.google-analytics.com https://www.googletagmanager.com` を維持しつつ、`object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'` と厳格な `connect-src` ホワイトリスト（Firebase / GA4 のみ）で外部送信・クリックジャッキングを封じます（本番 `firebase.json` に `localhost` は含めず、エミュレータ実行時のみ検証）。
  - XSS の根本対策として、React 標準エスケープ＋ESLint `react/no-danger: "error"`＋全外部リンクへの `safeExternalUrl()`（`https:` のみ許可・`javascript:` 完全遮断）を徹底します。
  - あわせて `firebase.json` の `hosting` に `"trailingSlash": false` を明記し、`next.config.ts` と挙動を完全一致させます。

### ⑧ 環境変数の再現性確保（`.env.production` コミット＋秘密情報の完全分離）
- **対策**: GA4 測定ID（`G-VTX813ECF9`）や Firebase Web SDK 設定値はブラウザ配信バンドルに埋め込まれる非機密の公開識別子であるため、`.env.production` として Git 管理に含め、クローン直後や別端末でもビルド欠落が起きないようにします。ローカルエミュレータ切り替え（`NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true`）のみ `.env.local`（Git除外）で行い、店舗パスワードソルトや HMAC 鍵などの機密値は `NEXT_PUBLIC_*` に一切置かず Cloud Functions 側のみに閉じ込めます。

---

## 3. ステップ別 実装タスク一覧

### Step 1-1：Next.js 基盤構築・ESLint二層隔離・URL安全処理・GA4組込
- `package.json`（`"dev": "next dev -p 3070"`）、`next.config.ts`、`tsconfig.json`、`vitest.config.ts`、`.gitignore`、`.env.production`、`.env.example` の作成と依存パッケージ導入。
- `eslint.config.mjs` による第1層（`portal`）からの `mop` / `firebase/auth` / `firebase/functions` / 通常 `firebase/firestore` import 禁止設定＋境界違反検知の確認。
- `src/styles/tokens.css`（`P-001` 着せ替え用 CSS カスタムプロパティ集約）、`src/lib/env.ts`、`src/lib/url-safety.ts`（`stripLocationHashOnly`, `safeExternalUrl`, `normalizeInstagramHandle`）、`src/lib/analytics.ts`（`G-VTX813ECF9`）、`src/lib/firebase-lite.ts`、`PortalLink.tsx`（`prefetch={false}`）、`useLiveState.ts` 土台、`(portal)` / `(mop)` ルート骨格の実装。

### Step 1-2：SSOT 型定義（`domain.ts` / `schemas.ts`）＆ 2026年キャンパスマップ完全正規化移植
- `src/types/domain.ts` および `src/types/schemas.ts` の実装（`ProjectMaster`, `MenuItemMaster`, `MenuOptionGroup`, `StoreMopConfig`, `StageSlotMaster`, `PublicLiveStateDoc`, `CampusMapData`）。
- `scripts/migrate-map-2026.ts` を作成・実行し、`nanryosai-2026` の `campus_map_data.json` から全 51 室・11 スポット・9 建物・4 屋外エリア・4 アクセス経路・全階層廊下/階段/トイレを欠損ゼロで正規化IDへ変換し `data/campus_map_data.json` を生成。
- 全カテゴリ（調理MOP店・室内販売・展示・ステージ・有志・後夜祭）を網羅した検証用初期データ（`data/projects.json`, `data/stages.json`）の作成。

### Step 1-3：データ突合バリデーション CLI ＆ 画像 WebP 変換 CLI ＆ Vitest 単体テスト
- `scripts/validate-data.ts`（`npm run validate:data`）：Zod パース、該当フロア内の `roomId` 実在検証、意図しない部屋重複検知、SNS ハンドル形式検証、ステージ `linkedProjectId` 整合検証、参照画像ファイル実在＆容量上限（`<= 45KB` / `<= 90KB`）検査。
- `scripts/process-assets.ts`（`npm run process-assets`）：`sharp` + `heic-convert` による Exif 回転補正＋カバー2段階・ギャラリー・商品画像の WebP 生成とサンプル検証。
- `vitest` 単体テストスイート実行（`?src=` 保護、XSS URL 遮断、Zod 異常系弾き、マップ51室＋11スポット整合テスト）。

### Step 1-4：Cloud Functions 2nd Gen（`nodejs22` + esbuild）＆ Hosting ヘッダ・Emulator 実機検証
- `functions/` 初期化（`engines.node: "22"`, `firebase-admin` モジュラー import, `firebase-functions/v2`, `../src/types/schemas` 共有参照, `esbuild` 外部SDK指定バンドル, `asia-northeast1` / `concurrency: 80` の `healthCheck` 関数）。
- `firebase.json` 更新（`functions` セクション追加、`trailingSlash: false`、静的アセット `immutable` キャッシュ、本番 CSP ヘッダ設定）。
- `npm run build` → Firebase Local Emulator Suite（Hosting `5000` / Functions `5001` / Firestore `8080` / Auth `9099`）起動 → ヘッドレスブラウザ／実通信で **コンソールエラー 0 件・CSP 違反 0 件・`healthCheck` 応答 200・`?src=` 維持** を実機確認。

---

## 4. 着手前の確認事項（デフォルト推奨案）

特に異論がなければ、以下の推奨設定でそのまま実装を開始できます：
1. **ローカル開発ポート**: 既存プロセスとのポート `3000` 競合を避け、`npm run dev` は **`3070`** 番を使用。
2. **元画像フォルダの扱い**: リポジトリ肥大化防止のため `assets/original/` は `.gitignore` 除外とし、変換後の軽量 WebP（`public/images/**`）のみ Git 管理。
3. **Functions ランタイム**: 現行 `firebase-tools 14.25.0` がサポートする最新の **`nodejs22`** を設定（将来 CLI 更新時に `nodejs24` へ更新可能）。
