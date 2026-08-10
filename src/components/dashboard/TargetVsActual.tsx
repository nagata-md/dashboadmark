import type { TargetVsActualRow } from "@/lib/mock/types";

// spec §4.4/§4.5「予実対比」。目標は会社全体に対してのみ設定するため、実績も会社全体
// （拠点別データ＋全社共通データの合算）に対して行う（拠点別の予実対比はv1では行わない）。
export type { TargetVsActualRow };

export function TargetVsActual({ rows }: { rows: TargetVsActualRow[] }) {
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => {
        const achievement = row.target ? row.actual / row.target : null;
        const fillWidth = achievement == null ? 0 : Math.min(1, achievement) * 100;
        return (
          <div key={row.kpiKey}>
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-1 text-xs">
              <span className="font-semibold text-ink">{row.label}</span>
              <span className="text-gray-700">
                実績 {row.actual.toLocaleString()} / 目標{" "}
                {row.target == null ? "未設定" : row.target.toLocaleString()}
                {achievement != null && ` （${(achievement * 100).toFixed(0)}%）`}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-navy" style={{ width: `${fillWidth}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
