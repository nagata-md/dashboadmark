// 期間種別（月次/週次）とURLクエリパラメータから period_start を組み立てる（spec §4.2.1）。
// 週次の週開始日は任意の日付を選べる自由入力とし、ISO週番号ベースの<input type="week">は使わない
// （媒体ごとに週の区切り方＝日〜土・月〜日等が異なるため、2026-08-20方針）。
export type PeriodType = "monthly" | "weekly";

export interface PeriodParams {
  periodType?: string;
  periodMonth?: string;
  periodWeekStart?: string;
}

export function resolvePeriod(
  params: PeriodParams,
): { periodType: PeriodType; periodStart: string } | null {
  const periodType: PeriodType = params.periodType === "weekly" ? "weekly" : "monthly";
  if (periodType === "monthly" && params.periodMonth) {
    return { periodType, periodStart: `${params.periodMonth}-01` };
  }
  if (periodType === "weekly" && params.periodWeekStart) {
    return { periodType, periodStart: params.periodWeekStart };
  }
  return null;
}
