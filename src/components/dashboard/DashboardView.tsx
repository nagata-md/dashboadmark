"use client";

import { useMemo, useState } from "react";
import { Panel } from "@/components/ui/Panel";
import {
  buildChannelBreakdown,
  buildFunnelStages,
  buildLocationBreakdown,
  buildTargetVsActual,
  buildTrend,
  formatMonthLabel,
  formatYen,
  sumProductionCost,
  toChannelLeadsList,
} from "@/lib/mock/aggregate";
import {
  getCampaignMetricsForClient,
  getChannelsForClient,
  getFunnelMetricsForClient,
  getLocationsForClient,
  getProductionCostsForClient,
  getTargetsForClient,
} from "@/lib/mock/data";
import { ChannelBreakdownTable } from "./ChannelBreakdownTable";
import { FunnelChart } from "./FunnelChart";
import { LocationBreakdown } from "./LocationBreakdown";
import { PeriodCompare } from "./PeriodCompare";
import { TargetVsActual } from "./TargetVsActual";
import { TrendChart } from "./TrendChart";

export function DashboardView({ clientId }: { clientId: string }) {
  const campaignRows = useMemo(() => getCampaignMetricsForClient(clientId), [clientId]);
  const funnelRows = useMemo(() => getFunnelMetricsForClient(clientId), [clientId]);
  const targets = useMemo(() => getTargetsForClient(clientId), [clientId]);
  const locations = useMemo(() => getLocationsForClient(clientId), [clientId]);
  const channels = useMemo(() => getChannelsForClient(clientId), [clientId]);
  const productionCosts = useMemo(() => getProductionCostsForClient(clientId), [clientId]);

  const periodStarts = useMemo(
    () =>
      Array.from(new Set([...campaignRows.map((r) => r.periodStart), ...funnelRows.map((r) => r.periodStart)])).sort(
        (a, b) => (a < b ? 1 : -1),
      ),
    [campaignRows, funnelRows],
  );

  const [period, setPeriod] = useState(periodStarts[0]);
  const [comparePeriod, setComparePeriod] = useState(periodStarts[1] ?? periodStarts[0]);
  const [showCompare, setShowCompare] = useState(false);

  if (periodStarts.length === 0 || !period) {
    return <Panel>この期間のデータはまだ入力されていません。</Panel>;
  }

  const stages = buildFunnelStages(campaignRows, funnelRows, period);
  const channelBreakdown = buildChannelBreakdown(campaignRows, channels, period);
  const locationBreakdown = buildLocationBreakdown(campaignRows, funnelRows, locations, period);
  const trend = buildTrend(campaignRows, funnelRows, [...periodStarts].sort());
  const targetRows = buildTargetVsActual(stages, targets, period);
  const productionCostTotal = sumProductionCost(productionCosts, period);

  return (
    <div className="flex flex-col gap-5">
      <Panel>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">対象期間（月次）</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="min-w-[140px]">
              {periodStarts.map((p) => (
                <option key={p} value={p}>
                  {formatMonthLabel(p)}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-1.5 pb-1.5 text-xs text-gray-700">
            <input type="checkbox" checked={showCompare} onChange={(e) => setShowCompare(e.target.checked)} />
            期間比較を表示する
          </label>
          {showCompare && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">比較期間</label>
              <select value={comparePeriod} onChange={(e) => setComparePeriod(e.target.value)} className="min-w-[140px]">
                {periodStarts.map((p) => (
                  <option key={p} value={p}>
                    {formatMonthLabel(p)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Panel>

      <Panel title="ファネル図">
        <FunnelChart stages={stages} channelLeads={toChannelLeadsList(channelBreakdown)} />
      </Panel>

      <Panel title="期間推移">
        <TrendChart points={trend} />
      </Panel>

      <Panel title="チャネル別内訳">
        <ChannelBreakdownTable rows={channelBreakdown} />
      </Panel>

      <Panel title="制作・クリエイティブ費用">
        <p className="text-sm text-gray-700">
          {formatMonthLabel(period)}の合計：<span className="text-lg font-bold text-navy">{formatYen(productionCostTotal)}</span>
        </p>
      </Panel>

      <Panel title="予実対比（会社全体）">
        <TargetVsActual rows={targetRows} />
      </Panel>

      {locations.length > 0 && (
        <Panel title="拠点別内訳">
          <LocationBreakdown rows={locationBreakdown} />
        </Panel>
      )}

      {showCompare && (
        <Panel title="期間比較">
          <PeriodCompare
            baseLabel={formatMonthLabel(period)}
            compareLabel={formatMonthLabel(comparePeriod)}
            baseStages={stages}
            compareStages={buildFunnelStages(campaignRows, funnelRows, comparePeriod)}
            baseChannels={channelBreakdown}
            compareChannels={buildChannelBreakdown(campaignRows, channels, comparePeriod)}
            baseLocations={locationBreakdown}
            compareLocations={buildLocationBreakdown(campaignRows, funnelRows, locations, comparePeriod)}
            baseProductionCostTotal={productionCostTotal}
            compareProductionCostTotal={sumProductionCost(productionCosts, comparePeriod)}
          />
        </Panel>
      )}
    </div>
  );
}
