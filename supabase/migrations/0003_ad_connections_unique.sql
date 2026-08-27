-- Phase 6（広告API連携）着手にあたり、クライアントごとに媒体単位で1接続のみを
-- 持つという前提（spec §4.2.2、ad_connectionsのupsertに必要）を制約として明示する。
-- 0001_init.sql 時点ではこの制約が漏れていた。

alter table ad_connections
  add constraint ad_connections_client_platform_unique unique (client_id, platform);
