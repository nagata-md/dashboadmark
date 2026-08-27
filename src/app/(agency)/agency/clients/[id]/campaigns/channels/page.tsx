import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Table, Tr, Th, Td } from "@/components/ui/Table";
import { FormRow } from "@/components/ui/FormRow";
import { Button } from "@/components/ui/Button";
import { RealAdConnections } from "@/components/ads/RealAdConnections";
import { createClient } from "@/lib/supabase/server";
import { isChannelVisible } from "@/lib/campaigns/channelVisibility";
import { FIELD_KEYS, FIELD_LABELS } from "@/lib/campaigns/fieldKeys";
import {
  addCustomChannel,
  setCustomChannelEnabled,
  setDefaultChannelEnabled,
} from "../actions";

export const metadata = {
  title: "施策マスタ | 住宅マーケティング数値ダッシュボード（仮称）",
};

const AD_ERROR_MESSAGES: Record<string, string> = {
  not_authorized: "権限エラーが発生しました。管理者にお問い合わせください。",
  missing_client: "クライアント情報が取得できませんでした。",
  oauth_state_invalid: "接続情報の有効期限が切れました。もう一度お試しください。",
  oauth_exchange_failed: "OAuth接続に失敗しました。時間をおいて再度お試しください。",
  oauth_save_failed: "接続情報の保存に失敗しました。時間をおいて再度お試しください。",
  sync_failed: "同期に失敗しました。時間をおいて再度お試しください。",
};

const AD_SUCCESS_MESSAGES: Record<string, string> = {
  ad_connected: "広告アカウントを接続しました。",
  synced: "同期を実行しました。",
};

// improvement.md §3-3・§3-4（2026-08-27ユーザー指摘）：低頻度の「施策マスタ管理」
// （広告アカウント接続・施策の有効/無効・クライアント固有施策の追加）を、
// 日常入力の`/agency/clients/[id]/campaigns`から分離した専用画面。
export default async function ChannelsMasterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { id: clientId } = await params;
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: realClient } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .maybeSingle();
  if (!realClient) notFound();

  const { data: channels } = await supabase
    .from("campaign_channels")
    .select("id, name, type, client_id, enabled, enabled_fields")
    .or(`client_id.is.null,client_id.eq.${clientId}`)
    .order("sort_order", { ascending: true });

  const { data: channelSettings } = await supabase
    .from("client_channel_settings")
    .select("channel_id, enabled")
    .eq("client_id", clientId);
  const defaultChannelOverrides = new Map((channelSettings ?? []).map((s) => [s.channel_id, s.enabled]));

  const allChannelsWithState = (channels ?? []).map((c) => ({
    ...c,
    isDefault: c.client_id === null,
    isEnabled: isChannelVisible(c, defaultChannelOverrides),
  }));
  const customChannels = allChannelsWithState.filter((c) => !c.isDefault);

  const adErrorMessage = sp.error ? AD_ERROR_MESSAGES[sp.error] : undefined;
  const adSuccessMessage = sp.success ? AD_SUCCESS_MESSAGES[sp.success] : undefined;
  const returnTo = `/agency/clients/${clientId}/campaigns/channels`;

  return (
    <>
      <PageHeader
        title="施策マスタ"
        eyebrow="CHANNELS"
        actions={
          <Link href={`/agency/clients/${clientId}/campaigns`} className="text-sm text-accent hover:underline">
            ← 施策データ入力に戻る
          </Link>
        }
      />

      <Panel title="施策の有効/無効管理" className="mb-4">
        <p className="mb-4 text-xs text-gray-700">
          このクライアントで使わない施策を無効化すると、施策データ入力・チャネル別内訳・目標/予算のチャネル別計画から除外されます（過去に記録済みのデータは削除されません）。
        </p>
        <Table>
          <thead>
            <Tr>
              <Th>施策名</Th>
              <Th>種別</Th>
              <Th>出典</Th>
              <Th>状態</Th>
              <Th />
            </Tr>
          </thead>
          <tbody>
            {allChannelsWithState.map((channel) => {
              const toggleAction = channel.isDefault
                ? setDefaultChannelEnabled.bind(null, clientId, channel.id, !channel.isEnabled)
                : setCustomChannelEnabled.bind(null, clientId, channel.id, !channel.isEnabled);
              return (
                <Tr key={channel.id}>
                  <Td className="font-semibold text-navy">{channel.name}</Td>
                  <Td>{channel.type === "ad" ? "広告" : "運用"}</Td>
                  <Td>{channel.isDefault ? "デフォルト" : "クライアント固有"}</Td>
                  <Td>
                    {channel.isEnabled ? (
                      <span className="text-success">有効</span>
                    ) : (
                      <span className="text-gray-500">無効</span>
                    )}
                  </Td>
                  <Td>
                    <form action={toggleAction}>
                      <button type="submit" className="text-xs text-accent hover:underline">
                        {channel.isEnabled ? "無効化する" : "有効化する"}
                      </button>
                    </form>
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      </Panel>

      <Panel title="施策マスタ管理（クライアント固有）">
        {customChannels.length > 0 ? (
          <Table className="mb-4">
            <thead>
              <Tr>
                <Th>施策名</Th>
                <Th>種別</Th>
                <Th>入力項目</Th>
              </Tr>
            </thead>
            <tbody>
              {customChannels.map((c) => (
                <Tr key={c.id}>
                  <Td className="font-semibold text-navy">{c.name}</Td>
                  <Td>{c.type === "ad" ? "広告" : "運用"}</Td>
                  <Td>
                    {(c.enabled_fields ?? [])
                      .map((key: string) => FIELD_LABELS[key as keyof typeof FIELD_LABELS])
                      .join("・")}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <p className="mb-4 text-sm text-gray-500">
            このクライアント固有の施策はまだ追加されていません。
          </p>
        )}

        <form action={addCustomChannel} className="max-w-[420px]">
          <input type="hidden" name="clientId" value={clientId} />
          <FormRow label="施策名">
            <input type="text" name="name" required />
          </FormRow>
          <FormRow label="種別">
            <select name="type">
              <option value="ad">広告</option>
              <option value="organic">運用（オーガニック）</option>
            </select>
          </FormRow>
          <FormRow label="入力項目（反響数は常に必須のため対象外）">
            <div className="flex flex-col gap-1.5">
              {FIELD_KEYS.map((key) => (
                <label key={key} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" name={`field_${key}`} />
                  {FIELD_LABELS[key]}
                </label>
              ))}
            </div>
          </FormRow>
          <Button type="submit" variant="primary">
            追加
          </Button>
        </form>
      </Panel>

      {adSuccessMessage && (
        <p className="mb-4 rounded-control bg-success-tint px-3 py-2 text-xs text-success">
          {adSuccessMessage}
        </p>
      )}
      {adErrorMessage && (
        <p className="mb-4 rounded-control bg-danger-tint px-3 py-2 text-xs text-danger">
          {adErrorMessage}
        </p>
      )}

      <RealAdConnections clientId={clientId} returnTo={returnTo} />
    </>
  );
}
