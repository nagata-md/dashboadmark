import type { ChannelLeadSummary, FunnelStages } from "@/lib/mock/types";

// spec §4.5「ファネル図」（最優先）。施策→反響→来場予約→来場、その先は見積もり／図面出し／契約が
// 来場から並列に分岐する3本の枝として表示する（件数の合算・重複排除は行わない、spec §3）。
// 遷移率はそれぞれ前段階（枝は来場）の件数を分母として算出する。
// 起点「施策」はspec §6上件数カラムを持たないため、チャネルごとの反響数の内訳として表示する（2026-08-10確認）。

function rate(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return numerator / denominator;
}

function formatRate(r: number | null): string {
  return r == null ? "-" : `${(r * 100).toFixed(1)}%`;
}

function StageBox({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div
      className={`flex min-w-[104px] flex-col items-center rounded-panel border px-4 py-3 shadow-panel ${
        accent ? "border-navy bg-navy text-white" : "border-gray-300 bg-white"
      }`}
    >
      <span
        className={`font-archivo text-[11px] font-semibold uppercase tracking-[0.08em] ${
          accent ? "text-white/70" : "text-gray-500"
        }`}
      >
        {label}
      </span>
      <span className={`mt-1 text-2xl font-bold ${accent ? "text-white" : "text-navy"}`}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}

function RateArrow({ rate: r }: { rate: number | null }) {
  return (
    <div className="flex flex-col items-center px-1 text-accent">
      <span aria-hidden className="text-lg leading-none">
        →
      </span>
      <span className="text-[11px] font-semibold">{formatRate(r)}</span>
    </div>
  );
}

function BranchRow({ label, value, denominator }: { label: string; value: number; denominator: number }) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden className="text-gray-400">
        ↳
      </span>
      <span className="w-16 shrink-0 text-xs text-gray-700">
        {formatRate(rate(value, denominator))}
      </span>
      <StageBox label={label} value={value} />
    </div>
  );
}

function ChannelLeadsBox({ channels }: { channels: ChannelLeadSummary[] }) {
  return (
    <div className="flex w-[200px] flex-col gap-1 rounded-panel border border-gray-300 bg-white px-3 py-2.5 shadow-panel">
      <span className="font-archivo text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
        施策別反響数
      </span>
      {channels.length === 0 && <span className="text-[11px] text-gray-500">データなし</span>}
      {channels.map((c) => (
        <div key={c.channelName} className="flex items-baseline justify-between gap-2 text-[11px]">
          <span className="text-gray-700">{c.channelName}</span>
          <span className="font-semibold text-navy">{c.leads.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

export function FunnelChart({
  stages,
  channelLeads = [],
}: {
  stages: FunnelStages;
  channelLeads?: ChannelLeadSummary[];
}) {
  const { leads, visitReservations, visits, estimates, floorPlans, contracts } = stages;

  return (
    <div>
      <div className="flex flex-wrap items-start gap-1.5">
        <ChannelLeadsBox channels={channelLeads} />
        <span aria-hidden className="mt-8 text-lg leading-none text-accent">
          →
        </span>
        <div className="mt-8 flex items-center gap-1.5">
          <StageBox label="反響" value={leads} />
          <RateArrow rate={rate(visitReservations, leads)} />
          <StageBox label="来場予約" value={visitReservations} />
          <RateArrow rate={rate(visits, visitReservations)} />
          <StageBox label="来場" value={visits} accent />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-dashed border-gray-300 pt-4 md:ml-[387px]">
        <p className="mb-1 text-[11px] text-gray-500">来場からの分岐（並列・重複排除なし、spec §3）</p>
        <BranchRow label="見積もり" value={estimates} denominator={visits} />
        <BranchRow label="図面出し" value={floorPlans} denominator={visits} />
        <BranchRow label="契約" value={contracts} denominator={visits} />
      </div>
    </div>
  );
}
