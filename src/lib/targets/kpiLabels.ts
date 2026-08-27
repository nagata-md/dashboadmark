// 予実対比（spec §4.4/§4.5）で扱う、targetsテーブル（会社全体・月次）に保存するKPI。
// 目標設定画面（Phase 8）とダッシュボード・レポート生成（Phase 9・10、当面は
// lib/mock/aggregate.ts が同じ配列を参照）の両方で共通利用する。目標は会社全体に対して
// のみ設定する（拠点別の目標設定は行わない、§4.4）。
//
// 2026-08-27決定（improvement.md §4-1・§9-1・§9-2）：「合計反響数」（旧kpiKey='leads_total'）は
// チャネル別の反響数目標（campaign_targets、拠点別＋全社共通の自動合算）に置き換わったため、
// このtargetsベースの一覧からは除外した。合計反響数の目標値が必要な場合は
// `@/lib/metrics/aggregate` の `sumCampaignTargetLeads` を使う。
export const KPI_LABELS: { kpiKey: string; label: string }[] = [
  { kpiKey: "visit_reservations", label: "来場予約数" },
  { kpiKey: "visits", label: "来場数" },
  { kpiKey: "contracts", label: "契約数" },
];
