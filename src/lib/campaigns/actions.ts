"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAgencyOrClientUser } from "@/lib/auth/requireAgencyOrClientUser";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { syncConnection } from "@/lib/ads/sync";
import { resolvePeriod } from "./period";

function toNumberOrNull(value: FormDataEntryValue | null): number | null {
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

// spec §4.2.1：施策データの手動入力（1施策・1期間・1拠点ぶんのUPSERT）。
// improvement.md §1-1（2026-08-27）で旧`/campaigns/entry`ページから一覧のモーダル
// （CampaignEditModal）に移設。2026-08-27の方針転換（同§1-2の議論を受けて）で、
// 代理店・住宅会社どちらの担当者からも呼べるよう`requireAgencyOrClientUser`に変更した
// （campaign_metricsのRLSは元々ロールを問わず許可している）。呼び出し元（CampaignEntryView）
// がhidden inputで渡す`basePath`（`/agency/clients/[id]/campaigns` or `/client/campaigns`）へ
// リダイレクトする。
export async function saveCampaignMetric(formData: FormData) {
  const actor = await requireAgencyOrClientUser();

  const clientId =
    actor.type === "client" ? (actor.clientId ?? "") : String(formData.get("clientId") ?? "");
  const channelId = String(formData.get("channelId") ?? "");
  const locationIdRaw = String(formData.get("locationId") ?? "");
  const locationId = locationIdRaw === "" ? null : locationIdRaw;
  const basePath = String(formData.get("basePath") ?? "");

  const period = resolvePeriod({
    periodType: String(formData.get("periodType") ?? ""),
    periodMonth: String(formData.get("periodMonth") ?? ""),
    periodWeekStart: String(formData.get("periodWeekStart") ?? ""),
  });
  if (!clientId || !channelId || !period || !basePath) return;

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
        updated_by_type: actor.type,
        updated_by_id: actor.id,
        updated_at: new Date().toISOString(),
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
      created_by_type: actor.type,
      created_by_id: actor.id,
      updated_by_type: actor.type,
      updated_by_id: actor.id,
    });
  }

  const periodQuery =
    period.periodType === "monthly"
      ? `periodType=monthly&periodMonth=${String(formData.get("periodMonth"))}`
      : `periodType=weekly&periodWeekStart=${period.periodStart}`;
  redirect(`${basePath}?${periodQuery}&locationId=${locationId ?? ""}&success=saved`);
}

// spec §4.2.2「一度手動で上書きした期間・施策の行は、以降の自動同期で自動的に
// 上書きされない（担当者が明示的に『APIの値に戻す』操作をした場合のみ、再度APIの値で
// 上書きされる）」。押した時点で対象の広告アカウントに対して強制的に再同期する
// （過去の同期値を別途保存しておくのではなく、今の時点のAPI値を都度取得する方針、
// 2026-08-10にユーザーと確認して確定済み）。2026-08-27：代理店・住宅会社どちらからも
// 呼べるようにした（campaign_metricsの手動編集と同じ方針転換）。
export async function revertToApiValue(clientId: string, channelId: string) {
  await requireAgencyOrClientUser();
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
  revalidatePath("/client/campaigns");
}
