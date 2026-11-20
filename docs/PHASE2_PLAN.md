# 南陵祭2027 Phase 2 実装計画書（第1層：公式Webポータル基盤 ＆ 会場運用完結）

本計画書は、[ROADMAP.md](./ROADMAP.md) の **Phase 2（第1層「公式Webポータル基盤」の実装）** を手戻りゼロで進めるための詳細実装計画書です。
すべての前提は [DECISIONS.md](../DECISIONS.md)（`D-001`〜`D-010` / `P-001`〜`P-003`）および [RETROSPECTIVE_2026.md](./RETROSPECTIVE_2026.md)（2026年GA4実測・12鉄則）に準拠し、現行コードベース（`v0.1.13`）との技術突合・レッドチーム精査を反映しています。

---

## 0. Phase 2 のゴールと進行原則

### ゴール（完了定義 / Definition of Done）
> **「第2層（MOP/POS）を完全に切り離した状態（`NEXT_PUBLIC_MOP_ENABLED=false`）でも、生徒会公認の公式デジタルパンフレット＋ステージ会場ライブ運用システムとして単体で本番公開できる状態」** を完成させる。

1. **全ポータル画面の静的0ms初期描画**: トップ (`/`)・企画一覧 (`/projects`)・企画詳細 (`/projects/[id]`)・キャンパスマップ (`/map`)・ステージ (`/stages`)・ご案内/アクセス (`/guide`) が Static Export (`out/`) として出力され、`<Suspense>` 未分離による CSR 退行が 0 件である。
2. **二層分離＆3段階キルスイッチの完全動作**: ESLint 境界違反 0 件を維持しつつ、企画詳細の `<OrderEntrySlot />` が「①ビルド環境変数 `isMopBuildEnabled` × ②企画マスタ `mopConfig.enabled` × ③ライブ配信 `mopGlobalEnabled` / 店舗ステータス」の3段階で安全に遮断・表示切替される。
3. **第1層バックエンド＆ルールの自己完結（`D-010.1`）**:
   - `firestore.rules`（`firestore-rules-author` 作成 ＋ `firebase-security-rules-auditor` 監査済）にて `public/live_state` の単一ドキュメント `get` のみを公開し、`list` および全クライアント直接書込（`write`）は全面拒否を維持する。
   - Cloud Functions 2nd Gen (`asia-northeast1`, `concurrency: 80`) にて `loginVenueStaff`（レート制限＋`scrypt` 強ハッシュ検証＋`minValidEpoch`）と `updateVenueLiveStatus`（単一トランザクションで自会場 `venues[venueId]` のみ更新）が稼働する。
4. **キャンパスマップ刷新＆圏外耐性**: 屋内51室＋11スポット＋4バス経路がモジュラー構成（約650行目安）で動作し、初期描画ラベル・`/map?project=ID` 自動階層ジャンプ＆パルス＆ボトムシート・オフライン時の白地ポリゴン維持・開発限定座標コピーツールが機能する。
5. **品質・転送量・E2E基準の達成**:
   - `npm run typecheck` / `npm run lint` / `npm run validate:data` / `npm run test` がエラー 0 件。
   - Firebase Hosting 無料枠（`360 MB/日`）に対し、想定ピーク（例: 1,500人 × 5.5 PV）でも余裕で収まるページ転送量＆非マップ画面への `campus_map_data.json` 非混入を実測確認。
   - Playwright E2E（iPhone縦画面ビューポート・アプリ内WebView相当・`?src=` 保護・CSP違反 0 件・`/venue` → ポータル反映連携）が全件グリーン。

### 重要進行ルール：段階的 UI/UX 共同設計ゲート（`P-003`）
> [!IMPORTANT]
> **UI・ナビゲーションの独断決め打ち禁止（Zero-Assumption Protocol）**
> iOS 76.3%・Instagram/LINE アプリ内 WebView（下部ブラウザバー干渉）・キャンパスマップのボトムシート共存・2026年GA4回遊実態（トップ往復2.30回・文脈ボタン25.5倍）を踏まえ、**スマホナビ構造および各画面の具体的なレイアウト・操作感は本計画書で一方的に固定しません。**
> 先に **Step 2-1（データ・バックエンド・セキュリティ基盤）** を固めた上で、UI実装に入る **Step 2-2 / 2-3 / 2-4 の各着手前に必ず設計案とトレードオフを提示し、ユーザーと協議・合意してから実装** します。

---

## 1. 事前精査で特定した技術ポイントと対策（6項目）

### ① 非マップ画面への `campus_map_data.json`（5,088行）バンドル混入防止
- **現状の課題**: `src/domains/portal/lib/master-data.ts` が `campus_map_data.json`・`projects.json`・`stages.json` を単一モジュールで一括 import しているため、クライアントコンポーネントから同ファイルを参照すると約150KBのポリゴン座標JSONがトップや企画一覧のJSチャンクへ巻き込まれる恐れがある。
- **対策**:
  - `src/domains/portal/lib/portal-master.ts`（`portal_config.json`, `projects.json`, `stages.json` 専用）と `src/domains/portal/lib/map-master.ts`（`campus_map_data.json` 専用）に物理分割する。
  - トップ画面の建物数・部屋数サマリー等は Server Component 側でビルド時に静的計算し、クライアントJSへ `campus_map_data.json` が渡るのは `/map` ルートのみに限定する。

### ② ポータル共通設定 SSOT（`data/portal_config.json`）の新設（`D-010.2`）
- **対策**: 来春〜夏に学校側で確定する日程・投票URL・お知らせをコード修正なしで安全に更新できるよう `data/portal_config.json` を新設し、`PortalConfigSchema`（Zod）および `scripts/validate-data.ts` の一括検証対象に組み込む：
  - `festivalMeta`: 開催年度・回数・スローガン（未定可）・日程モード（`status: 'tentative' | 'confirmed'`, `tentativeLabel: '2027年9月開催予定'`, 確定後の Day1/Day2 開始・終了ISO日時）
  - `grandPrixVoting`: `{ enabled: boolean, votingUrl?: string, noticeText: string }`（`safeExternalUrl` 相当の `https://` 検証付き。受付時間外はリンクを無効化して案内テキストを表示）
  - `announcements`: `{ id, publishedAt, category: 'important' | 'info' | 'stage', title, summary, linkHref? }[]`（2026年GA4で「専用ページよりトップの抜粋で消費された」実態に合わせ、簡潔な構造化データとして保持）
  - `receptionNotes`: 来場者向け注意事項・スリッパ持参案内・撮影規約・公共交通機関アクセス案内

### ③ 公式パンフ完全中立性と CS部導線の両立（`D-010.3`）
- **対策**: 2026年に「特定部活の優遇」として受付QR掲示が不許可となった教訓と、フッター奥埋没（6人 / 1.5%）の双方を解決する：
  - グローバルナビ・トップ上部ヒーローには特定部活名を一切出さず、全団体に対して完全に公平・中立な「南陵祭2027 公式デジタルパンフレット」の体裁を貫く。
  - CS部の展示自体は `projects.json` の1企画として他団体と同列に掲載しつつ、`/guide`（ご案内・アクセス）内に **『公式デジタルパンフレット運営・開発体制（生徒会 × コンピューター科学部）』セクション** を設け、中学生（新入部員候補）や在校生が技術・活動内容へ自然に興味を持てる導線を作る。

### ④ Leaflet × Next.js 15 Static Export × React 19 StrictMode × `innerHTML` 禁止の完全両立
- **対策**:
  1. **SSR回避と初期0ms殻**: `/map` の Leaflet キャンバス本体は `next/dynamic(..., { ssr: false })` で分離し、外枠（フロア切替UI・ディープリンク対象表示・軽量スケルトン）は静的HTMLとして0ms表示する。
  2. **React 19 StrictMode 二重マウント耐性**: `react-leaflet` のピア依存問題を避け、軽量な素の `leaflet`（`^1.9.4`）＋ `@types/leaflet` を採用し、`useRef<L.Map | null>` で明示的に `map.remove()` クリーンアップを制御する。
  3. **ESLint `innerHTML` 禁止ルール準拠のカスタムラベル**: 教室番号＋企画略称＋ジャンル色/完売ドットを描画する `L.divIcon` では、HTML文字列結合ではなく **`document.createElement` ＋ `textContent` で構築した `HTMLElement` を `L.divIcon({ html: element })` に渡す** ことで、XSSシンクを完全にゼロにする。
  4. **国土地理院タイル高倍率404防止＆オフライン白地フォールバック**: `L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', { maxNativeZoom: 18, maxZoom: 22 })` を指定してズーム19〜22でのタイル404嵐を防ぎ、圏外・オフライン時でもキャンパスポリゴンと部屋ラベルだけで100%判読できる配色にする。

### ⑤ `LiveStateProvider` による Firestore 読取回数の極小化（`<= 1 op / 60s`）
- **対策**: 既存の `useLiveState` フックをポータル共通の `LiveStateProvider`（Context）へ昇格させ、トップ・企画一覧・企画詳細・マップ・ステージ間を SPA 遷移しても **60秒スロットルとメモリ/localStorage キャッシュがページ横断で共有** されるようにする。また `document.visibilityState === 'visible'` 復帰時のみ経過時間を判定し、バックグラウンド放置タブでの無駄な読み取りをゼロにする。

### ⑥ `/venue` 限定認証＆単一トランザクション部分更新による安全性担保（`D-003.4` / `D-006.5` / `D-010.1`）
- **対策**:
  - `public/live_state` は単一共有ドキュメントであるため、クライアントからの直接書込は一切開けず（`allow write: if false;`）、Cloud Functions `updateVenueLiveStatus` 経由に一本化する。
  - パスワード検証には外部バイナリ不要な Node.js 標準 `node:crypto` の `scrypt` ＋ `timingSafeEqual` を使用し、`venue_secrets/{venueId}` の `minValidEpoch` とカスタムクレーム `epoch` を毎回トランザクション内で照合することで、緊急時のパスワード変更・端末即時失効（`D-006.5`）を確実に機能させる。
  - `updateVenueLiveStatus` は Firestore トランザクション内で `venues[ callerVenueId ]` と `updatedAtIso` のみを更新し、他会場の状態や `mopGlobalEnabled`・`mopStores`・`emergencyBanner` の改ざんを構造的に不可能にする。

---

## 2. 追加・更新予定のディレクトリ＆ファイル構成

```text
nanryosai-2027/
├── data/
│   └── portal_config.json               # 【新規】開催日程(未定/確定)・GP投票設定・通常お知らせ・案内マスタ
├── firestore.rules                      # 【更新】firestore-rules-author委任: public/live_state の get のみ許可
├── scripts/
│   ├── validate-data.ts                 # 【拡張】portal_config.json の Zod＆内部リンク整合性チェック追加
│   └── seed-venue-secrets.ts            # 【新規】Emulator/管理用: 会場PWのscryptハッシュ生成投入CLI(平文Git保存ゼロ)
├── src/
│   ├── types/
│   │   ├── domain.ts                    # 【拡張】PortalConfig, AnnouncementItem, LoginVenueReq/Res 等を追加
│   │   └── schemas.ts                   # 【拡張】PortalConfigSchema, UpdateVenueLiveStatusInputSchema 等を追加
│   ├── domains/
│   │   ├── portal/
│   │   │   ├── context/
│   │   │   │   └── LiveStateProvider.tsx  # 【新規】ポータル横断60秒スロットル＆オフライン降格状態共有
│   │   │   ├── hooks/
│   │   │   │   ├── useLiveState.ts        # 【拡張】Provider連携・visibilitychange対応
│   │   │   │   └── useFavorites.ts        # 【新規】ログインレス localStorage お気に入り同期フック
│   │   │   ├── lib/
│   │   │   │   ├── portal-master.ts       # 【分割】portal_config / projects / stages ローダー（軽量）
│   │   │   │   └── map-master.ts          # 【分割】campus_map_data ローダー＆部屋/スポット逆引き（/map専用）
│   │   │   └── components/
│   │   │       ├── EmergencyBanner.tsx    # プレーンテキスト安全エスケープ緊急バナー
│   │   │       ├── OrderEntrySlot.tsx     # 3段階キルスイッチ内蔵 MOP連携枠（mop層importゼロ）
│   │   │       ├── FavoriteButton.tsx     # localStorage 即時トグルボタン
│   │   │       └── map/                   # 約650行目安のモジュラーLeafletマップ群（CSS Modules併用）
│   │   │           ├── CampusMapView.tsx
│   │   │           ├── MapCanvas.tsx
│   │   │           ├── FloorSwitcher.tsx
│   │   │           ├── ProjectPeekSheet.tsx
│   │   │           └── DevCoordPicker.tsx # NODE_ENV === 'development' 限定の座標コピー小ツール
│   │   └── venue/
│   │       ├── components/
│   │       │   ├── VenueLoginForm.tsx     # 会場選択＋PW手入力（URLクエリ露出ゼロ・分かりやすいエラー表示）
│   │       │   └── VenueControlPanel.tsx  # 混雑度4段階・現在演目・遅延分数の1タップ即時更新UI
│   │       └── lib/
│   │           └── venue-api.ts           # httpsCallable ラッパー（loginVenueStaff / updateVenueLiveStatus）
│   └── app/
│       └── (portal)/
│           ├── layout.tsx                 # LiveStateProvider ＋ 協議決定後のポータル共通ナビ・ヘッダ/フッタ
│           ├── page.tsx                   # トップページ（ヒーロー・カウントダウン・注目企画・NOW/NEXT・お知らせ）
│           ├── projects/
│           │   ├── page.tsx               # 企画一覧（ジャンルタブ・即時検索・お気に入り絞り込み）
│           │   └── [id]/page.tsx          # 企画詳細（メニュー・ギャラリー・GP投票・マップ文脈遷移・OrderEntrySlot）
│           ├── map/
│           │   └── page.tsx               # キャンパスマップ（?project=ID ディープリンク対応）
│           ├── stages/
│           │   └── page.tsx               # ステージタイムテーブル（3会場×Day1/Day2/後夜祭＋ライブ遅延反映）
│           └── guide/
│               └── page.tsx               # 南陵祭案内・バス経路・規約・『生徒会×CS部 共同運営紹介』
├── functions/
│   └── src/
│       ├── index.ts                       # healthCheck + loginVenueStaff + updateVenueLiveStatus エクスポート
│       └── venue/
│           ├── crypto-password.ts         # scrypt ソルト付きハッシュ生成・定数時間検証（Phase 3 store_staff と共通化可）
│           ├── rate-limit.ts              # Firestore トランザクションによる認証レート制限
│           └── venue-handlers.ts          # loginVenueStaff / updateVenueLiveStatus 本体
└── playwright.config.ts & e2e/            # 【新規】モバイル縦画面・WebView相当・Emulator E2E テストスイート
```

---

## 3. ステップ別 実装ロードマップ（全5ステップ）

### Step 2-1：ポータル共通設定 SSOT ＆ 第1層バックエンド・セキュリティルール構築
> UI検討に入る前に、データの型安全性と `public/live_state` の読み書き基盤をエミュレータ上で完全稼働させる。

1. `domain.ts` / `schemas.ts` に `PortalConfig`・`VenueStaffAuth`・`UpdateVenueLiveStatus` の型と Zod スキーマを追加。
2. `data/portal_config.json` を作成し、`scripts/validate-data.ts` に検証ロジックを追加。あわせて検証用 `projects.json` / `stages.json` を Phase 2 の画面確認に十分なバリエーションへ補強。
3. `master-data.ts` を `portal-master.ts` と `map-master.ts` に分離し、非マップ画面のバンドル肥大化を防止。
4. **`firestore-rules-author` サブエージェントへ委任** して `firestore.rules` を更新（`public/live_state` の `get` のみ `true`、他全コレクション・`list`・`write` は `false` 維持）→ `firebase-security-rules-auditor` チェックリストで監査 → Emulator ルール単体テストを追加。
5. `functions/src/venue/*` に `loginVenueStaff`・`updateVenueLiveStatus` および `scripts/seed-venue-secrets.ts` を実装し、Functions + Firestore + Auth Emulator 連携テストを通す。

---

### Step 2-2：ポータル共通ナビ ＆ 来場者向けコア画面群の実装（`ROADMAP 2-1`）
> **💬 着手前 UI 共同設計ゲート #1**:
> - スマホナビゲーション構造（iOS Safari / Instagram・LINE WebView 下部バーとの共存、トップ往復ハブとの役割分担）
> - トップページのセクション優先順位と注目企画カードの見せ方
> - 企画一覧の検索・ジャンルタブ・お気に入りUIの配置
> **上記をユーザーと協議・決定してから実装に入る。**

1. `useFavorites`（`localStorage` 完結・SSRハイドレーション不一致ゼロ設計）および `FavoriteButton` 実装。
2. `LiveStateProvider` および `EmergencyBanner`（React標準テキストエスケープ徹底・`innerHTML` ゼロ）実装。
3. トップページ（`/`）：ヒーロー、開催カウントダウン（`tentative` / `confirmed` 自動切替）、緊急バナー、ステージ NOW/NEXT タイムライン、注目企画カード、お知らせ抜粋、実用アクセス導線。
4. 企画一覧ページ（`/projects`）：4ジャンル切替、外部通信ゼロの軽量キーワード即時検索（企画名・団体名・キャッチコピー・タグ・メニュー名対象）、お気に入りフィルタ、MOP店の完売バッジ連動。
5. 企画詳細ページ（`/projects/[id]`）：静的0ms描画、メニュー＆オプション・アレルギー表示、ギャラリー、南陵GP投票枠、`localStorage` お気に入り、**『この場所をマップで見る』（`/map?project=ID`）強導線**、`<OrderEntrySlot />`（3段階キルスイッチ）。
6. ステージタイムテーブルページ（`/stages`）：体育館・視聴覚室・音楽室の会場/日程切替、後夜祭（在校生限定）バッジ、出演団体の企画詳細リンク。
7. ご案内・アクセスページ（`/guide`）：開催概要・注意事項・4系統バスアクセス案内・利用規約・『生徒会×CS部 共同運営・技術紹介』（公式中立クレジット）。

---

### Step 2-3：キャンパスマップ刷新（`ROADMAP 2-2` / 約650行モジュラー実装）
> **💬 着手前 UI 共同設計ゲート #2**:
> - 初期描画での「教室番号＋企画略称＋ジャンル色/完売ドット」ラベルの情報密度とズーム連動（34/83人がピンを触らず一枚絵閲覧した実測への最適解）
> - フロア切替ボタン（`1F〜5F` / `屋外・バス経路`）と下部ボトムシート（Peek）の操作感
> **上記をユーザーと協議・決定してから実装に入る。**

1. `leaflet` + `@types/leaflet` を導入し、`src/domains/portal/components/map/` 配下に責務分割された CSS Modules コンポーネントを構築（1ファイル巨大化を厳禁）。
2. `1F〜5F` 屋内ポリゴン（教室・特別室・廊下・渡り廊下・階段・男女/多目的トイレ）および `屋外`（校舎外周・中庭/昇降口テント・4バスルート）切替描画。
3. `document.createElement` + `textContent` による安全なカスタム `divIcon` ラベル（教室番号＋企画略称＋カテゴリ色＋MOP完売ドット）。
4. `/map?project=ID` ディープリンク時の該当フロア自動選択・対象ポリゴン/スポットへのスムーズフォーカス＆パルス強調・下部ボトムシート（Peek）自動展開（`?src=` 等の計測クエリも保護）。
5. `NODE_ENV === 'development'` 限定の「クリック地点 `[lat, lng]` 1タップコピー小ツール」（屋外テント座標調整用・本番ビルドではデッドコード除去）。

---

### Step 2-4：ライブ差分配信結合 ＆ 会場スタッフ管理画面 `/venue` 本実装（`ROADMAP 2-3`）
> **💬 着手前 UI 共同設計ゲート #3**:
> - 現場スタッフが2日間で182回更新し、かつ2026年にログイン21.4%失敗が起きた教訓を踏まえた、迷わない `/venue` ログイン＆1タップ更新画面レイアウトを協議・決定する。

1. `/venue`（`src/domains/venue/`）にて `VenueLoginForm`（`?venue=` 初期選択対応、パスワード手入力、`sessionStorage` / Auth Persistence による当日セッション維持、URLへのトークン露出ゼロ）を実装。
2. `VenueControlPanel` 実装：自会場のみの混雑度4段階（空いています / やや混雑 / 混雑 / 入場制限中）・現在進行中の演目選択・遅延分数（`0分` / `+5分` / `+10分` / `+15分` / `±微調整`）・一言メモを1〜2タップで即時送信。
3. ポータル側（トップ NOW/NEXT・`/stages`・`/projects`・`/projects/[id]`・`/map`）での `PublicLiveStateDoc` リアルタイム反映と、圏外・エラー時の「最終更新時刻 / オフライン安全表示」控えめバッジの統合確認。

---

### Step 2-5：第1層品質検証・転送量実測・Playwright E2E（`ROADMAP 2-4`）
1. **バンドル＆転送量監査**:
   - `next build` 生成物（`out/`）の全ルート別 HTML + JS + CSS + WebP 初期転送量を計測し、`campus_map_data.json` が `/map` 以外に一切含まれていないこと、および Firebase Hosting `360 MB/日` 無料枠に対する安全マージンを数値検証する。
2. **Playwright E2E テスト構築・実行**:
   - iPhone 縦画面ビューポート＆WebView相当での全ページ遷移、キーワード検索・お気に入り永続化、`/projects/[id]` → `/map?project=ID` ジャンプ、`<OrderEntrySlot />` 3段階キルスイッチ、`?src=pamphlet` 保持＆`#` フラグメントのみ消去、Hosting Emulator 上での CSP 違反 0 件、および `/venue` 更新 → ポータル `useLiveState` 反映までの E2E 通し検証。
3. **クラウド反映の最終確認（承認ゲート）**:
   - ローカル全検証結果をユーザーへ報告し、明示的な承認を得た場合にのみ Firebase Hosting プレビューチャンネル等へのデプロイ確認を実施する。
