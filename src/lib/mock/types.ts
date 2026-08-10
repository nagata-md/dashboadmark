// UI モックアップ用の型定義。spec.md §6 のテーブル定義に対応する（列名の意味は同一、
// 命名はTS慣習に合わせてcamelCaseにしている）。Phase 2以降の実データ層とは接続していない。

export type PeriodType = "monthly" | "weekly";
export type ByType = "agency" | "client";
export type ChannelType = "ad" | "organic";
export type Platform = "google_ads" | "yahoo_ads" | "meta_ads";
export type IntegrationStatus = "pending_review" | "active";
export type ConnectionStatus = "connected" | "error" | "disconnected";

export interface Client {
  id: string;
  name: string;
}

export interface Location {
  id: string;
  clientId: string;
  name: string;
}

/** location_id が null = 全社共通。UI側では null をそのまま使う */
export type LocationId = string | null;

/** 施策データ入力で扱える入力項目（spec §4.2 の広告/運用の入力項目に対応） */
export type FieldKey = "cost" | "impressions" | "clicks" | "followers" | "posts" | "views" | "inflowRate";

export interface CampaignChannel {
  id: string;
  /** null = 全クライアント共通のデフォルト施策マスタ。それ以外はクライアント固有の追加施策（2026-08-10確認） */
  clientId: string | null;
  name: string;
  type: ChannelType;
  platform: Platform | null;
  method: "manual" | "api";
  sortOrder: number;
  /** このチャネルで入力可能な項目（leads=反響数は全チャネル共通で常時必須のため含まない） */
  enabledFields: FieldKey[];
  /** enabledFieldsの部分集合。ここに含まれる項目は必須入力（残りは任意） */
  requiredFields: FieldKey[];
}

export interface PlatformIntegration {
  platform: Platform;
  status: IntegrationStatus;
}

export interface AdConnection {
  id: string;
  clientId: string;
  platform: Platform;
  externalAccountId: string;
  status: ConnectionStatus;
  lastSyncedAt: string | null;
  connectedByType: ByType;
  availableConversionActions: { id: string; name: string }[];
  trackedConversionActionIds: string[] | null;
}

export interface CampaignMetricRow {
  id: string;
  clientId: string;
  locationId: LocationId;
  channelId: string;
  source: "manual" | "api";
  periodType: PeriodType;
  /** 月次: 月初日 / 週次: 週開始日 (YYYY-MM-DD) */
  periodStart: string;
  cost: number | null;
  impressions: number | null;
  clicks: number | null;
  followers: number | null;
  posts: number | null;
  views: number | null;
  inflowRate: number | null;
  leads: number;
  manuallyOverridden: boolean;
  updatedByType: ByType | null;
  /**
   * 手動上書き直前の同期値のスナップショット（source='api'の行が初めて上書きされた時点で保持）。
   * 「APIの値に戻す」操作は次回同期を待たず即時に反映する方針のため（2026-08-10確認）、
   * このスナップショットへ即時に置き換える。manuallyOverridden=falseの間は使用しない。
   */
  apiSyncedValue?: { cost: number | null; impressions: number | null; clicks: number | null; leads: number };
}

export interface ChannelLeadSummary {
  channelName: string;
  leads: number;
}

/** チャネル別内訳の1行（ダッシュボード・レポートスナップショット共通、2026-08-10確認） */
export interface ChannelBreakdownRow {
  channelId: string;
  channelName: string;
  channelType: ChannelType;
  channelMethod: "manual" | "api";
  sortOrder: number;
  cost: number | null;
  impressions: number | null;
  clicks: number | null;
  leads: number;
  followers: number | null;
  posts: number | null;
  views: number | null;
  /** 比率指標は合算しないため、入力粒度の値をそのまま列挙する（spec §6） */
  inflowRates: number[];
  ctr: number | null;
  cpc: number | null;
  cpl: number | null;
}

/** 拠点別内訳の1行（全社共通を含む） */
export interface LocationBreakdownRow {
  locationId: string | null;
  locationName: string;
  leads: number;
  visitReservations: number;
  visits: number;
  contracts: number;
}

export interface FunnelStages {
  leads: number;
  visitReservations: number;
  visits: number;
  estimates: number;
  floorPlans: number;
  contracts: number;
}

export interface TargetVsActualRow {
  kpiKey: string;
  label: string;
  actual: number;
  target: number | null;
}

/** 制作・クリエイティブ費用（バナー制作・ページ更新など、2026-08-10確認）。施策チャネルの反響とは
 * 紐づかない自由入力の項目リストとして管理する。ダッシュボード・レポートには合計値を表示する。 */
export interface ProductionCost {
  id: string;
  clientId: string;
  locationId: LocationId;
  periodType: PeriodType;
  periodStart: string;
  itemName: string;
  amount: number;
  updatedByType: ByType;
}

export interface FunnelMetricRow {
  id: string;
  clientId: string;
  locationId: LocationId;
  periodType: PeriodType;
  periodStart: string;
  visitReservations: number;
  visits: number;
  estimates: number;
  floorPlans: number;
  contracts: number;
  updatedByType: ByType;
}

export interface Target {
  id: string;
  clientId: string;
  /** 'leads_total' | 'visit_reservations' | 'visits' | 'contracts' | 'channel:<channelId>:leads' 等 */
  kpiKey: string;
  periodStart: string;
  targetValue: number;
}

/** レポートスナップショットの1期間分（spec §4.6「ファネル・チャネル別・拠点別・予実の集計結果」）。
 * 期間比較を含むレポートでは base（基準期間）とcompare（比較期間）の2つを保持する（2026-08-10確認）。 */
export interface ReportPeriodSnapshot {
  periodStart: string;
  periodEnd: string;
  funnel: FunnelStages;
  channelLeads: ChannelLeadSummary[];
  channelBreakdown: ChannelBreakdownRow[];
  locationBreakdown: LocationBreakdownRow[];
  targetVsActual: TargetVsActualRow[];
  productionCostTotal: number;
}

export interface Report {
  id: string;
  clientId: string;
  periodType: "monthly" | "weekly" | "custom";
  generatedAt: string;
  generatedByType: ByType;
  base: ReportPeriodSnapshot;
  compare?: ReportPeriodSnapshot;
}
