"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAgencyUser } from "@/lib/auth/requireAgencyUser";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { resolvePeriod } from "@/lib/campaigns/period";
import { FIELD_KEYS, type FieldKey } from "@/lib/campaigns/fieldKeys";
import { syncConnection } from "@/lib/ads/sync";

function toNumberOrNull(value: FormDataEntryValue | null): number | null {
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

// spec §4.2.1：施策データの手動入力（1施策・1期間・1拠点ぶんのUPSERT）。
// improvement.md §1-1（2026-08-27）：旧`/campaigns/entry`ページから移設し、一覧ページの
// モーダル（CampaignEditModal）から呼ぶ。ロジック自体は変更していない
// （hidden inputで clientId/channelId/locationId/period を渡す方式もentryページと同じ）。
export async function saveCampaignMetric(formData: FormData) {
  const agencyUser = await requireAgencyUser();

  const clientId = String(formData.get("clientId") ?? "");
  const channelId = String(formData.get("channelId") ?? "");
  const locationIdRaw = String(formData.get("locationId") ?? "");
  const locationId = locationIdRaw === "" ? null : locationIdRaw;

  const period = resolvePeriod({
    periodType: String(formData.get("periodType") ?? ""),
    periodMonth: String(formData.get("periodMonth") ?? ""),
    periodWeekStart: String(formData.get("periodWeekStart") ?? ""),
  });
  if (!clientId || !channelId || !period) return;

  // 流入率は0〜100（%）で入力させ、DBには0〜1の比率で保存する
  // （spec §6のinflow_rate、formatPercentが*100して表示する前提と合わせる）。
  const inflowRatePercent = toNumberOrNull(formData.get("inflow_rate"));

  const values = {
    cost: toNumberOrNull(formData.get("cost")),
    impressions: toNumberOrNull(formData.get("impressions")),
    clicks: toNumberOrNull(formData.get("clicks")),
    followers: toNumberOrNull(formData.get("followers")),
    posts: toNumberOrNull(formData.get("posts")),
    views: toNumberOrNull(formData.get("views")),
    inflow_rate: inflowRatePercent == null ? null : inflowRatePercent / 100,
    leads: toNumberOrNull(formData.get("leads")) ?? 0,
  };

  const supabase = await createClient();

  // campaign_metricsのUNIQUE制約はlocation_idがnullかどうかで別々の部分インデックスに
  // 分かれておりPostgRESTのupsert(onConflict)では正しく指定できないため、
  // 既存行をSELECTしてから UPDATE/INSERT を切り替える。
  let existingQuery = supabase
    .from("campaign_metrics")
    .select("id")
    .eq("client_id", clientId)
    .eq("channel_id", channelId)
    .eq("period_type", period.periodType)
    .eq("period_start", period.periodStart);
  existingQuery = locationId
    ? existingQuery.eq("location_id", locationId)
    : existingQuery.is("location_id", null);
  const { data: existing } = await existingQuery.maybeSingle();

  if (existing) {
    await supabase
      .from("campaign_metrics")
      .update({
        ...values,
        manually_overridden: true,
        updated_by_type: "agency",
        updated_by_id: agencyUser.id,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("campaign_metrics").insert({
      client_id: clientId,
      location_id: locationId,
      channel_id: channelId,
      source: "manual",
      period_type: period.periodType,
      period_start: period.periodStart,
      ...values,
      created_by_type: "agency",
      created_by_id: agencyUser.id,
      updated_by_type: "agency",
      updated_by_id: agencyUser.id,
    });
  }

  const periodQuery =
    period.periodType === "monthly"
      ? `periodType=monthly&periodMonth=${String(formData.get("periodMonth"))}`
      : `periodType=weekly&periodWeekStart=${period.periodStart}`;
  redirect(
    `/agency/clients/${clientId}/campaigns?${periodQuery}&locationId=${locationId ?? ""}&success=saved`,
  );
}

// spec §4.2.3：クライアント固有施策の追加（代理店のみ）。
// enabled_fieldsはチェックボックスで選択、required_fieldsは「費用を選んだ場合は費用のみ必須、
// 他は任意」という決定済みルールに従い自動算出する（ユーザーには選ばせない）。
export async function addCustomChannel(formData: FormData) {
  await requireAgencyUser();

  const clientId = String(formData.get("clientId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  if (!clientId || !name || (type !== "ad" && type !== "organic")) return;

  const enabledFields = FIELD_KEYS.filter(
    (key) => formData.get(`field_${key}`) === "on",
  );
  if (enabledFields.length === 0) return;
  const requiredFields: FieldKey[] = enabledFields.includes("cost")
    ? ["cost"]
    : [];

  const supabase = await createClient();
  const { data: maxSortRow } = await supabase
    .from("campaign_channels")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSortOrder = (maxSortRow?.sort_order ?? 0) + 1;

  await supabase.from("campaign_channels").insert({
    client_id: clientId,
    name,
    type,
    platform: null,
    method: "manual",
    sort_order: nextSortOrder,
    enabled_fields: enabledFields,
    required_fields: requiredFields,
  });

  revalidatePath(`/agency/clients/${clientId}/campaigns`);
  revalidatePath(`/agency/clients/${clientId}/campaigns/channels`);
}

// spec §4.2.4：制作・クリエイティブ費用の入力（代理店のみ）。
export async function addProductionCost(formData: FormData) {
  const agencyUser = await requireAgencyUser();

  const clientId = String(formData.get("clientId") ?? "");
  const locationIdRaw = String(formData.get("locationId") ?? "");
  const locationId = locationIdRaw === "" ? null : locationIdRaw;
  const itemName = String(formData.get("itemName") ?? "").trim();
  const amount = Number(formData.get("amount"));

  const period = resolvePeriod({
    periodType: String(formData.get("periodType") ?? ""),
    periodMonth: String(formData.get("periodMonth") ?? ""),
    periodWeekStart: String(formData.get("periodWeekStart") ?? ""),
  });
  if (!clientId || !itemName || !period || Number.isNaN(amount)) return;

  const supabase = await createClient();
  await supabase.from("production_costs").insert({
    client_id: clientId,
    location_id: locationId,
    period_type: period.periodType,
    period_start: period.periodStart,
    item_name: itemName,
    amount,
    created_by_type: "agency",
    created_by_id: agencyUser.id,
    updated_by_type: "agency",
    updated_by_id: agencyUser.id,
  });

  revalidatePath(`/agency/clients/${clientId}/campaigns`);
}

export async function deleteProductionCost(
  clientId: string,
  costId: string,
) {
  await requireAgencyUser();
  const supabase = await createClient();
  await supabase.from("production_costs").delete().eq("id", costId);
  revalidatePath(`/agency/clients/${clientId}/campaigns`);
}

// spec §4.2.2「一度手動で上書きした期間・施策の行は、以降の自動同期で自動的に
// 上書きされない（担当者が明示的に『APIの値に戻す』操作をした場合のみ、再度APIの値で
// 上書きされる）」。押した時点で対象の広告アカウントに対して強制的に再同期する
// （過去の同期値を別途保存しておくのではなく、今の時点のAPI値を都度取得する方針、
// 2026-08-10にユーザーと確認して確定済み）。
export async function revertToApiValue(clientId: string, channelId: string) {
  await requireAgencyUser();
  const service = createServiceClient();

  const { data: channel } = await service
    .from("campaign_channels")
    .select("platform")
    .eq("id", channelId)
    .maybeSingle();

  if (!channel?.platform) return;

  const { data: connection } = await service
    .from("ad_connections")
    .select("id")
    .eq("client_id", clientId)
    .eq("platform", channel.platform)
    .maybeSingle();

  if (!connection) return;

  await syncConnection(connection.id, { force: true });
  revalidatePath(`/agency/clients/${clientId}/campaigns`);
}

// spec §4.4.1・improvement.md §3-3：デフォルト17施策（client_id is null）のクライアント単位
// 有効/無効の上書き。client_channel_settingsに行が無ければ有効扱いのため、無効化時のみ
// 明示的に行を作る／有効に戻す時は行のenabledをtrueに更新する（削除ではなく更新に統一し、
// 「誰がいつ変更したか」の履歴を残す）。
export async function setDefaultChannelEnabled(clientId: string, channelId: string, enabled: boolean) {
  const agencyUser = await requireAgencyUser();
  const supabase = await createClient();

  await supabase.from("client_channel_settings").upsert(
    {
      client_id: clientId,
      channel_id: channelId,
      enabled,
      updated_by_type: "agency",
      updated_by_id: agencyUser.id,
    },
    { onConflict: "client_id,channel_id" },
  );

  revalidatePath(`/agency/clients/${clientId}/campaigns`);
  revalidatePath(`/agency/clients/${clientId}/campaigns/channels`);
}

// spec §4.4.1・improvement.md §3-3：クライアント固有施策（client_id非null）の無効化。
// 既存のcampaign_metrics/campaign_targetsとの参照整合性を保つため、ハードデリートではなく
// campaign_channels.enabledの切り替えで表現する。
export async function setCustomChannelEnabled(clientId: string, channelId: string, enabled: boolean) {
  await requireAgencyUser();
  const supabase = await createClient();

  await supabase.from("campaign_channels").update({ enabled }).eq("id", channelId).eq("client_id", clientId);

  revalidatePath(`/agency/clients/${clientId}/campaigns`);
  revalidatePath(`/agency/clients/${clientId}/campaigns/channels`);
}
