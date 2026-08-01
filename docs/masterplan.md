# 住宅マーケティング数値ダッシュボード（仮称） — masterplan.md

> `spec.md`（v1）に対する実装計画。**何を・どの順で・どう作るか**を定義する。
> 仕様の記述を正とし、本書は「実装の地図」として spec を分解・補完する。
> 記法: ⚠️ = 着手前に人間判断が要る箇所 / ✅ = spec で確定済み / 📌 = 受け入れ基準に直結。
> `masterplan-sample.md` は別プロジェクト（「サーバー情報管理アプリ」）のサンプルであり、本プロジェクトの内容ではない。書式の参考としてのみ扱う。

---

## 実装状況（2026-08-01）

Phase 0 完了。Phase 1 進行中（共通レイアウト・UIコンポーネントが完了、残りはPhase 4以降で実画面ができ次第 `dev-preview` を削除するのみ）。

- Next.js (App Router / TypeScript) を `npx create-next-app` で作成し、GitHub（`nagata-md/dashboadmark`）にpush済み。Vercel連携は未実施。
- Tailwind v4 の `@theme inline`（`src/app/globals.css`）に DESIGN_SYSTEM.md のカラーパレット・角丸・シャドウ・タイポグラフィ（Noto Sans JP / Archivo）を移植。**注意点**：カスタムのbaseスタイル（`a`要素・input要素等）は必ず `@layer base` の中に書くこと。`@layer` の外に書くと、CSS Cascade Layers の仕様により Tailwind のユーティリティクラス（`@layer utilities`）より常に優先されてしまい、実際に `text-white/80` 指定のサイドバーナビリンクが `a { color: navy }` に上書きされ navy-on-navy で不可視になる不具合が発生した（修正済み）。
- 共通コンポーネントを実装：`components/layout/{AppShell,Sidebar,PageHeader}.tsx`、`components/ui/{Button,Panel,Tag,FormRow,FilterBar}.tsx`。Sidebarは768px以下でハンバーガー変形（§4.1）。
- `/login`（DESIGN_SYSTEM.md §5.9パターン）、`/`（`/login`へredirect）を実装。`/dev-preview`に一時的な確認用ページを作成（Phase 4以降で実画面ができ次第削除予定、名刺管理ツールの`_design_preview.php`と同じ位置づけ）。
- Headless Chromium（Playwright）でPC幅(1280px)・スマホ幅(390px)双方のスクリーンショットを確認し、崩れがないことを確認済み。

Phase 2（データ層）も完了。Supabaseは新しいAPIキー体系（Publishable key / Secret key、旧anon key・service_role keyの後継）で運用しており、`lib/supabase/{client,server,service}.ts` もそれに合わせて実装（env変数名は `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY`）。

- `supabase/migrations/0001_init.sql`：spec §6 の全12テーブル・RLS補助関数（`is_authorized_for_client` / `is_agency_user`）・RLSポリシーを作成。`supabase/seed.sql`：施策マスタ17件・`platform_integrations`3件（すべて`pending_review`）を投入。いずれもSupabase DashboardのSQL Editorから実行（Supabase CLIのlink/loginは今回未使用）。
- **spec.mdの見落としを発見・修正**：`campaign_metrics`/`funnel_metrics`の`UNIQUE(..., location_id, ...)`制約は、`location_id`がnull（全社共通）の場合にPostgresの「NULLは他のどのNULLとも一致しない」という挙動により重複を防げないことが判明。特定拠点用・全社共通用に分けた部分ユニークインデックス（`where location_id is not null` / `where location_id is null`）に変更（`0001_init.sql`）。
- `ad_connections`（OAuthトークンを含む）は`authenticated`ロールへのRLSポリシーを一切設けず、Service Role（Secret key）経由のみアクセス可能とした。クライアントごとのアクセス制御はNext.jsのサーバー側コード（Route Handler）で行う設計とする。
- `clients`テーブルのRLSは新規作成時に割当がまだ存在しない問題があったため、INSERTのみ`is_agency_user()`（代理店ユーザーなら誰でも作成可）、SELECT/UPDATEは`is_authorized_for_client(id)`と分離。
- 検証：Service Roleクライアントで`campaign_channels`17件・`platform_integrations`3件の取得を確認。Publishable keyのみ（未ログイン）での`campaign_channels`/`clients`参照が0件（RLSでブロック）になることを確認。`campaign_metrics`に同一クライアント・チャネル・期間で`location_id=null`の行を2件insertし、2件目が一意性制約違反で失敗することを確認（検証用データは後片付け済み）。

| Phase | 状態 |
|---|---|
| 0 基盤セットアップ | ✅ 完了 |
| 1 デザインシステム移植 | 🟡 進行中（共通コンポーネント完了、残りはPhase 4以降で `dev-preview` 削除のみ） |
| 2 データ層（Supabase/Postgres） | ✅ 完了 |
| 3 認証・アカウント管理 | 未着手 |
| 4 クライアント・拠点管理 | 未着手 |
| 5 施策データ手動入力 | 未着手 |
| 6 広告API連携（フェーズドロールアウト） | 未着手 |
| 7 来場〜契約データ入力（住宅会社側） | 未着手 |
| 8 目標設定・予実管理 | 未着手 |
| 9 ダッシュボード | 未着手 |
| 10 レポート機能 | 未着手 |
| 11 仕上げ | 未着手 |

---

## 0. 前提と現状

- ✅ 確定済みコア技術：**Next.js (App Router) / TypeScript**、**Supabase**（Postgres + Auth + RLS）、**Vercel**、Tailwind CSS、**Recharts**、サーバーサイド HTML→PDF（Puppeteer 系）、**Vercel Cron Jobs**（spec §7）。
- ✅ 参照ドキュメント：`spec.md`（本書の元仕様）、`docs/DESIGN_SYSTEM.md`（見た目の正、spec §12）。

### 着手前に確定が必要な事項（spec §10 の ⚠️）

| # | 事項 | 状態 |
|---|---|---|
| D1 | Google Ads API・Yahoo!広告 API・Meta Marketing API それぞれの利用申請（開発者アカウント登録・アプリ審査、spec §4.2.2・§10） | ⚠️ 進行中の外部プロセス。ただし spec §4.2.2 の**フェーズドロールアウト**方針により実装のブロッカーにはならない：コード実装はテスト用アカウントで先行させ、本番有効化は審査完了後に切り替える（Phase 6 参照）。Meta Marketing API は Standard Access 取得に実績要件（直近15日で API 呼び出し500回以上）があるため、実績作りを早期に開始する必要がある |

> D1 は実装と並行して進める外部タスク（申請書類の準備・提出）として扱い、Phase 0 開始と同時に着手する。実装スケジュール自体は D1 の承認を待たない。

### エンジニアリング上の実装方針（spec には明記されていないが実装に必要な決定）

| # | 事項 | 方針 |
|---|---|---|
| E1 | 広告 API の呼び出し方式 | 各媒体の公式 REST エンドポイントに直接 `fetch` する（重厚な SDK は必須にしない）。Google Ads API は公式 Node.js クライアントライブラリの採用可否を Phase 6 着手時に再検討してよい |
| E2 | ルーティング | Next.js App Router のファイルベースルーティング。`app/(agency)/agency/...` と `app/(client)/client/...` を Route Group で分離し、それぞれのレイアウトで認可チェックを共通化する |
| E3 | OAuth トークンの暗号化 | Node.js `crypto`（AES-256-GCM）を `lib/crypto.ts` に集約。鍵は Vercel 環境変数（`TOKEN_ENCRYPTION_KEY`）で管理し、復号は Service Role 経由のサーバーサイド処理からのみ行う（spec §6） |
| E4 | 日次同期のスケジューリング | `vercel.json` の Cron 設定から `app/api/ads/sync/route.ts` を1日1回呼び出す。対象は `platform_integrations.status = 'active'` かつ `ad_connections.status != 'disconnected'` の組み合わせのみ処理する |
| E5 | PDF 生成 | Vercel Serverless Function 上で `puppeteer-core` + `@sparticuz/chromium`（軽量 Chromium バイナリ、Vercel のデプロイサイズ制約に対応）を使う |
| E6 | RLS とサービス層の役割分担 | 通常の画面操作は Supabase RLS（`auth.uid()` ベース、spec §6）に委ねる。広告 API 同期・PDF 生成など Service Role Key を使うサーバー処理は RLS をバイパスするため、対象クライアント・接続の絞り込みをコード側で明示的に行う |
| E7 | 集計ロジックの実装場所 | 週→月の日数按分、フォロワー数の最新値採用、CTR/CPC/CPL の算出（spec §6「指標ごとの集計方法」）は SQL ビューではなくアプリ層（`lib/metrics/`）に実装し、`campaign_metrics` / `funnel_metrics` は生データのまま保持する |

---

## 1. アーキテクチャ全体像

```
app/
├─ login/page.tsx                        # /login（spec §5、DESIGN_SYSTEM.md §5.9のパターン）
├─ (agency)/agency/
│  ├─ clients/page.tsx                   # クライアント一覧・新規作成・切替
│  ├─ clients/[id]/dashboard/page.tsx    # spec §4.5
│  ├─ clients/[id]/campaigns/page.tsx    # spec §4.2（手動入力＋広告アカウント接続）
│  ├─ clients/[id]/targets/page.tsx      # spec §4.4
│  ├─ clients/[id]/locations/page.tsx
│  ├─ clients/[id]/reports/page.tsx      # spec §4.6
│  └─ users/page.tsx
├─ (client)/client/
│  ├─ dashboard/page.tsx
│  ├─ visits/page.tsx                    # 来場予約・来場入力
│  ├─ proposals/page.tsx                 # 見積もり・図面出し入力
│  ├─ contracts/page.tsx
│  ├─ ad-connections/page.tsx            # 広告アカウント接続（spec §4.2.2）
│  ├─ locations/page.tsx
│  ├─ reports/page.tsx
│  └─ users/page.tsx
└─ api/
   ├─ ads/oauth/[platform]/route.ts      # OAuth 開始・コールバック
   ├─ ads/sync/route.ts                  # Vercel Cron が叩く日次同期バッチ（E4）
   ├─ ads/sync/[connectionId]/route.ts   # 「今すぐ同期」
   └─ reports/[id]/pdf/route.ts          # PDF 生成（E5）

components/
├─ layout/        # Sidebar・PageHeader・MobileNav（DESIGN_SYSTEM.md §4を移植）
├─ ui/             # Button・Panel・Tag・FilterBar・Table・FormRow（同 §5）
└─ dashboard/      # FunnelChart・TrendChart・ChannelBreakdownTable・TargetVsActual・LocationBreakdown・PeriodCompare（spec §4.5、DESIGN_SYSTEM.md に無い新規コンポーネント、spec §12.3）

lib/
├─ supabase/       # server.ts / client.ts（Supabase クライアント初期化、RLS前提とService Role前提を分離）
├─ ads/            # google-ads.ts / yahoo-ads.ts / meta-ads.ts（OAuth・同期・コンバージョンアクション取得）
├─ crypto.ts       # E3: トークン暗号化/復号
├─ metrics/        # E7: 集計ロジック（週→月按分・followers最新値・CTR/CPC/CPL算出）
└─ pdf/            # E5: レポートHTML→PDF変換

supabase/
├─ migrations/     # spec §6 のテーブル・RLSポリシー・UNIQUE制約一式
└─ seed.sql         # 開発用ダミーデータ（クライアント数社・拠点・施策データ・目標）

vercel.json         # Cron設定（E4）
```

### データフローの要点

- **クライアント切替**：代理店ユーザーは `/agency/clients` で担当クライアントを選択し、以降の `[id]` 配下の画面はそのクライアントにスコープされる（RLS で他クライアントのデータは取得不可、spec §6）。
- **手動入力**：`campaigns` / `visits` / `proposals` / `contracts` の各フォームは Server Action（または API route）経由で `campaign_metrics` / `funnel_metrics` に UPSERT する。既存行がある場合は `manually_overridden = true` を立てて更新する（spec §4.2.2, §6）。
- **広告API同期**：Vercel Cron → `api/ads/sync` → `platform_integrations.status = 'active'` な媒体の `ad_connections` を1件ずつ処理 → 各媒体 API から費用・表示回数・クリック数・選択済みコンバージョンアクションの合算値を取得 → `campaign_metrics` に UPSERT（`manually_overridden = true` の行はスキップ、spec §4.2.2）。
- **ダッシュボード表示**：`lib/metrics/` の集計関数が `campaign_metrics` / `funnel_metrics` / `targets` から必要な期間・拠点の値を集計し、CTR/CPC/CPL・期間比較の差分などを都度算出してから各コンポーネントに渡す（spec §6、保存はしない）。
- **レポート生成**：ダッシュボードと同じ集計結果を `reports.snapshot_data` に jsonb で保存し、閲覧・PDF 生成は以後この保存済みスナップショットのみを参照する（元データが変わっても再計算しない、spec §4.6）。

---

## 2. 実装フェーズ（順序付き）

各フェーズは独立検証可能な単位。先頭ほど他に依存される基盤。

### Phase 0 — 基盤セットアップ
**ゴール**：Vercel にデプロイされた最小の Next.js ページが、Supabase に疎通する。
1. Next.js (App Router) + TypeScript プロジェクトを作成し、Git リポジトリを初期化する。
2. Supabase プロジェクトを作成し、環境変数（`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` / `TOKEN_ENCRYPTION_KEY`）を Vercel に登録する。
3. `lib/supabase/client.ts`（ブラウザ/RLS前提）と `lib/supabase/server.ts`（Service Role 前提）を分離して用意する。
4. Vercel と Git リポジトリを連携し、最小ページのデプロイと Supabase への疎通確認（`SELECT 1` 相当）ができるようにする。
5. D1（媒体 API 申請）に並行して着手する（§0）。
**完了条件**：Vercel 上の URL でトップページが表示され、Supabase へのクエリが成功する。

### Phase 1 — デザインシステム移植
**ゴール**：`DESIGN_SYSTEM.md` と同じトーン（サイドバー構成・配色・情報密度・角丸/シャドウ）の共通レイアウトが Next.js + Tailwind 上で再現される（spec §12）。
1. `tailwind.config` に DESIGN_SYSTEM.md §1・§3 のカラートークン・`radius`・`shadow` を `theme.extend` として移植する。
2. Noto Sans JP / Archivo フォントを `next/font` で読み込み、`fontFamily` に設定する。
3. `components/layout/Sidebar.tsx`・`PageHeader.tsx` 等、DESIGN_SYSTEM.md §4・§5 のレイアウトシェル・コンポーネントを React コンポーネント化する。モバイル（768px 以下）でのハンバーガー変形を含める（§4.1）。
4. `/login` ページを DESIGN_SYSTEM.md §5.9 のパターン（ネイビー背景＋中央カード）で実装する。
5. サイドバーのロゴ・サブテキストは本プロダクト名（仮称）に置き換える。
**完了条件**：空のページでも DESIGN_SYSTEM.md 記載のトーンで表示される。実装後、Headless Chrome 等で PC 幅・スマホ幅（375〜390px）双方のスクリーンショットを確認する（spec §12.4）。📌 受け入れ基準（全画面のUI品質に波及）。

### Phase 2 — データ層（Supabase/Postgres）
**ゴール**：spec §6 準拠のスキーマ・RLS・制約が揃う。
1. `supabase/migrations/`：`clients` / `locations` / `agency_users` / `agency_user_clients` / `client_users` / `campaign_channels` / `platform_integrations` / `ad_connections` / `campaign_metrics` / `funnel_metrics` / `targets` / `reports` の全テーブルを作成する。
2. `campaign_metrics`・`funnel_metrics`・`targets` に UNIQUE 制約を設定する（spec §6「一意性制約」）。
3. `locations` / `campaign_metrics` / `funnel_metrics` に `created_by_type/id` / `updated_by_type/id` を含める（spec §6「編集履歴の記録」）。
4. RLS ポリシーを全テーブルに設定：`auth.uid()` が `agency_user_clients` 経由で割当のある代理店ユーザー、または該当 `client_id` の住宅会社ユーザーである場合のみ読み書き可（spec §6）。
5. `campaign_channels` に初期施策マスタ（spec §4.2 の17件）を投入する seed を用意する。
6. `platform_integrations` に Google広告・Yahoo広告・Meta広告の3行を `status = 'pending_review'` で初期投入する。
7. `lib/crypto.ts`（E3）：AES-256-GCM の暗号化・復号関数を実装し、往復一致を単体テストで確認する。
**完了条件**：マイグレーションを適用して全テーブルが作成される。他クライアントの `client_id` を指定したクエリが RLS で拒否されることを確認する。📌 受け入れ基準（データ分離・§8セキュリティ）。

### Phase 3 — 認証・アカウント管理
**ゴール**：📌 代理店・住宅会社それぞれのアカウントでログインでき、新規クライアント登録時に住宅会社側の初期アカウントが発行される（spec §4.1）。
1. Supabase Auth（メール＋パスワード）を有効化し、`agency_users` / `client_users` それぞれのサインアップ/招待フローを実装する（auth ユーザー作成と同じ id でプロフィール行を作成、spec §6）。
2. 代理店担当者による新規クライアント登録画面（`/agency/clients` の新規作成導線）で、住宅会社側の初期ユーザーアカウントを同時に発行する。
3. `/agency/users` / `/client/users`：追加のユーザー招待を、それぞれ自分の所属側に対して行える画面を実装する。
4. 代理店担当者は `agency_user_clients` に割当のあるクライアントのみ切り替え・アクセスできるようにする（Phase 4 の切替UIと連携）。
**完了条件**：代理店が新規クライアントを登録すると住宅会社側アカウントが発行され、そのアカウントでログインできる。他社の代理店担当者は割当のないクライアントにアクセスできない。

### Phase 4 — クライアント・拠点管理
**ゴール**：クライアント・拠点の登録・編集・切替が一通り動作する（spec §4.1）。
1. `/agency/clients`：担当クライアント一覧・切替。
2. `/agency/clients/[id]/locations`・`/client/locations`：拠点の登録・編集を代理店・住宅会社どちらからも行えるようにし、`created_by_type/id`・`updated_by_type/id` を記録する。
**完了条件**：代理店・住宅会社どちらの画面からも拠点を登録・編集でき、編集者の記録が残る。

### Phase 5 — 施策データ手動入力
**ゴール**：📌 手動施策（spec §4.2 マスタのうち「手動」の14施策）の期間・拠点別データ入力が動作する。
1. `/agency/clients/[id]/campaigns`：施策一覧・期間（月次/週次）・拠点（特定拠点/全社共通）を指定した数値入力フォーム（spec §4.2.1）。
2. TVCM・ポータルサイト・チラシ折込の3施策は表示回数・クリック数を任意項目にする（spec §4.2）。
3. CTR・CPC・CPL は保存せず、一覧表示時に算出する（`lib/metrics/`、spec §4.2 算出式）。
**完了条件**：代理店担当者が施策データを期間・拠点を指定して入力・一覧確認でき、CTR/CPC/CPL が表示される。

### Phase 6 — 広告API連携（フェーズドロールアウト）
**ゴール**：📌 Google広告・Yahoo広告・Meta広告の OAuth 接続・自動同期・手動上書きが動作し、審査状況に応じた運用切り替えができる（spec §4.2.2）。
1. `lib/ads/`：各媒体の OAuth 認可コードフロー・トークン交換・費用/表示回数/クリック数/コンバージョンアクション取得を実装する（E1）。テスト用アカウント（Google Test Account Access 等）で検証する。
2. `platform_integrations.status` が `pending_review` の間は、接続画面（`/agency/clients/[id]/campaigns`・`/client/ad-connections`）で OAuth 接続ボタンを非活性にし「審査待ち」を表示する。この間は Phase 5 の手動入力フォームで運用する。
3. コンバージョンアクション選択 UI：OAuth 接続後に取得した一覧から複数選択（初期状態は全選択）でき、選択は `ad_connections.tracked_conversion_action_ids` に保存する。
4. `api/ads/sync`（Vercel Cron、E4）：日次で `platform_integrations.status = 'active'` かつ接続済みの `ad_connections` を同期し、`manually_overridden = true` の行は上書きしない。
5. `api/ads/sync/[connectionId]`：「今すぐ同期」の即時実行。
6. 手動上書き・「APIの値に戻す」操作、接続状態（正常・エラー・未接続）の表示。
**完了条件**：審査待ちの媒体は手動入力のみで運用でき、審査完了（`platform_integrations.status = 'active'` に切替）後は OAuth 接続・自動同期が動作する。手動上書き済みの行が自動同期で上書きされない。📌 受け入れ基準（§11の該当項目）。

### Phase 7 — 来場〜契約データ入力（住宅会社側）
**ゴール**：📌 来場予約・来場・見積もり・図面出し・契約の入力が動作する（spec §4.3）。
1. `/client/visits`・`/client/proposals`・`/client/contracts`：期間（月次/週次）・拠点を指定した入力フォーム。`funnel_metrics` に UPSERT し、作成者・更新者を記録する。
**完了条件**：住宅会社担当者が来場〜契約の各データを期間・拠点を指定して入力・一覧確認できる。

### Phase 8 — 目標設定・予実管理
**ゴール**：📌 代理店がクライアントごとに月次 KPI 目標を設定できる（spec §4.4）。
1. `/agency/clients/[id]/targets`：KPI（合計反響数・チャネル別反響数・来場予約数・来場数・契約数等）ごとの月次目標値の設定画面。`targets` テーブルへ UPSERT。
**完了条件**：代理店担当者が月次目標を設定・編集でき、Phase 9 の予実対比から参照できる。

### Phase 9 — ダッシュボード
**ゴール**：📌 spec §4.5 の全表示要素（ファネル図・期間推移・チャネル別内訳・予実対比・拠点別内訳・期間比較）が動作する。本プロダクトの中心機能のため最も時間を割く。
1. `lib/metrics/`（E7）：フロー指標の合算・週→月の日数按分、フォロワー数の最新値採用、流入率の非集計、CTR/CPC/CPLの算出をユニットテスト付きで実装する（spec §6「指標ごとの集計方法」）。
2. `components/dashboard/FunnelChart`：施策→反響→来場予約→来場→{見積もり, 図面出し}→契約の並列2段階ファネル図（Recharts＋カスタムSVG、spec §4.5・§12.3）。
3. `TrendChart`：主要 KPI の月次/週次推移。
4. `ChannelBreakdownTable`：チャネル別内訳（CTR/CPC/CPL、オーガニックのフォロワー数・流入率を含む）。
5. `TargetVsActual`：会社全体の予実対比（拠点別の予実対比は行わない、spec §4.5）。
6. `LocationBreakdown`：拠点別内訳（全社共通区分を含み、合計が会社全体と一致することを確認）。
7. `PeriodCompare`：任意の基準期間・比較期間を指定した差分・増減率表示（流入率は対象外、spec §4.5）。
**完了条件**：`/agency/clients/[id]/dashboard`・`/client/dashboard` で spec §4.5 の全要素が表示され、拠点別内訳の合計が会社全体の数値と一致する。📌 受け入れ基準の過半数がこのフェーズに集中する。

### Phase 10 — レポート機能
**ゴール**：📌 レポートの生成・スナップショット保存・PDF出力・再閲覧が動作する（spec §4.6）。
1. `/agency/clients/[id]/reports`・`/client/reports`：期間指定でのレポート生成。生成時点の集計結果（Phase 9 と同じロジック）を `reports.snapshot_data` に jsonb で保存する。
2. `api/reports/[id]/pdf`（E5）：`puppeteer-core` + `@sparticuz/chromium` でスナップショットデータから HTML→PDF を都度生成する（ファイルは永続保存しない）。
3. レポート一覧（生成日時・対象期間）から過去レポートを再度開けるようにする。
**完了条件**：レポート生成後に元データを変更しても、生成済みレポートの内容が変わらないことを確認する。PDF ダウンロードが動作する。

### Phase 11 — 仕上げ
**ゴール**：📌 spec §11 の受け入れ基準を全項目満たし、v1 として完了する。
1. 非機能要件の確認：モバイル入力の実機確認（spec §8 レスポンシブ）、必須項目チェック・数値バリデーション（負数不可等）、外部API障害時に他機能へ影響しないこと（`ad_connections.status` へのエラー表示含む）。
2. パフォーマンス確認：データ蓄積を想定したダミーデータでの期間集計・グラフ描画速度を確認する。
3. セキュリティ最終確認：RLS の他クライアントアクセス拒否、OAuth トークンが平文で存在しないことをDB上で確認する。
4. spec §11 の受け入れ基準を全項目チェックする。
**完了条件**：spec §11 の受け入れ基準を全項目満たす。

---

## 3. 受け入れ基準 ↔ フェーズ対応（spec §11）

| 受け入れ基準 | 担当フェーズ |
|---|---|
| 新規クライアント登録＋住宅会社側初期アカウント発行 | Phase 3 |
| 代理店・住宅会社どちらからも拠点を登録・編集できる | Phase 4 |
| 代理店担当者がクライアントを切り替えてダッシュボード閲覧 | Phase 4・9 |
| 施策データ（広告／運用オーガニック）の手動入力 | Phase 5 |
| 媒体ごとの審査状況表示・審査待ちは手動入力のみ | Phase 6 |
| 審査完了済み媒体の OAuth 接続 | Phase 6 |
| 広告アカウントの日次自動同期・即時同期 | Phase 6 |
| コンバージョンアクションの選択 | Phase 6 |
| API連携データの手動上書き・上書き済み行の保護 | Phase 6 |
| 来場〜契約データの入力 | Phase 7 |
| 月次 KPI 目標の設定 | Phase 8 |
| ファネル図（件数・遷移率）の表示 | Phase 9 |
| 予実対比の表示 | Phase 8・9 |
| 任意の2期間の比較表示 | Phase 9 |
| レポート生成・画面閲覧・PDFダウンロード | Phase 10 |
| レポートのスナップショット保存 | Phase 10 |
| 過去レポート一覧からの再閲覧 | Phase 10 |
| 拠点別内訳の合計と会社全体の数値の一致 | Phase 9 |

---

## 4. v1スコープ境界（念押し）

**後回し（v1.1以降、spec §9）**：Google広告・Yahoo広告・Meta広告以外の媒体の API 自動連携、拠点別の目標設定・予実管理、複数代理店対応の汎用 SaaS 化、ロール内の権限差、契約金額・原価・粗利の管理、通知・アラート機能、多言語対応。

**作らない（spec に明記のないもの）**：見積もり／図面出しの「いずれか一方でも通過した数」の自動算出（spec §3で撤回済み）、拠点別の目標設定・予実対比、レポートPDFファイルの永続保存。

---

## 5. リスクと対策

| リスク | 影響 | 対策 |
|---|---|---|
| Google/Yahoo/Meta の API 審査が長期化・却下される | 該当媒体の自動連携が v1 リリース後もしばらく使えない | spec §4.2.2 のフェーズドロールアウトで吸収（審査待ちは手動入力で運用）。D1 の申請作業を Phase 0 から並行着手し、Meta の実績要件（直近15日500コール以上）は早期にテスト運用で満たしておく |
| Supabase RLS ポリシーの設定漏れによるクライアント間データ漏洩 | 他クライアントの機密データ（広告費用・反響数等）が閲覧できてしまう | Phase 2 で全テーブルの RLS を実装し、他クライアントIDでのアクセス試行が拒否されることを都度確認する。Service Role を使うサーバー処理（同期・PDF生成）はコード側で対象を明示的に絞る（E6） |
| 週→月の日数按分・フォロワー数最新値採用など集計ロジックの実装ミス | ダッシュボード・レポートの数値が代理店・住宅会社間でずれ、信頼を損なう | `lib/metrics/` にユニットテストを用意し、月またぎの週・複数拠点合算・分母0のエッジケースを網羅する（Phase 9） |
| Vercel Serverless Function 上での Puppeteer/Chromium 実行時のサイズ・メモリ・タイムアウト制約 | PDF 生成が本番環境でのみ失敗する | `@sparticuz/chromium` を採用し、Phase 10 の早い段階で Vercel 実環境での生成を検証する |
| OAuth トークンの暗号鍵（`TOKEN_ENCRYPTION_KEY`）の管理 | 鍵が漏洩するとすべての広告アカウントトークンが復号可能になる | Vercel 環境変数のみで管理し、リポジトリ・ログに出力しない。ローテーション方針は v1 では固定鍵とし、必要が生じた時点で再検討する |
| 広告 API 側のレート制限・障害・認証切れ | 同期失敗が他機能（手動入力・閲覧）に波及する | 同期処理をクライアント・接続単位で独立させ、失敗しても他のクライアントの処理・画面閲覧に影響しないようにする。`ad_connections.status` にエラーを反映し画面に表示する（spec §8） |

---

## 6. 進め方の指針

1. **Phase 0→1→2→3 を先に固める**（基盤・デザイン・データ・認証）。
2. **D1（媒体API申請）は Phase 0 開始と同時に着手する**。審査結果を待たず Phase 6 の実装（テストアカウントでの検証）を進め、承認が取れ次第 `platform_integrations.status` を切り替える（spec §4.2.2）。
3. **Phase 9（ダッシュボード）に最も時間を割く**（本プロダクトの中心価値、受け入れ基準の過半数が集中）。
4. 各フェーズ末で完了条件と対応する受け入れ基準を実機チェックしてから次へ進む。
5. D1 は解決済み方針（フェーズドロールアウト）で進行中。新たな ⚠️ が発生した場合は本書と spec.md 双方に追記して可視化し、対応するフェーズ着手前に確定させる。

> 次アクション候補：①Phase 0（Next.js/Supabase プロジェクト作成・Vercel 連携） → ②`supabase/migrations` の作成（Phase 2） → ③各媒体の API 利用申請に着手（§0 D1、実装と並行）。
