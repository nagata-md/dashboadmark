import { FormRow } from "@/components/ui/FormRow";
import type { CampaignChannel, FieldKey } from "@/lib/mock/types";

// チャネルのenabledFields/requiredFieldsに応じて入力欄を動的に出し分ける（2026-08-10確認）。
// 施策マスタでクライアント固有のカスタム施策を追加した場合も、この共通コンポーネントがそのまま対応する。

export interface CampaignValueFormState {
  cost: string;
  impressions: string;
  clicks: string;
  followers: string;
  posts: string;
  views: string;
  inflowRate: string;
  leads: string;
}

export const EMPTY_VALUE_FORM: CampaignValueFormState = {
  cost: "",
  impressions: "",
  clicks: "",
  followers: "",
  posts: "",
  views: "",
  inflowRate: "",
  leads: "",
};

const FIELD_LABELS: Record<FieldKey, string> = {
  cost: "施策費用（円）",
  impressions: "表示回数",
  clicks: "クリック数",
  followers: "フォロワー数",
  posts: "投稿数",
  views: "再生数",
  inflowRate: "自社サイトへの流入率（%）",
};

export function CampaignValueFields({
  channel,
  values,
  onChange,
}: {
  channel: CampaignChannel;
  values: CampaignValueFormState;
  onChange: (patch: Partial<CampaignValueFormState>) => void;
}) {
  return (
    <>
      {channel.enabledFields.map((key) => {
        const required = channel.requiredFields.includes(key);
        return (
          <FormRow key={key} label={`${FIELD_LABELS[key]}${required ? "" : "（任意）"}`}>
            <input
              type="number"
              min={0}
              max={key === "inflowRate" ? 100 : undefined}
              step={key === "inflowRate" ? 0.1 : undefined}
              required={required}
              value={values[key]}
              onChange={(e) => onChange({ [key]: e.target.value })}
            />
          </FormRow>
        );
      })}
      <FormRow label="反響数">
        <input type="number" min={0} required value={values.leads} onChange={(e) => onChange({ leads: e.target.value })} />
      </FormRow>
    </>
  );
}
