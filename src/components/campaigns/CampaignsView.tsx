"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormRow } from "@/components/ui/FormRow";
import { Modal } from "@/components/ui/Modal";
import { Panel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import {
  ctr,
  cpc,
  cpl,
  formatMonthLabel,
  formatNum as num,
  formatPct as pct,
  formatYen as yen,
} from "@/lib/mock/aggregate";
import {
  MOCK_AD_CONNECTIONS,
  MOCK_PLATFORM_INTEGRATIONS,
  getCampaignMetricsForClient,
  getChannelsForClient,
  getLocationsForClient,
  getProductionCostsForClient,
} from "@/lib/mock/data";
import type { CampaignChannel, CampaignMetricRow, LocationId, PeriodType, ProductionCost } from "@/lib/mock/types";
import { AdConnectionPanel } from "@/components/ads/AdConnectionPanel";
import { ChannelMasterPanel } from "./ChannelMasterPanel";
import { CampaignValueFields, EMPTY_VALUE_FORM, type CampaignValueFormState } from "./CampaignValueFields";
import { ProductionCostPanel } from "./ProductionCostPanel";

function rowKey(clientId: string, channelId: string, locationId: LocationId, periodType: PeriodType, periodStart: string) {
  return `${clientId}__${channelId}__${locationId ?? "null"}__${periodType}__${periodStart}`;
}

function toNum(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function valuesToRowFields(channel: CampaignChannel, values: CampaignValueFormState) {
  const has = (key: keyof CampaignValueFormState) => channel.enabledFields.includes(key as never);
  return {
    cost: has("cost") ? toNum(values.cost) : null,
    impressions: has("impressions") ? toNum(values.impressions) : null,
    clicks: has("clicks") ? toNum(values.clicks) : null,
    followers: has("followers") ? toNum(values.followers) : null,
    posts: has("posts") ? toNum(values.posts) : null,
    views: has("views") ? toNum(values.views) : null,
    inflowRate: has("inflowRate") && values.inflowRate.trim() !== "" ? Number(values.inflowRate) / 100 : null,
    leads: toNum(values.leads) ?? 0,
  };
}

function rowToValues(row: CampaignMetricRow): CampaignValueFormState {
  return {
    cost: row.cost?.toString() ?? "",
    impressions: row.impressions?.toString() ?? "",
    clicks: row.clicks?.toString() ?? "",
    followers: row.followers?.toString() ?? "",
    posts: row.posts?.toString() ?? "",
    views: row.views?.toString() ?? "",
    inflowRate: row.inflowRate != null ? (row.inflowRate * 100).toString() : "",
    leads: row.leads.toString(),
  };
}

export function CampaignsView({ clientId }: { clientId: string }) {
  const locations = useMemo(() => getLocationsForClient(clientId), [clientId]);
  const [rows, setRows] = useState<CampaignMetricRow[]>(() => getCampaignMetricsForClient(clientId));
  const [channels, setChannels] = useState<CampaignChannel[]>(() => getChannelsForClient(clientId));
  const [productionCosts, setProductionCosts] = useState<ProductionCost[]>(() => getProductionCostsForClient(clientId));

  const [periodType, setPeriodType] = useState<PeriodType>("monthly");
  const [periodStart, setPeriodStart] = useState("2026-07-01");
  const [channelId, setChannelId] = useState(channels[0].id);
  const [locationId, setLocationId] = useState<LocationId>(locations[0]?.id ?? null);
  const [form, setForm] = useState<CampaignValueFormState>(EMPTY_VALUE_FORM);
  const [editingRow, setEditingRow] = useState<CampaignMetricRow | null>(null);
  const [editValues, setEditValues] = useState<CampaignValueFormState>(EMPTY_VALUE_FORM);

  const channel = channels.find((c) => c.id === channelId)!;
  const listedRows = rows.filter((r) => r.periodStart === periodStart && r.periodType === periodType);
  const clientChannels = channels.filter((c) => c.clientId === clientId);

  function upsertRow(channelId: string, locationId: LocationId, periodType: PeriodType, periodStart: string, values: CampaignValueFormState) {
    const targetChannel = channels.find((c) => c.id === channelId)!;
    const key = rowKey(clientId, channelId, locationId, periodType, periodStart);
    setRows((prev) => {
      const existingIndex = prev.findIndex(
        (r) => rowKey(clientId, r.channelId, r.locationId, r.periodType, r.periodStart) === key,
      );
      const base = existingIndex >= 0 ? prev[existingIndex] : null;
      const next: CampaignMetricRow = {
        id: base?.id ?? key,
        clientId,
        channelId,
        locationId,
        periodType,
        periodStart,
        source: base?.source ?? "manual",
        ...valuesToRowFields(targetChannel, values),
        manuallyOverridden: base?.source === "api" ? true : base?.manuallyOverridden ?? false,
        updatedByType: "agency",
        // 初めて上書きする瞬間の同期値を保持しておく（「APIの値に戻す」で即時復元するため、2026-08-10確認）
        apiSyncedValue:
          base?.source === "api" && !base.manuallyOverridden
            ? { cost: base.cost, impressions: base.impressions, clicks: base.clicks, leads: base.leads }
            : base?.apiSyncedValue,
      };
      if (existingIndex >= 0) {
        const copy = [...prev];
        copy[existingIndex] = next;
        return copy;
      }
      return [...prev, next];
    });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    upsertRow(channelId, locationId, periodType, periodStart, form);
    setForm(EMPTY_VALUE_FORM);
  }

  function openEdit(row: CampaignMetricRow) {
    setEditingRow(row);
    setEditValues(rowToValues(row));
  }

  function saveEdit() {
    if (!editingRow) return;
    upsertRow(editingRow.channelId, editingRow.locationId, editingRow.periodType, editingRow.periodStart, editValues);
    setEditingRow(null);
  }

  // 「APIの値に戻す」：即時に再同期する方針（2026-08-10確認）。本モックでは保持しておいた
  // 直前の同期値スナップショットに即時置き換える（実装ではPhase 6の単体同期処理を呼ぶ）。
  function revertToApi(row: CampaignMetricRow) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== row.id || !r.apiSyncedValue) return r;
        return {
          ...r,
          cost: r.apiSyncedValue.cost,
          impressions: r.apiSyncedValue.impressions,
          clicks: r.apiSyncedValue.clicks,
          leads: r.apiSyncedValue.leads,
          manuallyOverridden: false,
          updatedByType: null,
          apiSyncedValue: undefined,
        };
      }),
    );
  }

  function saveChannel(newChannel: CampaignChannel) {
    setChannels((prev) => {
      const idx = prev.findIndex((c) => c.id === newChannel.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newChannel;
        return copy;
      }
      return [...prev, newChannel];
    });
  }

  const editingChannel = editingRow ? channels.find((c) => c.id === editingRow.channelId) : null;
  const editingLocationName = editingRow?.locationId
    ? locations.find((l) => l.id === editingRow.locationId)?.name ?? "-"
    : "全社共通";

  return (
    <div className="flex flex-col gap-5">
      <Panel title="広告アカウント接続状況">
        <AdConnectionPanel integrations={MOCK_PLATFORM_INTEGRATIONS} connections={MOCK_AD_CONNECTIONS.filter((c) => c.clientId === clientId)} />
      </Panel>

      <Panel title="施策マスタ管理">
        <ChannelMasterPanel clientId={clientId} channels={clientChannels} onSave={saveChannel} />
      </Panel>

      <Panel title="施策データ入力">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <FormRow label="施策">
            <select value={channelId} onChange={(e) => setChannelId(e.target.value)}>
              <optgroup label="広告">
                {channels.filter((c) => c.type === "ad" && c.clientId === null).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="運用（オーガニック）">
                {channels.filter((c) => c.type === "organic" && c.clientId === null).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
              {clientChannels.length > 0 && (
                <optgroup label="クライアント独自の施策">
                  {clientChannels.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </FormRow>
          <FormRow label="期間種別">
            <select value={periodType} onChange={(e) => setPeriodType(e.target.value as PeriodType)}>
              <option value="monthly">月次</option>
              <option value="weekly">週次</option>
            </select>
          </FormRow>
          <FormRow label={periodType === "monthly" ? "対象月" : "週開始日"}>
            {periodType === "monthly" ? (
              <input
                type="month"
                value={periodStart.slice(0, 7)}
                onChange={(e) => setPeriodStart(`${e.target.value}-01`)}
              />
            ) : (
              <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            )}
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

          <CampaignValueFields channel={channel} values={form} onChange={(patch) => setForm({ ...form, ...patch })} />

          <div className="flex items-end">
            <Button type="submit" variant="primary">
              保存
            </Button>
          </div>
        </form>
      </Panel>

      <Panel title="制作・クリエイティブ費用">
        <ProductionCostPanel
          clientId={clientId}
          locations={locations}
          periodType={periodType}
          periodStart={periodStart}
          rows={productionCosts}
          onAdd={(cost) => setProductionCosts((prev) => [...prev, cost])}
        />
      </Panel>

      <Panel title={`入力済みデータ一覧（${formatMonthLabel(periodStart)}）`}>
        <Table>
          <thead>
            <Tr>
              <Th>施策</Th>
              <Th>拠点</Th>
              <Th className="text-right">費用/フォロワー等</Th>
              <Th className="text-right">表示/投稿</Th>
              <Th className="text-right">クリック/再生</Th>
              <Th className="text-right">反響数</Th>
              <Th className="text-right">CTR/流入率</Th>
              <Th className="text-right">CPC</Th>
              <Th className="text-right">CPL</Th>
              <Th>状態</Th>
              <Th>操作</Th>
            </Tr>
          </thead>
          <tbody>
            {listedRows.map((row) => {
              const rowChannel = channels.find((c) => c.id === row.channelId)!;
              const locationName = row.locationId ? locations.find((l) => l.id === row.locationId)?.name ?? "-" : "全社共通";
              return (
                <Tr key={row.id}>
                  <Td className="font-semibold text-ink">{rowChannel.name}</Td>
                  <Td>{locationName}</Td>
                  <Td className="text-right">{rowChannel.enabledFields.includes("cost") ? yen(row.cost) : num(row.followers)}</Td>
                  <Td className="text-right">{rowChannel.enabledFields.includes("impressions") ? num(row.impressions) : num(row.posts)}</Td>
                  <Td className="text-right">{rowChannel.enabledFields.includes("clicks") ? num(row.clicks) : num(row.views)}</Td>
                  <Td className="text-right font-semibold">{row.leads.toLocaleString()}</Td>
                  <Td className="text-right">{rowChannel.type === "ad" ? pct(ctr(row.clicks, row.impressions)) : pct(row.inflowRate)}</Td>
                  <Td className="text-right">{yen(cpc(row.cost, row.clicks))}</Td>
                  <Td className="text-right">{yen(cpl(row.cost, row.leads))}</Td>
                  <Td>
                    {row.source === "api" && !row.manuallyOverridden && <StatusBadge tone="neutral">API連携</StatusBadge>}
                    {row.manuallyOverridden && <StatusBadge tone="warning">手動上書き</StatusBadge>}
                    {row.source === "manual" && !row.manuallyOverridden && <StatusBadge tone="neutral">手動入力</StatusBadge>}
                  </Td>
                  <Td>
                    <div className="flex flex-col gap-1">
                      <button type="button" onClick={() => openEdit(row)} className="text-xs text-accent hover:underline">
                        修正
                      </button>
                      {row.manuallyOverridden && row.source === "api" && (
                        <button type="button" onClick={() => revertToApi(row)} className="text-xs text-accent hover:underline">
                          APIの値に戻す
                        </button>
                      )}
                    </div>
                  </Td>
                </Tr>
              );
            })}
            {listedRows.length === 0 && (
              <Tr>
                <Td colSpan={11} className="text-center text-gray-500">
                  この期間のデータはまだありません。
                </Td>
              </Tr>
            )}
          </tbody>
        </Table>
      </Panel>

      {editingRow && editingChannel && (
        <Modal title="施策データを修正" onClose={() => setEditingRow(null)}>
          <p className="mb-3.5 rounded border border-gray-300 bg-gray-050 px-3 py-2 text-xs text-gray-700">
            施策: <span className="font-semibold text-ink">{editingChannel.name}</span> ／ 拠点:{" "}
            <span className="font-semibold text-ink">{editingLocationName}</span> ／ 期間:{" "}
            <span className="font-semibold text-ink">{formatMonthLabel(editingRow.periodStart)}</span>
          </p>
          <CampaignValueFields channel={editingChannel} values={editValues} onChange={(patch) => setEditValues({ ...editValues, ...patch })} />
          <div className="flex justify-end gap-2">
            <Button type="button" onClick={() => setEditingRow(null)}>
              キャンセル
            </Button>
            <Button type="button" variant="primary" onClick={saveEdit}>
              保存
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
