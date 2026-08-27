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
  actorId: string;
  fields: FunnelFields;
}

// spec §4.3：来場予約〜契約の各段階を、`/client/visits`・`/client/proposals`・
// `/client/contracts` の3画面それぞれから同じ funnel_metrics 行（client_id+location_id+
// period_type+period_start がキー）の異なる列に対してUPSERTする。campaign_metrics と同様、
// location_id の null 有無で部分ユニークインデックスが分かれているため、PostgRESTの
// upsert(onConflict) は使わず既存行をSELECTしてから UPDATE/INSERT を切り替える。
export async function upsertFunnelMetric({
  clientId,
  locationId,
  periodType,
  periodStart,
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
        updated_by_type: "client",
        updated_by_id: actorId,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("funnel_metrics").insert({
      client_id: clientId,
      location_id: locationId,
      period_type: periodType,
      period_start: periodStart,
      ...fields,
      created_by_type: "client",
      created_by_id: actorId,
      updated_by_type: "client",
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
    .select("visit_reservations, visits, estimates, floor_plans, contracts")
    .eq("client_id", clientId)
    .eq("period_type", periodType)
    .eq("period_start", periodStart);
  query = locationId ? query.eq("location_id", locationId) : query.is("location_id", null);
  const { data } = await query.maybeSingle();
  return data;
}
