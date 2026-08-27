import { Table, Td, Th, Tr } from "@/components/ui/Table";
import { Tag } from "@/components/ui/Tag";
import { formatNum as num, formatPct as pct, formatYen as yen } from "@/lib/mock/aggregate";
import type { ChannelBreakdownRow } from "@/lib/mock/types";

// spec §4.5「チャネル別内訳」。CTR/CPC/CPL・フォロワー数・流入率は種別（広告/運用）で列を
// 出し分けず常に計算する。未入力の項目は値自体がnullのため自然に「-」表示になる。これにより
// クライアント固有のカスタムチャネル（任意の項目組み合わせ）でも列ロジックを変更せずに対応できる（2026-08-10確認）。

/** 予算消化率（費用÷予算）。予算・費用のどちらかが未入力/0なら算出不可として「-」表示にする
 * （spec §4.2のCPL算出ルールと同じ考え方、improvement.md §9-1）。 */
function consumptionRate(cost: number | null, budget: number | null): number | null {
  if (!cost || !budget) return null;
  return cost / budget;
}

export function ChannelBreakdownTable({ rows }: { rows: ChannelBreakdownRow[] }) {
  return (
    <Table>
      <thead>
        <Tr>
          <Th>施策</Th>
          <Th className="text-right">費用</Th>
          <Th className="text-right">予算</Th>
          <Th className="text-right">消化率</Th>
          <Th className="text-right">表示回数</Th>
          <Th className="text-right">クリック数</Th>
          <Th className="text-right">反響数</Th>
          <Th className="text-right">CTR</Th>
          <Th className="text-right">CPC</Th>
          <Th className="text-right">CPL</Th>
          <Th className="text-right">フォロワー数</Th>
          <Th className="text-right">流入率</Th>
        </Tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <Tr key={row.channelId}>
            <Td>
              <span className="font-semibold text-ink">{row.channelName}</span>
              <span className="mt-0.5 block text-[11px] text-gray-500">
                {row.channelType === "ad" ? "広告" : "運用（オーガニック）"}
                {row.channelMethod === "api" && <Tag className="ml-1">API連携</Tag>}
              </span>
            </Td>
            <Td className="text-right">{yen(row.cost)}</Td>
            <Td className="text-right">{yen(row.budget)}</Td>
            <Td className="text-right">{pct(consumptionRate(row.cost, row.budget))}</Td>
            <Td className="text-right">{num(row.impressions)}</Td>
            <Td className="text-right">{num(row.clicks)}</Td>
            <Td className="text-right font-semibold">{row.leads.toLocaleString()}</Td>
            <Td className="text-right">{pct(row.ctr)}</Td>
            <Td className="text-right">{yen(row.cpc)}</Td>
            <Td className="text-right">{yen(row.cpl)}</Td>
            <Td className="text-right">{num(row.followers)}</Td>
            <Td className="text-right">
              {row.inflowRates.length > 0 ? row.inflowRates.map((r) => pct(r)).join(" / ") : "-"}
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}
