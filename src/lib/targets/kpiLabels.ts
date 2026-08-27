// 予実対比（spec §4.4/§4.5）で扱うKPI。目標設定画面（Phase 8）とダッシュボード・
// レポート生成（Phase 9・10、当面は lib/mock/aggregate.ts が同じ配列を参照）の
// 両方で共通利用する。目標は会社全体に対してのみ設定する（拠点別の目標設定は行わない、§4.4）。
export const KPI_LABELS: { kpiKey: string; label: string }[] = [
  { kpiKey: "leads_total", label: "合計反響数" },
  { kpiKey: "visit_reservations", label: "来場予約数" },
  { kpiKey: "visits", label: "来場数" },
  { kpiKey: "contracts", label: "契約数" },
];
