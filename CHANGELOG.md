# 変更履歴 (Change Log)

<!-- [AI警告] 更新前に必ずこのファイルの冒頭80行を読み、最新のバージョンを確認して重複を避けること。新しいバージョンは必ず最上部に挿入すること。 -->

本プロジェクトにおけるすべての重要な変更はこのファイルに記録されます。

フォーマットは [Keep a Changelog](https://keepachangelog.com/ja/1.0.0/) に基づき、
バージョン管理は [Semantic Versioning](https://semver.org/spec/v2.0.0.html) に準拠しますが、以下の独自基準を最優先します。

### バージョニング基準

- **最上位基準**: ユーザーがプロダクトとして「完全に使える状態になった」と判断したかどうか。
- **メジャー (Major / x)**: ユーザーがすべてのファイルを精査し、「南陵祭本番で稼働できる」と判断した時のみ更新。
- **マイナー (Minor / y)**: ユーザーとAIの試行錯誤を経て、ユーザーが「完了・一区切り」を宣言・承認した時のみ更新。
- **パッチ (Patch / z)**: 日常的な機能追加、バグ修正、設計書の更新、リファクタリングなど。

---

## [0.1.23] ハンバーガーメニュー開閉アニメーション修正（`<dialog>` `@starting-style`）＆ 遷移時暗転解消・上からフロー遷移最適化 - 2026-11-20

### メタ情報

- **AIモデル**: Antigravity
- **筆者**: AI & 山本洋昌 (Uokun)
- **変更理由**: ハンバーガーメニュー展開時の `scroll-timeline` + `scroll-snap` 競合によるアニメーション不具合、ページ遷移時に `opacity: 0` 始点による一瞬の暗転が発生していた問題、および横スライド遷移が残っていないかの総点検と「上から流れるように出てくる」滑らかな遷移への調整を行うため。

### 変更内容

- **ハンバーガーメニュー展開・閉じアニメーションの刷新** (`src/domains/portal/components/PortalShell.tsx`, `src/styles/portal.css`):
  - `animation-timeline: scroll()` と `.portal-drawer-scroller`（`scroll-snap-type: x mandatory` + `IntersectionObserver`）の複合による開閉不具合・バックドロップ競合を撤廃。
  - ネイティブ `<dialog>` の `@starting-style` + `transition-behavior: allow-discrete` + `data-closing` + `dialog.getAnimations({ subtree: true })` によるトップレイヤーアニメーションへ移行し、右スワイプで閉じる操作もドロワー本体上のタッチハンドラで直接制御。
- **ページ遷移時の一瞬の暗転解消と上から流れる遷移の最適化** (`src/styles/portal.css`):
  - `.portal-route-stage` の `portalRouteFloatIn`（`opacity: 0` 始点 + `will-change`）を廃止し、`portalRouteFlowDown`（`opacity: 0.9 -> 1`, `translate3d(0, -16px, 0) -> translate3d(0, 0, 0)`, `220ms cubic-bezier(0.22, 1, 0.36, 1)`）へ変更。
  - `src` 配下に横スライド遷移（`tab-forward` / `tab-backward` / `translateX` ルート遷移）が残存しないことも確認済み。

---

## [0.1.22] 初回ページ遷移カクつき解消（Suspense一覧即時描画・ロゴリフロー抑止・即時先読み）＆ 上からフローティング遷移への変更 - 2026-11-20

### メタ情報

- **AIモデル**: Antigravity
- **筆者**: AI & 山本洋昌 (Uokun)
- **変更理由**: 初回ページ遷移時（特に `/projects` 等）に「読み込み中...」フォールバック差し替えやロゴ再計測リフローが横スライドアニメーションと重なってカクつく問題を解消し、より安定して滑らかな「上からフローティング（`translate3d(0, -10px, 0)` + `opacity`）」遷移へ統一するため。

### 追加 / 変更 (Added / Changed) / 修正 (Fixed)

- **ページ遷移モーションを「上からフローティング」へ変更（`PortalShell.tsx` / `portal.css`）**:
  - 左右スライド（`tab-forward` / `tab-backward`）を廃止し、どのルート遷移でも一律に上からスッと現れる `portalRouteFloatIn`（`translate3d(0, -10px, 0) -> 0` + `opacity`、`210ms`、`will-change: transform, opacity`）へ統一。
- **初回遷移カクつき解消（`ProjectsCatalogClient.tsx` / `WaveLogo.tsx` / `PortalShell.tsx`）**:
  - `ProjectsCatalogClient.tsx` の `<Suspense fallback>` を「読み込み中...」テキストから完全な `ProjectsCatalogContent` へ置き換え、`/projects` 初回遷移時の高さジャンプ・チラつきをゼロ化。
  - `WaveLogo.tsx` で算出済み `--logo-fit-size` を `:root` とモジュールキャッシュに保持し、ルート遷移でフッターが再マウントされても強制同期リフローを発生させないよう最適化。
  - `PortalShell.tsx` の主要導線プリフェッチを `requestIdleCallback(timeout: 1500)` 待ちからマウント直後実行へ変更し、初タップ前のチャンク先読み率を向上。

### 得られた知見 / 注意点 (Learned / Caveats)

- **`<Suspense fallback>` とアニメーションの衝突**:
  - Static Export 対策で `useSearchParams()` を `<Suspense>` 分離する際、フォールバックを「読み込み中...」の1行にすると、SPA 遷移直後にアニメーション中でフォールバック→実データへ差し替わりレイアウトジャンプを引き起こす。フォールバック側にもデフォルト状態の完全DOMを置くことで静的HTML・初回遷移双方の体感が劇的に滑らかになる。

---

## [0.1.21] 開催カウントダウン状態遷移（24時間未満特別アニメーション・開催中／閉幕自動切替）＆ 一時確認クエリ - 2026-11-20

### メタ情報

- **AIモデル**: Antigravity
- **筆者**: AI & 山本洋昌 (Uokun)
- **変更理由**: 開催日当日に「開催まであと」が `0:00:00` で止まらず自動的に「開催中！」表示へ切り替わることを保証し、あわせて開催1日未満時の特別アニメーション演出と本番公開URL上で検証できる一時確認クエリを提供するため。

### 追加 / 変更 (Added / Changed)

- **カウントダウン全フェーズ自動判定（`HomeCountdown.tsx` / `portal.css`）**:
  - `DAY1`（`2027-09-10 09:00〜17:00`）、`DAY1終了〜DAY2開始`（`DAY 2 一般公開まであと`）、`DAY2`（`2027-09-11 09:00〜17:30`）、`閉幕後` の各状態を `computeFestivalPhase` で自動判定し、開催時間帯は `NOW OPEN · DAY 1/2` パルス付き「南陵祭 2027 開催中！」バナーへ自動遷移するようにした。
  - 開催まで24時間未満（`diff <= 86,400,000ms`）になると `.countdown-imminent` モードとなり、`24H COUNTDOWN` バッジ・オーラ浮遊アニメーション（`countdownAura`）・秒ボックスのティックバウンス（`secTickA/B`）を発火（`prefers-reduced-motion: reduce` 時は停止）。
- **一時確認クエリ対応（Static Export `<Suspense>` 分離）**:
  - `/?countdown=under24h`（23:59:50前）・`/?countdown=last10s`（8秒前→0秒到達で「開催中！」へ自動切替確認）・`/?countdown=live`・`/?countdown=live1`・`/?countdown=ended` に対応し、クエリ付与時のみ下部に1タップ切替バーを表示（通常アクセスでは非表示）。

### 得られた知見 / 注意点 (Learned / Caveats)

- **1秒ごとの CSS キーフレーム再トリガー**:
  - 秒ボックスへ `data-tick={secTick % 2}` を交互付与し `secTickA` / `secTickB` の2キーフレームを割り当てることで、React で DOM を作り直すことなく毎秒確実かつ軽量にバウンス演出を再生できる。

---

## [0.1.20] ハンバーガーメニュー刷新（高速展開・項目整理・オーダー発光・大きめ便利機能・規約アコーディオン・ビルド時バージョン表記） - 2026-11-20

### メタ情報

- **AIモデル**: Antigravity
- **筆者**: AI & 山本洋昌 (Uokun)
- **変更理由**: ハンバーガーメニューの開閉体感速度を大幅に短縮しつつ、来場者導線（開催概要・発光強調オーダー・企画一覧・ステージ一覧・マップ・アクセス・コンピュータ科学部について）、大きめ表示の「便利機能」（お気に入り・人気投票・アンケート）、控えめな規約等アコーディオン、および `CHANGELOG.md` を毎回読み込まずに済む軽量なバージョン表記を実装するため。

### 追加 / 変更 (Added / Changed)

- **ハンバーガーメニュー展開・閉じ速度の高速化（`PortalShell.tsx` / `portal.css`）**:
  - 開閉時の `requestAnimationFrame` 2回待ちと `scroll-behavior: smooth`（約450〜600ms遅延）を撤去し、即時スナップ位置設定＋`160ms` 開／`130ms` 閉の `translate3d` コンポジタアニメーションへ移行（スワイプ閉じ操作は `scroll-snap` ＋ `IntersectionObserver` で維持）。
- **メニュー構成刷新＆発光オーダー・大きめ便利機能・目立たないアコーディオン**:
  - `menu-list` を「開催概要」「オーダー（`.menu-order-glow` 発光強調）」「企画一覧」「ステージ一覧」「マップ」「アクセス」「コンピュータ科学部について」へ再構成。
  - 「便利機能」に「お気に入り（全幅カード）」「人気投票」「アンケート」を大きく配置し、その下へ `<details className="menu-accordion">`（「お知らせ・規約など」：お知らせ・使える決済・利用規約・プライバシーポリシー）を控えめに追加。
- **ビルド時バージョン埋め込み（`next.config.ts` / `env.ts`）**:
  - `next.config.ts` にて `package.json` の `version` を `NEXT_PUBLIC_APP_VERSION` へ自動注入し、ドロワー下部の `Powered by コンピュータ科学部` 直下に `v0.1.20` を外部通信ゼロで表示（`CHANGELOG.md` のランタイム参照を廃止）。

### 得られた知見 / 注意点 (Learned / Caveats)

- **スワイプ可能ドロワーと高速開閉の両立**:
  - `<dialog>` + `scroll-snap` を残したまま開閉アニメだけを CSS `transform: translate3d(...)`（160ms/130ms）で駆動し、スワイプ閉じのみ `scroll-snap` ＋ `IntersectionObserver` に任せることで、指操作の自然さとタップ時の即応性を両立できた。

---

## [0.1.19] ライトモード瞬間ダーク化根治・ランダム自動スナップハイライト・タイムテーブル 09:00〜18:00＆DAY自動判別＆現在時刻ライン位置オートスクロール - 2026-11-20

### メタ情報

- **AIモデル**: Antigravity
- **筆者**: AI & 山本洋昌 (Uokun)
- **変更理由**: ① ライトモード設定時のページ遷移・再読込における一瞬のダーク表示フラッシュを根治し、② 企画ハイライトを完全ランダム抽出＋自動スナップカルーセル（フィルタ/矢印ボタンなし）へ簡潔化し、③ ステージタイムテーブルを 09:00〜18:00（10列）化・DAY1/DAY2 自動判別・現在時刻赤ライン＋初期表示での赤ライン位置オートスクロールを実現するため。

### 追加 / 変更 (Added / Changed) / 修正 (Fixed)

- **ライトモード瞬間ダークフラッシュ根治（`layout.tsx` / `theme-init.js` / `ThemeProvider.tsx`）**:
  - `src/app/layout.tsx` の `next/script`（`beforeInteractive` は App Router では `self.__next_s` 経由で非同期実行される）を `<head>` 内の同期 `<script src="/theme-init.js" />` へ変更し、初回ペイント前に `data-theme` と `root.style.colorScheme` を確定。
  - `ThemeProvider` を `src/components/ThemeProvider.tsx` として `RootLayout` 直下へ昇格（`src/domains/portal/context/ThemeProvider.tsx` は互換再エクスポート）し、`(portal)` ↔ `(mop)` ↔ `(venue)` 遷移時もテーマ状態を維持して Next.js `<head>` 再調整による上書きを防止。
- **企画・展示ハイライトの完全ランダム＆自動スナップ化（`HomeProjectHighlights.tsx` / `portal.css`）**:
  - ジャンルチップ・左右矢印ボタン・停止ボタンを撤去し、「すべて見る（`/projects`）」導線へ一本化。
  - 表示時に非ステージ企画を Fisher-Yates シャッフルして最大6件をランダム抜粋し、3.5秒間隔で1枚ずつ自動スナップ移動（タッチ・ホバー・フォーカス中および `prefers-reduced-motion: reduce` 時は自動停止）。
- **ステージタイムテーブル 09:00〜18:00 ＆ DAY自動判別 ＆ 現在時刻ライン追従（`HomeStageGantt.tsx` / `portal.css`）**:
  - 列構成を `09:00`〜`18:00`（10列・09:00〜19:00幅）へ拡張。
  - JST 日付に基づき `2027-09-11` は `DAY 2`、それ以外（`2027-09-10` および事前期間）は `DAY 1` を自動判別（手動切替時は手動選択を維持）。
  - JST 現在時刻の赤いライン（`.now-line` ＋ 時刻ラベル `.now-pill`）を表示し、初期マウント時に `.gantt-scroll` を赤いラインが中央に見える位置へ自動スクロール。

### 得られた知見 / 注意点 (Learned / Caveats)

- **Next.js App Router における `beforeInteractive` の実行タイミング**:
  - Pages Router と異なり App Router では `<Script strategy="beforeInteractive" />` が `<body>` 内の `self.__next_s` へ出力されるため、OS ダーク設定下でライトモードを選択していると初回描画がダークになる場合がある。同期 `<script src="/theme-init.js" />` を `<head>` に配置することで描画前確定が可能。

---

## [0.1.18] リアルタイム情報のレスポンシブ一本化（スマホ横長バー／PC3列）＆ インタラクティブ遷移連携 - 2026-11-20

### メタ情報

- **AIモデル**: Antigravity
- **筆者**: AI & 山本洋昌 (Uokun)
- **変更理由**: スマホ＝縦積み横長バー／PC＝3列グリッドへのレスポンシブ一本化（比較用 `?venues=` クエリの整理）と、リアルタイム情報カード／バーからの会場別ステージ・出演企画へのインタラクティブな直接遷移を実現するため。

### 追加 / 変更 (Added / Changed)

- **リアルタイム情報レスポンシブ一本化＆インタラクティブ化（`HomeLiveVenues.tsx` / `portal.css`）**:
  - 試験比較用クエリ（`?venues=grid|bar`）と `<Suspense>` ラッパーを整理し、CSS コンテナクエリ（`@container (max-width: 640px)` で横長バー、それ以上のPC/タブレットで3列グリッド）へ一本化。
  - 各カード／バーにストレッチリンク（`/stages?venue=<venueId>`）とホバー・押下（`scale: 0.985`）・`:focus-visible` フィードバックを実装し、`NOW` 出演枠に `linkedProjectId` がある場合はそのまま `/projects/[id]` へ直接遷移できる独立導線（`z-index: 2`）を配置。
- **ステージ一覧の `?venue=` ディープリンク連動（`StagesCatalogClient.tsx` / `HomeStageGantt.tsx` / `/stages`）**:
  - `src/domains/portal/components/StagesCatalogClient.tsx` を新設し、`/stages?venue=gym_stage` 等の遷移時に該当会場タブの自動選択・ライブ混雑/遅延ステータス表示・プログラム一覧の自動絞り込み・ガントチャート対象レーン強調を行うよう拡張（Static Export 対応のため `<Suspense>` 分離）。

### 得られた知見 / 注意点 (Learned / Caveats)

- **カード全体クリックと内部リンクの両立（`<a>` ネスト禁止準拠）**:
  - HTML 仕様上 `<a>` の中に `<a>` を入れられないため、見出し内 `<PortalLink className="venue-card-link">` の `::after` 疑似要素でカード全体を覆い、内部の `NOW` リンクのみ `position: relative; z-index: 2` で前面配置することでアクセシビリティと直接遷移を両立した。

---

## [0.1.17] ページ遷移方向連動アニメーション（ヘッダ・下部ナビ固定＋コンテンツ＆フッタ切替） - 2026-11-20

### メタ情報

- **AIモデル**: Antigravity
- **筆者**: AI & 山本洋昌 (Uokun)
- **変更理由**: ページ遷移時の体感の滑らかさと現在地の空間的把握を向上させるため、ヘッダーおよび下部フローティングナビを固定したまま、ページ本体＋フッターに対して遷移方向に応じたネイティブアプリ風トランジションアニメーションを追加する。

### 追加 / 変更 (Added / Changed)

- **方向連動ルートトランジションステージ（`PortalShell.tsx` / `portal.css`）**:
  - `src/domains/portal/components/PortalShell.tsx` に `getTabOrder` / `resolveRouteTransition` を追加し、メインコンテンツ（`{children}`）と `<footer className="app-footer">` を `<div key={pathname} className="portal-route-stage" data-transition={...}>` で括った。
  - 下部タブ間の遷移はタブ順序に応じて左右スライド＋フェード（`tab-forward` / `tab-backward`: `220ms`）、`/projects/[id]` や `/guide` への遷移は下からの浮き上がり＋フェード（`drill-in`: `230ms`）、詳細から一覧への戻りは沈み込みフェード（`drill-out`: `200ms`）を適用。
  - `src/styles/portal.css` ではデフォルト静的状態を保ちつつ `@media (prefers-reduced-motion: no-preference)` 内でのみ `transform: translate3d(...)` / `opacity` の GPU コンポジタアニメーションを発火させ、OSの「視差効果を減らす」設定を遵守した。

### 得られた知見 / 注意点 (Learned / Caveats)

- **レンダー中ステート調整による初回フレーム一致**:
  - `useEffect` ではなく React のレンダー中ステート更新（`if (routeAnim.path !== pathname)`）で遷移種別を決定することで、初回ロード時は `data-transition="none"`（0ms LCP無遅延）を保ちながら、クライアント遷移時は1フレーム目から正しい方向アニメーションを発火できる。

---

## [0.1.16] Phase 2 ベースUI改善（Webフォント刷新・スマホ横長LIVEバー・ハイライトカルーセル・遷移高速化・フル幅ロゴ） - 2026-11-20

### メタ情報

- **AIモデル**: Antigravity
- **筆者**: AI & 山本洋昌 (Uokun)
- **変更理由**: Phase 2 ポータルUIの第一印象と操作性を引き上げるため、① システム依存の細いフォント刷新（`Noto Sans JP` + `Plus Jakarta Sans` セルフホスト化＆太めウェイト統一）、② スマホ時の「リアルタイム情報」窮屈解消（縦積み横長バー化＋`/?venues=grid|bar` 比較クエリ対応）、③ 「企画・展示 ハイライト」の検証用表記除去＆本番20団体以上を見据えた横スクロール・スナップカルーセル化、④ ページ遷移ロード体感の高速化、⑤ フッター大型ロゴ `南陵祭'27` のウィンドウ横幅限界フィットを一括実装する。

### 追加 / 変更 (Added / Changed)

- **タイポグラフィ刷新（セルフホスト Web フォント化）**:
  - `src/app/layout.tsx` で `Noto_Sans_JP`（`500`/`700`/`900`）および `Plus_Jakarta_Sans`（`500`/`700`/`800`）を `next/font/google`（`display: 'swap'`・`'self'` 配信）で読み込み、`src/styles/tokens.css` の `--font-sans` と `.num` へ適用し、本文ベースウェイトを `500` へ引き上げて視認性と質感を改善。
- **スマホ版リアルタイム情報「縦積み横長バー」＋ 比較クエリ対応**:
  - `src/domains/portal/components/HomeLiveVenues.tsx` および `src/styles/portal.css` を更新し、モバイル幅（`@container (max-width: 640px)`）ではデフォルトで 1列×3行の横長バー表示（左アクセントライン・会場名＋混雑ピル＋時刻ヘッダ＋`NOW`/`NEXT` 行）とし、`/?venues=grid` で旧3列表示と即時比較できるようにした（`useSearchParams` は `<Suspense>` 分離し Static Export の0ms初期描画を維持。クエリ指定時のみ比較トグル表示）。
- **企画ハイライトの表記整理 ＆ 横スクロールカルーセル化**:
  - `data/projects.json` / `data/stages.json` から `【検証用】`・`（調理非干渉モード）`・`（Phase 1 検証データ）` 等の検証ラベルを自然なサンプル表記へ整理（ID・座標・MOP設定・検証ルールは維持）。
  - `src/domains/portal/components/HomeProjectHighlights.tsx` を CSS Scroll Snap ベースの横スクロールカルーセル（最大6件抜粋・右端次カード Peek 表示・`overscroll-behavior-x: contain`・`<>` ボタン・24px以上ヒット領域のドットインジケータ・`aria-live="polite"` 通知）へ刷新し、`PortalIcon.tsx` へ `chevron-left` を追加。
- **ページ遷移ロード高速化**:
  - `src/styles/tokens.css` の `html` から `scroll-behavior: smooth` を撤去し、Next.js App Router のルート遷移時のページ先頭スクロール引っかかりを解消。
  - `src/domains/portal/components/PortalLink.tsx` でデフォルト `prefetch={false}`（大量一覧での無差別先読み抑止）を保ったまま、ホバー・タッチ開始・フォーカス時に1回だけ `router.prefetch()` を走らせる意図ベース先読みを導入し、`src/domains/portal/components/PortalShell.tsx` では主要導線（`/`, `/projects`, `/order`, `/stages`, `/map`, `/guide`）をアイドル時に自動プリフェッチするよう改善。
- **フッター大型ロゴのウィンドウ横幅限界フィット**:
  - `src/domains/portal/components/WaveLogo.tsx` に `ResizeObserver`＋`document.fonts.ready` 連動の自動幅フィット計測（read-before-write でリフロー連鎖なし）を実装し、`src/styles/portal.css` の `.biglogo-wrap` 左右余白撤廃とウェーブ上端余白確保により、390pxスマホ〜1280px以上PCまで画面横幅限界（約99%）へフィットさせた。

### 得られた知見 / 注意点 (Learned / Caveats)

- **Static Export 下での `html { scroll-behavior: smooth; }` と遷移体感**:
  - グローバルの `scroll-behavior: smooth` は Next.js App Router の遷移後スクロールリセットを遅延させ体感速度を大きく損なうため、`html` には設定せずカルーセル等スクロールコンテナ側へ `@media (prefers-reduced-motion: no-preference)` で局所適用するのが適切。
- **`useSearchParams()` の `<Suspense>` 分離による 0ms 静的HTML維持**:
  - `/?venues=grid|bar` の比較クエリ対応でも `<Suspense fallback>` にデフォルト `bar` レイアウトをそのまま渡すことで、`out/index.html` の初期静的描画を一切欠損させずに動的比較切替を実現できる。

---

## [0.1.15] 公式Webポータル共通シェル＆トップページUIの Next.js 本番構成実装とデプロイ基盤整備 - 2026-11-20

### メタ情報

- **AIモデル**: Antigravity
- **筆者**: AI & 山本洋昌 (Uokun)
- **変更理由**: プレビューで合意した水色基調デザイン（ライト／ダーク／自動テーマ、端末画面サイズ・高さに応じた自動スケーリング、共通ヘッダー、ヘッダー直下緊急バナー枠、中央「オーダー」強調下部5タブ、右スライドドロワー、トップページ各セクション）を `DECISIONS.md`（`D-001`〜`D-010`）・ESLint境界・厳格CSP準拠の Next.js 15 Static Export 本番構成として構築し、`nanryosai-2027.web.app` へ先行展開するため。

### 追加 / 変更 (Added / Changed)

- **静的マスター分離（`campus_map_data.json` 混入防止: `PHASE2_PLAN.md §1-①`）**:
  - `src/domains/portal/lib/portal-master.ts`（`projects.json` / `stages.json` 専用）と `src/domains/portal/lib/map-master.ts`（`campus_map_data.json` 専用）へ物理分割し、`master-data.ts` は互換再エクスポート化。
- **テーマ・スケーリング・デザインシステム**:
  - `public/theme-init.js` および `src/app/layout.tsx`（`viewport.colorScheme = 'light dark'`, `next/font/google` セルフホスト `Inter` 読み込み, `<Script strategy="beforeInteractive" />`）を追加し、FOUCなしでのテーマ復元と端末サイズ別ルート文字サイズ自動最適化（`data-density="compact"` 等）を実装。
  - `src/styles/tokens.css` へ水色テーマ・ダークモード用トークンを追加し、`src/styles/portal.css`（`.portal-shell` / `.portal-main` スコープ）を新設。
- **ポータル共通シェル・コンポーネント＆主要ルート**:
  - `PortalIcon.tsx`（外部CDN不要のCSP準拠インラインSVG）、`LiveStateProvider.tsx`（ポータル横断60秒スロットル＋`visibilitychange`）、`FavoritesProvider.tsx`（`localStorage` 完結お気に入り）、`ThemeProvider.tsx`（ライト／ダーク／自動＋別タブ同期）、`EmergencyBanner.tsx`、`WaveLogo.tsx`、`PortalShell.tsx`（`<dialog>` ＋ CSS Scroll Snap＋`100svh`＋`IntersectionObserver` による右スライドハンバーガーメニュー＆下部5タブ）を実装。
  - トップページ `src/app/(portal)/page.tsx`（`HomeCountdown`, `HomeLiveVenues`, `HomeProjectHighlights`, `HomeOrderPromo`, `HomeStageGantt`, 開催概要・注意事項、お知らせ）および `/projects`, `/projects/[id]`（3段階キルスイッチ `<OrderEntrySlot />` ＋ `FavoriteButton`）, `/stages`, `/map`, `/guide` を構築。

### 得られた知見 / 注意点 (Learned / Caveats)

- **`dangerouslySetInnerHTML` 禁止環境 ＋ 厳格 CSP 下でのテーマ・アイコン設計**:
  - `eslint.config.mjs` で `dangerouslySetInnerHTML` / `innerHTML` が禁止されているため、FOUC防止スクリプトは `public/theme-init.js` として `'self'` から `beforeInteractive` で読み込み、アイコンは外部 CDN（jsDelivr 等）を使わずインライン SVG 化した。
- **ESLint 9 Flat Config と `.js` ブラウザスクリプト**:
  - `js.configs.recommended` の `no-undef` が `public/*.js` にも適用されるため、ファイル先頭に `/* global window, document, localStorage */` を明記してブラウザグローバルを宣言する必要がある。

---

## [0.1.14] Phase 2 実装計画書の策定と第1層バックエンド完結・公式中立性・段階的UI設計方針の確定 - 2026-11-17

### メタ情報

- **AIモデル**: Antigravity (Gemini)
- **筆者**: AI & 山本洋昌 (Uokun)
- **変更理由**: Phase 2（第1層「公式Webポータル基盤」）の実装着手にあたり、① Phase 2 単体で本番公開可能とするための `/venue` バックエンド＆セキュリティルール境界、② 来春〜夏に確定する開催日・GP投票URL・お知らせの SSOT 管理、③ 2026年の「特定部活優遇」指摘（受付QR不許可）とフッター埋没の双方を解決する公式中立導線、④ iOS約8割・WebView前提の段階的UI共同設計プロセスを確定し、`DECISIONS.md` および `docs/PHASE2_PLAN.md` へ永続化するため。

### 追加 / 変更 (Added / Changed)

- `DECISIONS.md`:
  - `D-010` 新設: Phase 2 範囲内での第1層バックエンド完結（`firestore.rules` は `public/live_state` の `get` のみ公開・クライアント直接 `write` 全面禁止維持、Functions に `loginVenueStaff` ＋ `updateVenueLiveStatus` 先行実装）、`data/portal_config.json` による共通設定 SSOT 化、公式デジタルパンフレットとしての完全中立性厳守と CS部導線方針、およびクラウドデプロイ承認境界を明記。
  - `P-003` 追加: スマホナビ構造および各画面の UI/UX ディテールを計画時点で独断固定せず、各 UI ステップ着手時にユーザーと協議・決定する方針を明記。
- `docs/PHASE2_PLAN.md`:
  - Step 2-1〜2-5 の実装計画、現行コードベース（`v0.1.13`）精査で特定した6つの技術対策（`campus_map_data.json` の非マップ画面チャンク混入防止分割、Leaflet × Static Export × React 19 StrictMode × `innerHTML` 禁止ルール適合、国土地理院タイル `maxNativeZoom: 18` 指定、`LiveStateProvider` 60秒スロットル共有、`<OrderEntrySlot />` 3段階キルスイッチ、`scrypt`＋単一トランザクション会場部分更新）、および3箇所の「UI共同設計ゲート」を策定。

### 得られた知見 / 注意点 (Learned / Caveats)

- **公式パンフレット化交渉（Phase 4-1）を見据えた「完全中立UI」の重要性**:
  - 2026年に「CS部のフッター埋没（6人 / 1.5%）」があったからといって、メインナビやトップ宣伝バナーに特定部活名を前面配置すると、2026年当日に受付QR掲示が不許可となった「特定部活の優遇」問題を再発させ、最重要目標である生徒会公式パンフ一本化交渉の足かせになる。グローバル導線は100%中立な公式パンフに徹し、「1出展企画としての対等掲載」＋「ご案内ページ内の『生徒会×CS部 共同運営・技術紹介』カード」で誘導するのが最適解である。
- **`master-data.ts` 分割による `360 MB/日` 無料枠保護**:
  - 5,088行の `campus_map_data.json` を `projects.json` と同一ローダーで再エクスポートすると、クライアントバンドル最適化の境界次第で非マップ画面にポリゴン座標データが混入するリスクがあるため、Step 2-1 で `portal-master.ts` と `map-master.ts` へ物理分離する。

---

## [0.1.13] レビュー監査修正（ESLint境界・キルスイッチ迂回12パターンの完全封鎖・`store_total` 残数誤設定遮断・StrictMode/GA4保護強化） - 2026-11-17

### メタ情報

- **AIモデル**: Antigravity (Gemini)
- **筆者**: AI
- **変更理由**: `[0.1.12]` の実装に対して敵対的レビューを実施した結果、① `eslint.config.mjs` におけるルートグループ相対パス（`./(mop)/...`, `../(venue)/...`, `../../../mop/...` 等）・動的 `import()`・`publicEnv.NEXT_PUBLIC_MOP_ENABLED` / `process.env.NEXT_PUBLIC_MOP_ENABLED` 経由の境界およびキルスイッチ迂回（計12パターン）、② `stockControlMode: 'store_total'` 店舗の商品に `initialStockCount` を誤付与した際の無警告通過および単一企画内メニュー商品ID重複の未検査、③ `PortalSmokeStatus` における React 19 `StrictMode` 二重実行時の消去済ハッシュ表示クリア、④ スタッフ・店舗シェル（`/venue`, `/order`, `/mop/*`）の `noindex` 未設定および誤混入クエリ機密値の GA4 送信リスクを検出したため、すべて根治・再検証する。

### 修正 (Fixed)

- **`eslint.config.mjs`（境界・キルスイッチ迂回12パターンの完全封鎖）**:
  - 相対ホップ数固定グロブ（`../mop/**`, `../../mop/**`）や `app/` 前置前提グロブ（`**/app/(mop)/**`）を廃止し、セグメント境界正規表現（`(^|/)(\\(mop\\)|mop)(/|$)` / `(^|/)(\\(venue\\)|venue)(/|$)`）へ刷新。`src/app/layout.tsx` や `src/app/(portal)/page.tsx` からの隣接ルートグループ相対参照、3階層以上の深い相対参照、`src/types/**` での重複設定上書きによる抜け穴をすべて遮断。
  - `venue` 層に `no-restricted-properties`（`NEXT_PUBLIC_MOP_ENABLED` および `isMopBuildEnabled`）を追加し、既に許可されている `publicEnv` 経由のプロパティ参照・分割代入および `process.env.NEXT_PUBLIC_MOP_ENABLED` 直接参照を AST レベルで完全封鎖。
  - `BASE_XSS_RESTRICTED_SYNTAX` を共通定数として全レイヤーへスプレッド継承しつつ、`ImportExpression`（動的 `import()`）および Functions での `require('googleapis')` による境界バイパスを遮断。
- **`src/types/schemas.ts`（`ProjectMasterSchema` の残数モード対称検証＆単一企画内商品ID一意性保証）**:
  - `stockControlMode: 'store_total'` の店舗でメニュー商品に `initialStockCount` が誤指定された場合、`stockControlMode="both"` への切り替えを案内する明示エラーで拒否するよう修正（商品上限が実行時に無視されて売り越す設定ミスを防止）。
  - `ProjectMasterSchema` 単体でも同一企画内の重複メニュー `item.id` を拒否するよう強化（Cloud Functions ランタイム単体検証時の整合性保証）。
- **`src/domains/portal/components/PortalSmokeStatus.tsx` & `src/lib/analytics.ts` & `(venue)`/`(mop)` Layout**:
  - `PortalSmokeStatus.tsx`: React 19 `StrictMode`（`next dev`）の `useEffect` 二重実行時に、1回目で消去した `#` ハッシュ表示が2回目の実行（ハッシュなし）で `null` に上書き消去される不具合を修正（`stripRes.didStrip` ガード追加）。
  - `src/lib/analytics.ts`: `buildPageViewPayload()` にて、`?src=` / `?store=` / `?venue=` 等の正規クエリを完全保持しつつ、万一誤って URL クエリに付与された機密キー（`token`, `password`, `pw`, `secret`, `passcode`, `auth`, `key`）を GA4 送信前に自動除去するデータ衛生防御を追加（`D-006.5` 準拠）。
  - `src/app/(venue)/layout.tsx` & `src/app/(mop)/layout.tsx`: 内部運用シェルに `robots: { index: false, follow: false }` メタデータを付与。
- **`tests/*.test.ts`（回帰テストの網羅追加）**:
  - 上記すべての ESLint 迂回パターン・`store_total` 誤設定・企画内商品ID重複・GA4 機密クエリ除去・`venue` 全ファイル検査を自動テストに追加。

### 得られた知見 / 注意点 (Learned / Caveats)

- **`no-restricted-imports` における App Router ルートグループ括弧パスと動的 `import()` の盲点**:
  - `src/app/` 内部からの相対 import は `'../(mop)/order/page'` のように `'app/'` セグメントを含まず、また ESLint の `no-restricted-imports` は静的 `ImportDeclaration` のみを対象とし動的 `ImportExpression`（`import(...)`）を検査しない。セグメント境界 `regex` と `BASE_XSS_RESTRICTED_SYNTAX` を継承した `ImportExpression` AST セレクタ、および環境変数オブジェクト経由の迂回を防ぐ `no-restricted-properties` の3点セットで初めてコンパイル境界が完全閉鎖される。

---

## [0.1.12] SSOT完全整合性修正（残数併用モード `both`・会場管理 `/venue` 分離＆キルスイッチ非連動化・CSP国土地理院タイル許可） - 2026-11-17

### メタ情報

- **AIモデル**: Antigravity (Gemini)
- **筆者**: AI
- **変更理由**: `DECISIONS.md`（`D-004` / `D-007` / `D-009.1`）・`docs/ROADMAP.md`（`2-3`）・`docs/PHASE1_PLAN.md` との全件再突合により検出された3点（① `stockControlMode: 'both'` 未定義、② 会場管理画面の `/mop/venue` 誤配置および MOP キルスイッチへの誤連動、③ `firebase.json` の CSP `img-src` における国土地理院タイルオリジン漏れ）を解消し、SSOT との 100% 一致を確立するため。

### 修正・変更 (Fixed / Changed)

- **`src/types/domain.ts` & `src/types/schemas.ts`（`stockControlMode: 'both'` 対応: `D-007`）**:
  - `StoreStockPolicy` および `StoreMopConfigSchema`（`z.discriminatedUnion('stockControlMode', ...)`）に `stockControlMode: 'both'`（店舗合計 `initialTotalStock` と商品別 `initialStockCount` の併用モード）を追加。
  - `ProjectMasterSchema` の `superRefine` にて、`stockControlMode` が `'per_item'` または `'both'` の店舗では全メニュー商品に `initialStockCount`（`0..10000` 整数）を必須化し、欠落時は該当インデックスとモード名を明示した Zod エラーを返すよう強化。
- **`src/app/(venue)/venue/page.tsx` & `src/domains/venue/**` & `eslint.config.mjs`（会場管理 `/venue` 独立化＆MOPキルスイッチ分離: `D-004` / `D-009.1` / `ROADMAP 2-3`）**:
  - 旧 `src/app/(mop)/mop/venue/page.tsx` を廃止し、専用ルートグループ `src/app/(venue)/`（URL `/venue`）および `src/domains/venue/`（`VenueShellCard.tsx`, `firebase-venue.ts`）へ分離新設。
  - `NEXT_PUBLIC_MOP_ENABLED=false`（MOPキルスイッチ停止時）でも `/venue` は第1層ステージ会場ライブ運用シェルとして単独稼働する表示へ分離し、`?venue=`（`gym_stage` / `admin_3f_av_room` / `student_4f_music_room` 判定付き）・`?src=` 保護・`stripLocationHashOnly()` による `#` フラグメント即時消去を実装。
  - `eslint.config.mjs`: 来場者向け `(portal)` および共有層からの `venue` 層 import を遮断して `firebase/auth`・`firebase/functions` のポータルバンドル混入ゼロを維持しつつ、`venue` 層からの `mop` 層および `isMopBuildEnabled` への依存（および `mop` 層から `venue` 層への逆依存）を双方向でビルドエラー化。
- **`firebase.json` & `docs/PHASE1_PLAN.md`（CSP `img-src` 国土地理院タイル追加）**:
  - `firebase.json` の `Content-Security-Policy` 内 `img-src` に `https://cyberjapandata.gsi.go.jp` を追加（Phase 2-2 の Leaflet キャンパスマップ背景タイル表示用）。あわせて `docs/PHASE1_PLAN.md` の構成図・ルート記述・CSP記述を同期。
- **`tests/*.test.ts`（自動テスト 37件 → 41件へ拡充）**:
  - `stockControlMode: 'both'` の正常系・境界値（`0`）・異常系（`initialTotalStock` 欠落・範囲外・一部商品の `initialStockCount` 欠落）、`venue` 境界ルール＆XSSルール非上書き検証、`firebase.json` CSP パース検証、および Hosting/Functions Emulator＋Headless Chrome 実機での国土地理院タイル CSP 通過・未許可オリジン遮断・`/venue` 稼働＆旧 `/mop/venue` `404` を確認。

### 得られた知見 / 注意点 (Learned / Caveats)

- **機能境界（MOPキルスイッチ）とバンドル境界（来場者ログインレス）の直交分離**:
  - 会場管理画面（`/venue`）は「業務機能としては第1層（ステージ会場ステータス運用・MOP停止時も稼働）」でありながら「SDK要件としてはスタッフ認証（`firebase/auth` + `firebase/functions`）を使う」という交差特性を持つため、`(portal)` でも `(mop)` でもない第3のルートグループ `(venue)` / `src/domains/venue` として切り出し ESLint で三者間境界を縛ることで、「来場者バンドルへの Auth/Functions 混入ゼロ」と「MOPキルスイッチからの完全独立」を矛盾なく両立できる。
- **ESLint Flat Config で特定ディレクトリ向けルールを追加する際の `no-restricted-syntax` 上書き防止**:
  - Flat Config では後続オブジェクトで同一ルール名（例: `no-restricted-syntax`）を再定義すると先行の全体ルール（`dangerouslySetInnerHTML` / `innerHTML` 禁止）が上書き消滅するため、`venue` 層の `isMopBuildEnabled` 遮断は `no-restricted-imports` の `paths` / `patterns`（`importNames` 指定）側に集約し、XSS 禁止ルールが `venue` 配下でも維持されていることを単体テストで保証した。

---

## [0.1.11] Phase 1 実装レッドチーム再監査・実データ＆実機エッジケース修正 - 2026-11-17

### メタ情報

- **AIモデル**: Antigravity (Gemini)
- **筆者**: AI
- **変更理由**: `[0.1.10]` で構築した Phase 1 基盤一式に対し、2026年実画像（506枚＋実機 iPhone `.HEIC` 3枚）・エミュレータ実通信・境界迂回パターンを用いた敵対的検証を実施した結果、末尾 `_1〜_9` 企画IDの画像誤分類・高周波イラストの圧縮失敗・二重スラッシュ URL でのトークン残留・共有層経由の ESLint 境界バイパス等を検出したため、すべて根治・再検証する。

### 修正 (Fixed)

- **`scripts/process-assets.ts` & `scripts/validate-data.ts`（画像パイプラインの致命的バグ2件を修正）**:
  - 企画ID末尾が `_[1-9]`（例: `class_1_1`, `homeroom_3_6`）のカバー画像（`class_1_1.jpg`）が `GALLERY_FILENAME_REGEX` に先取りされて非存在企画 `class_1` のギャラリー画像と誤認され、`_thumb.webp` / `_hero.webp` が欠損する不具合を修正（`data/projects.json` の既知ID照合および同梱ファイル関係を優先判定し、`validate-data.ts` に `[企画ID衝突エラー]` 検査を追加）。
  - 2026年イラストレーション部実作品（高周波線画 `2-1.jpg`, `2-6.jpg`）や縦長ポスター画像において、幅のみ指定の固定リサイズでは `q=25` まで落としても `45KB` / `90KB` 上限を超過して例外終了する不具合を修正。`fit: 'inside'` による長辺（幅・高さ双方）拘束と段階的スケール縮小フォールバックを導入し、2026年実線画および実機 iPhone `.HEIC` 3件すべてが規定バイト上限内に高品質収束することを実機確認。
- **`src/lib/url-safety.ts`（`stripLocationHashOnly` のプロトコル相対パス防御 & SNS正規化強化）**:
  - `computeHashStrippedUrl()` で `//order?...#t=...` のような先頭連続スラッシュパスが入力された際、そのまま `history.replaceState` に渡すとプロトコル相対クロスオリジン URL と解釈され `SecurityError` を投げる問題を修正（単一 `/` 正規化＋特殊 WebView 等で `replaceState` が例外を投げた際の `location.hash = ''` フォールバックを追加）。
  - `normalizeInstagramHandle()` でスキーム省略 URL（`instagram.com/handle`）や `m.instagram.com` に対応しつつ、ドメイン単体（`instagram.com`）の誤通過を遮断。
- **`src/types/schemas.ts`（Zod スキーマ厳格化とランタイム判定との完全一致）**:
  - `ProjectMasterSchema` の `instagramHandle` に `isValidNormalizedInstagramHandle()` を適用し、`...` や先頭/末尾ピリオド・ドメイン単体をビルド時 `validate:data` で確実に弾くよう統一。
  - `MenuOptionGroupSchema` / `MenuItemMasterSchema` での重複ID・`single` 選択時の不正 `maxSelections` 拒否、`PublicLiveStateDocSchema` での辞書キーと内部 `venueId` / `storeId` の一致検証を追加。
- **`src/lib/analytics.ts` & `src/components/AnalyticsTracker.tsx`（GA4 初期化競合リスクの排除）**:
  - インライン `<Script id="ga4-gtag-init">` の非同期注入順序に依存せず、`analytics.ts` 側で同期的に `window.dataLayer`（`Arguments` オブジェクト push）と初回 `config`（`send_page_view: false`）を一度だけ初期化する構造へ改め、初回 `?src=` 付き `page_view` の取りこぼしリスクと余分なインラインスクリプトを解消。
- **`eslint.config.mjs` & `.env.example`（二層境界の間接バイパス封鎖と環境変数優先順位の保護）**:
  - `no-restricted-imports` の適用対象を `src/app/*.{ts,tsx}`, `src/components/**`, `src/lib/**`, `src/types/**` にも拡大し、共有ユーティリティや `RootLayout` を踏み台にした `mop` / `firebase/auth` / `firebase/functions` の第1層バンドル混入を完全遮断（`src/types/**` はランタイム SDK 依存自体も禁止）。
  - Next.js が `next build` 時にも `.env.local` を `.env.production` より優先読込する仕様を踏まえ、`.env.local` をエミュレータ切替フラグのみに限定し `.env.example` に `.env.development.local` 使い分け注記を追記。
- **`tests/*.test.ts`（単体・境界テスト拡充）**:
  - 29件 → 37件へ拡充し、上記すべての回帰テストおよび `next dev -p 3070` ＋ Firestore Emulator（`127.0.0.1:8080`）実通信での `permission-denied` 捕捉＆`localStorage` キャッシュ維持を確認。

### 得られた知見 / 注意点 (Learned / Caveats)

- **高周波イラスト画像の WebP 容量上限収束には品質低下だけでなく段階的長辺縮小が必須**:
  - 写真（実機 iPhone `.HEIC` 含む）は `800px / q=80` で容易に `40〜80KB` に収まる一方、細密な線画・トーンを含むイラストは `800px` 固定のまま `q=25` まで下げても `100KB` を超え画質も崩壊するため、`q >= 42` を維持しながら長辺を `0.85 -> 0.72` 倍へ段階縮小する方が視覚品質と転送量上限（`<= 90KB`）を綺麗に両立できる。
- **Hosting Emulator（`localhost:5000`）と `next dev`（`localhost:3070`）の検証役割分担**:
  - 本番同一 CSP（`localhost` 非許可）を配信する Hosting Emulator（`5000`）では静的書き出し・CSP違反ゼロ・Functions Rewrite（`/api/health`）を検証し、クライアント SDK から Firestore/Auth Emulator（`127.0.0.1:8080` / `9099`）へ直接繋ぐ検証は `next dev`（`3070`, `NODE_ENV=development`）で行う二段構えが最も安全かつ確実である。

---

## [0.1.10] Phase 1 基盤一式の実装完了（Next.js静的書き出し・二層分離ESLint・SSOT型＆マップ全51室正規化・データ検証/画像圧縮CLI・Functions 2nd Gen＆Emulator E2E検証） - 2026-11-17

### メタ情報

- **AIモデル**: Antigravity (Gemini)
- **筆者**: AI
- **変更理由**: `docs/PHASE1_PLAN.md`（Step 1-1〜1-4）および `DECISIONS.md`（`D-001`〜`D-009`）に基づき、第1層（公式Webポータル）と第2層（MOP・有人POS・会場管理）をコンパイルレベルで完全分離した開発基盤・マスターデータ自動化CLI・Cloud Functions 2nd Gen 基盤を構築し、Firebase Local Emulator Suite 実機で全完了定義（DoD 7項目）を達成するため。

### 追加 (Added)

- **Next.js App Router（Static Export）＆ 二層境界強制基盤（Step 1-1）**:
  - `package.json`, `next.config.ts`（`output: 'export'`, `trailingSlash: false`, `images: { unoptimized: true }`, `dev -p 3070`）, `tsconfig.json`（`strict: true`, `noUncheckedIndexedAccess: true`）, `vitest.config.ts`, `eslint.config.mjs`, `.env.production`, `.env.example` を作成。
  - `eslint.config.mjs`: `src/domains/portal/**` および `src/app/(portal)/**` からの `@/domains/mop` / `firebase/auth` / `firebase/functions` / 通常版 `firebase/firestore` の import、および `dangerouslySetInnerHTML` / `innerHTML` / Functions での `googleapis` 読込をビルドエラーとして完全遮断。
  - `src/styles/tokens.css`: `P-001` 着せ替え用の CSS カスタムプロパティ（Tier 1〜3）と `@layer reset, base, theme, components, utilities` によるカスケード設計を1ファイルに集約。
  - `src/lib/env.ts`, `src/lib/url-safety.ts`（`stripLocationHashOnly`, `safeExternalUrl`, `normalizeInstagramHandle`）, `src/lib/analytics.ts`, `src/components/AnalyticsTracker.tsx`（`G-VTX813ECF9`・`<Suspense>` 分離済）, `src/lib/firebase-lite.ts`, `PortalLink.tsx`（`prefetch={false}`）, `useLiveState.ts`, `firebase-mop.ts`, `(portal)` / `(mop)` 単一静的シェル群（`/order`, `/mop/qr`, `/mop/kitchen`, `/mop/counter`, `/mop/monitor`, `/mop/venue`）を実装。
- **SSOT ドメイン型・Zodスキーマ ＆ 2026年キャンパスマップ完全正規化移植（Step 1-2）**:
  - `src/types/domain.ts`, `src/types/schemas.ts`: `CampusMapData`, `ProjectMaster`, `StoreMopConfig`（`kitchenMode: 'on' | 'off'`, `store_total | per_item` Discriminated Union, `1000-9999` / `100-999` 採番レンジ）, `StageSlotMaster`（有志・後夜祭 `after_festival` 対応）, `PublicLiveStateDoc` を定義。
  - `scripts/migrate-map-2026.ts`, `data/campus_map_data.json`: 2026年実マップから全51室（1Fの3-6/3-7、管理棟3F視聴覚室、4Fの1-7→1-6逆順を含む）・11スポット・9建物・4屋外エリア・4バスアクセス経路・廊下/階段/トイレを明示的1対1辞書＋件数一致アサートで正規化し、冗長な `coordinates` 二重配列と年度依存クラス名を除去。
  - `data/projects.json`, `data/stages.json`: 全カテゴリ・MOP両モード・共同教室・マップ非表示・後夜祭・有志枠を網羅した Phase 1 検証用マスタを作成。
- **データ突合検証 CLI・WebP画像最適化 CLI・Vitest単体テスト（Step 1-3）**:
  - `scripts/validate-data.ts`（`npm run validate:data`）: Zod 検証、指定フロア内の `roomId` 実在突合、意図しない部屋重複の遮断、ステージ参照＆時間重複検査、参照 WebP 画像の実在および容量上限（`<=45KB` / `<=90KB`）検査を実装。
  - `scripts/process-assets.ts`（`npm run process-assets`）: `sharp` + `heic-convert` による Exif 回転補正＋カバー2段階・ギャラリー・商品画像の WebP 出力と段階品質制御を実装し、`public/images/**` にサンプル WebP 8点を生成。
  - `tests/*.test.ts`（5ファイル・29テスト）: `?src=` 保護、XSS URL遮断、SNSハンドル正規化、7教室ズレ検知、画像リサイズ、ESLint二層境界遮断の自動テストを整備。
- **Cloud Functions 2nd Gen（`nodejs22` + `esbuild`）＆ Emulator E2E 検証（Step 1-4）**:
  - `functions/package.json`, `functions/tsconfig.json`, `functions/src/index.ts`: `asia-northeast1` / `concurrency: 80` の `healthCheck` 関数を実装し、`esbuild --external:firebase-admin --external:firebase-functions` によりルートの共有 Zod スキーマをインライン同梱。

### 変更 (Changed)

- `firebase.json`: `functions`（`nodejs22`）、`trailingSlash: false`、`/api/health` リライト、静的アセット長期キャッシュ（`immutable`）、および本番用 `Content-Security-Policy` ヘッダを追加（`firestore.rules` は完全フェイルクローズドのまま無変更を維持）。
- `.gitignore`: `!.env.production`, `assets/original/*`（`!.gitkeep`）, `functions/lib/`, `functions/node_modules/` 等を追記。
- `docs/ROADMAP.md`: Phase 1 の完了チェックリストを更新。

### 得られた知見 / 注意点 (Learned / Caveats)

- **Windows 環境の Firebase Hosting Emulator（`superstatic`）における `source` グロブの罠と RE2 正規表現による解決**:
  - 実機エミュレータ検証中、Windows 上の `firebase-tools` 内蔵 `superstatic` がリクエストパスを `glob-slasher`（`\` 区切り）へ変換した後に `minimatch@9`（`\` をエスケープ文字扱い）へ渡すため、`"source": "**"` や `"source": "/_next/static/**"` のヘッダ設定が Windows ローカルエミュレータ上で一切マッチせず素通りする挙動を特定した。
  - `firebase.json` の `headers` / `rewrites` に Firebase Hosting 公式サポートの RE2 互換 `"regex"`（`"^[/\\\\].*$"` 等）を用いることで、Windows ローカルエミュレータと本番 Google CDN（POSIX `/`）の双方で CSP・`immutable` キャッシュ・`/api/health` リライトが100%同一に適用されることをヘッドレス Chrome 実通信で確認した。
- **Next.js App Router における `history.replaceState` の `history.state` 保護**:
  - `stripLocationHashOnly()` で `window.history.replaceState(null, ...)` を呼ぶと Next.js App Router の内部履歴 state が破壊されるため、`window.history.state` を第1引数に引き継ぐ実装とした。

---

## [0.1.9] Phase 1 実装計画書の策定とレッドチーム再精査（実機CLI・全51室/47企画/24ステージ突合） - 2026-11-17

### メタ情報

- **AIモデル**: Antigravity (Gemini)
- **筆者**: AI & 山本洋昌 (Uokun)
- **変更理由**: Phase 1（Next.js基盤・二層分離・`domain.ts`・マップ座標正規化・データ検証＆画像圧縮・Functions 2nd Gen基盤）を着手後に一切手戻りさせないため、2026年実データ全件およびローカルCLI内部仕様まで踏み込んで計画を精査・確定するため。

### 追加 (Added)

- `docs/PHASE1_PLAN.md`: Step 1-1〜1-4 の完了定義・ディレクトリ構成・再精査で特定した8つの技術的落とし穴と対策を網羅した詳細実装計画書（v2）を作成。

### 得られた知見 / 注意点 (Learned / Caveats)

- **`firebase-tools 14.25.0` のサポートランタイム上限の実機確認**:
  - `firebase-tools/lib/deploy/functions/runtimes/supported.js` を直接検証した結果、現行 CLI が許容する最新 Node ランタイムは `nodejs22` までであり、`nodejs24` を指定すると即座に `FirebaseError` となることを確認。`nodejs22` + `esbuild --external:firebase-admin --external:firebase-functions` 構成（共有 Zod スキーマのみバンドル同梱）を採用する。
- **南陵高校の実フロア構造（全51室＋11スポット）と2026年47企画・24ステージの精査**:
  - `campus_map_data.json` 全件確認により、生徒棟1Fに `3年6組`・`3年7組` があること、管理棟3Fに `視聴覚室` があること、生徒棟4Fでは特別教室を挟んで `1年7組` → `1年6組` の逆順になっていること、屋外スポットIDに年度クラス番号（`tent_102` 等）が直書きされていたことを特定。連番推測を廃し明示的1対1辞書＋件数一致アサートで移植する方針とした。
  - あわせて `(mop)` ルートを動的 `[storeId]` ではなく単一静的シェル＋`?store=` 方式に統一することで、Static Export での動的店舗追加時 404 回避と朝8:30の PWA オフライン一括キャッシュを両立させた。

---

## [0.1.8] 本番までの全体マスターロードマップ（やることリスト）策定 - 2026-11-17

### メタ情報

- **AIモデル**: Antigravity (Gemini)
- **筆者**: AI & 山本洋昌 (Uokun)
- **変更理由**: 確定した `DECISIONS.md`（`D-001`〜`D-009`）および `RETROSPECTIVE_2026.md`（12鉄則・夏休み前決裁デッドライン）をもとに、これから2027年9月本番までに取り組む全工程（実装・検証・承認・当日運用）をチェックリスト化して永続管理するため。

### 追加 (Added)

- `docs/ROADMAP.md`: Phase 1（Next.js/型安全/データ検証＆画像最適化/Functions基盤）〜 Phase 5（前日15分訓練・文化祭本番・アーカイブ化）までの実行チェックリストを新規作成。

---

## [0.1.7] 実装前仕様の完全確定（調理KVS ON/OFF・採番1000/100・ID/PW認証・ポータル＆データ運用最適化） - 2026-11-17

### メタ情報

- **AIモデル**: Antigravity (Gemini)
- **筆者**: AI & 山本洋昌 (Uokun)
- **変更理由**: 第25回南陵祭2027のソースコード構築（`Next.js` + `TypeScript`）に入る前に残っていた設計仕様（Blaze/GA4反映確認、マスターデータ管理最適化、MOPの店舗ローカライズ範囲、採番体系、店舗端末認証、モニター表示、ポータル機能範囲）をすべて確定し、`DECISIONS.md` へ集約するため。

### 変更 (Changed)

- `DECISIONS.md`:
  - `D-003` 更新: 新規作成した `nanryosai-2027` の Blazeプラン切り替えおよび新規GA4プロパティ（`measurementId: G-VTX813ECF9`）を前提として確定記録。
  - `D-006` 更新: 店舗・会場スタッフ認証を「店舗ID＋パスワード手入力」（Cloud Functions 2nd Gen 上でのソルト付き強ハッシュ検証＋レート制限＋カスタムトークン＋Epoch即時失効対応）として明記。
  - `D-007` 更新: 2027年のMOP展開規模を **約3店舗** とし、店舗設定で **「調理KVS ON / OFF」** を切り替え可能なモジュラー設計（押し忘れ時の出し口バイパス回収付き／イートイン後会計等は2027年スコープ外）を確定。商品オプション（味・トッピング等）および「店舗合計 / 商品別」の両残数カウンター対応を明記。
  - `D-008` 更新: O(1)店舗別採番として **MOP `1000〜9999`（4桁）・有人POS `100〜999`（3桁）**、同時未受取1端末1件・1注文上限5個（設定可）、独立プレゼンモニター（上部に「お呼び出し中」大表示＋下部に「順番待ち・調理中」控えめ表示）を確定。
  - `D-009` 新設: Webポータルは2026年型の「ステージ会場ステータス＋MOP店完売表示」に限定し、軽量なアプリ内検索＆端末内お気に入りを搭載。また去年の `admin_sync.html` / `admin-server.js` を廃止し、AI支援＋SSOT JSON＋Zod突合検証＋2段階WebPリサイズ（400px/800px）＋MOP店同期CLIへ最適化する方針を確定。
  - `PENDING` 整理: 初期設計仕様の未決事項をすべて解消し、残件を公式テーマ決定（`P-001`）と春〜夏の学校調整（`P-002`）のみへ集約。

### 得られた知見 / 注意点 (Learned / Caveats)

- **2026年データ運用コード解剖からの最適化根拠**:
  - 2026年の `admin_sync.html`（2,061行）＋ `admin-server.js`（外部バインド・コード注入リスクあり）＋ `process-assets.js`（`.resize()` 削除による約1MB WebP肥大化）の実コードを精査した結果、AI活用を前提にブラウザ表GUIを廃止し、型安全JSON＋Zodマップ突合＋自動WebPリサイズへ置き換えることで保守負荷と事故リスクを劇的に削減できることを確認した。
- **インフラ準備完了の最終確認**:
  - `nanryosai-2027` コンソール上の `Blaze 従量制` 有効化および `nanryosai-2027-web` への `G-VTX813ECF9` 紐付け完了を確認済み。

---

## [0.1.6] GitHub初回プッシュ完了・Firebase 2027プロジェクト構築＆初期ルール適用・リポジトリ衛生整備 - 2026-11-17

### メタ情報

- **AIモデル**: Antigravity (Gemini)
- **筆者**: AI & 山本洋昌 (Uokun)
- **変更理由**: 第25回南陵祭2027の実装フェーズへ入る前段として、GitHub初回プッシュ、`nanryosai-2027` Firebaseプロジェクト＆東京リージョンFirestore・Webアプリの立ち上げ、完全閉鎖ベースラインのセキュリティルール適用、および開発環境設定の統一を行うため。

### 追加 / 変更 (Added / Changed)

- **GitHub 初回プッシュとローカルGit衛生設定**:
  - `.git/config`（ローカル設定）に `credential.username=ynrcs-old` および非個人用メール `user.email=ynrcs-old@users.noreply.github.com` を設定し、`0.1.5`（`ad936ff`）までを `origin/main` へ初回プッシュ完了。
  - `.gitattributes` を新規作成し、テキストファイルの改行コードを `LF` に統一（`.ps1`/`.bat`/`.cmd` は `CRLF`、画像等は `binary` 指定）してクロスプラットフォームの差分警告を防止。
  - `.agents/rules/commit-and-versioning-rules.md` に不足していた1行を補い、互換維持用の `.agent/rules/` とルール内容を完全同期。
- **Firebase 2027 基盤 (`nanryosai-2027`) の立ち上げ**:
  - `ynrcs1000@gmail.com` 配下に Firebase プロジェクト `nanryosai-2027`（Hosting URL: `https://nanryosai-2027.web.app`）と Web アプリ `nanryosai-2027-web` を新規作成。
  - `.firebaserc`、`firebase.json`（Firestore `asia-northeast1` / Hosting `public: "out"` + 基本セキュリティヘッダ / Local Emulator ポート定義 `4000, 5000, 5001, 8080, 9099`）、`firestore.indexes.json` を作成。
  - `firestore-rules-author` により完全フェイルクローズド（`allow read, write: if false;`）の初期 `firestore.rules` を作成し、ローカル Firestore Emulator で全CRUD操作の `HTTP 403` 拒否検証後に本番クラウド（Standard Edition, `asia-northeast1`）へデプロイ完了。

### 得られた知見 / 注意点 (Learned / Caveats)

- **Cloud Firestore API 有効化と `(default)` DB の仕様**:
  - `nanryosai-2027` には当初データベースが存在しなかったが、`firebase.json` 記載のロケーション（`asia-northeast1`）および標準 `STANDARD` エディションで `(default)` データベースが作成され、初期セキュリティルールのリリースまで正常完了した。
- **今後の手動コンソール作業（要実施）**:
  - 請求先アカウント紐付け（Blazeプラン有効化＋予算アラート設定）と、Google Analytics（GA4）新規プロパティ有効化による `measurementId` 取得は、Firebase コンソール上での設定が必要。

---

## [0.1.5] 校内実測Speedtest（BYOD2018壊滅データ）の検証とNext.js＋Firebase一本化・BAN完全廃止の確定 - 2026-11-17

### メタ情報

- **AIモデル**: Antigravity (Gemini)
- **筆者**: AI & 山本洋昌 (Uokun)
- **変更理由**: Googleフォトから取得した2026年文化祭本番昼ピーク（9/12 12:40）および校内 `BYOD2018`（9/3）のSpeedtest実測結果に基づき、来場者5G環境と店舗貸与iPad環境の通信特性を切り分けた上で、フレームワーク（`Next.js` 一本化）・ホスティング（`Firebase Hosting` 一本化）・有人POS併設・BAN完全廃止・クエリ保護仕様を最終確定するため。

### 変更 (Changed)

- `DECISIONS.md`:
  - `D-002` 更新: フロントエンドを `Next.js (App Router, output: 'export')` ＋ `TypeScript (strict: true)` に一本化。店舗側端末にはPWAローカルキャッシュと楽観的UI更新を必須化。
  - `D-003` 更新: ホスティングも `Firebase Hosting` に一本化し、Firestore / Cloud Functions 2nd Gen と統合管理する構成に確定（CSPヘッダー・長期キャッシュ制御・`sharp` 画像圧縮徹底）。
  - `D-006`〜`D-008` 更新:
    - 動的QRの少人数制限（3〜4人上限）を撤廃し10人同時スキャン等も通過可能に修正。
    - URLからの暗号トークン消去時は `#` フラグメントのみを操作し、店舗パラメータやGA4用クエリ（`?src=...` 等）を絶対に消去しない鉄則を明記。
    - スマホ非所持客向けの「有人POS（スタッフ代理入力）」併設、および不在パス時の残り残数カウンターへの自動在庫戻しを確定。
    - 紙の整理券と同等の現地チェックイン抑止力があること、およびシフト交代のクラスメイトへの判断負荷・責任問題を排するため、自動・手動を問わずBAN機能を完全廃止（裏側の「1端末同時1件・1注文個数上限」のみ適用）。

### 得られた知見 / 注意点 (Learned / Caveats)

- **校内通信環境の実測エビデンス（Googleフォト発掘データ）**:
  - **2026-09-12 12:40（南陵祭2日目昼ピーク・`So-net` 校内Wi-Fi系）**: 下り `0.35 Mbps` / 上り `0.00 Mbps` / 負荷時Ping `1,125 ms` / ジッター `357 ms`。
  - **2026-09-03 13:30（平日昼・南陵高校内 `SSID: "BYOD2018"`）**: パケットロス `65.5%` / 負荷時Ping 下り `1,203 ms`（最大 `4,571 ms`）・上り `2,312 ms`（最大 `6,224 ms`）。
  - 来場者・生徒はほぼ全員5Gモバイル回線を使用するため `Next.js` で高速に動作する一方、SIMを持たない学校貸与iPad（店舗端末・AirPAY端末）がこの `BYOD2018` に接続されると壊滅的なパケットロスに巻き込まれる。したがって店舗側端末は朝イチのPWAキャッシュ保存＋オフラインQR生成＋最小パケット再送（可能なら5Gテザリング併用）が生命線となる。

---

## [0.1.4] ゼロベース再検証・2026年現場実態（AirPAY律速）の反映とMOP最終運用設計の確定 - 2026-11-16

### メタ情報

- **AIモデル**: Antigravity (Gemini)
- **筆者**: AI & 山本洋昌 (Uokun)
- **変更理由**: 従来の前提（`0014` 生徒Googleログイン・遠隔注文・共用SOK・机上の先払い案等）をすべて白紙から再検証し、2026年本番の現場実態（AirPAY端末トラブルによる45分待ち・先払い禁止規定・責任転嫁リスク）に即した現実的かつシンプルなMOP運用・セキュリティ・インフラ方針を `DECISIONS.md` に確定記録するため。

### 変更 (Changed)

- `DECISIONS.md`:
  - `D-003` 更新: 教員への説明容易性と過去2年の実績を踏まえ、新規外部クラウド（Cloudflare等）を導入せず `GitHub ＋ Firebase` 基盤を継続する方針を明記（`googleapis` トップレベル読込禁止・ビルド時画像リサイズ強制・2026年旧コードのトランザクション欠陥根絶を含む）。
  - `D-005` 更新: 県教委貸与の公用Googleアカウント（`@gl.pen-kanagawa.ed.jp` / `0014`）ログインをWebポータル・MOPの双方から完全廃止（在校生・一般来場者共通のログインレス運用へ統一）。
  - `D-006`〜`D-008` 追加:
    - **店頭独立iPad動的QR方式 (`D-006`)**: 先払い不可・受取時AirPAY決済を厳守し、SOK・遠隔注文・700枚物理QR配布を不採用。プレゼンモニターとは独立したiPadでオフラインHMAC動的QRを表示し、スキャン直後に注文枠チケットへ交換する方式を採用。
    - **調理非干渉＆残り残数カウンター自動停止 (`D-007`)**: 焼く量・ペースは店舗裁量のままとし、MOPは「出すとき（呼び出し〜受け渡し・会計）」のみに介入。上限管理は注文ごとに減算される「残り残数カウンター（`0` で自動完売停止）」のみとする。
    - **3絵文字＋`0.1秒`時計による受け渡し確認 (`D-008`)**: 約30種からランダム生成する3つの絵文字（27,000通り）とまねきねこアプリ方式の `0.1秒` カウント現在時刻により、窓口での自然な目視確認のみでスクショ改ざん・横取りを防止（BAN機能廃止）。

### 得られた知見 / 注意点 (Learned / Caveats)

- **2026年調理テント45分待ちの真因と責任分界の重要性**:
  - 2026年の3-1で45分待ちが発生した主因は調理能力不足ではなく、ストックが10個ある状態でのAirPAY端末トラブル（カード無反応・充電切れ・通信断）とそれに伴う注文制限であった。また現場では結果的に5分超放置された商品も提供されていたため、MOPが調理や個別取り置きに過剰介入すると、AirPAY起因の滞留・放置商品（ウェイスト）の責任までMOP側に転嫁される危険がある。「調理非干渉・出し口のみMOP介入」はこの責任転嫁を構造的に防ぐ要となる。
- **4専門ワーカー監査による技術的教訓の統合**:
  - 2026年版のコールドスタート遅延（`googleapis` 150MB同期読込＋v1 SDK `concurrency: 1`）、画像 `.resize()` 欠落（平均960KB/枚によるFirebase Hosting `360MB/日` 枠圧迫）、キャンパスマップ座標の正規化再利用（自作CAD再構築不要）、および暗号NFC（`NTAG 424 DNA` のRTC非搭載・剥離リスク）の不適格性を検証し、2027年設計のガードレールとして確立。

---

## [0.1.3] 南陵祭2025–2026全記録の発掘総括・12鉄則の永続化と二層分離スコープ確定 - 2026-11-13

### メタ情報

- **AIモデル**: Antigravity (Gemini)
- **筆者**: AI & 山本洋昌 (Uokun)
- **変更理由**: 2025〜2026年度の全開発履歴・会議音声文字起こし・Genspark対話ログ・GA4/Cloud Monitoring実測データを徹底発掘し、失敗の本質と教訓をリポジトリ内に永続化するとともに、第25回「南陵祭2027」の基本スコープおよび意思決定SSOTを確定するため。

### 追加 (Added)

- `docs/RETROSPECTIVE_2026.md`: 南陵祭2025–2026の完全総括、モバイルオーダー導入見送りの経緯と回避された本番リスク、GA4×インフラ実測データの再分析、AI開発アンチパターン、および「12の絶対鉄則」を収録した正史ドキュメント。
- `DECISIONS.md`: マルチエージェント・長期開発における唯一の意思決定正本（SSOT）ファイル（`D-001`〜`D-005` 確定、ホスティング等の `PENDING` 論点明記）。

### 得られた知見 / 注意点 (Learned / Caveats)

- **二層分離スコープの確定 (`D-004`)**:
  - 3か年構想の集大成として「公式Webポータル」と「モバイルオーダー／店頭SOK／POS」の両方を狙うが、承認単位・UI導線・稼働キルスイッチ・バックエンド処理を完全に疎結合化することで共倒れリスクを根絶する。
- **2026年実測に基づく絶対制約の確立 (`D-005`)**:
  - 一般来場者のログイン関門撤廃（`localStorage` 完結・アプリ内WebView対応）、iOS約8割環境を踏まえた非Web Push主軸の伝達設計、1分間隔常時稼働Cloud Schedulerの廃止、およびGA4計測前の `replaceState` 禁止を標準ルール化。

---

## [0.1.2] コミット運用ルールの厳格化とワークフロースキルの整備 - 2026-09-22

### メタ情報

- **AIモデル**: Antigravity (Gemini)
- **筆者**: AI
- **変更理由**: コミットメッセージをバージョン番号のみ（例: `0.1.1`）とする厳格な運用ルールをプロジェクト固有のスキルおよびルールとして定義・永続化するため。

### 追加 (Added)

- `.agents/skills/japanese_workflow/SKILL.md`: 日本語ワークフローおよびGitコミットメッセージ厳格化（バージョン番号のみ）スキル。
- `.agents/rules/commit-and-versioning-rules.md`: コミットメッセージおよびCHANGELOG運用の常時適用ルール。
- `.agent/`: 互換性維持のためのスキルおよびルール定義。

---

## [0.1.1] Git環境の初期化と .gitignore の整備 - 2026-09-22

### メタ情報

- **AIモデル**: Antigravity (Gemini)
- **筆者**: AI & Uokun
- **変更理由**: プロジェクトのソースコード管理およびバージョン管理を開始するため、Git環境を初期化し、不要・機密ファイルを除外する `.gitignore` を整備するため。

### 追加 (Added)

- `.gitignore`: 依存関係（`node_modules/`）、機密情報（`.env*`, `*serviceAccountKey*.json` 等）、ビルド成果物、OS/エディタ固有ファイル等の除外設定。
- Gitリポジトリ初期化（`main` ブランチ）。

---

## [0.1.0] 南陵祭2027 プロジェクト始動 - 2026-09-22

### メタ情報

- **AIモデル**: Antigravity (Gemini)
- **筆者**: AI & Uokun
- **変更理由**: 第24回（2026年度）南陵祭システムの運用終了を受け、次年度「第25回南陵祭2027」に向けた新プロジェクトを始動。2026年版の運用実績と知見をベースにしつつ、システム全体の根本的なアーキテクチャ見直しと再設計を行うためのキックオフ。

### 追加 (Added)

- `CHANGELOG.md`: 変更履歴の記録開始、バージョニング方針・記録基準の策定。

### 得られた知見 / 今後の方針 (Learned / Next Steps)

- **根本的再設計（ゼロベース見直し）方針の確定**:
  - 2026年の膨大な知見（POS、モバイルオーダー、キッチン・プレゼンター連携、GA4アクセス計測、3Dマップ、Cloud Functions等の本番実績）をリファレンスとしつつ、2027年はコードを直接引き継ぐのではなく、設計・技術スタック・運用フローをゼロベースで再検討・再構築する。
