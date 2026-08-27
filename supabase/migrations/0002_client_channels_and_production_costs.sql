-- spec §4.2.3（クライアント固有施策管理）・§4.2.4（制作・クリエイティブ費用）に対応する
-- スキーマ変更。2026-08-10にspec.mdへ追記されたが、0001_init.sql適用時点では
-- 未反映だったことが2026-08-20に判明したため、このマイグレーションで追加する。
-- 0001_init.sql 適用後に実行すること。

-- ============================================================
-- campaign_channels: クライアント固有施策・入力項目の動的化（spec §4.2.3, §6）
-- ============================================================

alter table campaign_channels
  add column client_id uuid references clients(id) on delete cascade,
  add column method text,
  add column enabled_fields text[] not null default '{}',
  add column required_fields text[] not null default '{}';

-- 既存のデフォルト17施策のmethodを確定させる（platformがあればapi、無ければmanual）。
update campaign_channels
set method = case when platform is not null then 'api' else 'manual' end
where method is null;

alter table campaign_channels
  alter column method set not null,
  add constraint campaign_channels_method_check check (method in ('manual', 'api')),
  -- client_idがnullでない行（クライアント固有の追加施策）は常にmanual（spec §4.2.3）。
  add constraint campaign_channels_client_specific_manual_check
    check (client_id is null or method = 'manual');

-- 既存17施策のenabled_fields/required_fieldsを初期値として設定する
-- （TVCM・ポータルサイト・チラシ折込は表示回数・クリック数を任意にする、spec §4.2 決定済み）。
update campaign_channels set
  enabled_fields = case
    when type = 'ad' then array['cost', 'impressions', 'clicks']
    else array['followers', 'posts', 'views', 'inflow_rate']
  end,
  required_fields = case
    when type = 'ad' and name in ('TVCM', 'ポータルサイト（SUUMO/HOME''S等）', 'チラシ・折込')
      then array['cost']
    when type = 'ad' then array['cost', 'impressions', 'clicks']
    else array[]::text[]
  end
where client_id is null;

-- campaign_channels_select（0001）は全認証ユーザーに全行を見せていたが、
-- クライアント固有施策（client_id非null）は該当クライアントの担当者のみに
-- 見せる必要があるため置き換える（spec §4.2.3）。
drop policy if exists campaign_channels_select on campaign_channels;
create policy campaign_channels_select on campaign_channels
  for select using (client_id is null or is_authorized_for_client(client_id));

-- クライアント固有施策の追加・編集は代理店のみ（spec §4.2.3「代理店のみが追加・編集できる」）。
create policy campaign_channels_insert on campaign_channels
  for insert with check (
    client_id is not null and is_authorized_for_client(client_id) and is_agency_user()
  );
create policy campaign_channels_update on campaign_channels
  for update using (
    client_id is not null and is_authorized_for_client(client_id) and is_agency_user()
  ) with check (
    client_id is not null and is_authorized_for_client(client_id) and is_agency_user()
  );

-- ============================================================
-- production_costs: 制作・クリエイティブ費用（spec §4.2.4, §6）
-- ============================================================

create table production_costs (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients(id) on delete cascade,
  location_id     uuid references locations(id) on delete cascade,
  period_type     text not null check (period_type in ('monthly', 'weekly')),
  period_start    date not null,
  item_name       text not null,
  amount          numeric not null,
  created_by_type text check (created_by_type in ('agency', 'client')),
  created_by_id   uuid,
  updated_by_type text check (updated_by_type in ('agency', 'client')),
  updated_by_id   uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table production_costs enable row level security;

-- spec §4.2.4「入力は代理店担当者が行う」。閲覧はダッシュボード等で住宅会社側も
-- 見る想定のため is_authorized_for_client で許可し、書き込みは代理店のみに絞る。
create policy production_costs_select on production_costs
  for select using (is_authorized_for_client(client_id));
create policy production_costs_insert on production_costs
  for insert with check (is_authorized_for_client(client_id) and is_agency_user());
create policy production_costs_update on production_costs
  for update using (is_authorized_for_client(client_id) and is_agency_user())
  with check (is_authorized_for_client(client_id) and is_agency_user());
create policy production_costs_delete on production_costs
  for delete using (is_authorized_for_client(client_id) and is_agency_user());
