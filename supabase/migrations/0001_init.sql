-- spec.md §6 データモデル一式（テーブル・一意性制約・RLS）
-- masterplan.md Phase 2

create extension if not exists pgcrypto;

-- ============================================================
-- テーブル
-- ============================================================

create table clients (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

create table locations (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients(id) on delete cascade,
  name            text not null,
  created_by_type text check (created_by_type in ('agency', 'client')),
  created_by_id   uuid,
  updated_by_type text check (updated_by_type in ('agency', 'client')),
  updated_by_id   uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- agency_users.id / client_users.id は auth.users.id をそのまま使う（spec §6）
create table agency_users (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  email      text not null unique,
  created_at timestamptz not null default now()
);

create table agency_user_clients (
  agency_user_id uuid not null references agency_users(id) on delete cascade,
  client_id      uuid not null references clients(id) on delete cascade,
  primary key (agency_user_id, client_id)
);

create table client_users (
  id         uuid primary key references auth.users(id) on delete cascade,
  client_id  uuid not null references clients(id) on delete cascade,
  name       text not null,
  email      text not null unique,
  created_at timestamptz not null default now()
);

create table campaign_channels (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  type       text not null check (type in ('ad', 'organic')),
  platform   text check (platform in ('google_ads', 'yahoo_ads', 'meta_ads')),
  sort_order int not null default 0
);

-- 媒体API連携のフェーズドロールアウト状態（spec §4.2.2, §6）
create table platform_integrations (
  platform   text primary key check (platform in ('google_ads', 'yahoo_ads', 'meta_ads')),
  status     text not null check (status in ('pending_review', 'active')) default 'pending_review',
  updated_at timestamptz not null default now()
);

-- access_token/refresh_token は Service Role 経由でのみ参照可能とし、
-- authenticated ロールへの SELECT/INSERT/UPDATE ポリシーは意図的に付与しない（末尾のRLS節を参照）。
create table ad_connections (
  id                            uuid primary key default gen_random_uuid(),
  client_id                     uuid not null references clients(id) on delete cascade,
  platform                      text not null check (platform in ('google_ads', 'yahoo_ads', 'meta_ads')),
  external_account_id           text,
  access_token                  text,
  refresh_token                 text,
  token_expires_at              timestamptz,
  connected_by_type             text check (connected_by_type in ('agency', 'client')),
  connected_by_id               uuid,
  status                        text not null check (status in ('connected', 'error', 'disconnected')) default 'disconnected',
  last_synced_at                timestamptz,
  available_conversion_actions  jsonb,
  tracked_conversion_action_ids jsonb,
  created_at                    timestamptz not null default now()
);

create table campaign_metrics (
  id                  uuid primary key default gen_random_uuid(),
  client_id           uuid not null references clients(id) on delete cascade,
  location_id         uuid references locations(id) on delete cascade,
  channel_id          uuid not null references campaign_channels(id),
  source              text not null check (source in ('manual', 'api')),
  period_type         text not null check (period_type in ('monthly', 'weekly', 'daily')),
  period_start        date not null,
  cost                numeric,
  impressions         int,
  clicks              int,
  followers           int,
  posts               int,
  views               int,
  inflow_rate         numeric,
  leads               int not null default 0,
  manually_overridden boolean not null default false,
  synced_at           timestamptz,
  created_by_type     text check (created_by_type in ('agency', 'client')),
  created_by_id       uuid,
  updated_by_type     text check (updated_by_type in ('agency', 'client')),
  updated_by_id       uuid,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table funnel_metrics (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid not null references clients(id) on delete cascade,
  location_id        uuid references locations(id) on delete cascade,
  period_type        text not null check (period_type in ('monthly', 'weekly')),
  period_start       date not null,
  visit_reservations int not null default 0,
  visits             int not null default 0,
  estimates          int not null default 0,
  floor_plans        int not null default 0,
  contracts          int not null default 0,
  created_by_type    text not null check (created_by_type in ('agency', 'client')),
  created_by_id      uuid not null,
  updated_by_type     text not null check (updated_by_type in ('agency', 'client')),
  updated_by_id      uuid not null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table targets (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references clients(id) on delete cascade,
  kpi_key       text not null,
  period_start  date not null,
  target_value  numeric not null,
  created_at    timestamptz not null default now(),
  unique (client_id, kpi_key, period_start)
);

create table reports (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references clients(id) on delete cascade,
  period_type       text not null check (period_type in ('monthly', 'weekly', 'custom')),
  period_start      date not null,
  period_end        date not null,
  snapshot_data     jsonb not null,
  generated_by_type text not null check (generated_by_type in ('agency', 'client')),
  generated_by_id   uuid not null,
  generated_at      timestamptz not null default now()
);

-- ============================================================
-- 一意性制約（spec §6「一意性制約」）
--
-- campaign_metrics / funnel_metrics の location_id は null 許容（全社共通）。
-- 通常の UNIQUE 制約は「NULL は他のどの値とも一致しない」という Postgres の挙動により、
-- location_id が null の行同士の重複を防げない。特定拠点用と全社共通用に
-- 分けた部分ユニークインデックスで対応する。
-- ============================================================

create unique index campaign_metrics_by_location_uniq
  on campaign_metrics (client_id, location_id, channel_id, period_type, period_start)
  where location_id is not null;

create unique index campaign_metrics_company_wide_uniq
  on campaign_metrics (client_id, channel_id, period_type, period_start)
  where location_id is null;

create unique index funnel_metrics_by_location_uniq
  on funnel_metrics (client_id, location_id, period_type, period_start)
  where location_id is not null;

create unique index funnel_metrics_company_wide_uniq
  on funnel_metrics (client_id, period_type, period_start)
  where location_id is null;

-- ============================================================
-- RLS 補助関数
-- ============================================================

-- auth.uid() が agency_user_clients 経由で割当のある代理店ユーザー、
-- または該当 client_id の住宅会社ユーザーであるかを判定する（spec §6）。
-- security definer: agency_user_clients / client_users 自体のRLSに邪魔されず判定できるようにする。
create or replace function is_authorized_for_client(target_client_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from agency_user_clients auc
    where auc.agency_user_id = auth.uid() and auc.client_id = target_client_id
  ) or exists (
    select 1 from client_users cu
    where cu.id = auth.uid() and cu.client_id = target_client_id
  );
$$;

-- auth.uid() が（どのクライアントの担当かに関わらず）代理店ユーザーであるかを判定する。
create or replace function is_agency_user()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from agency_users where id = auth.uid());
$$;

-- ============================================================
-- RLS 有効化・ポリシー
-- ============================================================

alter table clients enable row level security;
alter table locations enable row level security;
alter table agency_users enable row level security;
alter table agency_user_clients enable row level security;
alter table client_users enable row level security;
alter table campaign_channels enable row level security;
alter table platform_integrations enable row level security;
alter table ad_connections enable row level security;
alter table campaign_metrics enable row level security;
alter table funnel_metrics enable row level security;
alter table targets enable row level security;
alter table reports enable row level security;

-- clients: 新規作成は代理店ユーザーなら誰でも可（spec §4.1）。
-- 参照・更新は割当のある代理店ユーザー、または当該住宅会社ユーザーのみ。
create policy clients_select on clients
  for select using (is_authorized_for_client(id));
create policy clients_insert on clients
  for insert with check (is_agency_user());
create policy clients_update on clients
  for update using (is_authorized_for_client(id)) with check (is_authorized_for_client(id));

create policy locations_access on locations
  for all using (is_authorized_for_client(client_id)) with check (is_authorized_for_client(client_id));

-- agency_users: v1は代理店1社専用のため、代理店ユーザー同士は互いに参照・招待できる（spec §2, §4.1）。
create policy agency_users_select on agency_users
  for select using (is_agency_user());
create policy agency_users_insert on agency_users
  for insert with check (is_agency_user());

create policy agency_user_clients_select on agency_user_clients
  for select using (agency_user_id = auth.uid());
create policy agency_user_clients_insert on agency_user_clients
  for insert with check (is_agency_user());

create policy client_users_access on client_users
  for all using (is_authorized_for_client(client_id)) with check (is_authorized_for_client(client_id));

-- campaign_channels: 施策マスタは全認証ユーザーが参照可（書き込みはService Role経由のみ、v1では追加UIなし）。
create policy campaign_channels_select on campaign_channels
  for select using (auth.uid() is not null);

-- platform_integrations: 審査状況は全認証ユーザーが参照可。更新はService Role経由のみ（spec §4.2.2）。
create policy platform_integrations_select on platform_integrations
  for select using (auth.uid() is not null);

-- ad_connections: authenticated ロールへのポリシーは設けない（Service Role経由のみアクセス可、spec §6）。
-- OAuthトークンを含むため、担当者向けの接続状態表示は Next.js のサーバー側コードが
-- Service Role で取得し、認可チェックはアプリケーション層で行う。

create policy campaign_metrics_access on campaign_metrics
  for all using (is_authorized_for_client(client_id)) with check (is_authorized_for_client(client_id));

create policy funnel_metrics_access on funnel_metrics
  for all using (is_authorized_for_client(client_id)) with check (is_authorized_for_client(client_id));

create policy targets_access on targets
  for all using (is_authorized_for_client(client_id)) with check (is_authorized_for_client(client_id));

create policy reports_access on reports
  for all using (is_authorized_for_client(client_id)) with check (is_authorized_for_client(client_id));
