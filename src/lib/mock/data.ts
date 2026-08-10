// UI モックアップ用の静的ダミーデータ。spec.md §4.2 の施策マスタ・§6 のテーブル定義に
// 沿った形をしているが、実際の Supabase 接続は行わない（Phase 2 の supabase/seed.sql とは別物）。
// クライアント1「サンプル工務店」は拠点2件＋全社共通データを持ち、拠点別内訳の合計チェック
// (§4.5) を確認できるようにしている。クライアント2「ノースホームズ」は拠点未登録のケース。

import { buildReportPeriodSnapshot } from "./aggregate";
import type {
  AdConnection,
  CampaignChannel,
  CampaignMetricRow,
  Client,
  FunnelMetricRow,
  Location,
  PlatformIntegration,
  ProductionCost,
  Report,
  Target,
} from "./types";

// /client/* 側は自社データに固定（クライアント切替なし、spec §4.5）。
// Phase 3（認証）着手前のため、ログイン中の住宅会社をこの定数で仮に固定する。
export const CURRENT_CLIENT_ID = "1";

export const MOCK_CLIENTS: Client[] = [
  { id: "1", name: "サンプル工務店" },
  { id: "2", name: "ノースホームズ" },
];

export const MOCK_LOCATIONS: Location[] = [
  { id: "loc1", clientId: "1", name: "本店ショールーム" },
  { id: "loc2", clientId: "1", name: "郊外モデルハウス" },
];

const AD_FULL: CampaignChannel["enabledFields"] = ["cost", "impressions", "clicks"];
const AD_COST_ONLY: CampaignChannel["enabledFields"] = ["cost"];
const ORGANIC_FULL: CampaignChannel["enabledFields"] = ["followers", "posts", "views", "inflowRate"];

// spec §4.2「初期施策マスタ（v1確定・追加可）」。全クライアント共通のデフォルト（clientId: null）。
// 2026-08-10確認：クライアント固有のカスタム施策はこの下にMOCK_CLIENT_CAMPAIGN_CHANNELSとして別管理する。
export const MOCK_DEFAULT_CAMPAIGN_CHANNELS: CampaignChannel[] = [
  { id: "ch_google", clientId: null, name: "Google広告", type: "ad", platform: "google_ads", method: "api", sortOrder: 1, enabledFields: AD_FULL, requiredFields: AD_FULL },
  { id: "ch_yahoo", clientId: null, name: "Yahoo広告", type: "ad", platform: "yahoo_ads", method: "api", sortOrder: 2, enabledFields: AD_FULL, requiredFields: AD_FULL },
  { id: "ch_meta", clientId: null, name: "Meta広告（Facebook/Instagram）", type: "ad", platform: "meta_ads", method: "api", sortOrder: 3, enabledFields: AD_FULL, requiredFields: AD_FULL },
  { id: "ch_youtube_ad", clientId: null, name: "YouTube広告", type: "ad", platform: null, method: "manual", sortOrder: 4, enabledFields: AD_FULL, requiredFields: AD_FULL },
  { id: "ch_tiktok_ad", clientId: null, name: "TikTok広告", type: "ad", platform: null, method: "manual", sortOrder: 5, enabledFields: AD_FULL, requiredFields: AD_FULL },
  { id: "ch_pinterest_ad", clientId: null, name: "Pinterest広告", type: "ad", platform: null, method: "manual", sortOrder: 6, enabledFields: AD_FULL, requiredFields: AD_FULL },
  { id: "ch_tvcm", clientId: null, name: "TVCM", type: "ad", platform: null, method: "manual", sortOrder: 7, enabledFields: AD_FULL, requiredFields: AD_COST_ONLY },
  { id: "ch_portal", clientId: null, name: "ポータルサイト（SUUMO/HOME'S等）", type: "ad", platform: null, method: "manual", sortOrder: 8, enabledFields: AD_FULL, requiredFields: AD_COST_ONLY },
  { id: "ch_flyer", clientId: null, name: "チラシ・折込", type: "ad", platform: null, method: "manual", sortOrder: 9, enabledFields: AD_FULL, requiredFields: AD_COST_ONLY },
  { id: "ch_seo", clientId: null, name: "SEO／オーガニック検索", type: "organic", platform: null, method: "manual", sortOrder: 10, enabledFields: ORGANIC_FULL, requiredFields: [] },
  { id: "ch_instagram", clientId: null, name: "Instagram運用", type: "organic", platform: null, method: "manual", sortOrder: 11, enabledFields: ORGANIC_FULL, requiredFields: [] },
  { id: "ch_youtube_organic", clientId: null, name: "YouTube運用", type: "organic", platform: null, method: "manual", sortOrder: 12, enabledFields: ORGANIC_FULL, requiredFields: [] },
  { id: "ch_tiktok_organic", clientId: null, name: "TikTok運用", type: "organic", platform: null, method: "manual", sortOrder: 13, enabledFields: ORGANIC_FULL, requiredFields: [] },
  { id: "ch_pinterest_organic", clientId: null, name: "Pinterest運用", type: "organic", platform: null, method: "manual", sortOrder: 14, enabledFields: ORGANIC_FULL, requiredFields: [] },
  { id: "ch_hp", clientId: null, name: "自社HP", type: "organic", platform: null, method: "manual", sortOrder: 15, enabledFields: ORGANIC_FULL, requiredFields: [] },
  { id: "ch_showroom", clientId: null, name: "住宅展示場", type: "organic", platform: null, method: "manual", sortOrder: 16, enabledFields: ORGANIC_FULL, requiredFields: [] },
  { id: "ch_referral", clientId: null, name: "紹介・口コミ", type: "organic", platform: null, method: "manual", sortOrder: 17, enabledFields: ORGANIC_FULL, requiredFields: [] },
];

// クライアント固有の追加施策（施策マスタ管理、2026-08-10確認）。代理店のみが追加・編集できる想定。
// 「地元フリーペーパー」は特殊媒体の例：表示回数・クリック数の概念が無いため費用のみ入力可能にしている。
export const MOCK_CLIENT_CAMPAIGN_CHANNELS: CampaignChannel[] = [
  { id: "ch_client1_freepaper", clientId: "1", name: "地元フリーペーパー", type: "ad", platform: null, method: "manual", sortOrder: 101, enabledFields: AD_COST_ONLY, requiredFields: AD_COST_ONLY },
];

export const MOCK_CAMPAIGN_CHANNELS: CampaignChannel[] = [...MOCK_DEFAULT_CAMPAIGN_CHANNELS, ...MOCK_CLIENT_CAMPAIGN_CHANNELS];

/** クライアントが実際に使える施策一覧（全クライアント共通のデフォルト＋そのクライアント固有の追加分） */
export function getChannelsForClient(clientId: string): CampaignChannel[] {
  return MOCK_CAMPAIGN_CHANNELS.filter((c) => c.clientId === null || c.clientId === clientId);
}

// 媒体単位の審査状況（フェーズドロールアウト、spec §4.2.2）。
// google_ads: 審査完了・接続済みの完全なフローを確認するため
// yahoo_ads: 審査完了だがクライアントの OAuth 接続がまだ済んでいない状態を確認するため
// meta_ads: 審査待ち（OAuth接続ボタン非活性）を確認するため
export const MOCK_PLATFORM_INTEGRATIONS: PlatformIntegration[] = [
  { platform: "google_ads", status: "active" },
  { platform: "yahoo_ads", status: "active" },
  { platform: "meta_ads", status: "pending_review" },
];

export const MOCK_AD_CONNECTIONS: AdConnection[] = [
  {
    id: "conn_google_1",
    clientId: "1",
    platform: "google_ads",
    externalAccountId: "123-456-7890",
    status: "connected",
    lastSyncedAt: "2026-08-10T06:05:00+09:00",
    connectedByType: "agency",
    availableConversionActions: [
      { id: "conv_1", name: "問い合わせ完了" },
      { id: "conv_2", name: "資料請求完了" },
      { id: "conv_3", name: "電話クリック" },
      { id: "conv_4", name: "サイト滞在3分以上" },
    ],
    trackedConversionActionIds: ["conv_1", "conv_2"],
  },
];

const M = (
  id: string,
  locationId: string | null,
  channelId: string,
  periodStart: string,
  source: "manual" | "api",
  values: Partial<CampaignMetricRow>,
): CampaignMetricRow => ({
  id,
  clientId: "1",
  locationId,
  channelId,
  source,
  periodType: "monthly",
  periodStart,
  cost: null,
  impressions: null,
  clicks: null,
  followers: null,
  posts: null,
  views: null,
  inflowRate: null,
  leads: 0,
  manuallyOverridden: false,
  updatedByType: "agency",
  ...values,
});

export const MOCK_CAMPAIGN_METRICS: CampaignMetricRow[] = [
  // --- 2026-07（今月分） ---
  M("cm_07_google_loc1", "loc1", "ch_google", "2026-07-01", "api", { cost: 450000, impressions: 180000, clicks: 3200, leads: 42, updatedByType: null }),
  M("cm_07_google_loc2", "loc2", "ch_google", "2026-07-01", "api", { cost: 210000, impressions: 90000, clicks: 1500, leads: 18, updatedByType: null }),
  M("cm_07_google_null", null, "ch_google", "2026-07-01", "api", { cost: 80000, impressions: 30000, clicks: 500, leads: 6, updatedByType: null }),
  M("cm_07_meta_loc1", "loc1", "ch_meta", "2026-07-01", "manual", { cost: 150000, impressions: 95000, clicks: 2100, leads: 15 }),
  M("cm_07_yahoo_loc1", "loc1", "ch_yahoo", "2026-07-01", "manual", { cost: 90000, impressions: 40000, clicks: 800, leads: 9 }),
  M("cm_07_yahoo_loc2", "loc2", "ch_yahoo", "2026-07-01", "manual", { cost: 60000, impressions: 25000, clicks: 500, leads: 5 }),
  M("cm_07_tvcm_null", null, "ch_tvcm", "2026-07-01", "manual", { cost: 300000, leads: 8 }),
  M("cm_07_portal_loc1", "loc1", "ch_portal", "2026-07-01", "manual", { cost: 120000, leads: 20 }),
  M("cm_07_portal_loc2", "loc2", "ch_portal", "2026-07-01", "manual", { cost: 80000, leads: 11 }),
  M("cm_07_flyer_loc2", "loc2", "ch_flyer", "2026-07-01", "manual", { cost: 50000, leads: 4 }),
  M("cm_07_seo_null", null, "ch_seo", "2026-07-01", "manual", { inflowRate: 0.34, leads: 25 }),
  M("cm_07_instagram_null", null, "ch_instagram", "2026-07-01", "manual", { followers: 12500, posts: 18, views: 45000, inflowRate: 0.08, leads: 10 }),
  M("cm_07_hp_null", null, "ch_hp", "2026-07-01", "manual", { views: 8900, inflowRate: 0.12, leads: 14 }),
  M("cm_07_referral_null", null, "ch_referral", "2026-07-01", "manual", { leads: 6 }),
  M("cm_07_freepaper_loc2", "loc2", "ch_client1_freepaper", "2026-07-01", "manual", { cost: 30000, leads: 3 }),

  // --- 2026-06（前月分・期間比較・トレンド用） ---
  M("cm_06_google_loc1", "loc1", "ch_google", "2026-06-01", "api", {
    cost: 420000, impressions: 170000, clicks: 3000, leads: 38,
    manuallyOverridden: true, updatedByType: "agency",
    // 上書き前にAPIが同期していた値（「APIの値に戻す」で即時復元するデモ用、2026-08-10確認）
    apiSyncedValue: { cost: 415000, impressions: 168000, clicks: 2950, leads: 36 },
  }),
  M("cm_06_google_loc2", "loc2", "ch_google", "2026-06-01", "api", { cost: 200000, impressions: 85000, clicks: 1400, leads: 16, updatedByType: null }),
  M("cm_06_google_null", null, "ch_google", "2026-06-01", "api", { cost: 75000, impressions: 28000, clicks: 460, leads: 5, updatedByType: null }),
  M("cm_06_meta_loc1", "loc1", "ch_meta", "2026-06-01", "manual", { cost: 140000, impressions: 90000, clicks: 1900, leads: 13 }),
  M("cm_06_yahoo_loc1", "loc1", "ch_yahoo", "2026-06-01", "manual", { cost: 85000, impressions: 38000, clicks: 750, leads: 8 }),
  M("cm_06_yahoo_loc2", "loc2", "ch_yahoo", "2026-06-01", "manual", { cost: 55000, impressions: 23000, clicks: 470, leads: 4 }),
  M("cm_06_tvcm_null", null, "ch_tvcm", "2026-06-01", "manual", { cost: 300000, leads: 6 }),
  M("cm_06_portal_loc1", "loc1", "ch_portal", "2026-06-01", "manual", { cost: 115000, leads: 17 }),
  M("cm_06_portal_loc2", "loc2", "ch_portal", "2026-06-01", "manual", { cost: 78000, leads: 9 }),
  M("cm_06_flyer_loc2", "loc2", "ch_flyer", "2026-06-01", "manual", { cost: 48000, leads: 3 }),
  M("cm_06_seo_null", null, "ch_seo", "2026-06-01", "manual", { inflowRate: 0.31, leads: 21 }),
  M("cm_06_instagram_null", null, "ch_instagram", "2026-06-01", "manual", { followers: 12100, posts: 15, views: 39000, inflowRate: 0.075, leads: 8 }),
  M("cm_06_hp_null", null, "ch_hp", "2026-06-01", "manual", { views: 8200, inflowRate: 0.11, leads: 11 }),
  M("cm_06_referral_null", null, "ch_referral", "2026-06-01", "manual", { leads: 5 }),

  // --- クライアント2（拠点未登録）2026-07 ---
  { ...M("cm2_07_seo", null, "ch_seo", "2026-07-01", "manual", { leads: 10 }), clientId: "2" },
  { ...M("cm2_07_hp", null, "ch_hp", "2026-07-01", "manual", { leads: 5 }), clientId: "2" },
  { ...M("cm2_07_referral", null, "ch_referral", "2026-07-01", "manual", { leads: 3 }), clientId: "2" },
  { ...M("cm2_07_tvcm", null, "ch_tvcm", "2026-07-01", "manual", { cost: 100000, leads: 4 }), clientId: "2" },
];

// 制作・クリエイティブ費用（バナー制作・ページ更新など、2026-08-10確認）。施策の反響には紐づかない
// 自由入力の項目リストとして管理する。
export const MOCK_PRODUCTION_COSTS: ProductionCost[] = [
  { id: "pc_07_banner", clientId: "1", locationId: "loc1", periodType: "monthly", periodStart: "2026-07-01", itemName: "夏の見学会バナー制作", amount: 40000, updatedByType: "agency" },
  { id: "pc_07_page", clientId: "1", locationId: null, periodType: "monthly", periodStart: "2026-07-01", itemName: "HPページ更新", amount: 15000, updatedByType: "agency" },
  { id: "pc_07_flyer_design", clientId: "1", locationId: "loc2", periodType: "monthly", periodStart: "2026-07-01", itemName: "チラシデザイン費", amount: 20000, updatedByType: "agency" },
  { id: "pc_06_page", clientId: "1", locationId: null, periodType: "monthly", periodStart: "2026-06-01", itemName: "HPページ更新", amount: 12000, updatedByType: "agency" },
  { id: "pc_06_video", clientId: "1", locationId: null, periodType: "monthly", periodStart: "2026-06-01", itemName: "動画編集費", amount: 30000, updatedByType: "agency" },
];

export function getProductionCostsForClient(clientId: string): ProductionCost[] {
  return MOCK_PRODUCTION_COSTS.filter((r) => r.clientId === clientId);
}

const F = (
  id: string,
  clientId: string,
  locationId: string | null,
  periodStart: string,
  values: Omit<FunnelMetricRow, "id" | "clientId" | "locationId" | "periodType" | "periodStart" | "updatedByType">,
): FunnelMetricRow => ({
  id,
  clientId,
  locationId,
  periodType: "monthly",
  periodStart,
  updatedByType: "client",
  ...values,
});

export const MOCK_FUNNEL_METRICS: FunnelMetricRow[] = [
  F("fm_07_loc1", "1", "loc1", "2026-07-01", { visitReservations: 30, visits: 26, estimates: 14, floorPlans: 10, contracts: 6 }),
  F("fm_07_loc2", "1", "loc2", "2026-07-01", { visitReservations: 14, visits: 12, estimates: 6, floorPlans: 5, contracts: 3 }),
  F("fm_07_null", "1", null, "2026-07-01", { visitReservations: 4, visits: 3, estimates: 1, floorPlans: 1, contracts: 0 }),
  F("fm_06_loc1", "1", "loc1", "2026-06-01", { visitReservations: 27, visits: 23, estimates: 12, floorPlans: 9, contracts: 5 }),
  F("fm_06_loc2", "1", "loc2", "2026-06-01", { visitReservations: 12, visits: 10, estimates: 5, floorPlans: 4, contracts: 2 }),
  F("fm_06_null", "1", null, "2026-06-01", { visitReservations: 3, visits: 2, estimates: 1, floorPlans: 0, contracts: 0 }),
  F("fm2_07_null", "2", null, "2026-07-01", { visitReservations: 8, visits: 6, estimates: 3, floorPlans: 2, contracts: 1 }),
];

export const MOCK_TARGETS: Target[] = [
  { id: "tg_07_leads", clientId: "1", kpiKey: "leads_total", periodStart: "2026-07-01", targetValue: 180 },
  { id: "tg_07_vr", clientId: "1", kpiKey: "visit_reservations", periodStart: "2026-07-01", targetValue: 50 },
  { id: "tg_07_visits", clientId: "1", kpiKey: "visits", periodStart: "2026-07-01", targetValue: 45 },
  { id: "tg_07_contracts", clientId: "1", kpiKey: "contracts", periodStart: "2026-07-01", targetValue: 10 },
  { id: "tg_06_leads", clientId: "1", kpiKey: "leads_total", periodStart: "2026-06-01", targetValue: 150 },
  { id: "tg_06_vr", clientId: "1", kpiKey: "visit_reservations", periodStart: "2026-06-01", targetValue: 45 },
  { id: "tg_06_visits", clientId: "1", kpiKey: "visits", periodStart: "2026-06-01", targetValue: 38 },
  { id: "tg_06_contracts", clientId: "1", kpiKey: "contracts", periodStart: "2026-06-01", targetValue: 8 },
];

// レポートのスナップショットは、生成時点のダッシュボード集計結果をそのまま複製したもの（spec §4.6）。
// 手打ちの数値をここに置くと元データとズレるため、他のMOCK_*配列からその場で集計して埋める
// （ReportsView.generate()の実処理と同じ関数を使う）。
function snapshot(clientId: string, periodStart: string, periodEnd: string) {
  return buildReportPeriodSnapshot(
    MOCK_CAMPAIGN_METRICS.filter((r) => r.clientId === clientId),
    MOCK_FUNNEL_METRICS.filter((r) => r.clientId === clientId),
    MOCK_TARGETS.filter((t) => t.clientId === clientId),
    MOCK_PRODUCTION_COSTS.filter((r) => r.clientId === clientId),
    getChannelsForClient(clientId),
    MOCK_LOCATIONS.filter((l) => l.clientId === clientId),
    periodStart,
    periodEnd,
  );
}

export const MOCK_REPORTS: Report[] = [
  {
    id: "rep_06",
    clientId: "1",
    periodType: "monthly",
    generatedAt: "2026-07-02T10:15:00+09:00",
    generatedByType: "agency",
    base: snapshot("1", "2026-06-01", "2026-06-30"),
  },
  {
    id: "rep_07",
    clientId: "1",
    periodType: "monthly",
    generatedAt: "2026-08-03T09:40:00+09:00",
    generatedByType: "client",
    base: snapshot("1", "2026-07-01", "2026-07-31"),
  },
  {
    // 期間比較を含めたレポートの例（2026-08-10確認：対象月ではなく期間指定＋期間比較に対応）
    id: "rep_07_vs_06",
    clientId: "1",
    periodType: "monthly",
    generatedAt: "2026-08-04T11:00:00+09:00",
    generatedByType: "agency",
    base: snapshot("1", "2026-07-01", "2026-07-31"),
    compare: snapshot("1", "2026-06-01", "2026-06-30"),
  },
];

export function getClient(id: string): Client | undefined {
  return MOCK_CLIENTS.find((c) => c.id === id);
}

export function getLocationsForClient(clientId: string): Location[] {
  return MOCK_LOCATIONS.filter((l) => l.clientId === clientId);
}

export function getCampaignMetricsForClient(clientId: string): CampaignMetricRow[] {
  return MOCK_CAMPAIGN_METRICS.filter((r) => r.clientId === clientId);
}

export function getFunnelMetricsForClient(clientId: string): FunnelMetricRow[] {
  return MOCK_FUNNEL_METRICS.filter((r) => r.clientId === clientId);
}

export function getTargetsForClient(clientId: string): Target[] {
  return MOCK_TARGETS.filter((t) => t.clientId === clientId);
}

export function getReportsForClient(clientId: string): Report[] {
  return MOCK_REPORTS.filter((r) => r.clientId === clientId);
}
