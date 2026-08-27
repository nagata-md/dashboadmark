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

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

// 期間・拠点を選択するGETフォーム（施策データ・来場・見積/図面出し・契約の各入力画面）で、
// クエリパラメータが一切無い初回表示時のみ「月次・今月」をデフォルトにする（2026-08-27
// ユーザー指摘：毎回「表示」を押さないとデータが出ないのは手間）。periodType/periodMonth/
// periodWeekStartのいずれかが既に指定されていれば（ユーザーが一度でも選択・送信済み）、
// その指定をそのまま尊重する。
export function withDefaultPeriod(params: PeriodParams): PeriodParams {
  if (params.periodType || params.periodMonth || params.periodWeekStart) return params;
  return { periodType: "monthly", periodMonth: currentMonthKey() };
}
