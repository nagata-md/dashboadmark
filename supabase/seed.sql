-- spec.md §4.2 初期施策マスタ ＋ §4.2.2 媒体審査状況の初期投入
-- Supabase SQL Editor で 0001_init.sql の後に実行する。

insert into campaign_channels (name, type, platform, sort_order) values
  ('Google広告', 'ad', 'google_ads', 1),
  ('Yahoo広告', 'ad', 'yahoo_ads', 2),
  ('Meta広告（Facebook/Instagram）', 'ad', 'meta_ads', 3),
  ('YouTube広告', 'ad', null, 4),
  ('TikTok広告', 'ad', null, 5),
  ('Pinterest広告', 'ad', null, 6),
  ('TVCM', 'ad', null, 7),
  ('ポータルサイト（SUUMO/HOME''S等）', 'ad', null, 8),
  ('チラシ・折込', 'ad', null, 9),
  ('SEO／オーガニック検索', 'organic', null, 10),
  ('Instagram運用', 'organic', null, 11),
  ('YouTube運用', 'organic', null, 12),
  ('TikTok運用', 'organic', null, 13),
  ('Pinterest運用', 'organic', null, 14),
  ('自社HP', 'organic', null, 15),
  ('住宅展示場', 'organic', null, 16),
  ('紹介・口コミ', 'organic', null, 17);

insert into platform_integrations (platform, status) values
  ('google_ads', 'pending_review'),
  ('yahoo_ads', 'pending_review'),
  ('meta_ads', 'pending_review');
