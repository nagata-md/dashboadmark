import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { FormRow } from "@/components/ui/FormRow";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { KPI_LABELS } from "@/lib/targets/kpiLabels";
import { getVisibleAdChannels } from "@/lib/targets/visibleAdChannels";
import {
  buildFiscalYearMonths,
  computeUnitCost,
  currentFiscalYearBaseYear,
  sumOrNull,
  type MonthColumn,
} from "@/lib/targets/fiscalYearGrid";
import {
  buildChannelBreakdown,
  buildFunnelStages,
  sumCampaignTargetLeads,
  type CampaignMetricDbRow,
  type CampaignTargetDbRow,
  type ChannelDbRow,
  type FunnelMetricDbRow,
  type TargetDbRow,
} from "@/lib/metrics/aggregate";
import { monthRange } from "@/lib/metrics/dateRange";
import { formatNum, formatYen } from "@/lib/metrics/adMetrics";
import { saveChannelPlan, saveCompanyKpiGrid, saveFiscalYearStartMonth } from "./actions";

export const metadata = {
  title: "目標・予算 | 住宅マーケティング数値ダッシュボード（仮称）",
};

const ALL_LOCATIONS_KEY = "";
type Tab = "channel" | "company" | "actual";

// improvement.md §4-1・§9-1・§9-2・§2-7の設計に基づく実データ版。
// 反響数の目標はチャネル別（拠点別＋全社共通）に一本化し、予算÷目標で単価（想定CPL）を
// 自動算出する。来場予約数・来場数・契約数は施策チャネルに紐づかないため引き続き会社全体のみ。
// 「年間予実」タブは読み取り専用で、目標×実績を月ごとに比較する（§2-7）。
export default async function TargetsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; locationId?: string; year?: string; success?: string }>;
}) {
  const { id: clientId } = await params;
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id, fiscal_year_start_month")
    .eq("id", clientId)
    .maybeSingle();
  if (!client) notFound();

  const fiscalStartMonth = client.fiscal_year_start_month ?? 4;
  const tab: Tab = sp.tab === "company" || sp.tab === "actual" ? sp.tab : "channel";
  const baseYear = Number(sp.year) || currentFiscalYearBaseYear(fiscalStartMonth);
  const months = buildFiscalYearMonths(fiscalStartMonth, baseYear);
  const locationId = sp.locationId && sp.locationId !== "" ? sp.locationId : null;

  const [{ data: locationRows }, channels, { data: campaignTargetRows }, { data: targetRows }] = await Promise.all([
    supabase.from("locations").select("id, name").eq("client_id", clientId).order("created_at", { ascending: true }),
    getVisibleAdChannels(supabase, clientId),
    supabase
      .from("campaign_targets")
      .select("channel_id, location_id, period_start, target_leads, budget_amount")
      .eq("client_id", clientId),
    supabase.from("targets").select("kpi_key, period_start, target_value").eq("client_id", clientId),
  ]);

  const locationOptions = [
    { id: ALL_LOCATIONS_KEY, name: "全社共通" },
    ...(locationRows ?? []).map((l) => ({ id: l.id, name: l.name })),
  ];
  const allCampaignTargets: CampaignTargetDbRow[] = campaignTargetRows ?? [];
  const allTargets: TargetDbRow[] = targetRows ?? [];
  const channelsAsDbRows: ChannelDbRow[] = channels.map((c, i) => ({
    id: c.id,
    name: c.name,
    type: "ad",
    method: c.method,
    sort_order: i,
  }));

  // 年間予実タブのみ、施策・来場〜契約の実績データを追加で読み込む。
  let campaignRows: CampaignMetricDbRow[] = [];
  let funnelRows: FunnelMetricDbRow[] = [];
  if (tab === "actual") {
    const [{ data: cRows }, { data: fRows }] = await Promise.all([
      supabase
        .from("campaign_metrics")
        .select("channel_id, location_id, period_type, period_start, cost, impressions, clicks, leads")
        .eq("client_id", clientId),
      supabase
        .from("funnel_metrics")
        .select("location_id, period_type, period_start, visit_reservations, visits, estimates, floor_plans, contracts")
        .eq("client_id", clientId),
    ]);
    campaignRows = (cRows ?? []).map((r) => ({
      channel_id: r.channel_id,
      location_id: r.location_id,
      period_type: r.period_type,
      period_start: r.period_start,
      cost: r.cost,
      impressions: r.impressions,
      clicks: r.clicks,
      followers: null,
      posts: null,
      views: null,
      inflow_rate: null,
      leads: r.leads,
    }));
    funnelRows = fRows ?? [];
  }

  const successMessage = sp.success === "saved" ? "保存しました。" : null;
  const baseQuery = (overrides: Record<string, string>) => {
    const q = new URLSearchParams({ tab, year: String(baseYear), locationId: locationId ?? "", ...overrides });
    return `?${q.toString()}`;
  };

  return (
    <>
      <PageHeader title="目標・予算" eyebrow="TARGETS & BUDGET" />

      {successMessage && (
        <p className="mb-4 rounded-control bg-success-tint px-3 py-2 text-xs text-success">{successMessage}</p>
      )}

      <Panel className="mb-4">
        <div className="flex flex-wrap items-end gap-6">
          <form action={saveFiscalYearStartMonth} className="flex items-end gap-2">
            <input type="hidden" name="clientId" value={clientId} />
            <input type="hidden" name="tab" value={tab} />
            <FormRow label="事業年度の開始月" className="mb-0">
              <select name="fiscalYearStartMonth" defaultValue={fiscalStartMonth}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {m}月始まり
                  </option>
                ))}
              </select>
            </FormRow>
            <Button type="submit" variant="default">
              変更
            </Button>
          </form>

          <form method="get" className="flex items-end gap-2">
            <input type="hidden" name="tab" value={tab} />
            <input type="hidden" name="locationId" value={locationId ?? ""} />
            <FormRow label="年度" className="mb-0">
              <select name="year" defaultValue={baseYear}>
                {Array.from({ length: 5 }, (_, i) => baseYear - 2 + i).map((y) => (
                  <option key={y} value={y}>
                    {y}年度（{months[0]?.label}〜{months[11]?.label}）
                  </option>
                ))}
              </select>
            </FormRow>
            <Button type="submit" variant="default">
              表示
            </Button>
          </form>
        </div>
      </Panel>

      <div className="mb-0 flex gap-1 border-b border-gray-300">
        {(
          [
            { key: "channel", label: "チャネル別計画" },
            { key: "company", label: "会社全体KPI" },
            { key: "actual", label: "年間予実" },
          ] as const
        ).map((t) => (
          <Link
            key={t.key}
            href={baseQuery({ tab: t.key })}
            className={`rounded-t-control border border-b-0 px-4 py-2 text-sm font-semibold ${
              tab === t.key ? "border-gray-300 bg-white text-navy" : "border-transparent text-gray-500 hover:text-navy"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "channel" && (
        <ChannelPlanTab
          clientId={clientId}
          fiscalStartMonth={fiscalStartMonth}
          baseYear={baseYear}
          months={months}
          locationOptions={locationOptions}
          locationId={locationId}
          channels={channels}
          campaignTargets={allCampaignTargets}
        />
      )}

      {tab === "company" && (
        <CompanyKpiTab
          clientId={clientId}
          fiscalStartMonth={fiscalStartMonth}
          baseYear={baseYear}
          months={months}
          targets={allTargets}
          campaignTargets={allCampaignTargets}
        />
      )}

      {tab === "actual" && (
        <AnnualActualTab
          months={months}
          locationOptions={locationOptions}
          locationId={locationId}
          channels={channelsAsDbRows}
          campaignTargets={allCampaignTargets}
          targets={allTargets}
          campaignRows={campaignRows}
          funnelRows={funnelRows}
        />
      )}
    </>
  );
}

// ============================================================
// チャネル別計画タブ
// ============================================================

function ChannelPlanTab({
  clientId,
  fiscalStartMonth,
  baseYear,
  months,
  locationOptions,
  locationId,
  channels,
  campaignTargets,
}: {
  clientId: string;
  fiscalStartMonth: number;
  baseYear: number;
  months: MonthColumn[];
  locationOptions: { id: string; name: string }[];
  locationId: string | null;
  channels: { id: string; name: string; method: "manual" | "api" }[];
  campaignTargets: CampaignTargetDbRow[];
}) {
  const scoped = campaignTargets.filter((r) => r.location_id === locationId);
  const byKey = new Map(scoped.map((r) => [`${r.channel_id}_${r.period_start}`, r]));

  const totalLeadsByMonth = months.map((m) =>
    channels.reduce((s, ch) => s + (byKey.get(`${ch.id}_${m.periodStart}`)?.target_leads ?? 0), 0),
  );
  const totalBudgetByMonth = months.map((m) =>
    channels.reduce((s, ch) => s + (byKey.get(`${ch.id}_${m.periodStart}`)?.budget_amount ?? 0), 0),
  );
  const totalLeadsAnnual = totalLeadsByMonth.reduce((a, b) => a + b, 0);
  const totalBudgetAnnual = totalBudgetByMonth.reduce((a, b) => a + b, 0);

  return (
    <Panel title="チャネル別：反響目標・予算・単価" className="rounded-tl-none">
      <form method="get" className="mb-4 flex flex-wrap items-end gap-4">
        <input type="hidden" name="tab" value="channel" />
        <input type="hidden" name="year" value={baseYear} />
        <FormRow label="拠点" className="mb-0">
          <select name="locationId" defaultValue={locationId ?? ""}>
            {locationOptions.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </FormRow>
        <Button type="submit" variant="default">
          表示
        </Button>
        <p className="max-w-[520px] pb-1.5 text-xs text-gray-500">
          「目標（反響件数）」「予算（円）」を入力すると、単価に予算÷目標の想定CPLが表示されます（どちらか未入力・0件の場合は「-」）。会社全体タブの合計反響数は、ここで入力した全拠点分の合算です。
        </p>
      </form>

      {channels.length === 0 ? (
        <p className="text-sm text-gray-500">このクライアントに有効な広告施策がありません。</p>
      ) : (
        <form action={saveChannelPlan}>
          <input type="hidden" name="clientId" value={clientId} />
          <input type="hidden" name="locationId" value={locationId ?? ""} />
          <input type="hidden" name="fiscalStartMonth" value={fiscalStartMonth} />
          <input type="hidden" name="baseYear" value={baseYear} />

          <div className="overflow-x-auto rounded-panel border border-gray-300">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr>
                  <GridHeaderCell sticky>施策</GridHeaderCell>
                  <th className="w-[96px] whitespace-nowrap border-b-2 border-navy bg-gray-050 px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-700">
                    指標
                  </th>
                  {months.map((m) => (
                    <GridHeaderCell key={m.key} align="right">
                      {m.label}
                    </GridHeaderCell>
                  ))}
                  <GridHeaderCell align="right">年間合計</GridHeaderCell>
                </tr>
              </thead>
              <tbody>
                <Fragment>
                  <tr className="bg-accent-tint/40">
                    <td
                      rowSpan={3}
                      className="sticky left-0 z-10 w-[160px] whitespace-nowrap border-b-2 border-gray-300 bg-accent-tint/40 px-3 py-2 align-top"
                    >
                      <span className="font-semibold text-ink">合計</span>
                      <span className="mt-0.5 block text-[11px] text-gray-500">全チャネルの自動集計</span>
                    </td>
                    <SubLabelCell>目標（件）</SubLabelCell>
                    {totalLeadsByMonth.map((v, i) => (
                      <td key={months[i].key} className="whitespace-nowrap border-b border-gray-300 px-3 py-1.5 text-right font-semibold text-ink">
                        {formatNum(v)}件
                      </td>
                    ))}
                    <td className="whitespace-nowrap border-b border-gray-300 px-3 py-1.5 text-right font-semibold text-navy">
                      {formatNum(totalLeadsAnnual)}件
                    </td>
                  </tr>
                  <tr className="bg-accent-tint/40">
                    <SubLabelCell>予算（円）</SubLabelCell>
                    {totalBudgetByMonth.map((v, i) => (
                      <td key={months[i].key} className="whitespace-nowrap border-b border-gray-300 px-3 py-1.5 text-right font-semibold text-ink">
                        {formatYen(v)}
                      </td>
                    ))}
                    <td className="whitespace-nowrap border-b border-gray-300 px-3 py-1.5 text-right font-semibold text-navy">
                      {formatYen(totalBudgetAnnual)}
                    </td>
                  </tr>
                  <tr className="bg-accent-tint/40">
                    <SubLabelCell border2>単価（円/件）</SubLabelCell>
                    {months.map((m, i) => {
                      const uc = computeUnitCost(totalBudgetByMonth[i], totalLeadsByMonth[i]);
                      return (
                        <td key={m.key} className="whitespace-nowrap border-b-2 border-gray-300 px-3 py-1.5 text-right text-ink">
                          {uc == null ? "-" : formatYen(uc)}
                        </td>
                      );
                    })}
                    <td className="whitespace-nowrap border-b-2 border-gray-300 px-3 py-1.5 text-right font-semibold text-accent">
                      {computeUnitCost(totalBudgetAnnual, totalLeadsAnnual) == null
                        ? "-"
                        : formatYen(computeUnitCost(totalBudgetAnnual, totalLeadsAnnual)!)}
                    </td>
                  </tr>
                </Fragment>

                {channels.map((channel) => {
                  const leadsRow = months.map((m) => byKey.get(`${channel.id}_${m.periodStart}`)?.target_leads ?? null);
                  const budgetRow = months.map((m) => byKey.get(`${channel.id}_${m.periodStart}`)?.budget_amount ?? null);
                  const leadsTotal = leadsRow.reduce((s: number, v) => s + (v ?? 0), 0);
                  const budgetTotal = budgetRow.reduce((s: number, v) => s + (v ?? 0), 0);
                  return (
                    <Fragment key={channel.id}>
                      <tr className="hover:bg-gray-050">
                        <td
                          rowSpan={3}
                          className="sticky left-0 z-10 w-[160px] whitespace-nowrap border-b-2 border-gray-300 bg-white px-3 py-2 align-top"
                        >
                          <span className="font-semibold text-ink">{channel.name}</span>
                          <span className="mt-0.5 block text-[11px] text-gray-500">
                            {channel.method === "api" ? "API連携" : "手動"}
                          </span>
                        </td>
                        <SubLabelCell>目標（件）</SubLabelCell>
                        {months.map((m, i) => (
                          <td key={m.key} className="border-b border-gray-300 px-1.5 py-1.5 align-top">
                            <input
                              type="number"
                              min={0}
                              name={`leads_${channel.id}_${m.key}`}
                              defaultValue={leadsRow[i] ?? ""}
                              className="w-[64px] text-right"
                            />
                          </td>
                        ))}
                        <td className="whitespace-nowrap border-b border-gray-300 px-3 py-2 text-right font-semibold text-navy">
                          {formatNum(leadsTotal)}件
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-050">
                        <SubLabelCell>予算（円）</SubLabelCell>
                        {months.map((m, i) => (
                          <td key={m.key} className="border-b border-gray-300 px-1.5 py-1.5 align-top">
                            <input
                              type="number"
                              min={0}
                              name={`budget_${channel.id}_${m.key}`}
                              defaultValue={budgetRow[i] ?? ""}
                              className="w-[76px] text-right"
                            />
                          </td>
                        ))}
                        <td className="whitespace-nowrap border-b border-gray-300 px-3 py-2 text-right font-semibold text-navy">
                          {formatYen(budgetTotal)}
                        </td>
                      </tr>
                      <tr className="bg-gray-050/70">
                        <SubLabelCell border2>単価（円/件）</SubLabelCell>
                        {months.map((m, i) => {
                          const uc = computeUnitCost(budgetRow[i] ?? 0, leadsRow[i] ?? 0);
                          return (
                            <td key={m.key} className="whitespace-nowrap border-b-2 border-gray-300 px-3 py-1.5 text-right text-gray-700">
                              {uc == null ? "-" : formatYen(uc)}
                            </td>
                          );
                        })}
                        <td className="whitespace-nowrap border-b-2 border-gray-300 px-3 py-1.5 text-right font-semibold text-accent">
                          {computeUnitCost(budgetTotal, leadsTotal) == null ? "-" : formatYen(computeUnitCost(budgetTotal, leadsTotal)!)}
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mb-4 mt-2 text-xs text-gray-500">空欄で保存すると、その施策・月の目標/予算は未設定に戻ります。</p>
          <Button type="submit" variant="primary">
            保存
          </Button>
        </form>
      )}
    </Panel>
  );
}

// ============================================================
// 会社全体KPIタブ
// ============================================================

function CompanyKpiTab({
  clientId,
  fiscalStartMonth,
  baseYear,
  months,
  targets,
  campaignTargets,
}: {
  clientId: string;
  fiscalStartMonth: number;
  baseYear: number;
  months: MonthColumn[];
  targets: TargetDbRow[];
  campaignTargets: CampaignTargetDbRow[];
}) {
  const companyLeadsTotals = months.map((m) => sumCampaignTargetLeads(campaignTargets, monthRange(m.key)) ?? 0);

  return (
    <Panel title="会社全体KPI（年間一括）" className="rounded-tl-none">
      <p className="mb-3 text-xs text-gray-700">
        来場予約数・来場数・契約数は施策チャネルに紐づかないデータのため、引き続き会社全体のみで入力します（spec §4.4）。合計反響数は「チャネル別計画」タブで入力した値の自動集計（読み取り専用）です。
      </p>

      <form action={saveCompanyKpiGrid}>
        <input type="hidden" name="clientId" value={clientId} />
        <input type="hidden" name="fiscalStartMonth" value={fiscalStartMonth} />
        <input type="hidden" name="baseYear" value={baseYear} />

        <div className="overflow-x-auto rounded-panel border border-gray-300">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr>
                <GridHeaderCell sticky>項目</GridHeaderCell>
                {months.map((m) => (
                  <GridHeaderCell key={m.key} align="right">
                    {m.label}
                  </GridHeaderCell>
                ))}
                <GridHeaderCell align="right">年間合計</GridHeaderCell>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-accent-tint/40">
                <td className="sticky left-0 z-10 w-[160px] whitespace-nowrap border-b border-gray-300 bg-accent-tint/40 px-3 py-2 align-top">
                  <span className="font-semibold text-ink">合計反響数</span>
                  <span className="mt-0.5 block text-[11px] text-gray-500">チャネル別目標の自動集計</span>
                </td>
                {companyLeadsTotals.map((v, i) => (
                  <td key={months[i].key} className="whitespace-nowrap border-b border-gray-300 px-3 py-2 text-right text-gray-700">
                    {formatNum(v)}件
                  </td>
                ))}
                <td className="whitespace-nowrap border-b border-gray-300 px-3 py-2 text-right font-semibold text-navy">
                  {formatNum(companyLeadsTotals.reduce((a, b) => a + b, 0))}件
                </td>
              </tr>

              {KPI_LABELS.map(({ kpiKey, label }) => {
                const rowValues = months.map(
                  (m) => targets.find((t) => t.kpi_key === kpiKey && t.period_start === m.periodStart)?.target_value ?? null,
                );
                const rowTotal = rowValues.reduce((s: number, v) => s + (v ?? 0), 0);
                return (
                  <tr key={kpiKey} className="hover:bg-gray-050">
                    <td className="sticky left-0 z-10 w-[160px] whitespace-nowrap border-b border-gray-300 bg-white px-3 py-2 align-top">
                      <span className="font-semibold text-ink">{label}</span>
                    </td>
                    {months.map((m, i) => (
                      <td key={m.key} className="border-b border-gray-300 px-1.5 py-1.5 align-top">
                        <input
                          type="number"
                          min={0}
                          name={`kpi_${kpiKey}_${m.key}`}
                          defaultValue={rowValues[i] ?? ""}
                          className="w-[80px] text-right"
                        />
                      </td>
                    ))}
                    <td className="whitespace-nowrap border-b border-gray-300 px-3 py-2 text-right font-semibold text-navy">
                      {formatNum(rowTotal)}件
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mb-4 mt-2 text-xs text-gray-500">空欄で保存すると、その項目・月の目標は未設定に戻ります。</p>
        <Button type="submit" variant="primary">
          保存
        </Button>
      </form>
    </Panel>
  );
}

// ============================================================
// 年間予実タブ（読み取り専用、§2-7）
// ============================================================

function AnnualActualTab({
  months,
  locationOptions,
  locationId,
  channels,
  campaignTargets,
  targets,
  campaignRows,
  funnelRows,
}: {
  months: MonthColumn[];
  locationOptions: { id: string; name: string }[];
  locationId: string | null;
  channels: ChannelDbRow[];
  campaignTargets: CampaignTargetDbRow[];
  targets: TargetDbRow[];
  campaignRows: CampaignMetricDbRow[];
  funnelRows: FunnelMetricDbRow[];
}) {
  const companyFunnelByMonth = months.map((m) => buildFunnelStages(campaignRows, funnelRows, monthRange(m.key)));
  const companyLeadsTargetByMonth = months.map((m) => sumCampaignTargetLeads(campaignTargets, monthRange(m.key)) ?? 0);
  const companyLeadsActualByMonth = months.map((m) => {
    const breakdown = buildChannelBreakdown(campaignRows, channels, monthRange(m.key));
    return breakdown.length === 0 ? null : breakdown.reduce((s, r) => s + r.leads, 0);
  });

  const scopedCampaignRows = campaignRows.filter((r) => r.location_id === locationId);
  const scopedTargets = campaignTargets.filter((r) => r.location_id === locationId);
  const targetByKey = new Map(scopedTargets.map((r) => [`${r.channel_id}_${r.period_start}`, r]));

  const perChannel = channels.map((channel) => {
    const leadsTarget = months.map((m) => targetByKey.get(`${channel.id}_${m.periodStart}`)?.target_leads ?? 0);
    const budgetTarget = months.map((m) => targetByKey.get(`${channel.id}_${m.periodStart}`)?.budget_amount ?? 0);
    const leadsActual: (number | null)[] = [];
    const costActual: (number | null)[] = [];
    for (const m of months) {
      const breakdown = buildChannelBreakdown(scopedCampaignRows, [channel], monthRange(m.key));
      leadsActual.push(breakdown[0]?.leads ?? null);
      costActual.push(breakdown[0]?.cost ?? null);
    }
    return { channel, leadsTarget, budgetTarget, leadsActual, costActual };
  });

  const totalLeadsTargetByMonth = months.map((_, i) => perChannel.reduce((s, c) => s + c.leadsTarget[i], 0));
  const totalLeadsActualByMonth = months.map((_, i) => sumOrNull(perChannel.map((c) => c.leadsActual[i])));
  const totalBudgetTargetByMonth = months.map((_, i) => perChannel.reduce((s, c) => s + c.budgetTarget[i], 0));
  const totalCostActualByMonth = months.map((_, i) => sumOrNull(perChannel.map((c) => c.costActual[i])));

  return (
    <Panel title="年間予実（目標×実績）" className="rounded-tl-none">
      <p className="mb-4 max-w-[680px] text-xs text-gray-700">
        上段に薄字で目標、下段に太字で実績を表示し、達成していれば緑、未達（費用・単価は超過）であれば赤で強調します。読み取り専用です。
      </p>

      <div className="mb-6">
        <div className="font-archivo mb-2 inline-block border-b-2 border-accent pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
          会社全体KPI
        </div>
        <ComparisonGrid
          months={months}
          rows={[
            {
              label: "合計反響数",
              sub: "チャネル別の目標・実績を自動集計（広告施策のみ）",
              goodDirection: "higher",
              targets: companyLeadsTargetByMonth,
              actuals: companyLeadsActualByMonth,
              formatter: (n) => `${formatNum(n)}件`,
            },
            {
              label: "来場予約数",
              goodDirection: "higher",
              targets: months.map((m) => targets.find((t) => t.kpi_key === "visit_reservations" && t.period_start === m.periodStart)?.target_value ?? 0),
              actuals: companyFunnelByMonth.map((s) => s.visitReservations),
              formatter: (n) => `${formatNum(n)}件`,
            },
            {
              label: "来場数",
              goodDirection: "higher",
              targets: months.map((m) => targets.find((t) => t.kpi_key === "visits" && t.period_start === m.periodStart)?.target_value ?? 0),
              actuals: companyFunnelByMonth.map((s) => s.visits),
              formatter: (n) => `${formatNum(n)}件`,
            },
            {
              label: "契約数",
              goodDirection: "higher",
              targets: months.map((m) => targets.find((t) => t.kpi_key === "contracts" && t.period_start === m.periodStart)?.target_value ?? 0),
              actuals: companyFunnelByMonth.map((s) => s.contracts),
              formatter: (n) => `${formatNum(n)}件`,
            },
          ]}
        />
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="font-archivo inline-block border-b-2 border-accent pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
            チャネル別（拠点：{locationOptions.find((l) => l.id === (locationId ?? ""))?.name ?? "全社共通"}）
          </div>
          <form method="get" className="flex items-end gap-2">
            <input type="hidden" name="tab" value="actual" />
            <select name="locationId" defaultValue={locationId ?? ""}>
              {locationOptions.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            <Button type="submit" variant="default">
              表示
            </Button>
          </form>
        </div>

        <div className="overflow-x-auto rounded-panel border border-gray-300">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr>
                <GridHeaderCell>施策</GridHeaderCell>
                <th className="w-[96px] whitespace-nowrap border-b-2 border-navy bg-gray-050 px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-700">
                  指標
                </th>
                {months.map((m) => (
                  <GridHeaderCell key={m.key} align="right">
                    {m.label}
                  </GridHeaderCell>
                ))}
                <GridHeaderCell align="right">年間合計</GridHeaderCell>
              </tr>
            </thead>
            <tbody>
              <ChannelActualRowGroup
                months={months}
                label="合計"
                sub="全チャネルの自動集計"
                leadsTarget={totalLeadsTargetByMonth}
                leadsActual={totalLeadsActualByMonth}
                budgetTarget={totalBudgetTargetByMonth}
                costActual={totalCostActualByMonth}
                highlight
              />
              {perChannel.map(({ channel, leadsTarget, leadsActual, budgetTarget, costActual }) => (
                <ChannelActualRowGroup
                  key={channel.id}
                  months={months}
                  label={channel.name}
                  leadsTarget={leadsTarget}
                  leadsActual={leadsActual}
                  budgetTarget={budgetTarget}
                  costActual={costActual}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Panel>
  );
}

function ChannelActualRowGroup({
  months,
  label,
  sub,
  leadsTarget,
  leadsActual,
  budgetTarget,
  costActual,
  highlight = false,
}: {
  months: MonthColumn[];
  label: string;
  sub?: string;
  leadsTarget: number[];
  leadsActual: (number | null)[];
  budgetTarget: number[];
  costActual: (number | null)[];
  highlight?: boolean;
}) {
  const leadsTargetTotal = leadsTarget.reduce((a, b) => a + b, 0);
  const leadsActualTotal = sumOrNull(leadsActual);
  const budgetTargetTotal = budgetTarget.reduce((a, b) => a + b, 0);
  const costActualTotal = sumOrNull(costActual);
  const cplTarget = months.map((_, i) => computeUnitCost(budgetTarget[i], leadsTarget[i]));
  const cplActual = months.map((_, i) => (costActual[i] != null && leadsActual[i] != null ? computeUnitCost(costActual[i]!, leadsActual[i]!) : null));
  const cplTargetTotal = computeUnitCost(budgetTargetTotal, leadsTargetTotal);
  const cplActualTotal = costActualTotal != null && leadsActualTotal != null ? computeUnitCost(costActualTotal, leadsActualTotal) : null;
  const rowBg = highlight ? "bg-accent-tint/40" : "hover:bg-gray-050";
  const labelBg = highlight ? "bg-accent-tint/40" : "bg-white";

  return (
    <Fragment>
      <tr className={rowBg}>
        <td
          rowSpan={3}
          className={`sticky left-0 z-10 w-[160px] whitespace-nowrap border-b-2 border-gray-300 ${labelBg} px-3 py-2 align-top`}
        >
          <span className="font-semibold text-ink">{label}</span>
          {sub && <span className="mt-0.5 block text-[11px] text-gray-500">{sub}</span>}
        </td>
        <SubLabelCell bg={labelBg}>反響数（件）</SubLabelCell>
        {months.map((m, i) => (
          <ComparisonCell key={m.key} target={leadsTarget[i]} actual={leadsActual[i]} goodDirection="higher" formatter={(n) => `${formatNum(n)}件`} />
        ))}
        <ComparisonCell target={leadsTargetTotal} actual={leadsActualTotal} goodDirection="higher" formatter={(n) => `${formatNum(n)}件`} />
      </tr>
      <tr className={rowBg}>
        <SubLabelCell bg={labelBg}>予算/実績費用</SubLabelCell>
        {months.map((m, i) => (
          <ComparisonCell key={m.key} target={budgetTarget[i]} actual={costActual[i]} goodDirection="lower" formatter={formatYen} />
        ))}
        <ComparisonCell target={budgetTargetTotal} actual={costActualTotal} goodDirection="lower" formatter={formatYen} />
      </tr>
      <tr className={rowBg}>
        <SubLabelCell bg={labelBg} border2>
          単価（円/件）
        </SubLabelCell>
        {months.map((m, i) => (
          <ComparisonCell key={m.key} target={cplTarget[i]} actual={cplActual[i]} goodDirection="lower" formatter={formatYen} />
        ))}
        <ComparisonCell target={cplTargetTotal} actual={cplActualTotal} goodDirection="lower" formatter={formatYen} />
      </tr>
    </Fragment>
  );
}

function ComparisonGrid({
  months,
  rows,
}: {
  months: MonthColumn[];
  rows: {
    label: string;
    sub?: string;
    goodDirection: "higher" | "lower";
    targets: number[];
    actuals: (number | null)[];
    formatter: (n: number) => string;
  }[];
}) {
  return (
    <div className="overflow-x-auto rounded-panel border border-gray-300">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr>
            <GridHeaderCell>項目</GridHeaderCell>
            {months.map((m) => (
              <GridHeaderCell key={m.key} align="right">
                {m.label}
              </GridHeaderCell>
            ))}
            <GridHeaderCell align="right">年間合計</GridHeaderCell>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const targetTotal = row.targets.reduce((a, b) => a + b, 0);
            const actualTotal = sumOrNull(row.actuals);
            return (
              <tr key={row.label} className="hover:bg-gray-050">
                <td className="sticky left-0 z-10 w-[160px] whitespace-nowrap border-b border-gray-300 bg-white px-3 py-2 align-top">
                  <span className="font-semibold text-ink">{row.label}</span>
                  {row.sub && <span className="mt-0.5 block text-[11px] text-gray-500">{row.sub}</span>}
                </td>
                {months.map((m, i) => (
                  <ComparisonCell key={m.key} target={row.targets[i]} actual={row.actuals[i]} goodDirection={row.goodDirection} formatter={row.formatter} />
                ))}
                <ComparisonCell target={targetTotal} actual={actualTotal} goodDirection={row.goodDirection} formatter={row.formatter} />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ComparisonCell({
  target,
  actual,
  goodDirection,
  formatter,
}: {
  target: number | null;
  actual: number | null;
  goodDirection: "higher" | "lower";
  formatter: (n: number) => string;
}) {
  let colorClass = "text-ink";
  if (target != null && actual != null && target !== 0) {
    const achieved = goodDirection === "higher" ? actual >= target : actual <= target;
    colorClass = achieved ? "text-success" : "text-danger";
  }
  return (
    <td className="whitespace-nowrap border-b border-gray-300 px-2 py-1.5 text-right align-top">
      <div className="text-[10px] text-gray-500">目標 {target == null ? "-" : formatter(target)}</div>
      <div className={`text-sm font-semibold ${colorClass}`}>{actual == null ? "-" : formatter(actual)}</div>
    </td>
  );
}

// ============================================================
// 共通の小さなグリッドセル
// ============================================================

function GridHeaderCell({
  children,
  align = "left",
  sticky = false,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  sticky?: boolean;
}) {
  return (
    <th
      className={`whitespace-nowrap border-b-2 border-navy bg-gray-050 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-700 ${
        align === "right" ? "text-right" : "text-left"
      } ${sticky ? "sticky left-0 z-10 w-[160px]" : ""}`}
    >
      {children}
    </th>
  );
}

function SubLabelCell({ children, bg = "bg-white", border2 = false }: { children: React.ReactNode; bg?: string; border2?: boolean }) {
  return (
    <td
      className={`w-[96px] whitespace-nowrap ${border2 ? "border-b-2" : "border-b"} border-gray-300 ${bg} px-2 py-1.5 text-[11px] text-gray-500`}
    >
      {children}
    </td>
  );
}
