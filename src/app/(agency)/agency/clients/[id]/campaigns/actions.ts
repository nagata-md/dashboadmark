"use server";

import { revalidatePath } from "next/cache";
import { requireAgencyUser } from "@/lib/auth/requireAgencyUser";
import { createClient } from "@/lib/supabase/server";
import { resolvePeriod } from "@/lib/campaigns/period";
import { FIELD_KEYS, type FieldKey } from "@/lib/campaigns/fieldKeys";

// saveCampaignMetric・revertToApiValueは2026-08-27の方針転換（improvement.md §1-2）で
// 代理店・住宅会社どちらからも呼べる必要が生じたため、`src/lib/campaigns/actions.ts`
// （route非依存の共有場所）に移設した。呼び出し元は`@/lib/campaigns/actions`から
// 直接importする。このファイルには代理店専用の操作（施策マスタ・制作費用）のみを残す。

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
