-- improvement.md §4-1・§9-1・§9-2・§3-3（2026-08-27決定）に対応するスキーマ追加。
-- モック（src/app/dev-preview/targets-budget/page.tsx）で確認済みの設計をDB化する。
-- 0001〜0003 適用後に実行すること。
--
-- 追加するもの:
--   1. clients.fiscal_year_start_month …年間グリッドの起点月（§4-1）
--   2. campaign_targets            …チャネル別の反響数目標・予算（§9-1・§9-2、campaign_metricsの「計画」側）
--   3. campaign_channels.enabled   …クライアント固有施策の無効化（ハードデリートの代替、§3-3）
--   4. client_channel_settings     …デフォルト施策のクライアント単位の有効/無効上書き（§3-3）

-- ============================================================
-- 1. clients.fiscal_year_start_month（§4-1）
-- ============================================================

alter table clients
  add column fiscal_year_start_month int not null default 4
    check (fiscal_year_start_month between 1 and 12);

comment on column clients.fiscal_year_start_month is
  '目標・予算の年間グリッドの起点月（1〜12、デフォルト4=4月始まり）。クライアント登録・編集画面で設定する（§4-1）。';

-- ============================================================
-- 2. campaign_targets（§9-1・§9-2）
--
-- campaign_metrics（実績）と対になる「計画」テーブル。1行 = クライアント×拠点(or全社共通)×
-- チャネル×対象月の「反響数目標」「予算」のセット。単価（想定CPL）はbudget_amount÷target_leadsで
-- 表示時に算出するため保存しない（spec §4.2のCPL算出ルールと同じ考え方）。
--
-- 期間はtargetsテーブルと同じく月次のみ（period_typeを持たない。spec §4.4「月次でKPI目標値を
-- 設定する」に揃える。年間グリッドはUIが12回のupsertとして扱う）。
--
-- 会社全体の値（合計反響数・会社全体予算）は、この表の拠点別＋全社共通(location_id is null)行を
-- 自動合算（ロールアップ）して算出するのみで、独立した値としては保存しない
-- （§9-1で確認済み：独立入力にすると内訳の合計とズレるダブルメンテナンスになるため）。
-- ============================================================

create table campaign_targets (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients(id) on delete cascade,
  location_id     uuid references locations(id) on delete cascade,
  channel_id      uuid not null references campaign_channels(id),
  period_start    date not null,
  target_leads    int,
  budget_amount   numeric,
  created_by_type text check (created_by_type in ('agency', 'client')),
  created_by_id   uuid,
  updated_by_type text check (updated_by_type in ('agency', 'client')),
  updated_by_id   uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table campaign_targets is
  'チャネル別の反響数目標・予算（計画値）。campaign_metricsの実績と同じ軸（拠点×チャネル×月）を持つ（§9-1・§9-2）。';

-- campaign_metricsと同じ理由（location_id nullの重複をUNIQUE制約では防げない、0001参照）で
-- 特定拠点用・全社共通用に分けた部分ユニークインデックスにする。
create unique index campaign_targets_by_location_uniq
  on campaign_targets (client_id, location_id, channel_id, period_start)
  where location_id is not null;

create unique index campaign_targets_company_wide_uniq
  on campaign_targets (client_id, channel_id, period_start)
  where location_id is null;

alter table campaign_targets enable row level security;

-- 目標・予算の設定は代理店の役務（spec §4.4「代理店担当者が...設定する」）。
-- production_costsと同じ方針：閲覧は双方、書き込みは代理店のみ。
create policy campaign_targets_select on campaign_targets
  for select using (is_authorized_for_client(client_id));
create policy campaign_targets_insert on campaign_targets
  for insert with check (is_authorized_for_client(client_id) and is_agency_user());
create policy campaign_targets_update on campaign_targets
  for update using (is_authorized_for_client(client_id) and is_agency_user())
  with check (is_authorized_for_client(client_id) and is_agency_user());
create policy campaign_targets_delete on campaign_targets
  for delete using (is_authorized_for_client(client_id) and is_agency_user());

-- targetsのkpi_key='leads_total'（会社全体の合計反響数目標）は、campaign_targetsの自動合算に
-- 置き換わったため廃止する。以後、targetsに残るkpi_keyはvisit_reservations/visits/contractsの3種のみ
-- （§4-1・§9-2、アプリ側もKPI_LABELSからleads_totalを除外する想定）。
delete from targets where kpi_key = 'leads_total';

-- ============================================================
-- 3. campaign_channels.enabled（§3-3）
--
-- client_id が非null（クライアント固有施策）の行にのみ意味を持つ列。「削除」の代わりに
-- falseにすることで、既存の campaign_targets / campaign_metrics との参照整合性を保ったまま
-- 入力フォーム・チャネル別内訳・チャネル別計画グリッドから除外できるようにする。
-- client_id が null（全クライアント共通のデフォルト17施策）の行では常にtrueのまま使わず、
-- クライアント単位の有効/無効は下記 client_channel_settings で管理する（1行が全クライアント
-- 共通のため、この列だけではクライアントごとの出し分けができないため）。
-- ============================================================

alter table campaign_channels
  add column enabled boolean not null default true;

comment on column campaign_channels.enabled is
  'client_idが非nullの行（クライアント固有施策）のみ有効。falseで「削除」の代わりの無効化として扱う（§3-3）。デフォルト施策側の可視性は client_channel_settings を参照。';

-- campaign_channels_update（0003）は既にclient_id非null行の更新を代理店に許可しているため、
-- enabled列の追加だけでRLS変更は不要。

-- ============================================================
-- 4. client_channel_settings（§3-3）
--
-- デフォルト施策（campaign_channels.client_id is null）を、クライアントごとに
-- 「使う/使わない」で上書きするための対応表。行が存在しない組み合わせは enabled=true
-- （デフォルトで使う）とみなす。クライアント固有施策の有効/無効は上記の
-- campaign_channels.enabled で管理するため、このテーブルの対象外
-- （channel_idはデフォルト施策のIDのみを想定。DB制約では表現できないためアプリ層で保証する）。
-- ============================================================

create table client_channel_settings (
  client_id       uuid not null references clients(id) on delete cascade,
  channel_id      uuid not null references campaign_channels(id) on delete cascade,
  enabled         boolean not null default true,
  updated_by_type text check (updated_by_type in ('agency', 'client')),
  updated_by_id   uuid,
  updated_at      timestamptz not null default now(),
  primary key (client_id, channel_id)
);

comment on table client_channel_settings is
  'デフォルト施策（campaign_channels.client_id is null）のクライアント単位での有効/無効の上書き。行が無ければ有効扱い（§3-3）。';

alter table client_channel_settings enable row level security;

-- campaign_channelsのクライアント固有施策と同じ方針：閲覧は双方、追加・更新は代理店のみ（§4.2.3）。
create policy client_channel_settings_select on client_channel_settings
  for select using (is_authorized_for_client(client_id));
create policy client_channel_settings_insert on client_channel_settings
  for insert with check (is_authorized_for_client(client_id) and is_agency_user());
create policy client_channel_settings_update on client_channel_settings
  for update using (is_authorized_for_client(client_id) and is_agency_user())
  with check (is_authorized_for_client(client_id) and is_agency_user());
