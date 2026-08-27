"use server";

import { redirect } from "next/navigation";
import { requireAgencyUser } from "@/lib/auth/requireAgencyUser";
import { createClient } from "@/lib/supabase/server";
import { resolvePeriod } from "@/lib/campaigns/period";

function toNumberOrNull(value: FormDataEntryValue | null): number | null {
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

// spec §4.2.1：施策データの手動入力（1施策・1期間・1拠点ぶんのUPSERT）。
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

  const values = {
    cost: toNumberOrNull(formData.get("cost")),
    impressions: toNumberOrNull(formData.get("impressions")),
    clicks: toNumberOrNull(formData.get("clicks")),
    followers: toNumberOrNull(formData.get("followers")),
    posts: toNumberOrNull(formData.get("posts")),
    views: toNumberOrNull(formData.get("views")),
    inflow_rate: toNumberOrNull(formData.get("inflow_rate")),
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
    `/agency/clients/${clientId}/campaigns?${periodQuery}&locationId=${locationId ?? ""}`,
  );
}
