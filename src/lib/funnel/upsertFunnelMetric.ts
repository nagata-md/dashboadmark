import { createClient } from "@/lib/supabase/server";

type FunnelFields = Partial<{
  visit_reservations: number;
  visits: number;
  estimates: number;
  floor_plans: number;
  contracts: number;
}>;

interface UpsertFunnelMetricInput {
  clientId: string;
  locationId: string | null;
  periodType: "monthly" | "weekly";
  periodStart: string;
  actorType: "agency" | "client";
  actorId: string;
  fields: FunnelFields;
}

// spec §4.3：来場予約〜契約の各段階の入力（2026-08-27方針転換：代理店・住宅会社どちらの
// 担当者からも入力・編集できる、improvement.md §1-2参照）。同じ funnel_metrics 行
// （client_id+location_id+period_type+period_startがキー）に対してUPSERTする。
// campaign_metrics と同様、location_id の null 有無で部分ユニークインデックスが分かれている
// ため、PostgRESTの upsert(onConflict) は使わず既存行をSELECTしてから UPDATE/INSERT を
// 切り替える。
export async function upsertFunnelMetric({
  clientId,
  locationId,
  periodType,
  periodStart,
  actorType,
  actorId,
  fields,
}: UpsertFunnelMetricInput) {
  const supabase = await createClient();

  let existingQuery = supabase
    .from("funnel_metrics")
    .select("id")
    .eq("client_id", clientId)
    .eq("period_type", periodType)
    .eq("period_start", periodStart);
  existingQuery = locationId
    ? existingQuery.eq("location_id", locationId)
    : existingQuery.is("location_id", null);
  const { data: existing } = await existingQuery.maybeSingle();

  if (existing) {
    await supabase
      .from("funnel_metrics")
      .update({
        ...fields,
        updated_by_type: actorType,
        updated_by_id: actorId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("funnel_metrics").insert({
      client_id: clientId,
      location_id: locationId,
      period_type: periodType,
      period_start: periodStart,
      ...fields,
      created_by_type: actorType,
      created_by_id: actorId,
      updated_by_type: actorType,
      updated_by_id: actorId,
    });
  }
}

export async function getFunnelMetric(
  clientId: string,
  locationId: string | null,
  periodType: "monthly" | "weekly",
  periodStart: string,
) {
  const supabase = await createClient();
  let query = supabase
    .from("funnel_metrics")
    .select("visit_reservations, visits, estimates, floor_plans, contracts, updated_by_type, updated_at")
    .eq("client_id", clientId)
    .eq("period_type", periodType)
    .eq("period_start", periodStart);
  query = locationId ? query.eq("location_id", locationId) : query.is("location_id", null);
  const { data } = await query.maybeSingle();
  return data;
}
