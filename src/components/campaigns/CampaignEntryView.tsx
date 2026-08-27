import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Table, Tr, Th, Td } from "@/components/ui/Table";
import { FormRow } from "@/components/ui/FormRow";
import { Button } from "@/components/ui/Button";
import { PeriodTypeFields } from "@/components/forms/PeriodTypeFields";
import { CampaignEntryTable, type CampaignEntryRow } from "@/components/campaigns/CampaignEntryTable";
import { createClient } from "@/lib/supabase/server";
import { isChannelVisible } from "@/lib/campaigns/channelVisibility";
import { resolvePeriod, withDefaultPeriod, type PeriodParams } from "@/lib/campaigns/period";
import type { FieldKey } from "@/lib/campaigns/fieldKeys";
import { formatYen } from "@/lib/metrics/adMetrics";
import { revertToApiValue, saveCampaignMetric } from "@/lib/campaigns/actions";
import { addProductionCost, deleteProductionCost } from "@/app/(agency)/agency/clients/[id]/campaigns/actions";

export interface CampaignEntrySearchParams extends PeriodParams {
  locationId?: string;
  success?: string;
}

// spec §4.2.1（施策データ手動入力）・§4.2.4（制作・クリエイティブ費用）。
// 2026-08-27方針転換（improvement.md §1-2）：施策データ入力を住宅会社側からも行えるように
// した。`viewerType`で「施策マスタ管理」への導線（代理店のみ）・制作費用の編集権限
// （代理店のみ、spec §4.2.4「入力は代理店担当者が行う」）を出し分ける。
// `/agency/clients/[id]/campaigns/page.tsx`・`/client/campaigns/page.tsx`の両方から使う。
export async function CampaignEntryView({
  clientId,
  basePath,
  channelsHref,
  viewerType,
  searchParams,
}: {
  clientId: string;
  basePath: string;
  /** 施策マスタ画面へのリンク先。代理店側のみ渡す（住宅会社側は施策マスタを管理しない） */
  channelsHref?: string;
  viewerType: "agency" | "client";
  searchParams: CampaignEntrySearchParams;
}) {
  const supabase = await createClient();

  const sp = searchParams;
  const effectiveSp = withDefaultPeriod(sp);
  const period = resolvePeriod(effectiveSp);
  const locationId = sp.locationId && sp.locationId !== "" ? sp.locationId : null;

  const { data: locations } = await supabase
    .from("locations")
    .select("id, name")
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });

  // デフォルト17施策（client_id is null）＋このクライアント固有の追加施策（spec §4.2.3）。
  // 有効/無効の切替・クライアント固有施策の追加・広告アカウント接続は
  // 施策マスタ（代理店のみ）で行う（improvement.md §3-4）。
  const { data: channels } = await supabase
    .from("campaign_channels")
    .select("id, name, type, client_id, enabled, enabled_fields, required_fields")
    .or(`client_id.is.null,client_id.eq.${clientId}`)
    .order("sort_order", { ascending: true });

  // デフォルト施策のクライアント単位の有効/無効上書き（improvement.md §3-3）。
  const { data: channelSettings } = await supabase
    .from("client_channel_settings")
    .select("channel_id, enabled")
    .eq("client_id", clientId);
  const defaultChannelOverrides = new Map((channelSettings ?? []).map((s) => [s.channel_id, s.enabled]));

  const allChannelsWithState = (channels ?? []).map((c) => ({
    ...c,
    isEnabled: isChannelVisible(c, defaultChannelOverrides),
  }));

  let metricsByChannel = new Map<
    string,
    {
      cost: number | null;
      impressions: number | null;
      clicks: number | null;
      followers: number | null;
      posts: number | null;
      views: number | null;
      inflow_rate: number | null;
      leads: number | null;
      source: string;
      manually_overridden: boolean;
      updated_by_type: string | null;
      updated_at: string | null;
    }
  >();
  let productionCosts: { id: string; item_name: string; amount: number }[] = [];

  if (period) {
    let metricsQuery = supabase
      .from("campaign_metrics")
      .select(
        "channel_id, cost, impressions, clicks, followers, posts, views, inflow_rate, leads, source, manually_overridden, updated_by_type, updated_at",
      )
      .eq("client_id", clientId)
      .eq("period_type", period.periodType)
      .eq("period_start", period.periodStart);
    metricsQuery = locationId
      ? metricsQuery.eq("location_id", locationId)
      : metricsQuery.is("location_id", null);
    const { data: metrics } = await metricsQuery;
    metricsByChannel = new Map((metrics ?? []).map((m) => [m.channel_id, m]));

    let costsQuery = supabase
      .from("production_costs")
      .select("id, item_name, amount")
      .eq("client_id", clientId)
      .eq("period_type", period.periodType)
      .eq("period_start", period.periodStart);
    costsQuery = locationId
      ? costsQuery.eq("location_id", locationId)
      : costsQuery.is("location_id", null);
    const { data: costs } = await costsQuery;
    productionCosts = costs ?? [];
  }

  const productionCostTotal = productionCosts.reduce((sum, c) => sum + Number(c.amount), 0);

  const entryRows: CampaignEntryRow[] = allChannelsWithState
    .filter((c) => c.isEnabled)
    .map((channel) => {
      const m = metricsByChannel.get(channel.id);
      return {
        channelId: channel.id,
        channelName: channel.name,
        isAd: channel.type === "ad",
        enabledFields: (channel.enabled_fields ?? []) as FieldKey[],
        requiredFields: (channel.required_fields ?? []) as FieldKey[],
        metric: m
          ? {
              cost: m.cost,
              impressions: m.impressions,
              clicks: m.clicks,
              followers: m.followers,
              posts: m.posts,
              views: m.views,
              inflow_rate: m.inflow_rate,
              leads: m.leads,
              updated_by_type: m.updated_by_type,
              updated_at: m.updated_at,
            }
          : null,
        revertAction:
          m?.source === "api" && m.manually_overridden ? revertToApiValue.bind(null, clientId, channel.id) : null,
      };
    });

  return (
    <>
      <PageHeader
        title="施策データ"
        eyebrow="CAMPAIGNS"
        actions={
          channelsHref ? (
            <Link href={channelsHref} className="text-sm text-accent hover:underline">
              施策マスタ管理 →
            </Link>
          ) : undefined
        }
      />

      {sp.success === "saved" && (
        <p className="mb-4 rounded-control bg-success-tint px-3 py-2 text-xs text-success">保存しました。</p>
      )}

      <Panel title="期間・拠点を選択" className="mb-4 max-w-[560px]">
        <form method="get" className="flex flex-wrap items-end gap-4">
          <PeriodTypeFields
            defaultType={period?.periodType ?? "monthly"}
            defaultMonth={effectiveSp.periodMonth}
            defaultWeekStart={effectiveSp.periodWeekStart}
          />
          <FormRow label="拠点" className="mb-0">
            <select name="locationId" defaultValue={locationId ?? ""}>
              <option value="">全社共通</option>
              {(locations ?? []).map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </FormRow>
          <Button type="submit" variant="primary">
            表示
          </Button>
        </form>
      </Panel>

      {period ? (
        <>
          <Panel title="施策一覧" className="mb-4">
            <CampaignEntryTable
              rows={entryRows}
              saveAction={saveCampaignMetric}
              clientId={clientId}
              basePath={basePath}
              locationId={locationId}
              periodType={period.periodType}
              periodMonth={effectiveSp.periodMonth}
              periodWeekStart={effectiveSp.periodWeekStart}
            />
          </Panel>

          <Panel title="制作・クリエイティブ費用" className="mb-4 max-w-[560px]">
            {productionCosts.length > 0 ? (
              <Table className="mb-4">
                <thead>
                  <Tr>
                    <Th>項目名</Th>
                    <Th>金額</Th>
                    {viewerType === "agency" && <Th />}
                  </Tr>
                </thead>
                <tbody>
                  {productionCosts.map((c) => (
                    <Tr key={c.id}>
                      <Td>{c.item_name}</Td>
                      <Td>{formatYen(c.amount)}</Td>
                      {viewerType === "agency" && (
                        <Td>
                          <form action={deleteProductionCost.bind(null, clientId, c.id)}>
                            <button type="submit" className="text-xs text-danger hover:underline">
                              削除
                            </button>
                          </form>
                        </Td>
                      )}
                    </Tr>
                  ))}
                  <Tr>
                    <Td className="font-semibold text-navy">合計</Td>
                    <Td className="font-semibold text-navy">{formatYen(productionCostTotal)}</Td>
                    {viewerType === "agency" && <Td />}
                  </Tr>
                </tbody>
              </Table>
            ) : (
              <p className="mb-4 text-sm text-gray-500">この期間の制作・クリエイティブ費用はまだありません。</p>
            )}
            {viewerType === "agency" ? (
              <form action={addProductionCost} className="flex flex-wrap items-end gap-4">
                <input type="hidden" name="clientId" value={clientId} />
                <input type="hidden" name="locationId" value={locationId ?? ""} />
                <input type="hidden" name="periodType" value={period.periodType} />
                {period.periodType === "monthly" ? (
                  <input type="hidden" name="periodMonth" value={effectiveSp.periodMonth} />
                ) : (
                  <input type="hidden" name="periodWeekStart" value={effectiveSp.periodWeekStart} />
                )}
                <FormRow label="項目名" className="mb-0">
                  <input type="text" name="itemName" required />
                </FormRow>
                <FormRow label="金額（円）" className="mb-0">
                  <input type="number" name="amount" min={0} required />
                </FormRow>
                <Button type="submit" variant="primary">
                  追加
                </Button>
              </form>
            ) : (
              <p className="text-xs text-gray-500">制作・クリエイティブ費用の入力は代理店担当者が行います（spec §4.2.4）。</p>
            )}
          </Panel>
        </>
      ) : (
        <p className="mb-4 text-sm text-gray-500">期間・拠点を選択して「表示」を押すと、施策一覧・制作費用が表示されます。</p>
      )}
    </>
  );
}
