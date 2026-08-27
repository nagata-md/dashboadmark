// campaign_channels.enabled_fields/required_fields（spec §4.2.3, §6）で使うキー一覧。
export const FIELD_KEYS = [
  "cost",
  "impressions",
  "clicks",
  "followers",
  "posts",
  "views",
  "inflow_rate",
] as const;

export type FieldKey = (typeof FIELD_KEYS)[number];

export const FIELD_LABELS: Record<FieldKey, string> = {
  cost: "施策費用（円）",
  impressions: "表示回数",
  clicks: "クリック数",
  followers: "フォロワー数",
  posts: "投稿数",
  views: "再生数",
  inflow_rate: "自社サイトへの流入率（%）",
};
