// レポート生成（spec §4.6）の本体。クライアントの全期間データをまとめて取得し、
// 基準期間・比較期間それぞれについて lib/metrics/aggregate.ts で集計してスナップショットを
// 組み立てる。agency/client 両方の Server Action（reports/actions.ts）から共通で呼ぶ。
import type { createClient } from "@/lib/supabase/server";
import type { ReportPeriodSnapshot } from "@/lib/mock/types";
import {
  buildChannelBreakdown,
  buildFunnelStages,
  buildLocationBreakdown,
  buildTargetVsActual,
  sumProductionCost,
  toChannelLeadsList,
} from "@/lib/metrics/aggregate";
import { loadClientDataset, type ClientDataset } from "@/lib/metrics/loadClientDataset";
import type { ResolvedReportPeriod } from "./period";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export function buildSnapshot(dataset: ClientDataset, period: ResolvedReportPeriod): ReportPeriodSnapshot {
  const funnel = buildFunnelStages(dataset.campaignRows, dataset.funnelRows, period.range);
  const channelBreakdown = buildChannelBreakdown(dataset.campaignRows, dataset.channels, period.range);
  return {
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    funnel,
    channelLeads: toChannelLeadsList(channelBreakdown),
    channelBreakdown,
    locationBreakdown: buildLocationBreakdown(dataset.campaignRows, dataset.funnelRows, dataset.locations, period.range),
    targetVsActual: buildTargetVsActual(funnel, dataset.targets, dataset.campaignTargets, period.range),
    productionCostTotal: sumProductionCost(dataset.productionCosts, period.range),
  };
}

export async function generateReportSnapshot(
  supabase: SupabaseServerClient,
  clientId: string,
  base: ResolvedReportPeriod,
  compare: ResolvedReportPeriod | null,
): Promise<{ base: ReportPeriodSnapshot; compare?: ReportPeriodSnapshot }> {
  const dataset = await loadClientDataset(supabase, clientId);
  return {
    base: buildSnapshot(dataset, base),
    compare: compare ? buildSnapshot(dataset, compare) : undefined,
  };
}
