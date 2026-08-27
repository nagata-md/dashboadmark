"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormRow } from "@/components/ui/FormRow";
import { Panel } from "@/components/ui/Panel";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import { ChannelBreakdownTable } from "@/components/dashboard/ChannelBreakdownTable";
import { FunnelChart } from "@/components/dashboard/FunnelChart";
import { LocationBreakdown } from "@/components/dashboard/LocationBreakdown";
import { PeriodCompare } from "@/components/dashboard/PeriodCompare";
import { TargetVsActual } from "@/components/dashboard/TargetVsActual";
import { buildReportPeriodSnapshot, formatYen } from "@/lib/mock/aggregate";
import {
  getCampaignMetricsForClient,
  getChannelsForClient,
  getFunnelMetricsForClient,
  getLocationsForClient,
  getProductionCostsForClient,
  getReportsForClient,
  getTargetsForClient,
} from "@/lib/mock/data";
import type { ByType, Report } from "@/lib/mock/types";

// spec §4.6：生成時点の集計結果をスナップショットとして保存し、以後元データが変わっても
// 表示内容は変わらない。PDFはスナップショットから都度描画し、ファイル自体は保存しない。
// 本モックアップではPDF生成（Phase 10・puppeteer-core）の代わりにブラウザの印刷機能で代替する。
// 2026-08-10確認：対象月の単一選択ではなく期間種別（月次/週次/カスタム）＋期間比較に対応する。
// 本モックは月次データのみを保持するため、カスタム期間が既存データの期間と厳密一致しない場合は
// 0件（データなし）として表示される（実データ層のPhase 9で日数按分等の範囲集計に置き換わる）。

type ReportPeriodType = Report["periodType"];

function monthToRange(month: string): { periodStart: string; periodEnd: string } {
  const [y, m] = month.split("-").map(Number);
  const periodStart = `${month}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const periodEnd = `${month}-${String(lastDay).padStart(2, "0")}`;
  return { periodStart, periodEnd };
}

function weekToRange(weekStart: string): { periodStart: string; periodEnd: string } {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { periodStart: weekStart, periodEnd: end.toISOString().slice(0, 10) };
}

function PeriodRangeFields({
  periodType,
  defaultMonth,
  onChange,
}: {
  periodType: ReportPeriodType;
  defaultMonth: string;
  onChange: (range: { periodStart: string; periodEnd: string }) => void;
}) {
  const [month, setMonth] = useState(defaultMonth);
  const [weekStart, setWeekStart] = useState(`${defaultMonth}-01`);
  const [customStart, setCustomStart] = useState(`${defaultMonth}-01`);
  const [customEnd, setCustomEnd] = useState(monthToRange(defaultMonth).periodEnd);

  useEffect(() => {
    if (periodType === "monthly") onChange(monthToRange(month));
    else if (periodType === "weekly") onChange(weekToRange(weekStart));
    else onChange({ periodStart: customStart, periodEnd: customEnd });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodType, month, weekStart, customStart, customEnd]);

  if (periodType === "monthly") {
    return <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />;
  }
  if (periodType === "weekly") {
    return <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />;
  }
  return (
    <div className="flex items-center gap-2">
      <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
      <span className="text-gray-500">〜</span>
      <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
    </div>
  );
}

export function ReportsView({ clientId, generatedByType }: { clientId: string; generatedByType: ByType }) {
  const [reports, setReports] = useState<Report[]>(() =>
    [...getReportsForClient(clientId)].sort((a, b) => (a.generatedAt < b.generatedAt ? 1 : -1)),
  );
  const [selectedId, setSelectedId] = useState<string | null>(reports[0]?.id ?? null);
  const [periodType, setPeriodType] = useState<ReportPeriodType>("monthly");
  const [includeCompare, setIncludeCompare] = useState(false);
  const [baseRange, setBaseRange] = useState(monthToRange("2026-07"));
  const [compareRange, setCompareRange] = useState(monthToRange("2026-06"));

  const selected = reports.find((r) => r.id === selectedId) ?? null;

  function generate(e: FormEvent) {
    e.preventDefault();
    const campaignRows = getCampaignMetricsForClient(clientId);
    const funnelRows = getFunnelMetricsForClient(clientId);
    const targets = getTargetsForClient(clientId);
    const productionCosts = getProductionCostsForClient(clientId);
    const channels = getChannelsForClient(clientId);
    const locations = getLocationsForClient(clientId);

    const report: Report = {
      id: `rep_${Date.now()}`,
      clientId,
      periodType,
      generatedAt: new Date().toISOString(),
      generatedByType,
      base: buildReportPeriodSnapshot(campaignRows, funnelRows, targets, productionCosts, channels, locations, baseRange.periodStart, baseRange.periodEnd),
      compare: includeCompare
        ? buildReportPeriodSnapshot(campaignRows, funnelRows, targets, productionCosts, channels, locations, compareRange.periodStart, compareRange.periodEnd)
        : undefined,
    };
    setReports((prev) => [report, ...prev]);
    setSelectedId(report.id);
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel title="レポート生成" className="print:hidden">
        <form onSubmit={generate} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <FormRow label="期間種別">
              <select value={periodType} onChange={(e) => setPeriodType(e.target.value as ReportPeriodType)}>
                <option value="monthly">月次</option>
                <option value="weekly">週次</option>
                <option value="custom">カスタム（任意の期間）</option>
              </select>
            </FormRow>
            <FormRow label="対象期間">
              <PeriodRangeFields periodType={periodType} defaultMonth="2026-07" onChange={setBaseRange} />
            </FormRow>
          </div>
          <label className="flex items-center gap-1.5 text-xs text-gray-700">
            <input type="checkbox" checked={includeCompare} onChange={(e) => setIncludeCompare(e.target.checked)} />
            比較期間を含める
          </label>
          {includeCompare && (
            <FormRow label="比較期間">
              <PeriodRangeFields periodType={periodType} defaultMonth="2026-06" onChange={setCompareRange} />
            </FormRow>
          )}
          <p className="text-[11px] text-gray-500">
            本モックは月次データのみのため、既存データの期間（2026年6月・7月）と厳密に一致しない期間は0件になります。
          </p>
          <div>
            <Button type="submit" variant="primary">
              レポート生成
            </Button>
          </div>
        </form>
      </Panel>

      <Panel title="レポート一覧" className="print:hidden">
        <Table>
          <thead>
            <Tr>
              <Th>生成日時</Th>
              <Th>対象期間</Th>
              <Th>比較期間</Th>
              <Th>生成者</Th>
              <Th>操作</Th>
            </Tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <Tr key={r.id} className={r.id === selectedId ? "bg-accent-tint" : ""}>
                <Td>{new Date(r.generatedAt).toLocaleString("ja-JP")}</Td>
                <Td>
                  {r.base.periodStart} 〜 {r.base.periodEnd}
                </Td>
                <Td>{r.compare ? `${r.compare.periodStart} 〜 ${r.compare.periodEnd}` : "-"}</Td>
                <Td>{r.generatedByType === "agency" ? "代理店" : "住宅会社"}</Td>
                <Td>
                  <button type="button" className="text-xs text-accent hover:underline" onClick={() => setSelectedId(r.id)}>
                    開く
                  </button>
                </Td>
              </Tr>
            ))}
            {reports.length === 0 && (
              <Tr>
                <Td colSpan={5} className="text-center text-gray-500">
                  過去に生成したレポートはまだありません。
                </Td>
              </Tr>
            )}
          </tbody>
        </Table>
      </Panel>

      {selected && (
        <Panel title="レポート詳細" className="print:rounded-none print:border-0 print:p-0 print:shadow-none">
          <p className="mb-4 rounded border border-gray-300 bg-gray-050 px-3 py-2 text-xs text-gray-700 print:border-0 print:bg-white print:px-0">
            これは {new Date(selected.generatedAt).toLocaleString("ja-JP")} 時点のスナップショットです。生成後に元データが変更されても、この内容は変わりません（spec §4.6）。
          </p>

          <div className="flex flex-col gap-5">
            <div>
              <div className="font-archivo mb-2 inline-block border-b-2 border-accent pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                ファネル図
              </div>
              <FunnelChart stages={selected.base.funnel} channelLeads={selected.base.channelLeads} />
            </div>

            <div>
              <div className="font-archivo mb-2 inline-block border-b-2 border-accent pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                チャネル別内訳
              </div>
              <ChannelBreakdownTable rows={selected.base.channelBreakdown} />
            </div>

            <div>
              <div className="font-archivo mb-2 inline-block border-b-2 border-accent pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                制作・クリエイティブ費用
              </div>
              <p className="text-sm text-gray-700">
                合計：<span className="text-lg font-bold text-navy">{formatYen(selected.base.productionCostTotal)}</span>
              </p>
            </div>

            <div>
              <div className="font-archivo mb-2 inline-block border-b-2 border-accent pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                予実対比（会社全体）
              </div>
              <TargetVsActual rows={selected.base.targetVsActual} />
            </div>

            {selected.base.locationBreakdown.length > 1 && (
              <div>
                <div className="font-archivo mb-2 inline-block border-b-2 border-accent pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                  拠点別内訳
                </div>
                <LocationBreakdown rows={selected.base.locationBreakdown} />
              </div>
            )}

            {selected.compare && (
              <div>
                <div className="font-archivo mb-2 inline-block border-b-2 border-accent pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                  期間比較
                </div>
                <PeriodCompare
                  baseLabel={`${selected.base.periodStart} 〜 ${selected.base.periodEnd}`}
                  compareLabel={`${selected.compare.periodStart} 〜 ${selected.compare.periodEnd}`}
                  baseStages={selected.base.funnel}
                  compareStages={selected.compare.funnel}
                  baseChannels={selected.base.channelBreakdown}
                  compareChannels={selected.compare.channelBreakdown}
                  baseLocations={selected.base.locationBreakdown}
                  compareLocations={selected.compare.locationBreakdown}
                  baseProductionCostTotal={selected.base.productionCostTotal}
                  compareProductionCostTotal={selected.compare.productionCostTotal}
                />
              </div>
            )}
          </div>

          <div className="mt-4 print:hidden">
            <Button type="button" onClick={() => window.print()}>
              PDFダウンロード
            </Button>
          </div>
        </Panel>
      )}
    </div>
  );
}
