// レポート生成フォーム（spec §4.6：期間種別＝月次/週次/カスタムのいずれか＋任意の比較期間）の
// 入力値から、集計に使う範囲（lib/metrics/dateRange の半開区間）と、reports テーブルに保存する
// period_start/period_end（両端含む・表示用）を組み立てる。
import { addDaysUTC, customRange, monthRange, toISODate, weekRange, type DateRange } from "@/lib/metrics/dateRange";

export type ReportPeriodType = "monthly" | "weekly" | "custom";

export interface ReportPeriodParams {
  periodType?: string;
  periodMonth?: string;
  periodWeekStart?: string;
  customStart?: string;
  customEnd?: string;
}

export interface ResolvedReportPeriod {
  periodType: ReportPeriodType;
  /** 両端含む表示用の開始日（reports.period_start と同じ形） */
  periodStart: string;
  /** 両端含む表示用の終了日（reports.period_end と同じ形） */
  periodEnd: string;
  /** 集計に使う半開区間 [start, end) */
  range: DateRange;
}

export function resolveReportPeriod(params: ReportPeriodParams): ResolvedReportPeriod | null {
  const periodType: ReportPeriodType =
    params.periodType === "weekly" ? "weekly" : params.periodType === "custom" ? "custom" : "monthly";

  if (periodType === "monthly") {
    if (!params.periodMonth) return null;
    const range = monthRange(params.periodMonth);
    return { periodType, periodStart: toISODate(range.start), periodEnd: toISODate(addDaysUTC(range.end, -1)), range };
  }
  if (periodType === "weekly") {
    if (!params.periodWeekStart) return null;
    const range = weekRange(params.periodWeekStart);
    return { periodType, periodStart: toISODate(range.start), periodEnd: toISODate(addDaysUTC(range.end, -1)), range };
  }
  // custom
  if (!params.customStart || !params.customEnd || params.customStart > params.customEnd) return null;
  return {
    periodType,
    periodStart: params.customStart,
    periodEnd: params.customEnd,
    range: customRange(params.customStart, params.customEnd),
  };
}
