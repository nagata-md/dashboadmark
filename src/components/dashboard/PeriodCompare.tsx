import { Table, Td, Th, Tr } from "@/components/ui/Table";
import { compare, formatNum as num, formatYen as yen, type Comparison } from "@/lib/mock/aggregate";
import type { ChannelBreakdownRow, FunnelStages, LocationBreakdownRow } from "@/lib/mock/types";

// spec §4.5「期間比較」。基準期間・比較期間について、ファネル各段階・チャネル別内訳・拠点別内訳の
// 各数値を基準値・比較値・差分（実数）・増減率（%）で並べる。流入率・目標との対比は対象外（spec §4.5）。
// 注：チャネル別比較は列数の都合上、費用・反響数・CPLの3指標に絞っている（CTR/CPCも同型で追加可能）。

function pctText(c: Comparison): string {
  return c.pct == null ? "-" : `${c.pct >= 0 ? "+" : ""}${(c.pct * 100).toFixed(1)}%`;
}

function ComparisonCells({ c, formatter = num }: { c: Comparison; formatter?: (v: number) => string }) {
  return (
    <>
      <Td className="text-right">{formatter(c.base)}</Td>
      <Td className="text-right">{formatter(c.compare)}</Td>
      <Td className={`text-right ${c.diff > 0 ? "text-success" : c.diff < 0 ? "text-danger" : ""}`}>
        {c.diff > 0 ? "+" : ""}
        {formatter(c.diff)}
      </Td>
      <Td className="text-right">{pctText(c)}</Td>
    </>
  );
}

function GroupHeader({ label }: { label: string }) {
  return (
    <Th colSpan={4} className="text-center">
      {label}
    </Th>
  );
}
function SubHeaders() {
  return (
    <>
      <Th className="text-right">基準</Th>
      <Th className="text-right">比較</Th>
      <Th className="text-right">差分</Th>
      <Th className="text-right">増減率</Th>
    </>
  );
}

interface PeriodCompareProps {
  baseLabel: string;
  compareLabel: string;
  baseStages: FunnelStages;
  compareStages: FunnelStages;
  baseChannels: ChannelBreakdownRow[];
  compareChannels: ChannelBreakdownRow[];
  baseLocations: LocationBreakdownRow[];
  compareLocations: LocationBreakdownRow[];
  /** 制作・クリエイティブ費用の期間合計（2026-08-10確認、spec.mdには無い新規指標） */
  baseProductionCostTotal?: number;
  compareProductionCostTotal?: number;
}

export function PeriodCompare({
  baseLabel,
  compareLabel,
  baseStages,
  compareStages,
  baseChannels,
  compareChannels,
  baseLocations,
  compareLocations,
  baseProductionCostTotal,
  compareProductionCostTotal,
}: PeriodCompareProps) {
  const stageRows: { label: string; c: Comparison }[] = [
    { label: "反響数", c: compare(baseStages.leads, compareStages.leads) },
    { label: "来場予約数", c: compare(baseStages.visitReservations, compareStages.visitReservations) },
    { label: "来場数", c: compare(baseStages.visits, compareStages.visits) },
    { label: "見積もり数", c: compare(baseStages.estimates, compareStages.estimates) },
    { label: "図面出し数", c: compare(baseStages.floorPlans, compareStages.floorPlans) },
    { label: "契約数", c: compare(baseStages.contracts, compareStages.contracts) },
  ];

  const channelIds = Array.from(new Set([...baseChannels, ...compareChannels].map((r) => r.channelId)));
  const channelRows = channelIds
    .map((id) => {
      const b = baseChannels.find((r) => r.channelId === id);
      const cmp = compareChannels.find((r) => r.channelId === id);
      const name = b?.channelName ?? cmp?.channelName;
      const sortOrder = b?.sortOrder ?? cmp?.sortOrder;
      if (!name || sortOrder == null) return null;
      return {
        channelId: id,
        channelName: name,
        sortOrder,
        cost: compare(b?.cost ?? 0, cmp?.cost ?? 0),
        leads: compare(b?.leads ?? 0, cmp?.leads ?? 0),
        cpl: compare(b?.cpl ?? 0, cmp?.cpl ?? 0),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const locationRows = baseLocations.map((baseLoc, i) => {
    const cmpLoc = compareLocations[i];
    return {
      name: baseLoc.locationName,
      leads: compare(baseLoc.leads, cmpLoc?.leads ?? 0),
      visitReservations: compare(baseLoc.visitReservations, cmpLoc?.visitReservations ?? 0),
      visits: compare(baseLoc.visits, cmpLoc?.visits ?? 0),
      contracts: compare(baseLoc.contracts, cmpLoc?.contracts ?? 0),
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs text-gray-700">
        基準期間: <span className="font-semibold text-ink">{baseLabel}</span> ／ 比較期間:{" "}
        <span className="font-semibold text-ink">{compareLabel}</span>
      </p>

      <div>
        <div className="font-archivo mb-2 inline-block border-b-2 border-accent pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
          ファネル各段階
        </div>
        <Table>
          <thead>
            <Tr>
              <Th>段階</Th>
              <SubHeaders />
            </Tr>
          </thead>
          <tbody>
            {stageRows.map((row) => (
              <Tr key={row.label}>
                <Td className="font-semibold text-ink">{row.label}</Td>
                <ComparisonCells c={row.c} />
              </Tr>
            ))}
          </tbody>
        </Table>
      </div>

      {baseProductionCostTotal != null && compareProductionCostTotal != null && (
        <div>
          <div className="font-archivo mb-2 inline-block border-b-2 border-accent pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
            制作・クリエイティブ費用
          </div>
          <Table>
            <thead>
              <Tr>
                <Th>項目</Th>
                <SubHeaders />
              </Tr>
            </thead>
            <tbody>
              <Tr>
                <Td className="font-semibold text-ink">費用合計</Td>
                <ComparisonCells c={compare(baseProductionCostTotal, compareProductionCostTotal)} formatter={yen} />
              </Tr>
            </tbody>
          </Table>
        </div>
      )}

      <div>
        <div className="font-archivo mb-2 inline-block border-b-2 border-accent pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
          チャネル別内訳（費用・反響数・CPL）
        </div>
        <Table>
          <thead>
            <Tr>
              <Th rowSpan={2} className="align-middle">
                施策
              </Th>
              <GroupHeader label="費用" />
              <GroupHeader label="反響数" />
              <GroupHeader label="CPL" />
            </Tr>
            <Tr>
              <SubHeaders />
              <SubHeaders />
              <SubHeaders />
            </Tr>
          </thead>
          <tbody>
            {channelRows.map((row) => (
              <Tr key={row.channelId}>
                <Td className="font-semibold text-ink">{row.channelName}</Td>
                <ComparisonCells c={row.cost} formatter={yen} />
                <ComparisonCells c={row.leads} />
                <ComparisonCells c={row.cpl} formatter={yen} />
              </Tr>
            ))}
          </tbody>
        </Table>
      </div>

      {locationRows.length > 1 && (
      <div>
        <div className="font-archivo mb-2 inline-block border-b-2 border-accent pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
          拠点別内訳
        </div>
        <Table>
          <thead>
            <Tr>
              <Th rowSpan={2} className="align-middle">
                拠点
              </Th>
              <GroupHeader label="反響数" />
              <GroupHeader label="来場予約数" />
              <GroupHeader label="来場数" />
              <GroupHeader label="契約数" />
            </Tr>
            <Tr>
              <SubHeaders />
              <SubHeaders />
              <SubHeaders />
              <SubHeaders />
            </Tr>
          </thead>
          <tbody>
            {locationRows.map((row) => (
              <Tr key={row.name}>
                <Td className="font-semibold text-ink">{row.name}</Td>
                <ComparisonCells c={row.leads} />
                <ComparisonCells c={row.visitReservations} />
                <ComparisonCells c={row.visits} />
                <ComparisonCells c={row.contracts} />
              </Tr>
            ))}
          </tbody>
        </Table>
      </div>
      )}
    </div>
  );
}
