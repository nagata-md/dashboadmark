"use client";

import { useState } from "react";
import { Table, Tr, Th, Td } from "@/components/ui/Table";
import { calcCpc, calcCpl, calcCtr, formatPercent, formatYen } from "@/lib/metrics/adMetrics";
import type { FieldKey } from "@/lib/campaigns/fieldKeys";
import { CampaignEditModal, type CampaignMetricValues } from "./CampaignEditModal";

export interface CampaignEntryRow {
  channelId: string;
  channelName: string;
  isAd: boolean;
  enabledFields: FieldKey[];
  requiredFields: FieldKey[];
  metric: CampaignMetricValues | null;
  // 「APIの値に戻す」対象（source==='api' && manuallyOverridden）の行のみ、サーバー側で
  // revertToApiValue.bind(null, clientId, channel.id)済みのアクションを渡す。
  revertAction: ((formData: FormData) => Promise<void>) | null;
}

// improvement.md §1-1：一覧の各行から直接モーダルを開いて編集する（旧`/campaigns/entry`への
// ページ遷移の代替）。開いている行はこのクライアントコンポーネント内のローカルstateで管理する。
// saveActionはsaveCampaignMetric自体（未bind）をそのまま受け取り、modal内のhidden inputで
// clientId・channelId・period・locationIdを渡す（entryページと同じ方式）。
export function CampaignEntryTable({
  rows,
  saveAction,
  clientId,
  basePath,
  locationId,
  periodType,
  periodMonth,
  periodWeekStart,
}: {
  rows: CampaignEntryRow[];
  saveAction: (formData: FormData) => Promise<void>;
  clientId: string;
  basePath: string;
  locationId: string | null;
  periodType: "monthly" | "weekly";
  periodMonth?: string;
  periodWeekStart?: string;
}) {
  const [openChannelId, setOpenChannelId] = useState<string | null>(null);
  const openRow = rows.find((r) => r.channelId === openChannelId) ?? null;

  return (
    <>
      <Table>
        <thead>
          <Tr>
            <Th>施策</Th>
            <Th>費用</Th>
            <Th>反響数</Th>
            <Th>CTR</Th>
            <Th>CPC</Th>
            <Th>CPL</Th>
            <Th />
          </Tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const m = row.metric;
            return (
              <Tr key={row.channelId}>
                <Td className="font-semibold text-navy">{row.channelName}</Td>
                <Td>{m ? formatYen(m.cost) : "-"}</Td>
                <Td>{m?.leads ?? "-"}</Td>
                <Td>{row.isAd ? formatPercent(calcCtr(m?.clicks ?? null, m?.impressions ?? null)) : "-"}</Td>
                <Td>{row.isAd ? formatYen(calcCpc(m?.cost ?? null, m?.clicks ?? null)) : "-"}</Td>
                <Td>{row.isAd ? formatYen(calcCpl(m?.cost ?? null, m?.leads ?? null)) : "-"}</Td>
                <Td>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setOpenChannelId(row.channelId)}
                      className="text-accent hover:underline"
                    >
                      {m ? "修正" : "入力"}
                    </button>
                    {row.revertAction && (
                      <form action={row.revertAction}>
                        <button type="submit" className="text-xs text-gray-500 hover:underline">
                          APIの値に戻す
                        </button>
                      </form>
                    )}
                  </div>
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>

      {openRow && (
        <CampaignEditModal
          clientId={clientId}
          basePath={basePath}
          channelId={openRow.channelId}
          channelName={openRow.channelName}
          locationId={locationId}
          periodType={periodType}
          periodMonth={periodMonth}
          periodWeekStart={periodWeekStart}
          enabledFields={openRow.enabledFields}
          requiredFields={openRow.requiredFields}
          existing={openRow.metric}
          saveAction={saveAction}
          onClose={() => setOpenChannelId(null)}
        />
      )}
    </>
  );
}
