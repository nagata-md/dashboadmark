// spec §4.2「算出項目（広告のみ、決定済み）」。保存はせず表示のたびに算出する。
// 分母が0または対象データなしの場合は算出不可として null（呼び出し側で「-」表示）とする。
export function calcCtr(clicks: number | null, impressions: number | null) {
  if (!clicks || !impressions) return null;
  return clicks / impressions;
}

export function calcCpc(cost: number | null, clicks: number | null) {
  if (!cost || !clicks) return null;
  return cost / clicks;
}

export function calcCpl(cost: number | null, leads: number | null) {
  if (!cost || !leads) return null;
  return cost / leads;
}

export function formatPercent(value: number | null, digits = 1) {
  return value === null ? "-" : `${(value * 100).toFixed(digits)}%`;
}

export function formatYen(value: number | null) {
  return value === null
    ? "-"
    : `¥${Math.round(value).toLocaleString("ja-JP")}`;
}

export function formatNum(value: number | null) {
  return value === null ? "-" : value.toLocaleString("ja-JP");
}

export function formatMonthLabel(periodStart: string) {
  const [y, m] = periodStart.split("-");
  return `${y}年${Number(m)}月`;
}

export interface Comparison {
  base: number;
  compare: number;
  diff: number;
  pct: number | null;
}

/** 基準期間・比較期間の差分・増減率（spec §4.5 期間比較）。比較対象が0の場合は増減率を算出不可とする */
export function compare(base: number, compareValue: number): Comparison {
  return {
    base,
    compare: compareValue,
    diff: base - compareValue,
    pct: compareValue === 0 ? null : (base - compareValue) / compareValue,
  };
}
