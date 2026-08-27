import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface AdChannelRow {
  id: string;
  name: string;
  method: "manual" | "api";
}

// 目標・予算（チャネル別計画・年間予実）で扱う「広告」施策一覧。デフォルト17施策
// （client_id null）はclient_channel_settingsでの無効化上書きを、クライアント固有施策は
// campaign_channels.enabledをそれぞれ確認する（improvement.md §3-3）。管理画面UIは未実装の
// ため、現状は明示的に無効化された施策が無い限りすべて表示される。
export async function getVisibleAdChannels(
  supabase: SupabaseServerClient,
  clientId: string,
): Promise<AdChannelRow[]> {
  const [{ data: channels }, { data: settings }] = await Promise.all([
    supabase
      .from("campaign_channels")
      .select("id, name, method, client_id, enabled, sort_order")
      .eq("type", "ad")
      .or(`client_id.is.null,client_id.eq.${clientId}`)
      .order("sort_order", { ascending: true }),
    supabase.from("client_channel_settings").select("channel_id, enabled").eq("client_id", clientId),
  ]);

  const overrideByChannelId = new Map((settings ?? []).map((s) => [s.channel_id, s.enabled]));

  return (channels ?? [])
    .filter((c) => (c.client_id !== null ? c.enabled : (overrideByChannelId.get(c.id) ?? true)))
    .map((c) => ({ id: c.id, name: c.name, method: c.method }));
}
