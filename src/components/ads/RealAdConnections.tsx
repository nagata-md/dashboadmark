import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAuthorizedForClient } from "@/lib/auth/isAuthorizedForClient";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { ConnectionStatusBadge, IntegrationStatusBadge } from "@/components/ui/StatusBadge";
import { updateTrackedConversionActions } from "@/lib/ads/actions";

const PLATFORM_LABELS: Record<string, string> = {
  google_ads: "Google広告",
  yahoo_ads: "Yahoo広告",
  meta_ads: "Meta広告（Facebook/Instagram）",
};

// 実クライアント向けの広告アカウント接続UI（spec §4.2.2、Phase 6）。代理店
// （/agency/clients/[id]/campaigns）・住宅会社（/client/ad-connections）どちらの
// 画面からも同じコンポーネントを使う（「接続操作は代理店・住宅会社どちらの管理画面
// からも行える」）。ad_connections はService Role専用のためこのコンポーネント内で
// 明示的に認可チェックしてから取得する（masterplan E6）。
export async function RealAdConnections({
  clientId,
  returnTo,
}: {
  clientId: string;
  returnTo: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const authorized = await isAuthorizedForClient(user.id, clientId);
  if (!authorized) return null;

  const { data: integrations } = await supabase
    .from("platform_integrations")
    .select("platform, status");

  const service = createServiceClient();
  const { data: connections } = await service
    .from("ad_connections")
    .select(
      "id, platform, external_account_id, status, last_synced_at, available_conversion_actions, tracked_conversion_action_ids",
    )
    .eq("client_id", clientId);

  return (
    <>
      <Panel title="広告アカウント接続状況" className="mb-4">
        <div className="flex flex-col gap-3">
          {(integrations ?? []).map((integration) => {
            const connection = (connections ?? []).find(
              (c) => c.platform === integration.platform,
            );
            const pending = integration.status === "pending_review";
            const oauthHref = `/api/ads/oauth/${integration.platform}?clientId=${clientId}&returnTo=${encodeURIComponent(returnTo)}`;

            return (
              <div
                key={integration.platform}
                className="flex flex-wrap items-center gap-3 rounded-panel border border-gray-300 p-3"
              >
                <div className="min-w-[180px] flex-1">
                  <div className="font-semibold text-ink">
                    {PLATFORM_LABELS[integration.platform]}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <IntegrationStatusBadge status={integration.status} />
                    <ConnectionStatusBadge status={connection?.status ?? "none"} />
                  </div>
                  {connection && (
                    <div className="mt-1 text-[11px] text-gray-500">
                      アカウントID: {connection.external_account_id ?? "-"} ／ 最終同期:{" "}
                      {connection.last_synced_at
                        ? new Date(connection.last_synced_at).toLocaleString("ja-JP")
                        : "未同期"}
                    </div>
                  )}
                  {pending && (
                    <div className="mt-1 text-[11px] text-warning">
                      審査待ちのため、この媒体は手動入力フォームで運用してください。
                    </div>
                  )}
                  {!pending && !connection && (
                    <div className="mt-1 text-[11px] text-gray-500">
                      未接続です。接続が完了するまでは手動入力で運用してください。
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {pending ? (
                    <Button type="button" disabled>
                      OAuth接続
                    </Button>
                  ) : (
                    <a href={oauthHref}>
                      <Button type="button">{connection ? "再接続" : "OAuth接続"}</Button>
                    </a>
                  )}
                  {connection && (
                    <form
                      method="post"
                      action={`/api/ads/sync/${connection.id}?returnTo=${encodeURIComponent(returnTo)}`}
                    >
                      <Button type="submit" variant="primary">
                        今すぐ同期
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {(connections ?? []).map((conn) => {
        const available = (conn.available_conversion_actions ?? []) as {
          id: string;
          name: string;
        }[];
        if (available.length === 0) return null;
        const tracked = (conn.tracked_conversion_action_ids ??
          available.map((a) => a.id)) as string[];

        return (
          <Panel key={conn.id} title="コンバージョンアクション選択" className="mb-4">
            <p className="mb-1 font-semibold text-ink">{PLATFORM_LABELS[conn.platform]}</p>
            <p className="mb-3 text-xs text-gray-700">
              反響（問い合わせ・資料請求等）に該当するコンバージョンアクションを選択してください。選択されたアクションの合算値が「反響数」として同期されます。変更は次回以降の同期分から反映されます。
            </p>
            <form
              action={updateTrackedConversionActions.bind(null, conn.id, clientId, returnTo)}
            >
              <div className="mb-3 flex flex-col gap-2">
                {available.map((action) => (
                  <label key={action.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="conversionActionId"
                      value={action.id}
                      defaultChecked={tracked.includes(action.id)}
                    />
                    {action.name}
                  </label>
                ))}
              </div>
              <Button type="submit" variant="primary">
                保存
              </Button>
            </form>
          </Panel>
        );
      })}
    </>
  );
}
