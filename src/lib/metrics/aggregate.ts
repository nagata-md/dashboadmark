// Phase 9・10 の実データ集計エンジン。spec §6「指標ごとの集計方法」を、任意の問い合わせ範囲
// （ダッシュボードの対象月・レポートの月次/週次/カスタム期間）に対して一般化した形で実装する。
// DBの生データ（campaign_metrics / funnel_metrics / production_costs / targets、いずれもsnake_case）
// を入力に取り、ダッシュボード・レポートの表示コンポーネントが期待する型（@/lib/mock/types、
// 元はUIモックアップ用に定義されたものだが、値の型定義自体は実データにも共通して使える）の
// 値を組み立てる。DB接続を持たない純粋関数のみで構成し、ユニットテスト（aggregate.test.ts）で
// 集計ロジックの正しさを直接検証できるようにしている。
import type {
  ChannelBreakdownRow,
  ChannelLeadSummary,
  ChannelType,
  FunnelStages,
  LocationBreakdownRow,
  TargetVsActualRow,
} from "@/lib/mock/types";
import { KPI_LABELS } from "@/lib/targets/kpiLabels";
import { calcCpc, calcCpl, calcCtr } from "./adMetrics";
import { type DateRange, monthRange, prorateWeight, rowInterval, type PeriodType } from "./dateRange";

export interface CampaignMetricDbRow {
  channel_id: string;
  location_id: string | null;
  period_type: PeriodType;
  period_start: string;
  cost: number | null;
  impressions: number | null;
  clicks: number | null;
  followers: number | null;
  posts: number | null;
  views: number | null;
  inflow_rate: number | null;
  leads: number;
}

export interface FunnelMetricDbRow {
  location_id: string | null;
  period_type: PeriodType;
  period_start: string;
  visit_reservations: number;
  visits: number;
  estimates: number;
  floor_plans: number;
  contracts: number;
}

export interface ProductionCostDbRow {
  location_id: string | null;
  period_type: PeriodType;
  period_start: string;
  amount: number;
}

export interface ChannelDbRow {
  id: string;
  name: string;
  type: ChannelType;
  method: "manual" | "api";
  sort_order: number;
}

export interface LocationDbRow {
  id: string;
  name: string;
}

export interface TargetDbRow {
  kpi_key: string;
  period_start: string;
  target_value: number;
}

export interface CampaignTargetDbRow {
  channel_id: string;
  location_id: string | null;
  period_start: string;
  target_leads: number | null;
  budget_amount: number | null;
}

interface Weighted<T> {
  row: T;
  weight: number;
}

/** range と重なりのある行だけを、重み（0〜1の日数按分比率）付きで残す。 */
function withWeights<T extends { period_type: PeriodType; period_start: string }>(
  rows: T[],
  range: DateRange,
): Weighted<T>[] {
  return rows
    .map((row) => ({ row, weight: prorateWeight(rowInterval(row.period_type, row.period_start), range) }))
    .filter((w) => w.weight > 0);
}

/** フロー指標（null許容）の日数按分合算。対象行が1件も無ければnull（未入力扱い）。 */
function sumNullableFlow<T extends { period_type: PeriodType; period_start: string }>(
  rows: T[],
  range: DateRange,
  getValue: (row: T) => number | null,
): number | null {
  const present = withWeights(rows, range).filter((w) => getValue(w.row) != null);
  if (present.length === 0) return null;
  return present.reduce((acc, w) => acc + getValue(w.row)! * w.weight, 0);
}

/** フロー指標（常に値を持つ、NOT NULL）の日数按分合算。対象行が無ければ0。 */
function sumFlow<T extends { period_type: PeriodType; period_start: string }>(
  rows: T[],
  range: DateRange,
  getValue: (row: T) => number,
): number {
  return withWeights(rows, range).reduce((acc, w) => acc + getValue(w.row) * w.weight, 0);
}

/** ストック指標（followers）: range内で最も新しいperiod_startを持つ行の値を採用する（spec §6）。 */
function latestStockValue<T extends { period_type: PeriodType; period_start: string }>(
  rows: T[],
  range: DateRange,
  getValue: (row: T) => number | null,
): number | null {
  const candidates = withWeights(rows, range).filter((w) => getValue(w.row) != null);
  if (candidates.length === 0) return null;
  const latest = [...candidates].sort((a, b) => (a.row.period_start < b.row.period_start ? 1 : -1))[0];
  return getValue(latest.row);
}

/** 比率指標（inflow_rate）: 合算しない。range内に重なる行の値をそのまま列挙する（spec §6）。 */
function collectRatioValues<T extends { period_type: PeriodType; period_start: string }>(
  rows: T[],
  range: DateRange,
  getValue: (row: T) => number | null,
): number[] {
  return withWeights(rows, range)
    .map((w) => getValue(w.row))
    .filter((v): v is number => v != null);
}

/** 指定範囲・全拠点分の行から、チャネル別内訳を組み立てる（spec §4.5・§4.2.3）。
 * range と重なる行が1件も無いチャネルは内訳に含めない（モックのbuildChannelBreakdownと同じ挙動）。 */
export function buildChannelBreakdown(
  campaignRows: CampaignMetricDbRow[],
  channels: ChannelDbRow[],
  range: DateRange,
): ChannelBreakdownRow[] {
  return channels
    .map((channel) => {
      const rows = campaignRows.filter((r) => r.channel_id === channel.id);
      if (withWeights(rows, range).length === 0) return null;
      const cost = sumNullableFlow(rows, range, (r) => r.cost);
      const impressions = sumNullableFlow(rows, range, (r) => r.impressions);
      const clicks = sumNullableFlow(rows, range, (r) => r.clicks);
      const leads = sumFlow(rows, range, (r) => r.leads);
      const posts = sumNullableFlow(rows, range, (r) => r.posts);
      const views = sumNullableFlow(rows, range, (r) => r.views);
      const followers = latestStockValue(rows, range, (r) => r.followers);
      const inflowRates = collectRatioValues(rows, range, (r) => r.inflow_rate);
      const row: ChannelBreakdownRow = {
        channelId: channel.id,
        channelName: channel.name,
        channelType: channel.type,
        channelMethod: channel.method,
        sortOrder: channel.sort_order,
        cost,
        impressions,
        clicks,
        leads,
        followers,
        posts,
        views,
        inflowRates,
        ctr: calcCtr(clicks, impressions),
        cpc: calcCpc(cost, clicks),
        cpl: calcCpl(cost, leads),
      };
      return row;
    })
    .filter((row): row is ChannelBreakdownRow => row !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** ファネル図の起点「施策」段階：チャネルごとの反響数を多い順に並べる（spec §4.5、2026-08-10確認）。 */
export function toChannelLeadsList(rows: ChannelBreakdownRow[]): ChannelLeadSummary[] {
  return rows
    .filter((r) => r.leads > 0)
    .map((r) => ({ channelName: r.channelName, leads: r.leads }))
    .sort((a, b) => b.leads - a.leads);
}

export function buildFunnelStages(
  campaignRows: CampaignMetricDbRow[],
  funnelRows: FunnelMetricDbRow[],
  range: DateRange,
): FunnelStages {
  return {
    leads: sumFlow(campaignRows, range, (r) => r.leads),
    visitReservations: sumFlow(funnelRows, range, (r) => r.visit_reservations),
    visits: sumFlow(funnelRows, range, (r) => r.visits),
    estimates: sumFlow(funnelRows, range, (r) => r.estimates),
    floorPlans: sumFlow(funnelRows, range, (r) => r.floor_plans),
    contracts: sumFlow(funnelRows, range, (r) => r.contracts),
  };
}

/** 拠点別内訳（全社共通を含む）。各行の合計は必ず会社全体の合計と一致する（spec §3・§4.5）。
 * base/compare で必ず同じ locations 配列を渡すこと——PeriodCompare コンポーネントが
 * 拠点行を配列の並び順（index）で突き合わせているため、順序が食い違うと誤対応する。 */
export function buildLocationBreakdown(
  campaignRows: CampaignMetricDbRow[],
  funnelRows: FunnelMetricDbRow[],
  locations: LocationDbRow[],
  range: DateRange,
): LocationBreakdownRow[] {
  const scopes: { id: string | null; name: string }[] = [
    ...locations.map((l) => ({ id: l.id, name: l.name })),
    { id: null, name: "全社共通" },
  ];
  return scopes.map((scope) => {
    const cRows = campaignRows.filter((r) => r.location_id === scope.id);
    const fRows = funnelRows.filter((r) => r.location_id === scope.id);
    return {
      locationId: scope.id,
      locationName: scope.name,
      leads: sumFlow(cRows, range, (r) => r.leads),
      visitReservations: sumFlow(fRows, range, (r) => r.visit_reservations),
      visits: sumFlow(fRows, range, (r) => r.visits),
      contracts: sumFlow(fRows, range, (r) => r.contracts),
    };
  });
}

/** 制作・クリエイティブ費用の期間合計（spec §4.2.4、2026-08-10確認）。 */
export function sumProductionCost(rows: ProductionCostDbRow[], range: DateRange): number {
  return sumFlow(rows, range, (r) => r.amount);
}

export interface TrendPoint {
  periodStart: string;
  leads: number;
  visits: number;
  contracts: number;
}

/** 期間推移グラフ用データ（spec §4.5）。monthKeys は "YYYY-MM" の配列（古い月→新しい月の順）。 */
export function buildTrend(
  campaignRows: CampaignMetricDbRow[],
  funnelRows: FunnelMetricDbRow[],
  monthKeys: string[],
): TrendPoint[] {
  return monthKeys.map((monthKey) => {
    const stages = buildFunnelStages(campaignRows, funnelRows, monthRange(monthKey));
    return { periodStart: `${monthKey}-01`, leads: stages.leads, visits: stages.visits, contracts: stages.contracts };
  });
}

/** チャネル別反響数目標（campaign_targets、月次のみ）の期間内合算。会社全体の目標は
 * 拠点別＋全社共通(location_id is null)行の自動合算として算出する方針のため（§9-1）、
 * この関数には location でフィルタしていない全行を渡す。range と重なる行が1件も無ければ
 * null（未設定）、それ以外は各行の target_leads（未入力はNULL=0扱い）を日数按分して合算する。 */
export function sumCampaignTargetLeads(rows: CampaignTargetDbRow[], range: DateRange): number | null {
  const weighted = withWeights(
    rows.map((r) => ({ ...r, period_type: "monthly" as PeriodType })),
    range,
  );
  if (weighted.length === 0) return null;
  return weighted.reduce((acc, w) => acc + (w.row.target_leads ?? 0) * w.weight, 0);
}

/** 予実対比（spec §4.4/§4.5）。目標は月次のみ（targets.period_start=月初日）のため、target の
 * 「区間」はその月のカレンダー月として扱い、range と重なる分を日数按分して合算する。
 * range がちょうど1つの月と一致する（ダッシュボードの通常利用）場合は単純に一致月の値になる。
 * range が複数月にまたがる場合（レポートの週次/カスタム期間）は近似値になる点に注意
 * （spec に明記が無い部分の合理的な拡張。目標自体が月次単位でしか設定できないため）。
 *
 * 「合計反響数」は2026-08-27の設計変更（§9-1・§9-2）でtargetsテーブルから
 * campaign_targets（チャネル別・広告施策のみ）のロールアップに置き換わった。実績側の
 * stages.leads は引き続き全チャネル（広告＋運用）の合算のままとする（既存ダッシュボードの
 * 実績値の定義を変更しないため）——目標が広告施策のみを対象とする一方、実績は運用施策分も
 * 含む点に差があるが、目標未設定時にNULLで表示されるため実用上の実害はない。 */
export function buildTargetVsActual(
  stages: FunnelStages,
  targets: TargetDbRow[],
  campaignTargets: CampaignTargetDbRow[],
  range: DateRange,
): TargetVsActualRow[] {
  const stageValues: Record<string, number> = {
    visit_reservations: stages.visitReservations,
    visits: stages.visits,
    contracts: stages.contracts,
  };
  const leadsRow: TargetVsActualRow = {
    kpiKey: "leads_total",
    label: "合計反響数",
    actual: stages.leads,
    target: sumCampaignTargetLeads(campaignTargets, range),
  };
  const rest = KPI_LABELS.map(({ kpiKey, label }) => {
    const rows = targets.filter((t) => t.kpi_key === kpiKey);
    const weighted = withWeights(
      rows.map((r) => ({ ...r, period_type: "monthly" as PeriodType })),
      range,
    );
    const target = weighted.length === 0 ? null : weighted.reduce((acc, w) => acc + w.row.target_value * w.weight, 0);
    return { kpiKey, label, actual: stageValues[kpiKey], target };
  });
  return [leadsRow, ...rest];
}

