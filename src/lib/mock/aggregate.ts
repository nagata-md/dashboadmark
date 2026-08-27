// モックアップ確認用の軽量な集計ヘルパー。spec.md §6「指標ごとの集計方法」の考え方
// （フロー指標は合算、ストック指標は期間末最新値、比率指標は合算しない）をUI表示できる
// 最小限で再現している。週→月の日数按分は対象外（本モックは月次データのみを扱うため）。
// Phase 9 の lib/metrics/ 本実装（ユニットテスト付き）はこれを土台にする想定だが、
// このファイル自体は使い捨てのモック集計であり、そのまま流用することは意図していない。

import type {
  CampaignChannel,
  CampaignMetricRow,
  ChannelBreakdownRow,
  ChannelLeadSummary,
  FunnelMetricRow,
  FunnelStages,
  Location,
  LocationBreakdownRow,
  ProductionCost,
  ReportPeriodSnapshot,
  Target,
  TargetVsActualRow,
} from "./types";
import { KPI_LABELS } from "@/lib/targets/kpiLabels";
import {
  compare,
  formatMonthLabel,
  formatNum,
  formatYen,
  formatPercent as formatPct,
  type Comparison,
} from "@/lib/metrics/adMetrics";

// formatYen/formatNum/formatPct/formatMonthLabel/compare は実データ集計（lib/metrics/adMetrics.ts）
// と共有する純粋関数のため、そちらを正としてここでは再エクスポートするのみ（実装の重複を避ける）。
// 既存の呼び出し元（ChannelBreakdownTable・PeriodCompare・TrendChart等）はこのモジュールから
// importしたままで良いよう、名前はそのまま維持する。
export { compare, formatMonthLabel, formatNum, formatYen, formatPct, type Comparison };

export function ctr(clicks: number | null, impressions: number | null): number | null {
  if (!impressions || clicks == null) return null;
  return clicks / impressions;
}

export function cpc(cost: number | null, clicks: number | null): number | null {
  if (!clicks || cost == null) return null;
  return cost / clicks;
}

export function cpl(cost: number | null, leads: number): number | null {
  if (!leads || cost == null) return null;
  return cost / leads;
}

function sum(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v != null);
  if (present.length === 0) return null;
  return present.reduce((a, b) => a + b, 0);
}

/** ストック指標（followers）: 対象期間内で最新の入力値を採用する */
function latestNonNull(rows: CampaignMetricRow[], field: "followers"): number | null {
  const withValue = rows.filter((r) => r[field] != null);
  if (withValue.length === 0) return null;
  return [...withValue].sort((a, b) => (a.periodStart < b.periodStart ? 1 : -1))[0][field];
}

/** 指定期間・全拠点（特定拠点＋全社共通）分の行から、チャネル別内訳を組み立てる。
 * チャネルの型（広告/運用）では列を出し分けず、常に全項目を計算する。custom
 * チャネルはenabledFieldsで入力自体を絞るため、未入力項目は自然にnull→「-」表示になる（2026-08-10確認）。 */
export function buildChannelBreakdown(
  rows: CampaignMetricRow[],
  channels: CampaignChannel[],
  periodStart: string,
): ChannelBreakdownRow[] {
  const periodRows = rows.filter((r) => r.periodStart === periodStart);
  return channels
    .map((channel) => {
      const channelRows = periodRows.filter((r) => r.channelId === channel.id);
      if (channelRows.length === 0) return null;
      const cost = sum(channelRows.map((r) => r.cost));
      const impressions = sum(channelRows.map((r) => r.impressions));
      const clicks = sum(channelRows.map((r) => r.clicks));
      const leads = channelRows.reduce((a, r) => a + r.leads, 0);
      const posts = sum(channelRows.map((r) => r.posts));
      const views = sum(channelRows.map((r) => r.views));
      const followers = latestNonNull(channelRows, "followers");
      const inflowRates = channelRows
        .map((r) => r.inflowRate)
        .filter((v): v is number => v != null);
      return {
        channelId: channel.id,
        channelName: channel.name,
        channelType: channel.type,
        channelMethod: channel.method,
        sortOrder: channel.sortOrder,
        cost,
        impressions,
        clicks,
        leads,
        followers,
        posts,
        views,
        inflowRates,
        ctr: ctr(clicks, impressions),
        cpc: cpc(cost, clicks),
        cpl: cpl(cost, leads),
      };
    })
    .filter((row): row is ChannelBreakdownRow => row !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** ファネル図の起点「施策」段階（spec §4.5）：チャネルごとの反響数を多い順に並べる（2026-08-10確認） */
export function toChannelLeadsList(rows: ChannelBreakdownRow[]): ChannelLeadSummary[] {
  return rows
    .filter((r) => r.leads > 0)
    .map((r) => ({ channelName: r.channelName, leads: r.leads }))
    .sort((a, b) => b.leads - a.leads);
}

/** 制作・クリエイティブ費用の期間合計（2026-08-10確認、spec.mdには無い新規指標） */
export function sumProductionCost(rows: ProductionCost[], periodStart: string): number {
  return rows.filter((r) => r.periodStart === periodStart).reduce((a, r) => a + r.amount, 0);
}

export function buildFunnelStages(
  campaignRows: CampaignMetricRow[],
  funnelRows: FunnelMetricRow[],
  periodStart: string,
): FunnelStages {
  const leads = campaignRows
    .filter((r) => r.periodStart === periodStart)
    .reduce((a, r) => a + r.leads, 0);
  const fRows = funnelRows.filter((r) => r.periodStart === periodStart);
  return {
    leads,
    visitReservations: fRows.reduce((a, r) => a + r.visitReservations, 0),
    visits: fRows.reduce((a, r) => a + r.visits, 0),
    estimates: fRows.reduce((a, r) => a + r.estimates, 0),
    floorPlans: fRows.reduce((a, r) => a + r.floorPlans, 0),
    contracts: fRows.reduce((a, r) => a + r.contracts, 0),
  };
}

/** 拠点別内訳（全社共通を含む）。各行の合計は必ず会社全体の合計と一致する（§3, §4.5） */
export function buildLocationBreakdown(
  campaignRows: CampaignMetricRow[],
  funnelRows: FunnelMetricRow[],
  locations: Location[],
  periodStart: string,
): LocationBreakdownRow[] {
  const scopes: { id: string | null; name: string }[] = [
    ...locations.map((l) => ({ id: l.id, name: l.name })),
    { id: null, name: "全社共通" },
  ];
  return scopes.map((scope) => {
    const cRows = campaignRows.filter((r) => r.periodStart === periodStart && r.locationId === scope.id);
    const fRows = funnelRows.filter((r) => r.periodStart === periodStart && r.locationId === scope.id);
    return {
      locationId: scope.id,
      locationName: scope.name,
      leads: cRows.reduce((a, r) => a + r.leads, 0),
      visitReservations: fRows.reduce((a, r) => a + r.visitReservations, 0),
      visits: fRows.reduce((a, r) => a + r.visits, 0),
      contracts: fRows.reduce((a, r) => a + r.contracts, 0),
    };
  });
}

export interface TrendPoint {
  periodStart: string;
  leads: number;
  visits: number;
  contracts: number;
}

export function buildTrend(
  campaignRows: CampaignMetricRow[],
  funnelRows: FunnelMetricRow[],
  periodStarts: string[],
): TrendPoint[] {
  return periodStarts.map((periodStart) => {
    const stages = buildFunnelStages(campaignRows, funnelRows, periodStart);
    return { periodStart, leads: stages.leads, visits: stages.visits, contracts: stages.contracts };
  });
}

export { KPI_LABELS };

export function buildTargetVsActual(stages: FunnelStages, targets: Target[], periodStart: string): TargetVsActualRow[] {
  const stageValues: Record<string, number> = {
    leads_total: stages.leads,
    visit_reservations: stages.visitReservations,
    visits: stages.visits,
    contracts: stages.contracts,
  };
  return KPI_LABELS.map(({ kpiKey, label }) => ({
    kpiKey,
    label,
    actual: stageValues[kpiKey],
    target: targets.find((t) => t.kpiKey === kpiKey && t.periodStart === periodStart)?.targetValue ?? null,
  }));
}

/** レポートスナップショットの1期間分を組み立てる（spec §4.6、data.tsのシード生成とReportsView両方で使う） */
export function buildReportPeriodSnapshot(
  campaignRows: CampaignMetricRow[],
  funnelRows: FunnelMetricRow[],
  targets: Target[],
  productionCosts: ProductionCost[],
  channels: CampaignChannel[],
  locations: Location[],
  periodStart: string,
  periodEnd: string,
): ReportPeriodSnapshot {
  const funnel = buildFunnelStages(campaignRows, funnelRows, periodStart);
  const channelBreakdown = buildChannelBreakdown(campaignRows, channels, periodStart);
  return {
    periodStart,
    periodEnd,
    funnel,
    channelLeads: toChannelLeadsList(channelBreakdown),
    channelBreakdown,
    locationBreakdown: buildLocationBreakdown(campaignRows, funnelRows, locations, periodStart),
    targetVsActual: buildTargetVsActual(funnel, targets, periodStart),
    productionCostTotal: sumProductionCost(productionCosts, periodStart),
  };
}
