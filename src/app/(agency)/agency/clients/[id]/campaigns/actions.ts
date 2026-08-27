"use server";

import { revalidatePath } from "next/cache";
import { requireAgencyUser } from "@/lib/auth/requireAgencyUser";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { resolvePeriod } from "@/lib/campaigns/period";
import { FIELD_KEYS, type FieldKey } from "@/lib/campaigns/fieldKeys";
import { syncConnection } from "@/lib/ads/sync";

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
