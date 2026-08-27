import { Panel } from "@/components/ui/Panel";
import { FormRow } from "@/components/ui/FormRow";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { loadClientDataset } from "@/lib/metrics/loadClientDataset";
import {
  appendBudgetRow,
  buildChannelBreakdown,
  buildFunnelStages,
  buildLocationBreakdown,
  buildTargetVsActual,
  buildTrend,
  sumProductionCost,
  toChannelLeadsList,
} from "@/lib/metrics/aggregate";
import { monthRange } from "@/lib/metrics/dateRange";
import { formatMonthLabel, formatYen } from "@/lib/metrics/adMetrics";
import { FunnelChart } from "./FunnelChart";
import { TrendChart } from "./TrendChart";
import { ChannelBreakdownTable } from "./ChannelBreakdownTable";
import { LocationBreakdown } from "./LocationBreakdown";
import { TargetVsActual } from "./TargetVsActual";
import { PeriodCompare } from "./PeriodCompare";

const TREND_MONTHS = 6;

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function shiftMonthKey(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function lastNMonthKeys(endMonthKey: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => shiftMonthKey(endMonthKey, -(n - 1 - i)));
}

export interface RealDashboardSearchParams {
  periodMonth?: string;
  comparePeriodMonth?: string;
  showCompare?: string;
}

// spec §4.5 ダッシュボード（実データ）。対象期間は月次のみ（2026-08-27方針確定：目標設定が
// 月次のみのため予実対比と整合させる）。期間・比較期間の選択は campaigns/page.tsx と同じ
// <form method="get"> パターンで、クライアントコンポーネント化しない。
export async function RealDashboard({
  clientId,
  searchParams,
}: {
  clientId: string;
  searchParams: RealDashboardSearchParams;
}) {
  const supabase = await createClient();
  const dataset = await loadClientDataset(supabase, clientId);

  const periodMonth = searchParams.periodMonth || currentMonthKey();
  const showCompare = searchParams.showCompare === "on";
  const comparePeriodMonth = searchParams.comparePeriodMonth || shiftMonthKey(periodMonth, -1);

  const range = monthRange(periodMonth);
  const funnel = buildFunnelStages(dataset.campaignRows, dataset.funnelRows, range);
  const channelBreakdown = buildChannelBreakdown(dataset.campaignRows, dataset.channels, range, dataset.campaignTargets);
  const locationBreakdown = buildLocationBreakdown(dataset.campaignRows, dataset.funnelRows, dataset.locations, range);
  const targetVsActual = appendBudgetRow(
    buildTargetVsActual(funnel, dataset.targets, dataset.campaignTargets, range),
    channelBreakdown,
    dataset.campaignTargets,
    range,
  );
  const productionCostTotal = sumProductionCost(dataset.productionCosts, range);
  const trend = buildTrend(dataset.campaignRows, dataset.funnelRows, lastNMonthKeys(periodMonth, TREND_MONTHS));

  const compareRange = showCompare ? monthRange(comparePeriodMonth) : null;
  const compareFunnel = compareRange ? buildFunnelStages(dataset.campaignRows, dataset.funnelRows, compareRange) : null;
  const compareChannelBreakdown = compareRange
    ? buildChannelBreakdown(dataset.campaignRows, dataset.channels, compareRange, dataset.campaignTargets)
    : null;
  const compareLocationBreakdown = compareRange
    ? buildLocationBreakdown(dataset.campaignRows, dataset.funnelRows, dataset.locations, compareRange)
    : null;
  const compareProductionCostTotal = compareRange ? sumProductionCost(dataset.productionCosts, compareRange) : null;

  return (
    <div className="flex flex-col gap-5">
      <Panel>
        <form method="get" className="flex flex-wrap items-end gap-4">
          <FormRow label="対象期間（月次）" className="mb-0">
            <input type="month" name="periodMonth" defaultValue={periodMonth} />
          </FormRow>
          <label className="flex items-center gap-1.5 pb-1.5 text-xs text-gray-700">
            <input type="checkbox" name="showCompare" defaultChecked={showCompare} value="on" />
            期間比較を表示する
          </label>
          <FormRow label="比較期間" className="mb-0">
            <input type="month" name="comparePeriodMonth" defaultValue={comparePeriodMonth} />
          </FormRow>
          <Button type="submit" variant="primary">
            表示
          </Button>
        </form>
      </Panel>

      <Panel title="ファネル図">
        <FunnelChart stages={funnel} channelLeads={toChannelLeadsList(channelBreakdown)} />
      </Panel>

      <Panel title="期間推移">
        <TrendChart points={trend} />
      </Panel>

      <Panel title="チャネル別内訳">
        <ChannelBreakdownTable rows={channelBreakdown} />
      </Panel>

      <Panel title="制作・クリエイティブ費用">
        <p className="text-sm text-gray-700">
          {formatMonthLabel(`${periodMonth}-01`)}の合計：
          <span className="text-lg font-bold text-navy">{formatYen(productionCostTotal)}</span>
        </p>
      </Panel>

      <Panel title="予実対比（会社全体）">
        <TargetVsActual rows={targetVsActual} />
      </Panel>

      {dataset.locations.length > 0 && (
        <Panel title="拠点別内訳">
          <LocationBreakdown rows={locationBreakdown} />
        </Panel>
      )}

      {showCompare && compareFunnel && compareChannelBreakdown && compareLocationBreakdown && compareProductionCostTotal !== null && (
        <Panel title="期間比較">
          <PeriodCompare
            baseLabel={formatMonthLabel(`${periodMonth}-01`)}
            compareLabel={formatMonthLabel(`${comparePeriodMonth}-01`)}
            baseStages={funnel}
            compareStages={compareFunnel}
            baseChannels={channelBreakdown}
            compareChannels={compareChannelBreakdown}
            baseLocations={locationBreakdown}
            compareLocations={compareLocationBreakdown}
            baseProductionCostTotal={productionCostTotal}
            compareProductionCostTotal={compareProductionCostTotal}
          />
        </Panel>
      )}
    </div>
  );
}
