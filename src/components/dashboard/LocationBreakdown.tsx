import { Table, Td, Th, Tr } from "@/components/ui/Table";
import type { LocationBreakdownRow } from "@/lib/mock/types";

// spec §4.5「拠点別内訳」。拠点に紐づかないデータ（全社共通）を1区分として合わせて表示し、
// 内訳の合計（各拠点＋全社共通）が会社全体の合計と一致することを確認できるようにする（spec §3）。
export function LocationBreakdown({ rows }: { rows: LocationBreakdownRow[] }) {
  const total = rows.reduce(
    (acc, r) => ({
      leads: acc.leads + r.leads,
      visitReservations: acc.visitReservations + r.visitReservations,
      visits: acc.visits + r.visits,
      contracts: acc.contracts + r.contracts,
    }),
    { leads: 0, visitReservations: 0, visits: 0, contracts: 0 },
  );

  return (
    <Table>
      <thead>
        <Tr>
          <Th>拠点</Th>
          <Th className="text-right">反響数</Th>
          <Th className="text-right">来場予約数</Th>
          <Th className="text-right">来場数</Th>
          <Th className="text-right">契約数</Th>
        </Tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <Tr key={row.locationId ?? "company-wide"}>
            <Td className={row.locationId == null ? "text-gray-700" : "font-semibold text-ink"}>
              {row.locationName}
            </Td>
            <Td className="text-right">{row.leads.toLocaleString()}</Td>
            <Td className="text-right">{row.visitReservations.toLocaleString()}</Td>
            <Td className="text-right">{row.visits.toLocaleString()}</Td>
            <Td className="text-right">{row.contracts.toLocaleString()}</Td>
          </Tr>
        ))}
        <Tr className="bg-gray-050 font-semibold">
          <Td>合計（会社全体）</Td>
          <Td className="text-right">{total.leads.toLocaleString()}</Td>
          <Td className="text-right">{total.visitReservations.toLocaleString()}</Td>
          <Td className="text-right">{total.visits.toLocaleString()}</Td>
          <Td className="text-right">{total.contracts.toLocaleString()}</Td>
        </Tr>
      </tbody>
    </Table>
  );
}
