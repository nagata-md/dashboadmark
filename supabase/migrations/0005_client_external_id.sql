-- improvement.md（2026-08-27ユーザー指摘）に対応するスキーマ追加。
-- 今後、様々な外部アプリと連携する際にクライアントを参照できるよう、
-- 内部PK（clients.id、UUID）とは別に、代理店が自由に入力・編集できる
-- 外部連携用の識別子を追加する。
--
-- 内部PKをそのまま外部連携に使わない理由：
--   - clients.id は Supabase 内部の実装詳細であり、将来的にDB移行等で変更されうる前提を
--     外部システムに持たせたくない。
--   - 代理店が外部システム（他ツール・CRM等）側の既存の顧客IDに合わせて値を決めたいケースに
--     対応するため、UUIDのような自動生成のみでなく、任意の文字列を入力・編集できる必要がある。

alter table clients
  add column external_client_id text;

comment on column clients.external_client_id is
  '外部アプリ連携用のクライアント識別子。代理店が任意の値を入力・編集できる（内部PKのclients.idとは別物）。未設定の間はnull。';

-- 空文字列ではなくnullを未設定として扱う（アプリ側でtrim後に空文字ならnullを保存する）。
-- UNIQUE制約はnullを複数許容する（Postgresの標準挙動）ため、未設定のクライアントが
-- 複数あっても問題ない。設定済みの値同士の重複だけを防ぐ。
alter table clients
  add constraint clients_external_client_id_unique unique (external_client_id);

-- clients_update（0001）は既に is_authorized_for_client(id) で代理店・住宅会社双方の
-- 更新を許可しているため、列追加のみでRLS変更は不要。
