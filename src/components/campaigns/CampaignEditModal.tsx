"use client";

import { Modal } from "@/components/ui/Modal";
import { FormRow } from "@/components/ui/FormRow";
import { Button } from "@/components/ui/Button";
import { FIELD_LABELS, type FieldKey } from "@/lib/campaigns/fieldKeys";

const ACTOR_LABELS: Record<string, string> = {
  agency: "代理店",
  client: "住宅会社",
};

export interface CampaignMetricValues {
  cost: number | null;
  impressions: number | null;
  clicks: number | null;
  followers: number | null;
  posts: number | null;
  views: number | null;
  inflow_rate: number | null;
  leads: number | null;
  updated_by_type: string | null;
  updated_at: string | null;
}

// improvement.md §1-1（2026-08-27方針決定）：2026-08-10のモックアップ（CampaignsView.tsx）で
// 確認済みだった「一覧行→モーダルでその場編集」パターンの実データ版。旧`/campaigns/entry`
// ページと同じServer Action（saveCampaignMetric、素の関数のままpropsで受け取り、クライアント側
// では.bind()しない）・同じ入力項目出し分けロジック（channel.enabled_fields/required_fields）を
// そのまま使い、hidden inputで期間・拠点・施策IDを渡す方式もentryページと揃える。
export function CampaignEditModal({
  clientId,
  basePath,
  channelId,
  channelName,
  locationId,
  periodType,
  periodMonth,
  periodWeekStart,
  enabledFields,
  requiredFields,
  existing,
  saveAction,
  onClose,
}: {
  clientId: string;
  basePath: string;
  channelId: string;
  channelName: string;
  locationId: string | null;
  periodType: "monthly" | "weekly";
  periodMonth?: string;
  periodWeekStart?: string;
  enabledFields: FieldKey[];
  requiredFields: FieldKey[];
  existing: CampaignMetricValues | null;
  saveAction: (formData: FormData) => Promise<void>;
  onClose: () => void;
}) {
  const lastUpdatedLabel =
    existing?.updated_at && existing.updated_by_type
      ? `最終更新: ${ACTOR_LABELS[existing.updated_by_type] ?? existing.updated_by_type} · ${new Date(existing.updated_at).toLocaleString("ja-JP")}`
      : null;

  return (
    <Modal title={`施策データ${existing ? "修正" : "入力"}：${channelName}`} onClose={onClose}>
      {lastUpdatedLabel && <p className="mb-3.5 text-xs text-gray-500">{lastUpdatedLabel}</p>}
      <form action={saveAction}>
        <input type="hidden" name="clientId" value={clientId} />
        <input type="hidden" name="basePath" value={basePath} />
        <input type="hidden" name="channelId" value={channelId} />
        <input type="hidden" name="locationId" value={locationId ?? ""} />
        <input type="hidden" name="periodType" value={periodType} />
        {periodType === "monthly" ? (
          <input type="hidden" name="periodMonth" value={periodMonth} />
        ) : (
          <input type="hidden" name="periodWeekStart" value={periodWeekStart} />
        )}

        {enabledFields.map((key) => {
          const required = requiredFields.includes(key);
          const rawValue = existing ? existing[key] : null;
          // inflow_rateはDBに0〜1の比率で保存されている（formatPercentが*100して表示する前提）が、
          // この入力欄は0〜100（%）で編集させるため、表示時のみ*100して逆変換する（保存時は/100）。
          const existingValue = key === "inflow_rate" && rawValue != null ? rawValue * 100 : rawValue;
          return (
            <FormRow key={key} label={`${FIELD_LABELS[key]}${required ? "" : "（任意）"}`}>
              <input
                type="number"
                name={key}
                min={0}
                max={key === "inflow_rate" ? 100 : undefined}
                step={key === "inflow_rate" ? 0.1 : undefined}
                required={required}
                defaultValue={existingValue ?? ""}
              />
            </FormRow>
          );
        })}
        <FormRow label="反響数">
          <input type="number" name="leads" min={0} required defaultValue={existing?.leads ?? ""} />
        </FormRow>
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            キャンセル
          </Button>
          <Button type="submit" variant="primary">
            保存
          </Button>
        </div>
      </form>
    </Modal>
  );
}
