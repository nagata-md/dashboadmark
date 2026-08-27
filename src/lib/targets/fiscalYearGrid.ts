// 目標・予算の年間グリッド（improvement.md §4-1・§9-1・§9-2）で使う月列・数値ヘルパー。
// サーバーコンポーネント（page.tsx）とServer Action（actions.ts）の両方から参照するため、
// "use client" を付けない純粋関数のみで構成する。

export interface MonthColumn {
  /** "YYYY-MM" */
  key: string;
  /** "YY/M" 表示用ラベル */
  label: string;
  /** そのままDBのperiod_start（月初日）として使える "YYYY-MM-01" */
  periodStart: string;
}

/** 事業年度の開始月（1〜12）と起点年から、12ヶ月分の月列を古い月→新しい月の順で組み立てる。 */
export function buildFiscalYearMonths(fiscalStartMonth: number, baseYear: number): MonthColumn[] {
  return Array.from({ length: 12 }, (_, i) => {
    const month = ((fiscalStartMonth - 1 + i) % 12) + 1;
    const year = baseYear + Math.floor((fiscalStartMonth - 1 + i) / 12);
    const mm = String(month).padStart(2, "0");
    return { key: `${year}-${mm}`, label: `${String(year).slice(2)}/${month}`, periodStart: `${year}-${mm}-01` };
  });
}

/** 今日時点でその事業年度に属する起点年（例：開始月4月・今日2026-08なら2026、開始月4月・今日2026-02なら2025）。 */
export function currentFiscalYearBaseYear(fiscalStartMonth: number, today: Date = new Date()): number {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth() + 1;
  return m >= fiscalStartMonth ? y : y - 1;
}

export function parseNum(v: string | null | undefined): number {
  const n = Number(v);
  return !v || v.trim() === "" || Number.isNaN(n) ? 0 : n;
}

/** 予算 ÷ 反響数目標。どちらかが0/未入力の場合は算出不可としてnull（spec §4.2のCPL算出ルールに揃える） */
export function computeUnitCost(budget: number, leads: number): number | null {
  if (!budget || !leads) return null;
  return budget / leads;
}

/** 配列が全てnull（実績データなし）ならnull、それ以外はnullを0扱いして合算する */
export function sumOrNull(values: (number | null)[]): number | null {
  if (values.every((v) => v == null)) return null;
  return values.reduce((sum: number, v) => sum + (v ?? 0), 0);
}
