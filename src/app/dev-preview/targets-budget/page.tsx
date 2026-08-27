"use client";

// improvement.md §4-1・§9-1・§9-2 で提案した「目標・予算の年間グリッド入力」の見た目だけを
// 確認するためのモック。DB接続・保存は行わない（他のdev-previewページと同じ位置づけ）。
// 2026-08-27ユーザー確認：反響数はチャネル別に一本化し（合計反響数は自動集計の読み取り専用に）、
// 予算 ÷ チャネル別反響数目標 で「単価（想定CPL）」を自動算出する。来場予約数・来場数・契約数は
// funnel_metricsにチャネルの紐付けが無いため、引き続き会社全体のみの入力欄として残す。

import { Fragment, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { formatNum, formatYen } from "@/lib/metrics/adMetrics";
import { KPI_LABELS } from "@/lib/targets/kpiLabels";
import { MOCK_LOCATIONS, getChannelsForClient } from "@/lib/mock/data";

const NAV_ITEMS = [
  { href: "/dev-preview", label: "共通コンポーネント確認" },
  { href: "/dev-preview/targets-budget", label: "目標・予算（モック）" },
];

const MOCK_CLIENT_ID = "1";
const GRID_YEAR_BASE = 2026;
const ALL_LOCATIONS_KEY = "__all__";

interface MonthColumn {
  key: string;
  label: string;
}

interface GridRow {
  key: string;
  label: string;
  sub?: string;
}

function buildMonths(startMonth: number): MonthColumn[] {
  return Array.from({ length: 12 }, (_, i) => {
    const month = ((startMonth - 1 + i) % 12) + 1;
    const year = GRID_YEAR_BASE + Math.floor((startMonth - 1 + i) / 12);
    return { key: `${year}-${String(month).padStart(2, "0")}`, label: `${String(year).slice(2)}/${month}` };
  });
}

function emptyRow(len: number): string[] {
  return Array.from({ length: len }, () => "");
}

function parseNum(v: string | undefined): number {
  const n = Number(v);
  return !v || v.trim() === "" || Number.isNaN(n) ? 0 : n;
}

/** 予算 ÷ 反響数目標。どちらかが0/未入力の場合は算出不可として null（spec §4.2のCPL算出ルールに揃える） */
function computeUnitCost(budget: number, leads: number): number | null {
  if (!budget || !leads) return null;
  return budget / leads;
}

// 会社全体のみで管理するKPI（反響数はチャネル別目標の合算に置き換わるため対象外、2026-08-27方針）
const COMPANY_KPI_LABELS = KPI_LABELS.filter((k) => k.kpiKey !== "leads_total");

// KPIの初期ダミー値（住宅展示場は春・秋に反響が伸びやすい、という季節性のイメージで手入力した例）
const COMPANY_KPI_SEED: Record<string, string[]> = {
  visit_reservations: ["38", "48", "52", "34", "30", "32", "34", "36", "38", "42", "45", "56"],
  visits: ["31", "39", "42", "28", "24", "26", "28", "29", "31", "34", "37", "45"],
  contracts: ["4", "6", "6", "4", "3", "3", "4", "4", "5", "5", "5", "7"],
};

// チャネル別反響数目標の初期ダミー値（全社共通スコープにサンプルを入れておく）
const CHANNEL_LEADS_SEED: Record<string, Record<string, string[]>> = {
  [ALL_LOCATIONS_KEY]: {
    ch_google: ["40", "55", "60", "35", "30", "32", "34", "36", "38", "44", "50", "62"],
    ch_yahoo: ["15", "18", "20", "12", "10", "11", "12", "13", "14", "16", "18", "22"],
    ch_meta: ["20", "28", "30", "18", "15", "16", "17", "18", "20", "24", "26", "32"],
  },
};
const CHANNEL_BUDGET_SEED: Record<string, Record<string, string[]>> = {
  [ALL_LOCATIONS_KEY]: {
    ch_google: ["300000", "400000", "420000", "250000", "220000", "230000", "240000", "250000", "260000", "300000", "350000", "430000"],
    ch_yahoo: ["100000", "120000", "130000", "80000", "70000", "75000", "80000", "85000", "90000", "100000", "110000", "140000"],
    ch_meta: ["150000", "200000", "210000", "130000", "110000", "115000", "120000", "125000", "140000", "170000", "180000", "220000"],
  },
};

// §2-7「年間予実」タブ用の実績ダミーデータ（全社共通スコープのみ用意。他拠点は実績「-」になる）。
const COMPANY_ACTUAL_SEED: Record<string, number[]> = {
  visit_reservations: [35, 50, 49, 36, 28, 33, 31, 38, 40, 41, 47, 53],
  visits: [29, 41, 40, 30, 22, 27, 26, 31, 29, 36, 39, 42],
  contracts: [3, 6, 5, 5, 3, 2, 4, 5, 4, 6, 5, 6],
};
const CHANNEL_LEADS_ACTUAL_SEED: Record<string, Record<string, number[]>> = {
  [ALL_LOCATIONS_KEY]: {
    ch_google: [37, 58, 57, 38, 28, 30, 36, 34, 41, 46, 48, 65],
    ch_yahoo: [14, 19, 18, 13, 9, 12, 11, 14, 13, 17, 19, 20],
    ch_meta: [22, 26, 32, 17, 16, 15, 19, 17, 22, 23, 28, 30],
  },
};
const CHANNEL_COST_ACTUAL_SEED: Record<string, Record<string, number[]>> = {
  [ALL_LOCATIONS_KEY]: {
    ch_google: [310000, 390000, 440000, 240000, 225000, 228000, 250000, 245000, 270000, 305000, 345000, 445000],
    ch_yahoo: [95000, 125000, 128000, 82000, 68000, 77000, 78000, 88000, 89000, 105000, 112000, 135000],
    ch_meta: [160000, 195000, 215000, 125000, 115000, 118000, 119000, 128000, 145000, 165000, 185000, 210000],
  },
};

/** 配列が全てnull（実績データなし）ならnull、それ以外はnullを0扱いして合算する */
function sumOrNull(arr: (number | null)[]): number | null {
  if (arr.every((v) => v == null)) return null;
  return arr.reduce((s: number, v) => s + (v ?? 0), 0);
}

function AnnualGrid({
  months,
  rows,
  values,
  onChange,
  formatTotal,
  readonlyRows = [],
}: {
  months: MonthColumn[];
  rows: GridRow[];
  values: Record<string, string[]>;
  onChange: (rowKey: string, monthIndex: number, value: string) => void;
  formatTotal: (n: number) => string;
  readonlyRows?: { key: string; label: string; sub?: string; monthlyValues: number[] }[];
}) {
  return (
    <div className="overflow-x-auto rounded-panel border border-gray-300">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-[160px] whitespace-nowrap border-b-2 border-navy bg-gray-050 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-700">
              項目
            </th>
            {months.map((m) => (
              <th
                key={m.key}
                className="whitespace-nowrap border-b-2 border-navy bg-gray-050 px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-700"
              >
                {m.label}
              </th>
            ))}
            <th className="whitespace-nowrap border-b-2 border-navy bg-gray-050 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-700">
              年間合計
            </th>
          </tr>
        </thead>
        <tbody>
          {readonlyRows.map((row) => {
            const total = row.monthlyValues.reduce((a, b) => a + b, 0);
            return (
              <tr key={row.key} className="bg-accent-tint/40">
                <td className="sticky left-0 z-10 w-[160px] whitespace-nowrap border-b border-gray-300 bg-accent-tint/40 px-3 py-2 align-top">
                  <span className="font-semibold text-ink">{row.label}</span>
                  {row.sub && <span className="mt-0.5 block text-[11px] text-gray-500">{row.sub}</span>}
                </td>
                {row.monthlyValues.map((v, mi) => (
                  <td key={months[mi].key} className="whitespace-nowrap border-b border-gray-300 px-3 py-2 text-right text-gray-700">
                    {formatTotal(v)}
                  </td>
                ))}
                <td className="whitespace-nowrap border-b border-gray-300 px-3 py-2 text-right font-semibold text-navy">
                  {formatTotal(total)}
                </td>
              </tr>
            );
          })}
          {rows.map((row) => {
            const rowValues = values[row.key] ?? emptyRow(months.length);
            const rowTotal = rowValues.reduce((s, v) => s + parseNum(v), 0);
            return (
              <tr key={row.key} className="hover:bg-gray-050">
                <td className="sticky left-0 z-10 w-[160px] whitespace-nowrap border-b border-gray-300 bg-white px-3 py-2 align-top">
                  <span className="font-semibold text-ink">{row.label}</span>
                  {row.sub && <span className="mt-0.5 block text-[11px] text-gray-500">{row.sub}</span>}
                </td>
                {months.map((m, mi) => (
                  <td key={m.key} className="border-b border-gray-300 px-1.5 py-1.5 align-top">
                    <input
                      type="number"
                      min={0}
                      value={rowValues[mi] ?? ""}
                      onChange={(e) => onChange(row.key, mi, e.target.value)}
                      className="w-[80px] text-right"
                    />
                  </td>
                ))}
                <td className="whitespace-nowrap border-b border-gray-300 px-3 py-2 text-right font-semibold text-navy">
                  {formatTotal(rowTotal)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * チャネル別計画グリッド：1施策につき「目標(件)」「予算(円)」「単価(円/件、自動算出・読み取り専用)」の
 * 3行を1セットで表示する。単価は 予算 ÷ 目標 で、どちらかが0/未入力なら「-」（spec §4.2のCPL算出と同じ考え方）。
 */
function ChannelPlanGrid({
  months,
  channels,
  leadsValues,
  budgetValues,
  onLeadsChange,
  onBudgetChange,
}: {
  months: MonthColumn[];
  channels: GridRow[];
  leadsValues: Record<string, string[]>;
  budgetValues: Record<string, string[]>;
  onLeadsChange: (channelId: string, monthIndex: number, value: string) => void;
  onBudgetChange: (channelId: string, monthIndex: number, value: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-panel border border-gray-300">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-[160px] whitespace-nowrap border-b-2 border-navy bg-gray-050 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-700">
              施策
            </th>
            <th className="w-[96px] whitespace-nowrap border-b-2 border-navy bg-gray-050 px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-700">
              指標
            </th>
            {months.map((m) => (
              <th
                key={m.key}
                className="whitespace-nowrap border-b-2 border-navy bg-gray-050 px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-700"
              >
                {m.label}
              </th>
            ))}
            <th className="whitespace-nowrap border-b-2 border-navy bg-gray-050 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-700">
              年間合計
            </th>
          </tr>
        </thead>
        <tbody>
          {(() => {
            const totalLeadsByMonth = months.map((_, mi) =>
              channels.reduce((s, ch) => s + parseNum((leadsValues[ch.key] ?? emptyRow(months.length))[mi]), 0),
            );
            const totalBudgetByMonth = months.map((_, mi) =>
              channels.reduce((s, ch) => s + parseNum((budgetValues[ch.key] ?? emptyRow(months.length))[mi]), 0),
            );
            const totalLeadsAnnual = totalLeadsByMonth.reduce((a, b) => a + b, 0);
            const totalBudgetAnnual = totalBudgetByMonth.reduce((a, b) => a + b, 0);
            const totalUnitCostAnnual = computeUnitCost(totalBudgetAnnual, totalLeadsAnnual);

            return (
              <Fragment key="__total__">
                <tr className="bg-accent-tint/40">
                  <td rowSpan={3} className="sticky left-0 z-10 w-[160px] whitespace-nowrap border-b-2 border-gray-300 bg-accent-tint/40 px-3 py-2 align-top">
                    <span className="font-semibold text-ink">合計</span>
                    <span className="mt-0.5 block text-[11px] text-gray-500">全チャネルの自動集計</span>
                  </td>
                  <td className="w-[96px] whitespace-nowrap border-b border-gray-300 bg-accent-tint/40 px-2 py-1.5 text-[11px] text-gray-500">
                    目標（件）
                  </td>
                  {totalLeadsByMonth.map((v, mi) => (
                    <td key={months[mi].key} className="whitespace-nowrap border-b border-gray-300 px-3 py-1.5 text-right font-semibold text-ink">
                      {formatNum(v)}件
                    </td>
                  ))}
                  <td className="whitespace-nowrap border-b border-gray-300 px-3 py-1.5 text-right font-semibold text-navy">
                    {formatNum(totalLeadsAnnual)}件
                  </td>
                </tr>
                <tr className="bg-accent-tint/40">
                  <td className="w-[96px] whitespace-nowrap border-b border-gray-300 bg-accent-tint/40 px-2 py-1.5 text-[11px] text-gray-500">
                    予算（円）
                  </td>
                  {totalBudgetByMonth.map((v, mi) => (
                    <td key={months[mi].key} className="whitespace-nowrap border-b border-gray-300 px-3 py-1.5 text-right font-semibold text-ink">
                      {formatYen(v)}
                    </td>
                  ))}
                  <td className="whitespace-nowrap border-b border-gray-300 px-3 py-1.5 text-right font-semibold text-navy">
                    {formatYen(totalBudgetAnnual)}
                  </td>
                </tr>
                <tr className="bg-accent-tint/40">
                  <td className="w-[96px] whitespace-nowrap border-b-2 border-gray-300 bg-accent-tint/40 px-2 py-1.5 text-[11px] text-gray-500">
                    単価（円/件）
                  </td>
                  {months.map((m, mi) => {
                    const uc = computeUnitCost(totalBudgetByMonth[mi], totalLeadsByMonth[mi]);
                    return (
                      <td key={m.key} className="whitespace-nowrap border-b-2 border-gray-300 px-3 py-1.5 text-right text-ink">
                        {uc == null ? "-" : formatYen(uc)}
                      </td>
                    );
                  })}
                  <td className="whitespace-nowrap border-b-2 border-gray-300 px-3 py-1.5 text-right font-semibold text-accent">
                    {totalUnitCostAnnual == null ? "-" : formatYen(totalUnitCostAnnual)}
                  </td>
                </tr>
              </Fragment>
            );
          })()}
          {channels.map((channel) => {
            const leadsRow = leadsValues[channel.key] ?? emptyRow(months.length);
            const budgetRow = budgetValues[channel.key] ?? emptyRow(months.length);
            const leadsTotal = leadsRow.reduce((s, v) => s + parseNum(v), 0);
            const budgetTotal = budgetRow.reduce((s, v) => s + parseNum(v), 0);
            const unitCostTotal = computeUnitCost(budgetTotal, leadsTotal);

            return (
              <Fragment key={channel.key}>
                <tr className="hover:bg-gray-050">
                  <td
                    rowSpan={3}
                    className="sticky left-0 z-10 w-[160px] whitespace-nowrap border-b-2 border-gray-300 bg-white px-3 py-2 align-top"
                  >
                    <span className="font-semibold text-ink">{channel.label}</span>
                    {channel.sub && <span className="mt-0.5 block text-[11px] text-gray-500">{channel.sub}</span>}
                  </td>
                  <td className="w-[96px] whitespace-nowrap border-b border-gray-300 bg-white px-2 py-1.5 text-[11px] text-gray-500">
                    目標（件）
                  </td>
                  {months.map((m, mi) => (
                    <td key={m.key} className="border-b border-gray-300 px-1.5 py-1.5 align-top">
                      <input
                        type="number"
                        min={0}
                        value={leadsRow[mi] ?? ""}
                        onChange={(e) => onLeadsChange(channel.key, mi, e.target.value)}
                        className="w-[64px] text-right"
                      />
                    </td>
                  ))}
                  <td className="whitespace-nowrap border-b border-gray-300 px-3 py-2 text-right font-semibold text-navy">
                    {formatNum(leadsTotal)}件
                  </td>
                </tr>
                <tr className="hover:bg-gray-050">
                  <td className="w-[96px] whitespace-nowrap border-b border-gray-300 bg-white px-2 py-1.5 text-[11px] text-gray-500">
                    予算（円）
                  </td>
                  {months.map((m, mi) => (
                    <td key={m.key} className="border-b border-gray-300 px-1.5 py-1.5 align-top">
                      <input
                        type="number"
                        min={0}
                        value={budgetRow[mi] ?? ""}
                        onChange={(e) => onBudgetChange(channel.key, mi, e.target.value)}
                        className="w-[76px] text-right"
                      />
                    </td>
                  ))}
                  <td className="whitespace-nowrap border-b border-gray-300 px-3 py-2 text-right font-semibold text-navy">
                    {formatYen(budgetTotal)}
                  </td>
                </tr>
                <tr className="bg-gray-050/70">
                  <td className="w-[96px] whitespace-nowrap border-b-2 border-gray-300 bg-gray-050 px-2 py-1.5 text-[11px] text-gray-500">
                    単価（円/件）
                  </td>
                  {months.map((m, mi) => {
                    const uc = computeUnitCost(parseNum(budgetRow[mi]), parseNum(leadsRow[mi]));
                    return (
                      <td key={m.key} className="whitespace-nowrap border-b-2 border-gray-300 px-3 py-1.5 text-right text-gray-700">
                        {uc == null ? "-" : formatYen(uc)}
                      </td>
                    );
                  })}
                  <td className="whitespace-nowrap border-b-2 border-gray-300 px-3 py-1.5 text-right font-semibold text-accent">
                    {unitCostTotal == null ? "-" : formatYen(unitCostTotal)}
                  </td>
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * 目標(小・グレー)／実績(太字)を縦に並べる比較セル（stacked cellパターン、DESIGN_SYSTEM §5.5）。
 * goodDirection="higher"：実績が目標以上で達成（緑）＝反響数・来場数など。
 * goodDirection="lower"：実績が目標以下で達成（緑）＝費用・単価など（使いすぎ・単価上振れが赤）。
 */
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

interface ActualComparisonRow {
  key: string;
  label: string;
  sub?: string;
  goodDirection: "higher" | "lower";
  targets: number[];
  actuals: (number | null)[];
  formatter: (n: number) => string;
}

/** §2-7「年間予実」：会社全体KPI（合計反響数＋来場予約数・来場数・契約数）の目標×実績比較グリッド */
function CompanyActualGrid({ months, rows }: { months: MonthColumn[]; rows: ActualComparisonRow[] }) {
  return (
    <div className="overflow-x-auto rounded-panel border border-gray-300">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-[160px] whitespace-nowrap border-b-2 border-navy bg-gray-050 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-700">
              項目
            </th>
            {months.map((m) => (
              <th
                key={m.key}
                className="whitespace-nowrap border-b-2 border-navy bg-gray-050 px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-700"
              >
                {m.label}
              </th>
            ))}
            <th className="whitespace-nowrap border-b-2 border-navy bg-gray-050 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-700">
              年間合計
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const targetTotal = row.targets.reduce((a, b) => a + b, 0);
            const actualTotal = sumOrNull(row.actuals);
            return (
              <tr key={row.key} className="hover:bg-gray-050">
                <td className="sticky left-0 z-10 w-[160px] whitespace-nowrap border-b border-gray-300 bg-white px-3 py-2 align-top">
                  <span className="font-semibold text-ink">{row.label}</span>
                  {row.sub && <span className="mt-0.5 block text-[11px] text-gray-500">{row.sub}</span>}
                </td>
                {months.map((m, mi) => (
                  <ComparisonCell
                    key={m.key}
                    target={row.targets[mi] ?? null}
                    actual={row.actuals[mi] ?? null}
                    goodDirection={row.goodDirection}
                    formatter={row.formatter}
                  />
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

/** §2-7「年間予実」：チャネル別の反響数・予算(実績費用)・単価を目標×実績で比較するグリッド */
function ChannelActualGrid({
  months,
  channels,
  leadsTargetByChannel,
  leadsActualByChannel,
  budgetTargetByChannel,
  costActualByChannel,
}: {
  months: MonthColumn[];
  channels: GridRow[];
  leadsTargetByChannel: Record<string, string[]>;
  leadsActualByChannel: Record<string, number[]>;
  budgetTargetByChannel: Record<string, string[]>;
  costActualByChannel: Record<string, number[]>;
}) {
  return (
    <div className="overflow-x-auto rounded-panel border border-gray-300">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-[160px] whitespace-nowrap border-b-2 border-navy bg-gray-050 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-700">
              施策
            </th>
            <th className="w-[96px] whitespace-nowrap border-b-2 border-navy bg-gray-050 px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-700">
              指標
            </th>
            {months.map((m) => (
              <th
                key={m.key}
                className="whitespace-nowrap border-b-2 border-navy bg-gray-050 px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-700"
              >
                {m.label}
              </th>
            ))}
            <th className="whitespace-nowrap border-b-2 border-navy bg-gray-050 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-700">
              年間合計
            </th>
          </tr>
        </thead>
        <tbody>
          {(() => {
            const perChannel = channels.map((channel) => ({
              leadsTarget: (leadsTargetByChannel[channel.key] ?? emptyRow(months.length)).map(parseNum),
              leadsActual: (leadsActualByChannel[channel.key] ?? months.map(() => null)) as (number | null)[],
              budgetTarget: (budgetTargetByChannel[channel.key] ?? emptyRow(months.length)).map(parseNum),
              costActual: (costActualByChannel[channel.key] ?? months.map(() => null)) as (number | null)[],
            }));

            const totalLeadsTargetByMonth = months.map((_, mi) => perChannel.reduce((s, c) => s + c.leadsTarget[mi], 0));
            const totalLeadsActualByMonth = months.map((_, mi) => sumOrNull(perChannel.map((c) => c.leadsActual[mi])));
            const totalBudgetTargetByMonth = months.map((_, mi) => perChannel.reduce((s, c) => s + c.budgetTarget[mi], 0));
            const totalCostActualByMonth = months.map((_, mi) => sumOrNull(perChannel.map((c) => c.costActual[mi])));

            const totalLeadsTargetAnnual = totalLeadsTargetByMonth.reduce((a, b) => a + b, 0);
            const totalLeadsActualAnnual = sumOrNull(totalLeadsActualByMonth);
            const totalBudgetTargetAnnual = totalBudgetTargetByMonth.reduce((a, b) => a + b, 0);
            const totalCostActualAnnual = sumOrNull(totalCostActualByMonth);
            const totalCplTargetAnnual = computeUnitCost(totalBudgetTargetAnnual, totalLeadsTargetAnnual);
            const totalCplActualAnnual =
              totalCostActualAnnual != null && totalLeadsActualAnnual != null
                ? computeUnitCost(totalCostActualAnnual, totalLeadsActualAnnual)
                : null;

            return (
              <Fragment key="__total__">
                <tr className="bg-accent-tint/40">
                  <td rowSpan={3} className="sticky left-0 z-10 w-[160px] whitespace-nowrap border-b-2 border-gray-300 bg-accent-tint/40 px-3 py-2 align-top">
                    <span className="font-semibold text-ink">合計</span>
                    <span className="mt-0.5 block text-[11px] text-gray-500">全チャネルの自動集計</span>
                  </td>
                  <td className="w-[96px] whitespace-nowrap border-b border-gray-300 bg-accent-tint/40 px-2 py-1.5 text-[11px] text-gray-500">
                    反響数（件）
                  </td>
                  {months.map((m, mi) => (
                    <ComparisonCell
                      key={m.key}
                      target={totalLeadsTargetByMonth[mi]}
                      actual={totalLeadsActualByMonth[mi]}
                      goodDirection="higher"
                      formatter={(n) => `${formatNum(n)}件`}
                    />
                  ))}
                  <ComparisonCell
                    target={totalLeadsTargetAnnual}
                    actual={totalLeadsActualAnnual}
                    goodDirection="higher"
                    formatter={(n) => `${formatNum(n)}件`}
                  />
                </tr>
                <tr className="bg-accent-tint/40">
                  <td className="w-[96px] whitespace-nowrap border-b border-gray-300 bg-accent-tint/40 px-2 py-1.5 text-[11px] text-gray-500">
                    予算/実績費用
                  </td>
                  {months.map((m, mi) => (
                    <ComparisonCell
                      key={m.key}
                      target={totalBudgetTargetByMonth[mi]}
                      actual={totalCostActualByMonth[mi]}
                      goodDirection="lower"
                      formatter={formatYen}
                    />
                  ))}
                  <ComparisonCell target={totalBudgetTargetAnnual} actual={totalCostActualAnnual} goodDirection="lower" formatter={formatYen} />
                </tr>
                <tr className="bg-accent-tint/40">
                  <td className="w-[96px] whitespace-nowrap border-b-2 border-gray-300 bg-accent-tint/40 px-2 py-1.5 text-[11px] text-gray-500">
                    単価（円/件）
                  </td>
                  {months.map((m, mi) => {
                    const cplTarget = computeUnitCost(totalBudgetTargetByMonth[mi], totalLeadsTargetByMonth[mi]);
                    const cplActual =
                      totalCostActualByMonth[mi] != null && totalLeadsActualByMonth[mi] != null
                        ? computeUnitCost(totalCostActualByMonth[mi], totalLeadsActualByMonth[mi])
                        : null;
                    return <ComparisonCell key={m.key} target={cplTarget} actual={cplActual} goodDirection="lower" formatter={formatYen} />;
                  })}
                  <ComparisonCell target={totalCplTargetAnnual} actual={totalCplActualAnnual} goodDirection="lower" formatter={formatYen} />
                </tr>
              </Fragment>
            );
          })()}
          {channels.map((channel) => {
            const leadsTarget = (leadsTargetByChannel[channel.key] ?? emptyRow(months.length)).map(parseNum);
            const leadsActual: (number | null)[] = leadsActualByChannel[channel.key] ?? months.map(() => null);
            const budgetTarget = (budgetTargetByChannel[channel.key] ?? emptyRow(months.length)).map(parseNum);
            const costActual: (number | null)[] = costActualByChannel[channel.key] ?? months.map(() => null);

            const leadsTargetTotal = leadsTarget.reduce((a, b) => a + b, 0);
            const leadsActualTotal = sumOrNull(leadsActual);
            const budgetTargetTotal = budgetTarget.reduce((a, b) => a + b, 0);
            const costActualTotal = sumOrNull(costActual);
            const cplTargetTotal = computeUnitCost(budgetTargetTotal, leadsTargetTotal);
            const cplActualTotal =
              costActualTotal != null && leadsActualTotal != null
                ? computeUnitCost(costActualTotal, leadsActualTotal)
                : null;

            return (
              <Fragment key={channel.key}>
                <tr className="hover:bg-gray-050">
                  <td
                    rowSpan={3}
                    className="sticky left-0 z-10 w-[160px] whitespace-nowrap border-b-2 border-gray-300 bg-white px-3 py-2 align-top"
                  >
                    <span className="font-semibold text-ink">{channel.label}</span>
                    {channel.sub && <span className="mt-0.5 block text-[11px] text-gray-500">{channel.sub}</span>}
                  </td>
                  <td className="w-[96px] whitespace-nowrap border-b border-gray-300 bg-white px-2 py-1.5 text-[11px] text-gray-500">
                    反響数（件）
                  </td>
                  {months.map((m, mi) => (
                    <ComparisonCell
                      key={m.key}
                      target={leadsTarget[mi]}
                      actual={leadsActual[mi]}
                      goodDirection="higher"
                      formatter={(n) => `${formatNum(n)}件`}
                    />
                  ))}
                  <ComparisonCell
                    target={leadsTargetTotal}
                    actual={leadsActualTotal}
                    goodDirection="higher"
                    formatter={(n) => `${formatNum(n)}件`}
                  />
                </tr>
                <tr className="hover:bg-gray-050">
                  <td className="w-[96px] whitespace-nowrap border-b border-gray-300 bg-white px-2 py-1.5 text-[11px] text-gray-500">
                    予算/実績費用
                  </td>
                  {months.map((m, mi) => (
                    <ComparisonCell key={m.key} target={budgetTarget[mi]} actual={costActual[mi]} goodDirection="lower" formatter={formatYen} />
                  ))}
                  <ComparisonCell target={budgetTargetTotal} actual={costActualTotal} goodDirection="lower" formatter={formatYen} />
                </tr>
                <tr className="bg-gray-050/70">
                  <td className="w-[96px] whitespace-nowrap border-b-2 border-gray-300 bg-gray-050 px-2 py-1.5 text-[11px] text-gray-500">
                    単価（円/件）
                  </td>
                  {months.map((m, mi) => {
                    const cplTarget = computeUnitCost(budgetTarget[mi], leadsTarget[mi]);
                    const cplActual =
                      costActual[mi] != null && leadsActual[mi] != null ? computeUnitCost(costActual[mi], leadsActual[mi]) : null;
                    return <ComparisonCell key={m.key} target={cplTarget} actual={cplActual} goodDirection="lower" formatter={formatYen} />;
                  })}
                  <ComparisonCell target={cplTargetTotal} actual={cplActualTotal} goodDirection="lower" formatter={formatYen} />
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function TargetsBudgetMockPage() {
  const [tab, setTab] = useState<"company" | "channel" | "actual">("channel");
  const [fiscalStartMonth, setFiscalStartMonth] = useState(4);
  const months = useMemo(() => buildMonths(fiscalStartMonth), [fiscalStartMonth]);

  const [companyKpiValues, setCompanyKpiValues] = useState<Record<string, string[]>>(COMPANY_KPI_SEED);
  const [channelLeadsValues, setChannelLeadsValues] =
    useState<Record<string, Record<string, string[]>>>(CHANNEL_LEADS_SEED);
  const [budgetValues, setBudgetValues] =
    useState<Record<string, Record<string, string[]>>>(CHANNEL_BUDGET_SEED);
  const [locationId, setLocationId] = useState(ALL_LOCATIONS_KEY);

  const locations = MOCK_LOCATIONS.filter((l) => l.clientId === MOCK_CLIENT_ID);
  const locationOptions = [{ id: ALL_LOCATIONS_KEY, name: "全社共通" }, ...locations];
  const adChannels = getChannelsForClient(MOCK_CLIENT_ID).filter((c) => c.type === "ad");

  const channelRows: GridRow[] = adChannels.map((c) => ({
    key: c.id,
    label: c.name,
    sub: c.method === "api" ? "API連携" : "手動",
  }));

  // 会社全体の「合計反響数」＝全拠点＋全社共通のチャネル別目標を合算した読み取り専用値
  // （予算の会社全体合計と同じ「自動合算」方針、§9-1）
  const companyLeadsTotals = months.map((_, mi) =>
    locationOptions.reduce(
      (sum, loc) =>
        sum +
        adChannels.reduce((s2, ch) => s2 + parseNum(channelLeadsValues[loc.id]?.[ch.id]?.[mi]), 0),
      0,
    ),
  );

  // §2-7「年間予実」会社全体タブ用：合計反響数の実績も同じロールアップ方式で集計する
  // （実績のダミーデータは全社共通スコープのみ用意しているため、他拠点は0扱いになる）
  const companyLeadsActualTotals = months.map((_, mi) =>
    locationOptions.reduce(
      (sum, loc) =>
        sum + adChannels.reduce((s2, ch) => s2 + (CHANNEL_LEADS_ACTUAL_SEED[loc.id]?.[ch.id]?.[mi] ?? 0), 0),
      0,
    ),
  );

  function handleCompanyKpiChange(kpiKey: string, monthIndex: number, value: string) {
    setCompanyKpiValues((prev) => {
      const rowValues = [...(prev[kpiKey] ?? emptyRow(months.length))];
      rowValues[monthIndex] = value;
      return { ...prev, [kpiKey]: rowValues };
    });
  }

  function handleLeadsChange(channelId: string, monthIndex: number, value: string) {
    setChannelLeadsValues((prev) => {
      const locState = { ...(prev[locationId] ?? {}) };
      const rowValues = [...(locState[channelId] ?? emptyRow(months.length))];
      rowValues[monthIndex] = value;
      locState[channelId] = rowValues;
      return { ...prev, [locationId]: locState };
    });
  }

  function handleBudgetChange(channelId: string, monthIndex: number, value: string) {
    setBudgetValues((prev) => {
      const locState = { ...(prev[locationId] ?? {}) };
      const rowValues = [...(locState[channelId] ?? emptyRow(months.length))];
      rowValues[monthIndex] = value;
      locState[channelId] = rowValues;
      return { ...prev, [locationId]: locState };
    });
  }

  return (
    <AppShell
      sidebar={
        <Sidebar
          logo="HOUSING DASHBOARD"
          subtitle="住宅マーケティング数値ダッシュボード"
          navItems={NAV_ITEMS}
          activeHref="/dev-preview/targets-budget"
          userName="代理店 担当者（モック）"
          userEmail="agency@example.com"
        />
      }
    >
      <PageHeader title="目標・予算" eyebrow="TARGETS & BUDGET (MOCK)" />

      <p className="mb-4 max-w-[760px] text-xs text-gray-700">
        improvement.md §4-1・§9-1・§9-2 で提案した「年間グリッド入力」の見た目を確認するためのモックです。ダミーデータのみを使用しており、保存・DB接続は行っていません（入力自体はブラウザ内で反映されます）。反響数はチャネル別に一本化し、予算 ÷ 反響数目標で単価（想定CPL）を自動算出します。
      </p>

      <Panel className="mb-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">事業年度の開始月</label>
            <select
              value={fiscalStartMonth}
              onChange={(e) => setFiscalStartMonth(Number(e.target.value))}
              className="min-w-[120px]"
            >
              <option value={4}>4月始まり</option>
              <option value={1}>1月始まり</option>
            </select>
          </div>
          <p className="pb-1.5 text-xs text-gray-500">
            クライアントごとに設定できる想定（実装時は`clients.fiscal_year_start_month`、クライアント編集画面側で設定・このモックでは仮に切替のみ再現）。
          </p>
        </div>
      </Panel>

      <div className="mb-0 flex gap-1 border-b border-gray-300">
        <button
          type="button"
          onClick={() => setTab("channel")}
          className={`rounded-t-control border border-b-0 px-4 py-2 text-sm font-semibold ${
            tab === "channel" ? "border-gray-300 bg-white text-navy" : "border-transparent text-gray-500 hover:text-navy"
          }`}
        >
          チャネル別計画
        </button>
        <button
          type="button"
          onClick={() => setTab("company")}
          className={`rounded-t-control border border-b-0 px-4 py-2 text-sm font-semibold ${
            tab === "company" ? "border-gray-300 bg-white text-navy" : "border-transparent text-gray-500 hover:text-navy"
          }`}
        >
          会社全体KPI
        </button>
        <button
          type="button"
          onClick={() => setTab("actual")}
          className={`rounded-t-control border border-b-0 px-4 py-2 text-sm font-semibold ${
            tab === "actual" ? "border-gray-300 bg-white text-navy" : "border-transparent text-gray-500 hover:text-navy"
          }`}
        >
          年間予実
        </button>
      </div>

      {tab === "channel" && (
        <Panel title="チャネル別：反響目標・予算・単価" className="rounded-tl-none">
          <div className="mb-4 flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">拠点</label>
              <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="min-w-[160px]">
                {locationOptions.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="max-w-[520px] pb-1.5 text-xs text-gray-500">
              チャネルごとに「目標（反響件数）」「予算（円）」を入力すると、下段の「単価」に予算÷目標の想定CPLが自動表示されます（どちらか未入力・0件の場合は「-」）。拠点×チャネル×月で管理し、会社全体タブの合計反響数はここで入力した全拠点分の合算です。
            </p>
          </div>
          <ChannelPlanGrid
            months={months}
            channels={channelRows}
            leadsValues={channelLeadsValues[locationId] ?? {}}
            budgetValues={budgetValues[locationId] ?? {}}
            onLeadsChange={handleLeadsChange}
            onBudgetChange={handleBudgetChange}
          />
          <div className="mt-4">
            <Button variant="primary">保存（モックのため未接続）</Button>
          </div>
        </Panel>
      )}

      {tab === "company" && (
        <Panel title="会社全体KPI（年間一括）" className="rounded-tl-none">
          <p className="mb-3 text-xs text-gray-700">
            来場予約数・来場数・契約数は施策チャネルに紐づかないデータのため、引き続き会社全体のみで入力します（spec §4.4）。合計反響数は「チャネル別計画」タブで入力した値の自動集計（読み取り専用）です。
          </p>
          <AnnualGrid
            months={months}
            rows={COMPANY_KPI_LABELS.map((k) => ({ key: k.kpiKey, label: k.label }))}
            values={companyKpiValues}
            onChange={handleCompanyKpiChange}
            formatTotal={(n) => `${formatNum(n)}件`}
            readonlyRows={[
              { key: "leads_total", label: "合計反響数", sub: "チャネル別目標の自動集計", monthlyValues: companyLeadsTotals },
            ]}
          />
          <div className="mt-4">
            <Button variant="primary">保存（モックのため未接続）</Button>
          </div>
        </Panel>
      )}

      {tab === "actual" && (
        <Panel title="年間予実（目標×実績）" className="rounded-tl-none">
          <p className="mb-4 max-w-[680px] text-xs text-gray-700">
            improvement.md §2-7で提案した「年間を通じた目標×実績の一覧比較」のイメージです。上段に薄字で目標、下段に太字で実績を表示し、達成していれば緑、未達（費用・単価は超過）であれば赤で強調します。読み取り専用で、入力欄はありません。実績のダミーデータは「全社共通」スコープのみ用意しているため、他拠点を選ぶと実績側が「-」になります。
          </p>

          <div className="mb-6">
            <div className="font-archivo mb-2 inline-block border-b-2 border-accent pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
              会社全体KPI
            </div>
            <CompanyActualGrid
              months={months}
              rows={[
                {
                  key: "leads_total",
                  label: "合計反響数",
                  sub: "チャネル別の目標・実績を自動集計",
                  goodDirection: "higher",
                  targets: companyLeadsTotals,
                  actuals: companyLeadsActualTotals,
                  formatter: (n) => `${formatNum(n)}件`,
                },
                ...COMPANY_KPI_LABELS.map((k) => ({
                  key: k.kpiKey,
                  label: k.label,
                  goodDirection: "higher" as const,
                  targets: (companyKpiValues[k.kpiKey] ?? emptyRow(months.length)).map(parseNum),
                  actuals: COMPANY_ACTUAL_SEED[k.kpiKey] ?? months.map(() => null),
                  formatter: (n: number) => `${formatNum(n)}件`,
                })),
              ]}
            />
          </div>

          <div>
            <div className="font-archivo mb-2 inline-block border-b-2 border-accent pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
              チャネル別（拠点：{locationOptions.find((l) => l.id === locationId)?.name}）
            </div>
            <ChannelActualGrid
              months={months}
              channels={channelRows}
              leadsTargetByChannel={channelLeadsValues[locationId] ?? {}}
              leadsActualByChannel={CHANNEL_LEADS_ACTUAL_SEED[locationId] ?? {}}
              budgetTargetByChannel={budgetValues[locationId] ?? {}}
              costActualByChannel={CHANNEL_COST_ACTUAL_SEED[locationId] ?? {}}
            />
          </div>
        </Panel>
      )}
    </AppShell>
  );
}
