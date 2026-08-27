// 実データ集計エンジンの土台。spec §6「指標ごとの集計方法」のうち、フロー指標の
// 「週次データを月次実績として集計する場合、月をまたぐ週は日数比率で按分する」というルールを、
// 任意の問い合わせ範囲（ダッシュボードの対象月・レポートの月次/週次/カスタム期間）に対して
// 一般化した形で実装する。UTC日付（時刻なし、Date.UTCベース）で扱うことでタイムゾーンのズレを避ける。

export type PeriodType = "monthly" | "weekly" | "daily";

/** 半開区間 [start, end) 。end は含まない。 */
export interface DateRange {
  start: Date;
  end: Date;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDaysUTC(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

export function addMonthsUTC(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()));
}

export function toISODate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** DBの1行（period_type・period_start）が表す期間区間を導出する。 */
export function rowInterval(periodType: PeriodType, periodStart: string): DateRange {
  const start = parseISODate(periodStart);
  if (periodType === "monthly") return { start, end: addMonthsUTC(start, 1) };
  if (periodType === "weekly") return { start, end: addDaysUTC(start, 7) };
  return { start, end: addDaysUTC(start, 1) }; // daily
}

/** "YYYY-MM" のカレンダー月区間。ダッシュボード・レポートの月次期間指定に使う。 */
export function monthRange(monthKey: string): DateRange {
  const [y, m] = monthKey.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  return { start, end: addMonthsUTC(start, 1) };
}

/** 週次期間（開始日から7日間、任意の曜日開始）。 */
export function weekRange(weekStartIso: string): DateRange {
  return rowInterval("weekly", weekStartIso);
}

/** カスタム期間（開始日〜終了日、両端含む）。 */
export function customRange(startIso: string, endIsoInclusive: string): DateRange {
  return { start: parseISODate(startIso), end: addDaysUTC(parseISODate(endIsoInclusive), 1) };
}

export function rangeLengthDays(range: DateRange): number {
  return (range.end.getTime() - range.start.getTime()) / MS_PER_DAY;
}

export function overlapDays(a: DateRange, b: DateRange): number {
  const start = Math.max(a.start.getTime(), b.start.getTime());
  const end = Math.min(a.end.getTime(), b.end.getTime());
  return Math.max(0, (end - start) / MS_PER_DAY);
}

/** rowRange のうち queryRange と重なる日数比率（0〜1）。日数按分の重み。 */
export function prorateWeight(rowRange: DateRange, queryRange: DateRange): number {
  const rowLength = rangeLengthDays(rowRange);
  if (rowLength <= 0) return 0;
  return overlapDays(rowRange, queryRange) / rowLength;
}
