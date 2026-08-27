import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import { FunnelChart } from "@/components/dashboard/FunnelChart";
import { ChannelBreakdownTable } from "@/components/dashboard/ChannelBreakdownTable";
import { LocationBreakdown } from "@/components/dashboard/LocationBreakdown";
import { TargetVsActual } from "@/components/dashboard/TargetVsActual";
import { PeriodCompare } from "@/components/dashboard/PeriodCompare";
import { createClient } from "@/lib/supabase/server";
import { formatYen } from "@/lib/metrics/adMetrics";
import type { ByType, ReportPeriodSnapshot } from "@/lib/mock/types";
import { PrintButton } from "./PrintButton";
import { ReportGenerateForm } from "./ReportGenerateForm";

export interface RealReportsSearchParams {
  selected?: string;
  error?: string;
  success?: string;
}

const REPORT_ERROR_MESSAGES: Record<string, string> = {
  invalid_period: "対象期間の指定が正しくありません。",
  generate_failed: "レポート生成に失敗しました。時間をおいて再度お試しください。",
};

interface ReportRow {
  id: string;
  period_start: string;
  period_end: string;
  generated_by_type: ByType;
  generated_at: string;
  snapshot_data: { base: ReportPeriodSnapshot; compare?: ReportPeriodSnapshot };
}

function todayMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

// spec §4.6：レポート閲覧・エクスポート（実データ）。generateAction は呼び出し元
// （agency/client それぞれの reports/actions.ts）で clientId 等を束縛したServer Actionを渡す。
export async function RealReports({
  clientId,
  basePath,
  generateAction,
  searchParams,
}: {
  clientId: string;
  basePath: string;
  generateAction: (formData: FormData) => Promise<void>;
  searchParams: RealReportsSearchParams;
}) {
  const supabase = await createClient();
  const { data: reportRows } = await supabase
    .from("reports")
    .select("id, period_start, period_end, generated_by_type, generated_at, snapshot_data")
    .eq("client_id", clientId)
    .order("generated_at", { ascending: false });

  const reports = (reportRows ?? []) as ReportRow[];
  const selected = reports.find((r) => r.id === searchParams.selected) ?? reports[0] ?? null;

  return (
    <div className="flex flex-col gap-5">
      {searchParams.success === "generated" && (
        <p className="rounded-control bg-success-tint px-3 py-2 text-xs text-success">レポートを生成しました。</p>
      )}
      {searchParams.error && (
        <p className="rounded-control bg-danger-tint px-3 py-2 text-xs text-danger">
          {REPORT_ERROR_MESSAGES[searchParams.error] ?? "エラーが発生しました。"}
        </p>
      )}

      <Panel title="レポート生成">
        <ReportGenerateForm generateAction={generateAction} defaultMonth={todayMonthKey()} />
      </Panel>

      <Panel title="レポート一覧">
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
              <Tr key={r.id} className={selected?.id === r.id ? "bg-accent-tint" : ""}>
                <Td>{new Date(r.generated_at).toLocaleString("ja-JP")}</Td>
                <Td>
                  {r.period_start} 〜 {r.period_end}
                </Td>
                <Td>
                  {r.snapshot_data.compare
                    ? `${r.snapshot_data.compare.periodStart} 〜 ${r.snapshot_data.compare.periodEnd}`
                    : "-"}
                </Td>
                <Td>{r.generated_by_type === "agency" ? "代理店" : "住宅会社"}</Td>
                <Td>
                  <Link href={`${basePath}?selected=${r.id}`} className="text-xs text-accent hover:underline">
                    開く
                  </Link>
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
        <Panel title="レポート詳細" className="print:shadow-none">
          <p className="mb-4 rounded border border-gray-300 bg-gray-050 px-3 py-2 text-xs text-gray-700">
            これは {new Date(selected.generated_at).toLocaleString("ja-JP")}{" "}
            時点のスナップショットです。生成後に元データが変更されても、この内容は変わりません（spec §4.6）。
          </p>

          <div className="flex flex-col gap-5">
            <div>
              <div className="font-archivo mb-2 inline-block border-b-2 border-accent pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                ファネル図
              </div>
              <FunnelChart stages={selected.snapshot_data.base.funnel} channelLeads={selected.snapshot_data.base.channelLeads} />
            </div>

            <div>
              <div className="font-archivo mb-2 inline-block border-b-2 border-accent pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                チャネル別内訳
              </div>
              <ChannelBreakdownTable rows={selected.snapshot_data.base.channelBreakdown} />
            </div>

            <div>
              <div className="font-archivo mb-2 inline-block border-b-2 border-accent pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                制作・クリエイティブ費用
              </div>
              <p className="text-sm text-gray-700">
                合計：<span className="text-lg font-bold text-navy">{formatYen(selected.snapshot_data.base.productionCostTotal)}</span>
              </p>
            </div>

            <div>
              <div className="font-archivo mb-2 inline-block border-b-2 border-accent pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                予実対比（会社全体）
              </div>
              <TargetVsActual rows={selected.snapshot_data.base.targetVsActual} />
            </div>

            {selected.snapshot_data.base.locationBreakdown.length > 1 && (
              <div>
                <div className="font-archivo mb-2 inline-block border-b-2 border-accent pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                  拠点別内訳
                </div>
                <LocationBreakdown rows={selected.snapshot_data.base.locationBreakdown} />
              </div>
            )}

            {selected.snapshot_data.compare && (
              <div>
                <div className="font-archivo mb-2 inline-block border-b-2 border-accent pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                  期間比較
                </div>
                <PeriodCompare
                  baseLabel={`${selected.snapshot_data.base.periodStart} 〜 ${selected.snapshot_data.base.periodEnd}`}
                  compareLabel={`${selected.snapshot_data.compare.periodStart} 〜 ${selected.snapshot_data.compare.periodEnd}`}
                  baseStages={selected.snapshot_data.base.funnel}
                  compareStages={selected.snapshot_data.compare.funnel}
                  baseChannels={selected.snapshot_data.base.channelBreakdown}
                  compareChannels={selected.snapshot_data.compare.channelBreakdown}
                  baseLocations={selected.snapshot_data.base.locationBreakdown}
                  compareLocations={selected.snapshot_data.compare.locationBreakdown}
                  baseProductionCostTotal={selected.snapshot_data.base.productionCostTotal}
                  compareProductionCostTotal={selected.snapshot_data.compare.productionCostTotal}
                />
              </div>
            )}
          </div>

          <div className="mt-4">
            <PrintButton />
          </div>
        </Panel>
      )}
    </div>
  );
}
