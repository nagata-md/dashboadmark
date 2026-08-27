// improvement.md §3-3：デフォルト施策（client_id is null）はclient_channel_settingsでの
// クライアント単位の上書きを、クライアント固有施策（client_id非null）は
// campaign_channels.enabled列をそれぞれ確認して「この施策をこのクライアントで表示するか」を
// 判定する。DBアクセスを含まない純粋関数として切り出し、campaigns/page.tsx（施策マスタ管理・
// 施策一覧）・loadClientDataset.ts（ダッシュボード・レポートのチャネル別内訳）・
// visibleAdChannels.ts（目標・予算のチャネル別計画）の3箇所で同じ判定ロジックを共有する。
export interface ChannelEnabledInput {
  id: string;
  client_id: string | null;
  enabled: boolean;
}

export function isChannelVisible(channel: ChannelEnabledInput, defaultChannelOverrides: Map<string, boolean>): boolean {
  if (channel.client_id !== null) return channel.enabled;
  return defaultChannelOverrides.get(channel.id) ?? true;
}
