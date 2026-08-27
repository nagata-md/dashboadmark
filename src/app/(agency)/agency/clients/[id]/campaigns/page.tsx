import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Table, Tr, Th, Td } from "@/components/ui/Table";
import { FormRow } from "@/components/ui/FormRow";
import { Button } from "@/components/ui/Button";
import { CampaignsView } from "@/components/campaigns/CampaignsView";
import { PeriodTypeFields } from "@/components/forms/PeriodTypeFields";
import { getClient } from "@/lib/mock/data";
import { createClient } from "@/lib/supabase/server";
import { isChannelVisible } from "@/lib/campaigns/channelVisibility";
import { resolvePeriod, type PeriodParams } from "@/lib/campaigns/period";
import {
  calcCpc,
  calcCpl,
  calcCtr,
  formatPercent,
  formatYen,
} from "@/lib/metrics/adMetrics";
import { addProductionCost, deleteProductionCost, revertToApiValue } from "./actions";

export const metadata = {
  title: "施策データ | 住宅マーケティング数値ダッシュボード（仮称）",
};

type SearchParams = PeriodParams & {
  locationId?: string;
};

// spec §4.2.1（施策データ手動入力）・§4.2.3（クライアント固有施策）・
// §4.2.4（制作・クリエイティブ費用）。
export default async function AgencyCampaignsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id: clientId } = await params;

  // Phase 1〜3で確認済みのモッククライアント（id: "1"/"2"）はモック実装のまま維持する。
  if (getClient(clientId)) {
    return (
      <>
        <PageHeader title="施策データ" eyebrow="CAMPAIGNS" />
        <CampaignsView clientId={clientId} />
      </>
    );
  }

  const supabase = await createClient();
  const { data: realClient } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .maybeSingle();
  if (!realClient) notFound();

  const sp = await searchParams;
  const period = resolvePeriod(sp);
  const locationId = sp.locationId && sp.locationId !== "" ? sp.locationId : null;

  const { data: locations } = await supabase
    .from("locations")
    .select("id, name")
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });

  // デフォルト17施策（client_id is null）＋このクライアント固有の追加施策（spec §4.2.3）。
  // 有効/無効の切替・クライアント固有施策の追加・広告アカウント接続は
  // `/agency/clients/[id]/campaigns/channels`（施策マスタ）で行う（improvement.md §3-4）。
  const { data: channels } = await supabase
    .from("campaign_channels")
    .select("id, name, type, client_id, enabled")
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
      leads: number | null;
      source: string;
      manually_overridden: boolean;
    }
  >();
  let productionCosts: { id: string; item_name: string; amount: number }[] = [];

  if (period) {
    let metricsQuery = supabase
      .from("campaign_metrics")
      .select("channel_id, cost, impressions, clicks, leads, source, manually_overridden")
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

  const productionCostTotal = productionCosts.reduce(
    (sum, c) => sum + Number(c.amount),
    0,
  );

  const periodQuery = period
    ? `periodType=${period.periodType}&${
        period.periodType === "monthly"
          ? `periodMonth=${sp.periodMonth}`
          : `periodWeekStart=${sp.periodWeekStart}`
      }&locationId=${locationId ?? ""}`
    : "";

  return (
    <>
      <PageHeader
        title="施策データ"
        eyebrow="CAMPAIGNS"
        actions={
          <Link href={`/agency/clients/${clientId}/campaigns/channels`} className="text-sm text-accent hover:underline">
            施策マスタ管理 →
          </Link>
        }
      />

      <Panel title="期間・拠点を選択" className="mb-4 max-w-[560px]">
        <form method="get" className="flex flex-wrap items-end gap-4">
          <PeriodTypeFields
            defaultType={period?.periodType ?? "monthly"}
            defaultMonth={sp.periodMonth}
            defaultWeekStart={sp.periodWeekStart}
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
                {allChannelsWithState.filter((c) => c.isEnabled).map((channel) => {
                  const m = metricsByChannel.get(channel.id);
                  const isAd = channel.type === "ad";
                  return (
                    <Tr key={channel.id}>
                      <Td className="font-semibold text-navy">{channel.name}</Td>
                      <Td>{m ? formatYen(m.cost) : "-"}</Td>
                      <Td>{m?.leads ?? "-"}</Td>
                      <Td>{isAd ? formatPercent(calcCtr(m?.clicks ?? null, m?.impressions ?? null)) : "-"}</Td>
                      <Td>{isAd ? formatYen(calcCpc(m?.cost ?? null, m?.clicks ?? null)) : "-"}</Td>
                      <Td>{isAd ? formatYen(calcCpl(m?.cost ?? null, m?.leads ?? null)) : "-"}</Td>
                      <Td>
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/agency/clients/${clientId}/campaigns/entry?channelId=${channel.id}&${periodQuery}`}
                            className="text-accent hover:underline"
                          >
                            {m ? "編集" : "入力"}
                          </Link>
                          {m?.source === "api" && m.manually_overridden && (
                            <form
                              action={revertToApiValue.bind(null, clientId, channel.id)}
                            >
                              <button
                                type="submit"
                                className="text-xs text-gray-500 hover:underline"
                              >
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
          </Panel>

          <Panel title="制作・クリエイティブ費用" className="mb-4 max-w-[560px]">
            {productionCosts.length > 0 ? (
              <Table className="mb-4">
                <thead>
                  <Tr>
                    <Th>項目名</Th>
                    <Th>金額</Th>
                    <Th />
                  </Tr>
                </thead>
                <tbody>
                  {productionCosts.map((c) => (
                    <Tr key={c.id}>
                      <Td>{c.item_name}</Td>
                      <Td>{formatYen(c.amount)}</Td>
                      <Td>
                        <form
                          action={deleteProductionCost.bind(null, clientId, c.id)}
                        >
                          <button
                            type="submit"
                            className="text-xs text-danger hover:underline"
                          >
                            削除
                          </button>
                        </form>
                      </Td>
                    </Tr>
                  ))}
                  <Tr>
                    <Td className="font-semibold text-navy">合計</Td>
                    <Td className="font-semibold text-navy">
                      {formatYen(productionCostTotal)}
                    </Td>
                    <Td />
                  </Tr>
                </tbody>
              </Table>
            ) : (
              <p className="mb-4 text-sm text-gray-500">
                この期間の制作・クリエイティブ費用はまだありません。
              </p>
            )}
            <form action={addProductionCost} className="flex flex-wrap items-end gap-4">
              <input type="hidden" name="clientId" value={clientId} />
              <input type="hidden" name="locationId" value={locationId ?? ""} />
              <input type="hidden" name="periodType" value={period.periodType} />
              {period.periodType === "monthly" ? (
                <input type="hidden" name="periodMonth" value={sp.periodMonth} />
              ) : (
                <input type="hidden" name="periodWeekStart" value={sp.periodWeekStart} />
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
          </Panel>
        </>
      ) : (
        <p className="mb-4 text-sm text-gray-500">
          期間・拠点を選択して「表示」を押すと、施策一覧・制作費用が表示されます。
        </p>
      )}
    </>
  );
}
