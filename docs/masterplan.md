# 住宅マーケティング数値ダッシュボード（仮称） — masterplan.md

> `spec.md`（v1）に対する実装計画。**何を・どの順で・どう作るか**を定義する。
> 仕様の記述を正とし、本書は「実装の地図」として spec を分解・補完する。
> 記法: ⚠️ = 着手前に人間判断が要る箇所 / ✅ = spec で確定済み / 📌 = 受け入れ基準に直結。
> `masterplan-sample.md` は別プロジェクト（「サーバー情報管理アプリ」）のサンプルであり、本プロジェクトの内容ではない。書式の参考としてのみ扱う。

---

## 実装状況（2026-08-27 更新）

> 2026-08-27時点の到達点・積み残し・留意点は本書末尾「## 11. 2026-08-27（続き・4セッション目）セッション終了メモ」を参照（**次回はここから読む**）。「## 10.」「## 9.」「## 8.」は同日の前のセッションの記録として履歴保持する。それ以前は2026-08-01・2026-08-20・2026-08-24時点の記録（履歴として保持）。

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
| 3 認証・アカウント管理 | ✅ 完了（2026-08-24、招待〜パスワード設定〜ログインまで実機確認済み。テンプレートの`next`固定値化のみ外部作業が残るが実装は完了） |
| 4 クライアント・拠点管理 | ✅ 完了 |
| 5 施策データ手動入力 | ✅ 完了（デフォルト17施策・クライアント固有施策・制作費用すべて実装済み） |
| 6 広告API連携（フェーズドロールアウト） | 🟡 進行中（2026-08-24、共通基盤完了・各媒体APIコード呼び出しはプレースホルダー） |
| 7 来場〜契約データ入力（住宅会社側） | ✅ 完了（2026-08-24） |
| 8 目標設定・予実管理 | ✅ 完了（2026-08-24、目標設定画面のみ。予実対比の表示自体はPhase 9）。**⚠️2026-08-27追記：`docs/improvement.md`の検討により、この画面のスコープを再設計（チャネル別反響目標・予算・年間一括入力等）。DB設計・実データ接続とも完了（同日中の別セッション、本書「## 10.」節参照）。マイグレーション適用済み** |
| 9 ダッシュボード | ✅ 完了（2026-08-27、実データ集計エンジン。住宅会社側・代理店側とも実機確認済み） |
| 10 レポート機能 | 🟡 実質完了（2026-08-27、レポート生成・保存・閲覧は実装・実機確認済み。PDFは従来通りブラウザ印刷で代替、サーバーサイド生成（E5）は未着手） |
| 11 仕上げ | 未着手 |

### 2026-08-10: 実装前のUIモックアップ確認（Phase 3着手前の割り込み作業）

Phase 3（認証）着手前に、spec.mdの機能に漏れがないかをUIで確認する目的で、複雑度の高い4画面（ダッシュボード・施策データ入力・広告アカウント接続・レポート）を実データ接続なしのモックアップとして先行実装した。認証・DB接続はまだ行わず、`src/lib/mock/`の静的ダミーデータ（クライアント2社・拠点2件・施策マスタ17件・2ヶ月分の実績・目標・レポート2件）で画面を組んでいる。Phase 3以降で実データ層に接続する際は、この画面実装を土台にして`lib/mock/`呼び出しをSupabaseクエリに置き換える想定。

- 実装箇所：`src/app/(agency)/agency/clients/[id]/{dashboard,campaigns,reports}`、`src/app/(client)/client/{dashboard,ad-connections,reports}`、`src/components/dashboard/*`（Funnel/Trend/ChannelBreakdown/TargetVsActual/LocationBreakdown/PeriodCompare）、`src/components/campaigns/*`、`src/components/ads/*`、`src/components/reports/*`、`src/components/ui/{Table,StatusBadge}`。`recharts`を導入（期間推移グラフ）。dataviz skillの検証手順に従い、期間推移グラフの3系列配色（`#3B6EA5`/`--accent`/`#A67C1E`）をCVD安全性チェック済み。
- **このモックアップ作業中に見つけて修正したPhase 1由来の実バグ**（Phase 5以降の本実装にも影響するため記録）：
  1. `globals.css`の共通input装飾が`type="number"`・`type="month"`を含んでおらず、数値入力欄がすべて枠線なしで実質見えない状態だった（施策データ入力・目標設定・来場〜契約入力など、数値入力が主体の画面すべてに影響する不具合）。修正済み。
  2. CTR/CPC/CPLの金額表示が小数点以下まで出ていた（¥142.308等）。`lib/mock/aggregate.ts`に`formatYen`等の共通フォーマッタを用意し四捨五入するよう統一。
  3. テーブルの列幅が窮屈だと日本語が1文字ごとに縦に折れて行が異常に高くなる不具合。DESIGN_SYSTEM.md §4.1の「横スクロールで対応する」方針に反していたため、`Table`の`Td`に`whitespace-nowrap`を既定化。
  4. `Panel`のタイトルは大文字化（uppercase）前提だが、"Google広告"のような英字+日本語混在の文字列を渡すと"GOOGLE広告"に化けることが判明。タイトルには英字ブランド名を含めず、本文側に通常表記で出す方針に変更。
- **spec.mdに対して見つかり、2026-08-10にユーザーと確認して確定した設計判断**（実装のバグではなく、spec.mdの記述だけでは決まらなかった点）：
  1. **期間比較の列数**：spec §4.5のチャネル別内訳・拠点別内訳を全指標×基準/比較/差分/増減率で並べると列数が破綻する（チャネル別だけで20列）。→ **指標を絞る**方針で確定。費用・反響数・CPLの3指標のみ基準/比較/差分/増減率で表示する（`PeriodCompare`実装済み）。
  2. **ファネル図の起点「施策」の表示内容**：spec §6には件数として持てるカラムが無い。→ **チャネルごとの反響数の内訳リスト**として表示する方針で確定（単なるアイコン表示ではない）。`FunnelChart`に`channelLeads`を追加し、反響数の多い順にチャネル名と件数を並べる形で実装済み。レポートのスナップショット（`reports.snapshot_data`）にもこの内訳を含める必要があることが判明したため、`Report`型・`ReportsView`のレポート生成処理も合わせて修正した。
  3. **拠点未登録クライアントの拠点別内訳**：→ **セクション非表示**で確定（ダッシュボード・期間比較の両方）。実装済み・追加対応不要。
  4. **「APIの値に戻す」操作のタイミング**：→ **即時に再同期する**方針で確定。本モックでは上書き前の同期値を`apiSyncedValue`として保持し、「APIの値に戻す」クリックで即時に値を復元する形で再現した（実データ接続後のPhase 6では、この操作から単体同期処理を呼ぶ実装に置き換える）。
  5. **週次データの入力UI**：Phase 5着手時に具体的なUIパターンを別途検討する（今回のモックは月次のみ実装、`<input type="week">`だけでは仕様通りの週開始日指定が難しいことが分かっている）。これは今回確定せず、Phase 5で改めて検討する。
- 上記の「実装バグ」「確定した設計判断」は本コミットで反映済み。5番（週次入力UI）のみPhase 5着手時に持ち越し。

### 2026-08-10（続き）: モックアップ確認から出た機能追加3点をspec.mdに反映

上記のモックアップを実際に見たユーザーから、施策データ入力・レポートに関する新規要望が出たため、spec.mdを更新した上でモックアップにも反映した。**spec.md自体が更新されている**（§4.2.3・§4.2.4・§4.5・§4.6・§6・§9・§11）ため、Phase 5・6・9・10着手時は更新後のspec.mdを参照すること。

- **施策マスタのクライアント別管理（spec §4.2.3、新規）**：デフォルト17施策に加え、クライアントごとに固有の施策（地元フリーペーパー等）を代理店のみが追加できる。入力項目（費用・表示回数・クリック数・フォロワー数・投稿数・再生数・流入率）はチェックボックスで個別に有効化する方式に変更し、`campaign_channels`に`client_id`（null=全クライアント共通）・`enabled_fields`・`required_fields`（配列）を追加。従来の「type（広告/運用）で表示項目を出し分ける」実装だったチャネル別内訳表示ロジックは、種別に関わらず全項目を計算し未入力はnull→「-」表示に統一することで、任意の項目組み合わせを持つカスタム施策にも対応できるよう簡略化した（`ChannelBreakdownTable`等）。
- **制作・クリエイティブ費用（spec §4.2.4、新規）**：施策の反響とは紐づかない項目名＋金額の自由入力リスト（新テーブル`production_costs`）。ダッシュボード・レポート・期間比較には期間合計のみ表示する。
- **施策データの修正フロー変更**：一覧の各行に「修正」ボタンを追加し、モーダル（新規コンポーネント`components/ui/Modal.tsx`、DESIGN_SYSTEM.mdにパターンが無いため新規設計）で値を編集する方式に変更。施策・拠点・期間（行のキー）はモーダル内では変更不可（読み取り専用表示）にし、数値項目のみ編集できるようにした（キー変更によるupsert衝突を避けるため）。
- **レポートの期間指定・期間比較（spec §4.6 変更）**：対象月の単一選択から、期間種別（月次/週次/カスタム=任意の開始日〜終了日）の指定に変更。生成時に「比較期間を含める」を選択でき、含めた場合はダッシュボードと同じ`PeriodCompare`をレポート詳細にも表示する。`Report`型を`{base: ReportPeriodSnapshot, compare?: ReportPeriodSnapshot}`に再構成し、`ReportPeriodSnapshot`にファネル・チャネル別内訳・拠点別内訳・予実対比・制作費用合計をすべて含めるようにした（従来はファネルとチャネル別反響数のみで、spec §4.6の「チャネル別・拠点別・予実の集計結果」を満たしていなかった不足を修正）。
- 集計ロジックの重複を減らすため、`lib/mock/aggregate.ts`に`buildTargetVsActual`・`buildReportPeriodSnapshot`・`sumProductionCost`を追加し、ダッシュボード（`DashboardView`）・レポート生成（`ReportsView`）・レポートのシードデータ（`data.ts`のMOCK_REPORTS）が同じ集計関数を共有する構成にした（手打ちの数値とのズレを防ぐため）。

### ▶ 次回のアクション（2026-08-20時点、履歴の詳細は本ブロック内に残す）

**2026-08-20時点の到達点**：Phase 0〜2・4・5 完了。Phase 3（認証）は実装完了・外部設定が一部残る。Phase 6〜11は未着手。

以下は2026-08-01時点で書かれた「Phase 3から再開する」という古いメモ（内容は完了済み・詳細は履歴として有用なため残す）。**2026-08-20時点で実際に次にやるべきことは、このブロックの末尾「2026-08-20時点の積み残し・留意点」を見ること。**

- **前提の確認事項**（再度ユーザーに聞き直す必要はない、済んでいるはず）：GitHubリポジトリ `nagata-md/dashboadmark` にpush済み。Supabaseプロジェクト作成済み・`.env.local` にURL/Publishable key/Secret keyとも設定済み。migrations/seedはSupabase Dashboard経由で適用済み（§2参照）。**Vercel連携はまだ**（`vercel link` またはダッシュボードでのGitHubリポジトリimportが未実施）。
- **Phase 3 でやること**（§2 Phase 3 の詳細も参照）：
  1. Supabase Auth（メール+パスワード）を有効化する。→ **完了（2026-08-20、確認のみ）**。新規Supabaseプロジェクトはメール+パスワードプロバイダがデフォルトで有効なため、ダッシュボード側の設定変更は不要だった。`auth.admin.createUser`（`email_confirm: true`）→`signInWithPassword`→`auth.admin.deleteUser`の使い捨てテストユーザーで作成・ログイン・削除の一連の流れが実際に成功することをService Role経由の一時スクリプトで検証済み（検証用ユーザーは削除済み、永続的な変更なし）。ログインフォーム自体はまだSupabase Authに接続されていない（静的フォームのまま、次項3で対応）。
  2. ~~`middleware.ts` を追加する~~ → **完了（2026-08-20）**。**Next.js 16 では `middleware.ts` は `proxy.ts` にリネームされている**（`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`、`export function middleware` ではなく `export function proxy`）ため、`src/proxy.ts` として実装した。`@supabase/ssr` の `createServerClient` は「セッション更新なしだと原因不明の予期しないログアウト・認証エラーが起きる」と明記しているため、毎リクエストで `supabase.auth.getUser()` を呼びCookieを更新するのみの実装（`src/lib/supabase/server.ts` の `setAll` のコメント参照）。**未ログイン時の `/login` リダイレクトは意図的に入れていない**：Supabase Authがまだ有効化されておらずログイン手段が無いため、ここでガードを入れると全ルートがリダイレクトループになりモックアップの動作確認ができなくなる。ガードは本項目1・3（Auth有効化・ログインフォーム接続）の後に追加すること。`npx tsc --noEmit` と dev サーバーでの `/login`・`/client/dashboard`・`/agency/clients/[id]/dashboard` 疎通確認済み（いずれも200、ログに`proxy.ts`実行時間が出ることを確認）。
  3. `agency_users` / `client_users` のサインアップ/招待フロー（Supabase Auth の `auth.users` 作成と同じ id でプロフィール行を作成、spec §6）。→ **認証まわりの実装は完了（2026-08-20）、実運用には外部設定2件が残る（下記参照）**。

     2026-08-20、代理店・住宅会社で認証方式が異なる方針を確定（spec §4.1.1に反映済み）：代理店担当者は自社Google Workspaceドメイン限定のGoogle OAuth（ドメイン一致で初回ログイン時に`agency_users`自動発行、招待不要）、住宅会社担当者は既存方針どおりメール+パスワード（代理店がメールアドレス登録→招待メール→本人がパスワード設定）。

     実装済みファイル：
     - `src/lib/auth/agencyDomain.ts`：`AGENCY_GOOGLE_WORKSPACE_DOMAIN`環境変数（`.env.local`に`marketingdept-llc.com`を設定済み）に対するメールドメイン判定。
     - `src/app/auth/callback/route.ts`：Google OAuthコールバック。`exchangeCodeForSession`→ドメイン判定（不一致なら`agency_users`を作らず即サインアウト）→Service Role経由で`agency_users`を自動作成（`agency_users_insert`のRLSポリシーは`is_agency_user()`前提のため初回作成はService Role必須）。
     - `src/app/auth/confirm/route.ts`：住宅会社担当者の招待リンク（`verifyOtp`）受け口。Supabase Dashboardの「Invite user」メールテンプレートを`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next={{ .RedirectTo }}`に変更する必要あり（**未実施・下記外部作業**）。
     - `src/app/set-password/page.tsx`：招待受諾後にパスワードを設定するページ（`supabase.auth.updateUser`）。
     - `src/lib/auth/inviteClientUser.ts`：住宅会社担当者の招待（`admin.inviteUserByEmail`）。呼び出し元（代理店担当者）が対象クライアントに割当済みかをコード側で明示的に検証してからService Roleで実行する（masterplan E6方針）。
     - `src/app/login/actions.ts` / `src/app/login/page.tsx`：ログイン画面に「Googleでログイン」（代理店）と「メール+パスワード」（住宅会社）の両方式を実装（従来の静的フォームから置き換え）。

     **検証結果**：
     - ドメイン判定ロジック（`isAgencyDomainEmail`）は一致・不一致とも期待通り動作することをユニット的に確認。
     - `inviteClientUser`の認可チェックは、未割当クライアントへのinviteが`not_authorized`で正しく拒否されることを使い捨てテストデータ（代理店ユーザー・クライアント・割当を作成→テスト→削除、後片付け済み）で確認。
     - 招待メール送信（`admin.inviteUserByEmail`）は**Supabase既定の組み込みメーラーのレート制限（"email rate limit exceeded"）に阻まれ、実際のメール送信までは確認できていない**（後述の外部作業が必要）。`verifyOtp`→`updateUser`（パスワード設定）→`signInWithPassword`の一連の流れ自体は、`admin.generateLink`で取得したトークンを使って迂回確認済みで正常動作する。
     - Google OAuthは`external.google: false`（未有効化）のため、コールバック処理のコードレビューのみで実機テストは未実施。

     **実運用開始前に必要な外部作業（ユーザー側、2件）**：
     1. **Google OAuthクライアントの発行**（spec §10 新規D2）→ **完了（2026-08-20）**。Google Cloud ConsoleでOAuth 2.0クライアントを作成し、Supabase Dashboard の Authentication → Providers → Google に設定済み。`external.google: true`を確認し、実際にGoogleアカウントでログイン→ドメイン一致判定→`agency_users`自動作成まで実機で成功（DBに`長田聖明 / main@marketingdept-llc.com`の行が実際に作成されたことを確認）。
     2. **カスタムSMTPプロバイダの設定**（2026-08-20新規発見）→ **DNS認証は完了、Supabase側の配線が残っている（⚠️次回最優先）**。Supabase既定の組み込みメーラーのレート制限（"email rate limit exceeded"）を回避するため、Vercel Marketplace経由でResendを導入（`vercel link`でVercelプロジェクト`marketingdept-llc/marketinddashboad`を新規作成しGitHub連携、`vercel integration add resend -m domain=marketingdept-llc.com -m region=ap-northeast-1`で導入。`RESEND_API_KEY`・`RESEND_EMAIL_DOMAIN`が`.env.local`に追加済み）。ドメイン認証用のDNSレコード（DKIM TXT・SPF MX・SPF TXT）をユーザー側で追加し、セッション終了時点で`resend domains get`が`status: "verified"`を返すことを確認済み。**しかし`admin.inviteUserByEmail`を試すと`AuthRetryableFetchError`（status 500, message `"{}"`）でまだ失敗する**——これはSupabase Dashboard側（Authentication → Emails → SMTP Settings）にResendのSMTP認証情報（host: `smtp.resend.com` / port: 465 / username: `resend` / password: `.env.local`の`RESEND_API_KEY`の値）がまだ設定されていないためと考えられる（未確認・次回最初に疑うべき箇所）。**次回やること**：①Supabase DashboardでSMTP設定を保存する、②「Invite user」メールテンプレートを`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next={{ .RedirectTo }}`に変更する（`src/app/auth/confirm/route.ts`参照、未実施）、③`admin.inviteUserByEmail`が成功するか再テストする、④可能なら`/agency/clients/new`から実際に住宅会社アカウントを1件招待し、招待メール受信→パスワード設定→ログインまで実機で確認する。
  4. 代理店担当者が新規クライアント登録時に住宅会社側の初期アカウントを同時発行する導線（spec §4.1）。→ **実装完了（2026-08-20、Phase 4の一部を前倒し）**。
     - `src/app/(agency)/agency/clients/page.tsx`：担当クライアント一覧（RLSの`clients_select`により自動的に割当済みクライアントのみ表示）。
     - `src/app/(agency)/agency/clients/new/page.tsx` / `actions.ts`：新規クライアント登録フォーム。クライアント名・初期担当者の氏名/メールアドレスを入力すると、`clients`作成→`agency_user_clients`に登録者自身を割当→`inviteClientUser`で初期アカウントを招待、を1つのServer Actionで実行する。
     - `src/lib/auth/requireAgencyUser.ts`：/agency/*ページ共通のガード（未ログイン・代理店ユーザーでなければ/loginへ）。実際にGoogleログイン済みセッションで動作確認済み。
     - **実装中に見つけて修正した実バグ**：`clients`テーブルへの新規行INSERT時に`.select().single()`（RETURNING）を付けると「new row violates row-level security policy」で失敗する不具合があった。原因はPostgreSQLの仕様で、RETURNINGを使うINSERTは新規行がRETURNING時点でSELECTポリシー（`clients_select`の`is_authorized_for_client`）も満たす必要があるため——ところが`agency_user_clients`の割当はこのINSERTの**後**に作成する設計だったため、割当がまだ存在せず新規クライアント行がSELECTポリシーを満たせず失敗していた。**対処**：クライアントIDをアプリ側（`crypto.randomUUID()`）で生成し、RETURNINGなしでINSERTすることで回避。使い捨てテストデータ（QAテスト代理店・QAテストクライアント2）で作成→一覧反映を確認済み、後片付け済み。
     - **既知の制限（2026-08-20時点で一部解消・一部未解消）**：`[id]/layout.tsx`自体は実クライアントに対応済み（ハイブリッド解決）だが、配下の各page.tsxは個別に`getClient(id)`（モック専用）を呼んで`notFound()`する実装のままだったため、実クライアントでは404になっていた。**`campaigns`・`locations`はPhase 5で実データ対応済みで解消**。**`dashboard`・`reports`は`src/app/(agency)/agency/clients/[id]/{dashboard,reports}/page.tsx`が未対応のまま残っており、実クライアントでは引き続き404になる**（Phase 9・10着手時に対応予定、それまでの既知の制限）。`/client/dashboard`・`/client/ad-connections`・`/client/reports`も同様に未対応。
  5. `/agency/users` / `/client/users` の追加ユーザー招待画面。→ **完了（2026-08-24）**。詳細は本セクション末尾の同日付追記を参照。
  6. 初期データ投入：最初の代理店ユーザーは、上記のGoogle自動プロビジョニングにより「マーケティング担当者が初めてGoogleでログインした瞬間」に自動発行されるため、手動作成は不要になった（2026-08-20の方針変更により当初想定から変更）。
- 完了条件・受け入れ基準は §2 Phase 3、§3 の対応表を参照。

#### 2026-08-20時点の積み残し・留意点（このセッションの終了時点）

**⚠️ 次回最優先（外部作業・ユーザー側）**
1. Supabase Dashboard（Authentication → Emails → SMTP Settings）にResendのSMTP情報を設定する（host: `smtp.resend.com` / port: 465 / username: `resend` / password: `.env.local`の`RESEND_API_KEY`）。ResendのDNS認証（DKIM/SPF）は完了済み（`status: verified`確認済み）だが、Supabase側にまだ配線していないため、`admin.inviteUserByEmail`は`AuthRetryableFetchError`（500）で失敗する状態のまま。
2. 「Invite user」メールテンプレートを`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next={{ .RedirectTo }}`に変更する（`src/app/auth/confirm/route.ts`が前提としている形式。未変更のままだとデフォルトのSupabase側確認画面に飛んでしまいこのアプリのフローに乗らない）。
3. 上記2件が終わったら、実際に`/agency/clients/new`から住宅会社を1件登録し、招待メール受信→パスワード設定（`/set-password`）→ログインまで一連の流れを実機で確認する（これはまだ一度も実メール経由では確認できていない。verifyOtp以降はトークンを直接使う迂回確認のみ済み）。

**未着手の機能（次に取り組むとすれば）**
- Phase 6は共通基盤のみ完了（下記2026-08-24の節参照）、各媒体の実API実装・審査申請は未着手。
- Phase 7・8は完了（下記参照）。Phase 9〜11は未着手（Phase 9のダッシュボードで実際にtargetsを読んで予実対比を表示する部分もここに含まれる）。

### 2026-08-24（続き）: Phase 7（来場〜契約データ入力・住宅会社側）実装

ユーザーの「審査は後回しにしてよいので、広告APIの実装自体とPhase 7を進めたい」という指示を受けて着手。spec §4.3どおり、`/client/visits`（来場予約数・来場数）・`/client/proposals`（見積もり数・図面出し数）・`/client/contracts`（契約数）の3画面を新規実装した。3画面とも**同じ`funnel_metrics`行（client_id+location_id+period_type+period_startがキー）の異なる列に対してUPSERTする**構造（見積もり・図面出しは来場から分岐する並列2段階のため合算しない、§3）。

- `src/lib/funnel/upsertFunnelMetric.ts`（新規、3画面共通）：`campaign_metrics`と同様、`location_id`のnull有無で部分ユニークインデックスが分かれているため、既存行をSELECTしてからUPDATE/INSERTを切り替える。**UPDATE時は呼び出し元が渡したフィールドのみを更新し、他の2画面が担当する列には触れない**（`getFunnelMetric`で現在値を取得しフォームに初期値として表示）。
- `src/app/(client)/client/{visits,proposals,contracts}/{page,actions}.tsx`（新規）：`/agency/clients/[id]/campaigns`と同じ期間・拠点選択パターン（月次/週次、`resolvePeriod`共有）を踏襲。保存後は`?success=saved`で同じ画面にリダイレクトし成功メッセージを表示（`/client/users`のフィードバックを踏まえ最初から成功メッセージ付きで実装）。
- 拠点未登録クライアントでも「全社共通」を選べば動作する（`locationId=""`→`location_id is null`、既存の施策データ入力と同じ扱い）。
- **検証**（`npx tsx --env-file=.env.local`で実コードのDB操作ロジックを直接実行、使い捨てテストデータ、後片付け済み）：同一期間・同一拠点に対して①`/client/visits`相当の保存（新規行作成）→②`/client/proposals`相当の保存→③`/client/contracts`相当の保存、の順に実行し、**後続の保存が先に保存した列を上書き・消去しないこと**（各画面が自分の担当列のみを更新すること）を確認。`npx tsc --noEmit`・`npm run build`とも成功、3ルートがビルドに現れることを確認済み。
- ブラウザでの実機目視確認はまだ行っていない（Phase 6のUI確認と合わせて次回対応）。
- 代理店側にはこの3画面の対応物は無い（spec §4.3のタイトル・画面一覧§5のとおり住宅会社側専用の機能のため、意図した設計）。

### 2026-08-24（続き）: Phase 8（目標設定）実装

spec §4.4「代理店担当者が、クライアントごとに月次でKPI目標値を設定する」に対応。`/agency/clients/[id]/targets/{page,actions}.tsx`を新規実装した。

- **KPIキーの定義場所を整理**：既存の`src/lib/mock/aggregate.ts`内に`KPI_LABELS`（`leads_total`・`visit_reservations`・`visits`・`contracts`の4種、モックのダッシュボード予実対比が使用）が定義されていたが、Phase 9で実データのダッシュボードを実装する際にこの4種と食い違うと予実対比が機能しなくなるため、`src/lib/targets/kpiLabels.ts`を正の定義場所として新設し、`lib/mock/aggregate.ts`側はそこからimportするよう修正した（挙動は変えていない、参照先の一本化のみ）。spec §4.4は「チャネル別反響数」も目標設定の例として挙げているが、モック側の実装が最初からこの4種（会社全体のKPIのみ）に絞っていたため、Phase 8もそれに合わせた（チャネル別の目標が本当に必要になった場合はPhase 9着手時に再検討）。
- `targets`テーブルは`unique(client_id, kpi_key, period_start)`という単一の実制約（`campaign_metrics`/`funnel_metrics`のような部分インデックス分割ではない）のため、`upsert(rows, {onConflict: "client_id,kpi_key,period_start"})`をそのまま使えた。
- **空欄保存時の挙動**：`targets.target_value`は`NOT NULL`のためnullでは保存できない。空欄で保存した場合はその月・そのKPIの目標を「未設定」に戻す意味として行ごと削除する仕様にした（valueをそのまま放置＝変更なし、ではない点に注意）。
- 目標は会社全体に対してのみ設定（拠点別の目標設定はv1では行わない、§4.4決定済み）。
- **検証**（`npx tsx --env-file=.env.local`で実際のupsert/deleteクエリを直接実行、使い捨てテストデータ、後片付け済み）：①複数KPIの新規保存→②一部KPIを更新・一部を空欄にして再保存、で「更新したKPIは新しい値になり、空欄にしたKPIは削除される」ことを確認。`npx tsc --noEmit`・`npm run build`とも成功、`/agency/clients/[id]/targets`がビルドに現れることを確認済み。
- モッククライアント（id: "1"/"2"）向けの目標設定画面は元々存在しない（Phase 1〜3のUIモックアップ4画面に含まれていなかったため）。このページは実クライアント専用として実装し、`clients`テーブルに該当IDが無い場合は`notFound()`する（他の一部画面のような mock/real ハイブリッド分岐は無い）。
- ブラウザでの実機目視確認はまだ行っていない（Phase 6・7と合わせて次回対応）。
- `targets`テーブルのRLS（`targets_access`、Phase 2で設定）は代理店・住宅会社どちらの`is_authorized_for_client`も許可しているため、コード上は住宅会社側からも書き込み可能な状態のまま（`production_costs`のように書き込みを代理店限定にするRLS変更はしていない）。spec上は代理店のみが設定する機能のため実害はないが（`/client/targets`というUI自体が存在しない）、気になる場合はPhase 9着手時にRLSを絞ることも検討。

### 2026-08-24（続き）: Phase 6（広告API連携）着手 — 共通基盤を実装、各媒体API呼び出しはプレースホルダー

ユーザーと相談し、「審査は工数がかかるため後回しにしたいが、広告API連携自体の実装は進めたい」という方針を確認。さらに「3媒体共通部分（OAuth接続画面・同期基盤・手動上書き保護）を先に全部作り、各媒体API呼び出し部分はプレースホルダーにする」方針で合意した（Google/Yahoo/Meta とも開発者アカウント・OAuthクライアントは2026-08-24時点で未取得）。

**実装したもの（共通基盤、本実装）**：
- `src/lib/crypto.ts`（E3）：AES-256-GCMによるトークン暗号化/復号。**`.env.local`の`TOKEN_ENCRYPTION_KEY`が空文字列のまま放置されていたことが判明**したため、このセッションでランダムな256bit鍵を生成し設定した（本番Vercel環境にも別途同じ方式で設定が必要、ローカルの値をそのまま使い回さないこと）。
- `src/lib/ads/types.ts`：`AdPlatformAdapter`インターフェース（`getAuthorizationUrl`・`exchangeCodeForTokens`・`refreshAccessToken`・`fetchConversionActions`・`fetchMetrics`）。
- `src/lib/ads/{google-ads,yahoo-ads,meta-ads}.ts`：媒体ごとのアダプター。**`getAuthorizationUrl`（OAuth認可画面へのURL構築）のみ本実装**（Google・Metaは公開安定APIの標準エンドポイントを使用、Yahoo!広告は認可エンドポイントの正確なURLが2026-08-24時点で未確認のため実装前に要ドキュメント確認とコメントで明記）。**それ以外の4メソッド（トークン交換・リフレッシュ・コンバージョンアクション取得・レポート取得）は全媒体プレースホルダー**（`src/lib/ads/placeholder.ts`、決定的なダミー値を返しエラーは投げない — 同期基盤自体をテストできるようにするため）。
- `src/lib/ads/sync.ts`：`syncConnection(connectionId, {force?})`。**同期の粒度は「当月の月初〜当日までの累計を`campaign_metrics`の`period_type='monthly'`行に上書き保存」という設計に決定**（E7の「生データのまま保持」方針、既存の手動入力と全く同じUNIQUE制約・上書きロジックを再利用できるため。案として日次粒度も検討したが、月次・週次しかない手動入力とのオーバーライド整合を取るのが複雑になるため見送った——Phase 9のダッシュボード集計ロジック実装時にこの前提を覚えておくこと）。`manually_overridden=true`の行は`force:true`を指定しない限りスキップして保護する。
- `src/lib/auth/isAuthorizedForClient.ts`：`agency_user_clients`の割当 または `client_users`の所属、のいずれかで判定する共通ヘルパー（DBの`is_authorized_for_client()`と同じ判定をコード側で再現）。`resolveCallerType`も同ファイルに追加。
- `src/app/api/ads/oauth/[platform]/route.ts`：OAuth開始（`?clientId=&returnTo=`）とコールバック（`?code=&state=`）を1ルートで処理。stateはclientId/returnToをbase64url化したもの（改ざんされてもコールバック側で`isAuthorizedForClient`を再検証するため実害は無い設計）。接続成功時、コンバージョンアクション一覧を取得し**未選択時は全件選択**として保存（spec §4.2.2決定済みルール）。
- `src/app/api/ads/sync/route.ts`：Vercel Cronからの日次バッチ（`vercel.json`に`0 18 * * *`=JST 3:00で設定、`CRON_SECRET`で認証）。`platform_integrations.status='active'`かつ`status != 'disconnected'`の接続のみ対象、1接続ずつ独立して処理し失敗が他に波及しないようにした（spec §8）。
- `src/app/api/ads/sync/[connectionId]/route.ts`：「今すぐ同期」（POST、認可チェックあり）。
- `src/lib/auth/isAuthorizedForClient`とは別に`revertToApiValue`（`campaigns/actions.ts`）：「APIの値に戻す」。押した時点で対象接続を`force:true`で即時再同期する方針（2026-08-10にユーザーと確認済みの決定を踏襲）。
- **DBスキーマ変更**：`supabase/migrations/0003_ad_connections_unique.sql`で`ad_connections(client_id, platform)`にUNIQUE制約を追加（0001時点で漏れていた。upsertに必要なため追加、既存データ無しを確認の上、`supabase db query --linked --file`で適用済み）。
- **UI**：`src/components/ads/RealAdConnections.tsx`（Server Component、`/agency/clients/[id]/campaigns`・`/client/ad-connections`の両方から共有）。媒体単位の審査状況バッジ・接続状態バッジ・OAuth接続/再接続ボタン（審査待ちは非活性）・今すぐ同期ボタン・コンバージョンアクション選択チェックボックスを表示。`ad_connections`はauthenticatedロールへのRLSが無い（Service Role専用）ため、コンポーネント内で`isAuthorizedForClient`による認可チェックを行ってからService Roleで取得している。既存のモッククライアント（id: "1"/"2"）は従来の`AdConnectionsView`（モック）のまま維持するハイブリッド構成（他の実データ対応済み画面と同じ方針）。施策一覧テーブルには`source='api'`かつ`manually_overridden=true`の行にのみ「APIの値に戻す」リンクを表示するようにした。
- **検証**（`npx tsx --env-file=.env.local`でパスエイリアス込みの実コードを直接実行、使い捨てテストデータ、後片付け済み）：
  1. 初回同期（既存行なし）→ `campaign_metrics`に`source='api'`・`manually_overridden=false`の行が正しく作成されることを確認。
  2. 上記の行を手動で`manually_overridden=true`にした後に再同期 → `skipped: true`で保護され、値が上書きされないことを確認。
  3. `force: true`で再同期（「APIの値に戻す」相当） → 保護を無視して上書きされ、`manually_overridden`が`false`に戻ることを確認。
  4. `token_expires_at`が過去の接続で同期 → `refreshAccessToken`が呼ばれ、新しいトークンが暗号化されて保存され、同期自体も成功することを確認。
  5. `ad_connections.status`・`last_synced_at`が同期成功時に正しく更新されることを確認。
  `npx tsc --noEmit`・`npm run build`とも成功、`/api/ads/oauth/[platform]`・`/api/ads/sync`・`/api/ads/sync/[connectionId]`がビルドに現れることを確認済み。
- **今回のテストで判明した注意点**：`.env.local`の`TOKEN_ENCRYPTION_KEY`が空だった件（上記参照）は、実際にPhase 6のテストで発覚するまで誰も気づいていなかった。Phase 2完了時点で「往復一致を単体テストで確認する」と記録されていたが、実際には鍵が未設定のまま放置されていた可能性がある——今後、環境変数が「設定されている前提」の記述を鵜呑みにせず、実際の値を確認する習慣が必要。
- **未実施・次回以降に必要な作業**：
  1. 各媒体の実際のOAuthクライアント発行（Google Cloud Console・Yahoo!広告API・Meta for Developers、外部作業）。
  2. 各アダプターの`exchangeCodeForTokens`・`refreshAccessToken`・`fetchConversionActions`・`fetchMetrics`の本実装（媒体ごとの公式ドキュメントを都度確認しながら、テストアカウントで検証）。
  3. Yahoo!広告APIの認可エンドポイントURL自体も要確認（`src/lib/ads/yahoo-ads.ts`のコメント参照）。
  4. 媒体API審査の申請作業（D1、外部作業、ユーザー側）。
  5. 実際のOAuth接続ボタンをブラウザで押した場合、現状は空の`client_id`のままGoogle/Yahoo/Metaの認可画面に遷移し失敗する（想定通り、認証情報未設定のため）。UI自体の見た目・接続状況表示・コンバージョンアクション選択チェックボックス・「今すぐ同期」ボタンの動作は、使い捨ての`ad_connections`行を用意すれば実機で見た目確認ができる。

**⚠️保留中（ユーザーの指示により後回し、2026-08-24）**：上記UI（`RealAdConnections`コンポーネント）は`npx tsc --noEmit`・`npm run build`のみ確認済みで、**ブラウザでの実機目視確認はまだ行っていない**。同期エンジン自体（`syncConnection`のロジック）はユニット的に実コードで検証済みだが、Reactコンポーネントの表示崩れ・ボタンのレイアウト等は未確認。次回、時間があれば使い捨ての`ad_connections`行を用意してブラウザで見た目を確認すること。
- クライアント固有施策（`campaign_channels`）の**編集・削除**画面（今回実装したのは「追加」のみ。spec上も削除は明記されていないため、必要になった時点で検討）。

**既知の制限（今は直さなくてよいが、次に触る時に思い出すべきこと）**
- `/agency/clients/[id]/dashboard`・`/agency/clients/[id]/reports`・`/client/dashboard`・`/client/ad-connections`・`/client/reports`は、実際に`/agency/clients/new`で作成した実クライアントでは**まだ404になる**（各page.tsxがモック専用の`getClient(id)`を直接呼んでいるため）。`campaigns`・`locations`は本セッションで実データ対応済み。Phase 9・10着手時にまとめて実データへ置き換える想定。
- モックアップ用クライアント（id: `"1"`・`"2"`、`src/lib/mock/data.ts`）は今後も`CampaignsView`等のモック実装を使い続ける設計にしている（実クライアントかどうかをclientIdの存在で振り分けるハイブリッド構成、`[id]/layout.tsx`・`campaigns/page.tsx`参照）。
- テスト方法の注意点：Supabaseの RLS でブロックされた `UPDATE` は**エラーを返さず「0件影響」で成功扱いになる**。「エラーが返ってこなければOK」という検証は誤検知の元（本セッションで一度誤検知した）。RLSの拒否を確認する時は必ずService Roleで実際の値を再取得して変化していないことを確認すること。
- Server Actions（`<form action={...}>`）は`curl`で直接POSTしても呼び出せない（Next.jsが生成する`$ACTION_ID_...`の内部エンコーディングに依存するため）。動作確認は「使い捨てのテストユーザー・データをService Role/supabase-jsで作り、実際のSupabaseクエリロジックを再現するNode検証スクリプトを都度書いて実行→片付ける」方式で行っている。ブラウザ経由の実機確認が必要な箇所（Google認証等）はユーザー本人に試してもらった。
- Vercel連携は完了済み（プロジェクト`marketingdept-llc/marketinddashboad`、GitHubリポジトリ`nagata-md/dashboadmark`と連携済み）だが、**まだ一度もデプロイはしていない**（ローカル開発のみ）。
- Supabase CLIはこのセッションで`supabase link --project-ref jyqmoosjduemlocpgqqu`によりlink済み（以前は未link）。マイグレーションは`supabase db push`ではなく`supabase db query --linked --file <path>`で直接適用する運用を継続している（0001は元々Dashboard SQL Editor経由、0002は今回CLI経由——どちらも`supabase_migrations.schema_migrations`には記録されないため、`supabase migration list`等で追跡はできない点に注意）。

### 2026-08-24: SMTP設定完了・招待〜ログインの実機確認、その過程で見つけた3件の実バグを修正

前回セッションの積み残し（SMTP設定・招待メールテンプレート変更）はユーザー側で対応済み。今回、実際に`/agency/clients/new`から住宅会社を招待→パスワード設定→ログインまでを実機で確認し、**Phase 3（認証）を完了**とした。この過程で3件の実バグを発見・修正済み。

**追記（同セッション内）**：上記のテンプレート変更（`next=/set-password`固定値化）はユーザー側で実施済み。`nagata+test2@marketingdept-llc.com`（テンプレート確認専用、確認後に削除済み）で再検証し、実際のメールリンク→確認ページ→「アカウントを有効化する」ボタン→`/set-password`という正しい遷移になることをログ（`GET /auth/confirm?...&next=/set-password`）とDB（`confirmed_at`記録）の両方で確認した。**外部作業の残りはなし。**

**発見・修正したバグ**：
1. **`inviteClientUser`のエラーメッセージが不正確**：Supabaseの`admin.inviteUserByEmail`が返すエラー内容を全部「invite_failed」に握りつぶしていたため、実際には無関係な原因（後述）でも「招待メールの送信に失敗しました。時間をおいて再度お試しください。」という不正確なメッセージが出ていた。`email_exists`（既に他の役割で登録済みのメールアドレスを招待しようとした場合）を個別に判定し、「このメールアドレスはすでに登録されています。別のメールアドレスを使用してください。」と表示するよう修正（`src/lib/auth/inviteClientUser.ts`・`src/app/(agency)/agency/clients/new/page.tsx`）。**なお`auth.users`のメールアドレスは代理店・住宅会社の区別なくプロジェクト全体で一意**という制約があるため、代理店担当者自身のメールアドレスを住宅会社の初期担当者として招待することはできない（実際にこれで最初の実機テストが失敗した）。
2. **招待リンクをメールクライアントの自動リンクスキャンが先に消費してしまう不具合**：`/auth/confirm`（旧`route.ts`）がGETリクエストの時点で即座に`verifyOtp`を実行していたため、メールの安全性チェック機能（Outlook Safe Links等）がユーザーのクリックより先にリンクを自動アクセスし、ワンタイムトークンを消費してしまっていた。実際に`auth.users.confirmed_at`がユーザー本人のクリックより前の時刻で記録されていたことで発覚。**対処**：`route.ts`を廃止し、`page.tsx`（GET、トークンは表示のみでまだ検証しない）＋`actions.ts`のServer Action（ユーザーの「アカウントを有効化する」ボタン押下＝POSTでのみ`verifyOtp`を実行）の2段階に分離した（`src/app/auth/confirm/{page,actions}.tsx`）。
3. **招待メールのリンクが`/set-password`ではなくログイン画面に飛んでしまう不具合**：`inviteClientUser.ts`が`admin.inviteUserByEmail`に渡す`redirectTo`を相対パス`"/set-password"`のままにしていたため、Supabase側がこれを許可URLとして解決できず、メールテンプレートの`{{ .RedirectTo }}`がサイトのルート（`http://localhost:3000`）だけに丸められてしまっていた（トップページ`/`は無条件に`/login`へリダイレクトする実装のため、結果的にログイン画面に着地する）。verifyOtp自体は成功していたため気づきにくいバグだった。**対処**：`{{ .RedirectTo }}`という動的な値への依存をやめ、メールテンプレート側の`next=`を`/set-password`の固定値にする方針に変更（コード側の`redirectTo`パラメータ自体は残しているが、テンプレートがそれを参照しないため実質無害化）。**この変更はユーザー側で実施済み、`nagata+test2@marketingdept-llc.com`での再検証で修正を確認済み（上記「追記」参照）。**
4. **（バグではないが同時に発覚・修正）Sidebarのログアウトボタンが一度も表示されていなかった**：`Sidebar`コンポーネントの「ログアウト」ボタンは`onLogout`propが渡された場合のみ表示する実装だったが、`onLogout`を渡している呼び出し元がコードベース中に一つも無かった（agency/clientどちらのlayoutからも未配線）。ログアウト機能自体は必須（実機確認中、代理店Googleセッションから住宅会社セッションに切り替える手段が無いことで発覚）のため、`onLogout`propを廃止し、`Sidebar`内部で直接`supabase.auth.signOut()`を呼ぶ方式に変更（`src/components/layout/Sidebar.tsx`）。

**検証**：`nagata@marketingdept-llc.com`を実際の住宅会社担当者として招待→実メール受信→（1回目はバグ2により失敗、2回目の修正後の招待メールでバグ3が発覚し`/set-password`に直接アクセスする形で回避）パスワード設定→ログアウト→`/login`のメール+パスワードで実際にログイン成功、まで確認済み。`npm run build`で全ルート（`/auth/confirm`含む）が正常にビルドされることも確認済み。試行錯誤で生じた孤立クライアントデータ（重複4件）は削除済み、成功した「合同会社マーケティングデパートメント」クライアント（実データ、`nagata@marketingdept-llc.com`が住宅会社担当者として所属）は残っている。

**このセッション開始時点で判明した別件**：Phase 3〜5の実装（認証一式・拠点管理・施策データ入力・クライアント固有施策・制作費用、いずれも本書には「完了」と記録済み）が**2026-08-10以降一度もgitコミットされていなかった**（`git log`は2026-08-10のUIモックアップ追加で止まっていた）。本セッションでもまだコミットしていない（ユーザーの指示により後回し）。次回セッション開始時、作業再開前に必ず`git status`を確認し、着手前にコミットすることを推奨する。

### 2026-08-24（続き）: `/agency/users`・`/client/users`（追加ユーザー招待画面）を実装

spec §4.1「追加のユーザー招待は、代理店・住宅会社いずれの管理画面からも、自分の所属側のユーザーを追加できる」に対応。着手前にユーザーと相談し、`/agency/users`の仕様を確定した：代理店担当者はGoogle Workspaceドメインでの自動プロビジョニング制（spec §4.1.1）のため招待の概念が無く、**一覧表示のみ**とする方針で確定（削除機能等は追加しない）。

- `src/lib/auth/inviteClientUser.ts`を拡張：呼び出し元が代理店担当者（`agency_user_clients`の割当で認可判定）か、住宅会社担当者本人（自分の`client_id`と一致するかで認可判定）かを`callerType: "agency" | "client"`で切り替えられるようにした。既存の呼び出し元（`src/app/(agency)/agency/clients/new/actions.ts`）は`callerType: "agency"`を渡すよう更新（挙動変更なし）。
- `src/app/(agency)/agency/users/page.tsx`（新規）：`agency_users`一覧表示のみ。担当者向けの案内文（自社Googleアカウントでのログイン方法）を表示。`agency_users_select`のRLS（`is_agency_user()`）により全代理店ユーザーが他の代理店ユーザーも参照できることを利用し、Service Role不要で実装。
- `src/app/(client)/client/users/{page,actions}.tsx`（新規）：自社（`client_users.client_id`）の担当者一覧＋追加招待フォーム。`inviteAdditionalUser`アクションが`inviteClientUser`を`callerType: "client"`で呼び出す。
- `/agency/clients`・`/agency/clients/new`のサイドバーナビに「ユーザー管理」リンクを追加。
- **検証**（使い捨てテストデータ、後片付け済み）：①別クライアントの住宅会社担当者が、自分の所属ではないクライアントへ招待を試みると`not_authorized`で正しく拒否されることを確認。②実際の住宅会社担当者（`nagata@marketingdept-llc.com`、実データ）が自社にチームメイトを招待でき、招待自体が成功することを確認（`inviteClientUser`ロジックを再現したNode検証スクリプトで実施、実際のメール受信・パスワード設定までは今回未確認——ロジックはPhase 3で実機確認済みの`inviteClientUser`本体と共通のため、追加確認は不要と判断）。`npx tsc --noEmit`・`npm run build`とも成功、`/agency/users`・`/client/users`両ルートがビルドに現れることを確認済み。
- **ユーザーからのフィードバックで追加対応した2点**：
  1. 招待成功後に画面が一覧に戻るだけで「成功したのか分かりにくい」という指摘を受け、`/client/users`（招待後）・`/agency/clients/new`→`/agency/clients`（クライアント登録後）の両方に緑色の成功メッセージ（`success=`クエリパラメータ経由）を追加。
  2. 「クライアントのユーザー管理には削除機能が必要」という指摘を受け、`src/lib/auth/removeClientUser.ts`（`inviteClientUser.ts`と同じ`callerType`認可方式）と`/client/users`の削除ボタンを追加。**自分自身の削除は禁止**（住宅会社側の最後の担当者が自分を消してログインできなくなる事故を防ぐため）。削除は`client_users`行の削除＋`auth.admin.deleteUser`によるSupabase Auth側アカウントの完全削除の両方を行う（削除後、同じメールアドレスへの再招待が可能）。使い捨てテストデータで、自己削除禁止・他クライアントからの削除試行の拒否・正常な削除・削除済みユーザーへの再削除（`not_found`）を確認済み。`/agency/users`側には削除機能を追加していない（一覧表示のみの方針は変更なし、Google自動プロビジョニングのため）。

### 2026-08-27: Phase 9（ダッシュボード）・Phase 10（レポート）実データ実装、vitest導入

ユーザーから「Phase 9着手、Phase 10（レポート）も含める、システム全体像が可視化された状態でテスト改善フェーズを設ける」という指示を受けて着手。着手前にEnterPlanModeで実装方針を整理し、ユーザーに3点を確認して確定：①ダッシュボードの対象期間は月次のみ（目標設定が月次のみのため予実対比と整合させる）、②実装範囲はダッシュボード＋レポートの両方、③テスト改善フェーズには自動テスト（vitest）導入を含める。

**集計エンジン（`src/lib/metrics/`、新規）**：spec §6「週次データを月次実績として集計する場合、月をまたぐ週は日数比率で按分する」というルールを、任意の問い合わせ範囲（ダッシュボードの対象月・レポートの月次/週次/カスタム期間）に対して一般化した「範囲ベースの日数按分エンジン」として実装し、ダッシュボードとレポートで集計ロジックを共用した。

- `dateRange.ts`：`rowInterval`（period_type・period_startから行の期間区間を導出）・`prorateWeight`（範囲との重なり日数比率）等。UTC日付（`Date.UTC`ベース）で計算しタイムゾーンのズレを回避。
- `aggregate.ts`：`buildChannelBreakdown`・`buildFunnelStages`・`buildLocationBreakdown`・`buildTargetVsActual`・`buildTrend`・`sumProductionCost`。フロー指標（cost/leads/visits等）は日数按分合算、ストック指標（followers）は範囲内で最新のperiod_startを採用（合算しない）、比率指標（inflow_rate）は範囲内の値をそのまま列挙（合算しない）——spec §6の3分類をそのまま実装。
- `loadClientDataset.ts`：ダッシュボード・レポート生成が共有するクライアント全期間データ取得（RLSスコープの`createClient()`、他の実データ画面と同じ規約）。
- 目標（`targets`）は月次固定のため、レポートで週次/カスタム範囲を選んだ場合は目標値も同じ日数按分ロジックで近似合算する（spec に明記の無い部分の拡張、実装コメントに明記）。
- CTR/CPC/CPLの算出・フォーマッタ（`formatYen`等）はPhase 6で作成済みの`src/lib/metrics/adMetrics.ts`を拡張して集約し、`src/lib/mock/aggregate.ts`側は対応する関数をそのまま再エクスポートするだけに変更した（既存の呼び出し元＝`ChannelBreakdownTable`等は一切変更不要、実装の重複を解消しつつ既存importを壊さない）。

**ダッシュボード・レポート（実データ）**：`campaigns/page.tsx`と同じハイブリッド分岐（モッククライアントは従来のDashboardView/ReportsView、実クライアントは新規コンポーネント）を4画面（`/agency/clients/[id]/{dashboard,reports}`・`/client/{dashboard,reports}`）に追加。

- `src/components/dashboard/RealDashboard.tsx`：期間・比較期間の選択はcampaigns/page.tsxと同じ`<form method="get">`パターン（クライアントコンポーネント化しない）。既存の表示コンポーネント（FunnelChart・TrendChart・ChannelBreakdownTable・LocationBreakdown・TargetVsActual・PeriodCompare）は`@/lib/mock/types`の型のみに依存する純粋な表示コンポーネントだったため、実データでもそのまま再利用できた。
- `src/lib/reports/{period,generateReport}.ts` + `src/components/reports/RealReports.tsx`：レポート生成（期間種別・比較期間の指定）→ `reports`テーブル（Phase 2で作成済みのスキーマ・RLSをそのまま利用）にスナップショット保存 → 一覧・詳細閲覧。PDF出力は従来通りブラウザ印刷（`window.print()`、`PrintButton.tsx`にクライアントコンポーネントとして切り出し）で代替し、E5（puppeteer-core本実装）は今回のスコープ外とした（次フェーズ以降）。

**実機で発見・修正したバグ**：`/client/ad-connections/page.tsx`（Phase 6実装）が、ログイン中の住宅会社ユーザーの`client_id`ではなく固定のモック定数`CURRENT_CLIENT_ID`（`"1"`）を先に判定していたため、実クライアントでログインしても常にモックの広告接続画面が表示され、実データ（`RealAdConnections`）に到達できない不具合を発見・修正した。今回新規実装したダッシュボード・レポートの実装パターン（`requireClientUser()`を先に呼び、ログイン中ユーザーの`client_id`で判定）と同じ形に揃えた。

**自動テスト（vitest、新規導入）**：`vitest`をdevDependencyに追加、`vitest.config.ts`（`@`→`./src`のエイリアス）、`package.json`に`"test": "vitest run"`を追加。`src/lib/metrics/{dateRange,aggregate}.test.ts`にDB接続不要な純粋関数のユニットテストを26件作成（spec §6の日数按分の具体例「7日中3日が4月・4日が5月」の検証、拠点別内訳の合計＝会社全体合計と一致する不変条件、ストック/比率指標の非合算挙動等）。全件成功。Playwright等のブラウザ自動E2Eは、Google OAuthログインの自動化が困難・テストユーザーseed機構が未整備のため今回は見送った（次フェーズ以降の検討事項）。

**実機検証（テスト改善フェーズ）**：ブラウザ自動化ツール（chromium-cli等）がこの環境に無かったため、`puppeteer-core`＋システムのGoogle Chromeを使った使い捨ての検証スクリプト（プロジェクトの`devDependencies`には追加せず、スクラッチ領域に一時インストール）で、実際のログインフォーム（メール+パスワード）から住宅会社側の一連の画面を操作して確認した。

- 実クライアント「合同会社マーケティングデパートメント」に対し、使い捨てのテストユーザー（`qa-phase9-check@example.com`）と使い捨ての施策実績・来場〜契約実績・目標・制作費用（2026年7月・8月分、週またぎの週次施策データも含む）をService Role経由で投入。
- `/client/dashboard`：ファネル図（反響27=Google25+Meta按分後2）・チャネル別内訳（CTR/CPC/CPL・followers最新値採用・inflow_rate非合算列挙）・期間推移（直近6ヶ月）・予実対比・期間比較（基準/比較/差分/増減率）のすべてが手計算と一致することを確認。
- `/client/reports`：レポート生成→一覧反映→詳細表示がダッシュボードと同じ数値になることを確認。
- スクリーンショットでレイアウト崩れが無いことも確認。`console --errors`相当（`page.on("console"/"pageerror")`）でエラー無し。
- 検証後、投入した全テストデータ（campaign_metrics 6件・funnel_metrics 2件・targets 4件・production_costs 2件・reports 1件・テストユーザー）を削除し、投入前と同じ0件の状態に戻したことを確認済み。
- **代理店側（`/agency/clients/[id]/dashboard`・`reports`）はClaude側からGoogle OAuthログインの自動操作ができないため、ユーザー本人に`npm run dev`のローカル環境でクリックスルーしてもらい確認した（同セッション内、確認OKの報告あり）。** 代理店側のGoogle OAuth認証そのものは2026-08-20時点で実機確認済み（本項目はその既存ログインを使ってダッシュボード・レポート画面が正しく表示されることの確認）。コード上は住宅会社側と全く同じ`lib/metrics/`集計エンジン・ハイブリッド分岐パターンを使っている。

**検証コマンド**：`npx tsc --noEmit`・`npm run lint`・`npm run build`（全ルート生成確認、`/agency/clients/[id]/{dashboard,reports}`・`/client/{dashboard,reports}`とも一覧に出現）・`npm run test`（26件成功）、いずれも成功。

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
1. `/agency/clients`：担当クライアント一覧・切替。→ **完了**（Phase 3の項目4で前倒し実装済み）。
2. `/agency/clients/[id]/locations`・`/client/locations`：拠点の登録・編集を代理店・住宅会社どちらからも行えるようにし、`created_by_type/id`・`updated_by_type/id` を記録する。→ **完了（2026-08-20）**。
   - `src/app/(agency)/agency/clients/[id]/locations/{page,actions}.tsx`・`src/app/(client)/client/locations/{page,actions}.tsx`：拠点一覧・追加・インライン編集（`src/components/locations/LocationNameEditor.tsx`、新規クライアント登録直後は拠点0件のためModalほどの複雑さは不要と判断し行内テキスト⇔フォーム切替の最小構成にした）。
   - **同時に修正**：`src/app/(agency)/agency/clients/[id]/layout.tsx`・`src/app/(client)/client/layout.tsx`に認証ガード（`requireAgencyUser`/`requireClientUser`、新規`src/lib/auth/requireClientUser.ts`）を追加し、Sidebarの氏名・メールアドレスを実際のログインユーザーの値に置き換えた。agencyレイアウトは「`lib/mock/data`のモッククライアント（id: "1"/"2"、Phase 1〜3の画面確認用）→ 無ければSupabaseの実クライアント」の順で名前を解決するハイブリッド構成にし、Phase 1〜3で確認済みのモック画面と、`/agency/clients/new`で新規作成した実クライアントの両方でレイアウトが機能するようにした（配下の`dashboard`/`campaigns`/`reports`ページ自体はまだモックデータのみを参照するため、実クライアントでは中身が空/未対応のまま——既知の制限、Phase 5以降で解消）。
   - **検証**：使い捨てテストデータ（代理店ユーザー・クライアント・割当・住宅会社ユーザー）で、代理店による拠点作成・改名、住宅会社セッションからの拠点閲覧（代理店作成分も見える）・拠点作成、他クライアントの拠点は見えないこと（RLS分離）を確認。`npm run build`で全ルートが正常に認識されることも確認済み。後片付け済み。
**完了条件**：代理店・住宅会社どちらの画面からも拠点を登録・編集でき、編集者の記録が残る。→ 満たされている（実データで確認済み）。

### Phase 5 — 施策データ手動入力
**ゴール**：📌 手動施策（spec §4.2 マスタのうち「手動」の14施策）の期間・拠点別データ入力が動作する。
1. `/agency/clients/[id]/campaigns`：施策一覧・期間（月次/週次）・拠点（特定拠点/全社共通）を指定した数値入力フォーム（spec §4.2.1）。→ **完了（2026-08-20）**。
2. TVCM・ポータルサイト・チラシ折込の3施策は表示回数・クリック数を任意項目にする（spec §4.2）。→ **完了**。
3. CTR・CPC・CPL は保存せず、一覧表示時に算出する（`lib/metrics/`、spec §4.2 算出式）。→ **完了**。
**完了条件**：代理店担当者が施策データを期間・拠点を指定して入力・一覧確認でき、CTR/CPC/CPL が表示される。→ 満たされている（デフォルト17施策・使い捨てテストデータで確認済み）。

**2026-08-20の実装内容と決定事項**：
- **週次入力UIの方式を確定**：ISO週番号の`<input type="week">`は媒体ごとに週の区切り方（日〜土・月〜日等）が異なり不適合と判明していたため、`<input type="date">`による自由な週開始日入力とし、内部的には「開始日+6日」を1週間として扱う方式に決定（`src/lib/campaigns/period.ts`）。曜日の強制（例：月曜始まり固定）は行わない。
- **クライアント固有施策の追加管理（spec §4.2.3）・制作費用入力（§4.2.4）も同日中に追加実装**（当初は次回以降に持ち越す予定だったが、ユーザーからの指示で続けて着手）。
- **spec.mdとDBスキーマの乖離を発見・解消**：2026-08-10にspec.mdへ追記された §4.2.3（`campaign_channels.client_id`/`enabled_fields`/`required_fields`）・§4.2.4（`production_costs`テーブル）は、実際には`supabase/migrations/0001_init.sql`に一度も反映されていなかった（マイグレーションファイルを確認して判明）。**`supabase/migrations/0002_client_channels_and_production_costs.sql`を新規作成し、`supabase db query --linked --file`で実DBに適用済み**（既存の17施策データは非破壊的なALTER TABLEで保持、methodは既存のplatform列から'api'/'manual'を自動判定、enabled_fields/required_fieldsは§4.2の決定済みルール通りに初期値投入）。これに伴い、コア実装時に暫定対応として作った`src/lib/campaigns/defaultChannelRules.ts`（チャネル名によるハードコード判定）は不要になったため削除し、`campaign_channels.enabled_fields/required_fields`を直接参照する汎用実装に置き換えた（`entry/page.tsx`・`entry/actions.ts`）。
- 実装：
  - `supabase/migrations/0002_client_channels_and_production_costs.sql`：上記スキーマ変更＋RLS（`campaign_channels`のSELECTをクライアントスコープに変更、INSERT/UPDATEは代理店のみ；`production_costs`はSELECTを代理店・住宅会社どちらも可、書き込みは代理店のみ、spec §4.2.4「入力は代理店担当者が行う」）。
  - `src/lib/campaigns/fieldKeys.ts`：入力項目キー一覧・ラベル（cost/impressions/clicks/followers/posts/views/inflow_rate）。
  - `src/app/(agency)/agency/clients/[id]/campaigns/actions.ts`：`addCustomChannel`（施策マスタへの追加、required_fieldsは「費用を選べば費用のみ必須、他は任意」という決定済みルールに従い自動算出しユーザーには選ばせない）・`addProductionCost`・`deleteProductionCost`。
  - `src/app/(agency)/agency/clients/[id]/campaigns/page.tsx`：「施策マスタ管理」パネル（クライアント固有施策の一覧・追加フォーム）・「制作・クリエイティブ費用」パネル（期間スコープの一覧・追加・削除・合計表示）を追加。施策一覧クエリもデフォルト17件＋このクライアント固有分（`client_id.is.null,client_id.eq.<id>`）に対応。
- **検証**：使い捨てテストデータで、クライアント固有施策（地元フリーペーパー、費用のみ必須）の追加・可視性（追加したクライアントからは18件、無関係な別クライアントからは17件のまま＝カスタム施策は見えない）を確認。**別クライアント担当の代理店ユーザーからの`campaign_channels`更新がRLSで実際にブロックされること**（DB上の値が変更されていないことまで確認、UPDATE自体はエラーを返さず0件影響という形でブロックされる点に注意——最初は「エラーが返るはず」という誤ったテスト方法で誤検知したため、実際にDBの値を再取得して確認するテストに修正した）を確認。`production_costs`は住宅会社セッションから閲覧はできるが書き込みは拒否されることも確認。`npm run build`で全ルート確認済み。後片付け済み。
- 実装：
  - `src/app/(agency)/agency/clients/[id]/campaigns/page.tsx`：期間・拠点選択フォーム＋施策一覧（CTR/CPC/CPL表示）。Phase 1〜3で確認済みのモッククライアント（id: "1"/"2"）は既存の`CampaignsView`（モック）のまま維持し、実クライアントの場合のみ新しい実データ版を表示するハイブリッド構成（`[id]/layout.tsx`と同じ方針）。
  - `src/app/(agency)/agency/clients/[id]/campaigns/entry/{page,actions}.tsx`：1施策・1期間・1拠点ぶんの入力フォーム（モーダルではなく専用ページ、理由：全17施策を1フォームに詰め込むと「反響数必須」が毎回全施策分要求されてしまい非現実的なため、1施策ずつ遷移する設計にした）。
  - `src/lib/metrics/adMetrics.ts`：CTR/CPC/CPL算出・¥/%表示フォーマット。
  - **実装中に見つけて対処した設計上の注意点**：`campaign_metrics`のUNIQUE制約は`location_id`のnull有無で2つの部分ユニークインデックスに分かれている（Phase 2で対応済み）ため、PostgRESTの`.upsert(onConflict:...)`では正しく指定できない。SELECTで既存行の有無を確認してからUPDATE/INSERTを切り替える方式で実装（`entry/actions.ts`）。
- **検証**：使い捨てテストデータで、Google広告（全項目必須）の新規作成・既存行への正しい上書き（重複INSERTにならないこと）・`manually_overridden`フラグ、TVCM（表示回数・クリック数なしでも保存可）、SEO（オーガニック指標）の保存を確認。`npm run build`で全ルート確認済み。後片付け済み。

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

> 次アクション候補（2026-08-24時点）：①未コミットのPhase 3〜8一式（認証・拠点管理・施策データ入力・追加ユーザー招待画面・広告API連携共通基盤・来場〜契約入力・目標設定等）をgitコミット（2026-08-10以降未コミットのまま、外部作業はすべて完了済みなので着手前にまずこれを推奨） → ②Phase 6〜8のUI実機目視確認（ブラウザでまだ未確認） → ③Phase 9（ダッシュボード、本プロダクトの中心機能）着手 → ④各媒体のAPI利用申請の進捗確認（§0 D1、実装と並行・Metaは実績要件があるため優先度高）。冒頭「実装状況」の「2026-08-24」の各節に詳細あり。

---

## 7. 2026-08-24 セッション終了メモ（トークン節約のためセッションリセット、次回はここから読む）

**次回セッション開始時に最初に確認すること**：

1. **⚠️最重要：Phase 3〜8の実装が2026-08-10以降まだ一度もgitコミットされていない。** `git status`で必ず確認すること（このセッション開始時点で既にこの状態だったが、セッション中も意図的にコミットを見送った——ユーザーの指示によるもので、忘れていたわけではない）。何かの拍子（`git checkout`等の破壊的操作）で失われるリスクがあるため、次回作業開始前にコミットすることを強く推奨する。
2. **Phase 6（広告API連携）・Phase 7（来場〜契約入力）・Phase 8（目標設定）はいずれもロジックをコードレベル（`npx tsx --env-file=.env.local`での実データ検証・`npm run build`）で確認済みだが、ブラウザでの実機目視確認は一度も行っていない。** Reactコンポーネントの表示崩れ・レイアウト崩れ等は未確認のまま。
3. **開発サーバーはこのセッション終了時に停止済み。** 次回`npm run dev`で再起動すること。
4. 実データベースには本セッション終了時点で以下が存在する（テストデータはすべて後片付け済み、これらは実際の運用データ）：
   - `clients`：「合同会社マーケティングデパートメント」1件のみ。
   - `client_users`：`nagata@marketingdept-llc.com`・`keiri@marketingdept-llc.com`・`nagata+test3@marketingdept-llc.com`の3件（後者2件はユーザー自身が`/client/users`の動作確認中に実際に招待したもの、Claudeが作成したテストデータではない）。
   - `agency_users`：`main@marketingdept-llc.com`（長田聖明）1件。
   - `ad_connections`・`targets`・`funnel_metrics`：0件（テスト後にすべて削除済み、クリーンな状態）。

**このセッションで完了した作業（詳細は本セクション以前の各日付節を参照）**：
- Phase 3（認証）：招待メール送信の不具合3件を修正し、実機で招待〜ログインまで完全に確認。
- `/agency/users`・`/client/users`（追加ユーザー招待・削除画面）を新規実装。
- Phase 6（広告API連携）：OAuth接続・同期基盤・手動上書き保護・トークン暗号化を実装（各媒体の実API呼び出しはプレースホルダー）。`.env.local`の`TOKEN_ENCRYPTION_KEY`が空文字列のまま放置されていたのを発見し設定済み。
- Phase 7（来場〜契約入力）：`/client/{visits,proposals,contracts}`を新規実装。
- Phase 8（目標設定）：`/agency/clients/[id]/targets`を新規実装。

**次にやること（優先順）**：①未コミット分のコミット、②Phase 6〜8のブラウザ実機確認、③Phase 9（ダッシュボード）着手——規模が大きいため、着手前に実装方針をユーザーと相談してから始めること。

---

## 8. 2026-08-27 セッション終了メモ（同日の前のセッション。履歴として保持、次回の入口は「## 9.」）

**このセッションで完了した作業**：Phase 3〜8一式を`git commit`（2026-08-10以降未コミットだった分）。Phase 9（ダッシュボード）・Phase 10（レポート）を実データで実装し、住宅会社側を実機（chromium相当のヘッドレスブラウザ＋実ログイン）で確認済み。vitest導入・ユニットテスト26件追加。**さらに、代理店側の`/agency/clients/[id]/dashboard`・`reports`もユーザー本人に`npm run dev`のローカル環境でクリックスルーしてもらい、確認OKの報告を受けた**（Claude側からはGoogle OAuthのログイン操作自体を自動操作できないため、この部分のみユーザー本人による確認。なお代理店側のGoogle OAuth認証そのものは2026-08-20時点で実機確認・完了済みであり、今回新たに確認したのはその既に動いているログインを使ってダッシュボード・レポート画面が正しく表示されるかどうかという点）。詳細は本書「### 2026-08-27: Phase 9・10...」の節を参照。

**次回セッション開始時に最初に確認すること**：

1. **開発サーバーの状態を確認すること。** このセッション終盤で`npm run dev`をバックグラウンド起動したまま終了した可能性がある（ポート3000使用中なら`lsof -ti:3000 -sTCP:LISTEN | xargs kill`で停止してから再起動）。
2. 実データベースは本セッション終了時点で前回（2026-08-24）と同じ状態（`clients`1件・`client_users`3件・`agency_users`1件、`campaign_metrics`・`funnel_metrics`・`targets`・`production_costs`・`reports`・`ad_connections`はいずれも0件）。今回投入した検証用データ・使い捨てユーザーはすべて削除済み、永続的な変更なし。
3. `git status`：Phase 9・10・vitest導入分は`git commit`済み（本セッション内でコミット・masterplan.md更新も反映）。

**未着手の機能（次に取り組むとすれば）**：
- Phase 6は共通基盤のみ完了、各媒体の実API実装・審査申請は未着手（D1、外部プロセスと並行）。
- レポートPDFのサーバーサイド生成（E5: puppeteer-core + @sparticuz/chromium）。現状はブラウザ印刷（`window.print()`）で代替。
- Playwright等によるブラウザ自動E2Eテスト（今回は見送り、vitestによる集計ロジックのユニットテストで代替）。
- Phase 11（仕上げ）は未着手。

**次にやること（優先順）**：①Phase 11（仕上げ）または残課題（PDF本実装・広告API本実装）の優先順位をユーザーと相談、②必要であればVercelへの初回デプロイ（連携済みだが2026-08-24時点で未実施のまま）。

---

## 9. 2026-08-27（続き）セッション終了メモ（次回はここから読む）

同日の別セッション。UI/UXレビューから始まり、目標・予算・施策マスタ管理の再設計の方針決定・モック実装・DB設計、クライアントの外部連携ID機能の実装まで進んだ。**このセッションの内容は`docs/improvement.md`に集約されている。先に必ずそちらを読むこと**（本節はimprovement.mdの参照ポインタと、実装状況・次の一歩のみをまとめる）。

**このセッションで完了した作業**：

1. **`docs/improvement.md`を新規作成**：UI/UXの観点でダッシュボード・施策管理・目標設定・レポート・横断課題・アプリ全体のスコープ抜けを洗い出したバックログ。優先度サマリー表（§7）・確認したいこと（§8）を含む。
2. **目標・予算・チャネル別計画の再設計**（improvement.md §4-1・§9-1・§9-2）：
   - 反響数の目標を会社全体の単一値からチャネル別（拠点別＋全社共通）に変更し、予算（費用計画）を新規に追加。予算÷反響数目標で単価（想定CPL）を自動算出。
   - 年間グリッド入力（KPI・チャネル×12ヶ月、事業年度開始月はクライアントごとに設定可）、年間予実ビュー（目標×実績の12ヶ月比較、読み取り専用）を追加。
   - `src/app/dev-preview/targets-budget/page.tsx`にモック実装し、ブラウザで動作確認済み（PC・モバイル幅、コンソールエラーなし）。**DB接続なし、実データ非対応の使い捨てページ**（他のdev-previewページと同じ位置づけ）。
3. **施策マスタのクライアント別有効/無効管理**（improvement.md §3-3）：デフォルト17施策をクライアントごとに使用/不使用切替、クライアント固有施策の編集・無効化に対応するDB設計。**管理画面UIは未実装**。
4. **DB設計（マイグレーション2件、いずれも未適用）**：
   - `supabase/migrations/0004_channel_targets_budget_and_settings.sql`：`clients.fiscal_year_start_month`、`campaign_targets`（チャネル別目標・予算）、`campaign_channels.enabled`、`client_channel_settings`。
   - `supabase/migrations/0005_client_external_id.sql`：`clients.external_client_id`（外部アプリ連携用、代理店が自由入力・編集、UNIQUE制約）。
5. **クライアントの外部連携ID機能を実コードで実装済み**（improvement.md §9-4）：`/agency/clients/new`（登録画面に入力欄追加）・`/agency/clients`（一覧画面に列＋インライン編集フォーム追加）・`src/app/(agency)/agency/clients/actions.ts`（新規、`updateExternalClientId`）。`npx tsc --noEmit`・`npm run build`は成功。**認証必須ページのためブラウザでの実機確認は未実施**。
6. **`docs/spec.md`を更新**：§4.1・§4.4・新設§4.4.1・§6・§9・§10・§11に上記の決定事項を反映済み。

**このセッションで完了していないこと（次回に持ち越し）**：

- **上記2件のマイグレーションはSupabaseにまだ適用していない**（`campaign_targets`・`client_channel_settings`等のテーブルは実DBにまだ存在しない）。
- `/agency/clients/[id]/targets`・`/agency/clients/[id]/campaigns`・ダッシュボード各コンポーネントは、まだ旧実装（会社全体のみのKPI4種、予算機能なし、チャネル無効化なし）のまま。モックの内容を実データに接続する作業は未着手。
- 施策マスタの有効/無効を切り替える管理画面UIは未実装。
- 外部連携ID機能はブラウザでの実機確認ができていない（Google OAuth認証が必要なため）。

**コミット**：本セッションの変更は`git commit`済み（コミット`35c7aed`「Add improvement.md; design targets/budget/channel-management overhaul; implement client external ID」）。**ただし`origin`へは未push**（ローカルのみ、2026-08-27時点でmainはorigin/mainより4コミット先行）。push・Vercelへの反映が必要な場合はユーザーに確認すること。

**次回セッション開始時に最初に確認すること**：

1. `git log -1`で上記コミットが残っているか確認する（ローカル環境が変わっていれば要注意）。`git push`はまだ行っていないため、リモートには反映されていない。
2. `docs/improvement.md`の「実装状況サマリー」（ファイル冒頭）を読み、優先度・進捗を把握する。
3. マイグレーション（0004・0005）をSupabaseに適用するかどうかをユーザーと確認する（本番/共有DBへの影響を伴う操作のため、実行前に必ず確認する）。

**次にやること（優先順、ユーザー未確認）**：①マイグレーション適用の承認、②`/agency/clients/[id]/targets`の実データ接続（モックのUIを移植）、③施策マスタ有効/無効管理画面の実装、④外部連携ID機能の実機確認。

---

## 10. 2026-08-27（続き・3セッション目）セッション終了メモ（次回はここから読む）

同日3つ目のセッション。「## 9.」の積み残しのうち、①マイグレーション適用と②`/agency/clients/[id]/targets`の実データ接続を完了した。

**このセッションで完了した作業**：

1. **マイグレーション適用**：`supabase/migrations/0004_channel_targets_budget_and_settings.sql`・`0005_client_external_id.sql`をユーザー承認のうえ`supabase db query --linked --file`でSupabaseに適用済み（linkedプロジェクト：`jyqmoosjduemlocpgqqu`「dashboard for mark」）。`campaign_targets`・`client_channel_settings`テーブル、`clients.fiscal_year_start_month`・`clients.external_client_id`・`campaign_channels.enabled`列の存在、および`targets`から`kpi_key='leads_total'`行が削除済みであることを確認済み。
2. **`/agency/clients/[id]/targets`の実データ接続**（improvement.md §4-1・§9-1・§9-2・§2-7）：
   - `src/lib/targets/kpiLabels.ts`：`KPI_LABELS`から`leads_total`を除外（来場予約数・来場数・契約数の3種のみ）。「合計反響数」は`campaign_targets`のロールアップに一本化。
   - `src/lib/metrics/aggregate.ts`：`CampaignTargetDbRow`型・`sumCampaignTargetLeads`（拠点別＋全社共通の自動合算、未入力はNULL=0扱い）を追加。`buildTargetVsActual`のシグネチャに`campaignTargets`引数を追加し、「合計反響数」の目標値をtargetsテーブルからcampaign_targetsのロールアップに切り替え（実績側`stages.leads`の定義は変更していない——広告施策のみを対象とする目標と、運用施策分も含む実績との間にスコープの差が残る点をコード注釈に明記）。
   - `src/lib/metrics/loadClientDataset.ts`：`campaignTargets`を追加取得。呼び出し元の`RealDashboard.tsx`・`generateReport.ts`を更新（ダッシュボード「予実対比」・レポート生成のどちらも新しいシグネチャに追従、既存の見た目・挙動は維持）。
   - `src/lib/metrics/aggregate.test.ts`：`sumCampaignTargetLeads`のテストを追加、`buildTargetVsActual`のテストを新シグネチャに更新。29件全テストパス。
   - 新規：`src/lib/targets/fiscalYearGrid.ts`（年間グリッドの月列・単価算出・null込み合算などの共通ヘルパー、"use client"なしでpage.tsx/actions.tsの双方から利用）、`src/lib/targets/visibleAdChannels.ts`（`client_channel_settings`・`campaign_channels.enabled`を考慮した「表示すべき広告施策」一覧の取得。管理画面UI未実装のため現状は実質フィルタなし）。
   - `src/app/(agency)/agency/clients/[id]/targets/page.tsx`・`actions.ts`を全面書き換え。タブ構成（チャネル別計画／会社全体KPI／年間予実）は`dev-preview/targets-budget`のモックをSSR＋Server Action版として実データに移植：
     - 「チャネル別計画」：拠点セレクタ＋広告施策ごとに目標（反響件数）・予算（円）を年間12ヶ月ぶん一括入力、単価はサーバー側で自動算出（読み取り専用）。保存は`saveChannelPlan`（`campaign_targets`）。
     - 「会社全体KPI」：来場予約数・来場数・契約数を年間一括入力（`targets`テーブル、`saveCompanyKpiGrid`）。「合計反響数」行はチャネル別計画の自動集計（読み取り専用）。
     - 「年間予実」：目標×実績を月ごとに比較する読み取り専用グリッド（§2-7）。会社全体KPI・チャネル別（拠点スコープ切替可）の両方に対応。実績データは`campaign_metrics`・`funnel_metrics`から`tab=actual`の時のみ追加取得。
     - 事業年度の開始月（`clients.fiscal_year_start_month`）はこの画面から直接編集できるようにした（クライアント編集画面がまだ存在しないため）。
   - `campaign_targets`のUNIQUE制約はcampaign_metrics/funnel_metricsと同じ理由で部分インデックスに分かれているため、`saveChannelPlan`は既存行をまとめてSELECTしてからinsert（新規）/upsert(id指定、通常インデックス)/delete（空欄化）に振り分ける方式にした（PostgRESTの`upsert(onConflict)`が使えないため。既存の`upsertFunnelMetric.ts`と同じ設計判断）。
   - 検証：`npx tsc --noEmit`・`npm run lint`・`npm run test`（29件）・`npm run build`すべて成功。**認証必須ページのためブラウザでの実機確認は未実施**（外部連携ID機能と同じ制約）。

**このセッションで完了していないこと（次回に持ち越し）**：

- ブラウザでの実機確認（`/agency/clients/[id]/targets`の3タブとも）。Google OAuth認証が必要なため、次回は認証済みセッションでの確認方法をユーザーと相談すること。
- 施策マスタの有効/無効を切り替える管理画面UI（improvement.md §3-3）は未実装（`visibleAdChannels.ts`は前提として実装済みだが、切り替えるためのUIが無い）。
- ダッシュボード側の表示統合（チャネル別内訳テーブルへの「予算」「消化率」列追加など、§9-1で「方針として維持」とされていた部分）は今回のスコープ外（目標・予算入力自体の実データ接続を優先したため）。
- 本セッションの変更はまだ`git commit`していない（ユーザーに確認してから実施する）。

**次回セッション開始時に最初に確認すること**：

1. `git status`で本セッションの変更が未コミットのまま残っているか確認する。
2. コミット・pushの要否をユーザーに確認する（前回まで含めて`origin/main`より5コミット先行、pushは未実施）。
3. `/agency/clients/[id]/targets`をブラウザで実機確認する方法（ログイン済みセッションでの確認、またはテスト用アカウントの用意）をユーザーと相談する。

**次にやること（優先順、ユーザー未確認）**：①本セッション変更のコミット・push可否の確認、②targets画面の実機確認、③施策マスタ有効/無効管理画面の実装、④外部連携ID機能の実機確認、⑤ダッシュボードへの予算・消化率表示統合。

---

## 11. 2026-08-27（続き・4セッション目）セッション終了メモ（次回はここから読む）

同日4つ目のセッション。ユーザーから「順番に進めてください」との指示を受け、「## 10.」の積み残しリストのうち、自分で完結できる項目（①push、③施策マスタ有効/無効管理画面、⑤ダッシュボードへの予算・消化率表示統合）を順に実施した。②・④（ブラウザ実機確認）はGoogle OAuth認証の都合でClaude側から自動操作できないため未着手のまま。

**このセッションで完了した作業**：

1. **①push**：前セッション（3セッション目）のコミット（`ab5044e`）を`origin/main`にpush済み。
2. **③施策マスタ有効/無効管理画面**（improvement.md §3-3）：
   - `/agency/clients/[id]/campaigns/actions.ts`に`setDefaultChannelEnabled`（デフォルト17施策、`client_channel_settings`をupsert）・`setCustomChannelEnabled`（クライアント固有施策、`campaign_channels.enabled`を更新）を追加。
   - `page.tsx`に「施策の有効/無効管理」パネルを新設し、デフォルト・クライアント固有すべての施策を一覧表示、状態（有効/無効）とトグルボタンを配置。既存の「施策マスタ管理（クライアント固有）」パネル（追加フォーム）はそのまま維持。
   - 判定ロジック（`client_id`が非nullなら`campaign_channels.enabled`、nullなら`client_channel_settings`の上書き、行が無ければ有効扱い）を`src/lib/campaigns/channelVisibility.ts`（新規、DBアクセス無しの純粋関数）に共通化し、3箇所で共有：施策一覧（`campaigns/page.tsx`の入力対象フィルタ）・ダッシュボード/レポートのチャネル別内訳（`loadClientDataset.ts`）・目標/予算のチャネル別計画（`targets/visibleAdChannels.ts`、既存実装をこの共通関数を使うようリファクタ）。
3. **⑤ダッシュボードへの予算・消化率表示統合**（improvement.md §9-1「方針として維持」だった部分）：
   - `src/lib/metrics/aggregate.ts`：`sumCampaignTargetLeads`の内部実装を汎用化（`sumCampaignTargetsField`）し、`sumCampaignTargetBudget`（予算のロールアップ）を追加。`buildChannelBreakdown`に`campaignTargets`（省略可、デフォルト`[]`）引数を追加し、チャネルごとの予算（拠点別＋全社共通の自動合算）を`budget`フィールドとして返すようにした。新規`appendBudgetRow`（`buildTargetVsActual`の結果に「予算消化（広告施策）」行を追加、実績は広告施策の費用合計・目標は予算ロールアップ）。
   - `ChannelBreakdownRow`型（`lib/mock/types.ts`）に`budget: number | null`を追加。モック側（`lib/mock/aggregate.ts`、demo用クライアント"1"/"2"）は予算の概念が無いため常に`null`を返すのみで、モック実装自体は変更していない。
   - `src/components/dashboard/ChannelBreakdownTable.tsx`：「予算」「消化率」列を追加（消化率＝費用÷予算、`spec §4.2`のCPL算出と同じ「片方が0/未入力なら"-"」ルール）。`RealDashboard.tsx`・`generateReport.ts`双方を新しいシグネチャ・`appendBudgetRow`呼び出しに追従させた。`ReportsView.tsx`・`RealReports.tsx`は同じコンポーネントを再利用しているため変更不要（自動的に反映）。
   - `aggregate.test.ts`に`sumCampaignTargetBudget`・`appendBudgetRow`・`buildChannelBreakdown`の予算ロールアップのテストを追加（33件全テストパス、3セッション目の29件から+4）。
   - 検証：`npx tsc --noEmit`・`npm run lint`・`npm run test`・`npm run build`すべて成功。

**このセッションで完了していないこと（次回に持ち越し）**：

- ②・④のブラウザ実機確認（`/agency/clients/[id]/targets`・`/agency/clients/[id]/campaigns`の施策有効/無効管理・`/agency/clients/new`の外部連携ID）。代理店側はGoogle OAuth認証のためClaude側から自動操作できず、過去のPhase 9・10確認と同様、ユーザー本人による`npm run dev`でのクリックスルー確認が必要。
- 施策マスタ管理画面での「クライアント固有施策の編集」（名称・入力項目の変更）は未実装（無効化のみ対応、improvement.md §3-3にスコープ決定を明記）。
- ダッシュボードの予算・消化率表示に対する達成率の色分け（§2-2、未達=警告色/達成=成功色）は別課題として引き続き未着手。
- 本セッションの変更（③・⑤）はまだ`git commit`していない。

**次回セッション開始時に最初に確認すること**：

1. `git status -sb`で本セッションの変更が未コミットのまま残っているか確認する。
2. コミット・push可否をユーザーに確認する。
3. ②・④のブラウザ実機確認をユーザーに依頼する（本節参照）。

**次にやること（優先順、ユーザー未確認）**：①本セッション変更のコミット・push可否の確認、②ユーザーによるブラウザ実機確認（targets 3タブ・施策有効/無効管理・外部連携ID）、③（実機確認の結果次第で）不具合修正。
