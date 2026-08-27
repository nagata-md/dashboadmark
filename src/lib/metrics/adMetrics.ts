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
