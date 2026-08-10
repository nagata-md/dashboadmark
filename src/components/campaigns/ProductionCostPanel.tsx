"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormRow } from "@/components/ui/FormRow";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import { formatYen } from "@/lib/mock/aggregate";
import type { Location, LocationId, PeriodType, ProductionCost } from "@/lib/mock/types";

// 制作・クリエイティブ費用（バナー制作・ページ更新など、2026-08-10確認）。施策チャネルの反響には
// 紐づかない自由入力の項目名＋金額のリストとして管理する（spec.mdには無い新規セクション）。

export function ProductionCostPanel({
  clientId,
  locations,
  periodType,
  periodStart,
  rows,
  onAdd,
}: {
  clientId: string;
  locations: Location[];
  periodType: PeriodType;
  periodStart: string;
  rows: ProductionCost[];
  onAdd: (cost: ProductionCost) => void;
}) {
  const [itemName, setItemName] = useState("");
  const [amount, setAmount] = useState("");
  const [locationId, setLocationId] = useState<LocationId>(null);

  const listedRows = rows.filter((r) => r.periodStart === periodStart);
  const total = listedRows.reduce((a, r) => a + r.amount, 0);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!itemName.trim() || amount.trim() === "") return;
    onAdd({
      id: `pc_${clientId}_${Date.now()}`,
      clientId,
      locationId,
      periodType,
      periodStart,
      itemName: itemName.trim(),
      amount: Number(amount),
      updatedByType: "agency",
    });
    setItemName("");
    setAmount("");
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <FormRow label="項目名" className="md:col-span-2">
          <input
            type="text"
            required
            placeholder="例: 見学会バナー制作"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
          />
        </FormRow>
        <FormRow label="金額（円）">
          <input type="number" min={0} required value={amount} onChange={(e) => setAmount(e.target.value)} />
        </FormRow>
        <FormRow label="拠点">
          <select value={locationId ?? "__all__"} onChange={(e) => setLocationId(e.target.value === "__all__" ? null : e.target.value)}>
            <option value="__all__">全社共通</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </FormRow>
        <div className="flex items-end md:col-span-4">
          <Button type="submit" variant="primary">
            追加
          </Button>
        </div>
      </form>

      <Table>
        <thead>
          <Tr>
            <Th>項目名</Th>
            <Th>拠点</Th>
            <Th className="text-right">金額</Th>
          </Tr>
        </thead>
        <tbody>
          {listedRows.map((r) => (
            <Tr key={r.id}>
              <Td className="font-semibold text-ink">{r.itemName}</Td>
              <Td>{r.locationId ? locations.find((l) => l.id === r.locationId)?.name ?? "-" : "全社共通"}</Td>
              <Td className="text-right">{formatYen(r.amount)}</Td>
            </Tr>
          ))}
          {listedRows.length === 0 && (
            <Tr>
              <Td colSpan={3} className="text-center text-gray-500">
                この期間の制作費用はまだありません。
              </Td>
            </Tr>
          )}
          {listedRows.length > 0 && (
            <Tr className="bg-gray-050 font-semibold">
              <Td colSpan={2}>合計</Td>
              <Td className="text-right">{formatYen(total)}</Td>
            </Tr>
          )}
        </tbody>
      </Table>
    </div>
  );
}
