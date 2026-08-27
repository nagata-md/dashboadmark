"use server";

import { redirect } from "next/navigation";
import { requireAgencyUser } from "@/lib/auth/requireAgencyUser";
import { createClient } from "@/lib/supabase/server";
import { KPI_LABELS } from "@/lib/targets/kpiLabels";

// spec §4.4：代理店担当者がクライアントごとに月次でKPI目標値を設定する。
// 空欄で保存した場合はその月・そのKPIの目標を未設定に戻す（targets.target_valueは
// NOT NULLのためnullでは保存できず、行の削除で表現する）。
export async function saveTargets(formData: FormData) {
  await requireAgencyUser();

  const clientId = String(formData.get("clientId") ?? "");
  const periodMonth = String(formData.get("periodMonth") ?? "");
  if (!clientId || !periodMonth) return;
  const periodStart = `${periodMonth}-01`;

  const supabase = await createClient();

  const upsertRows: { client_id: string; kpi_key: string; period_start: string; target_value: number }[] =
    [];
  const deleteKpiKeys: string[] = [];

  for (const { kpiKey } of KPI_LABELS) {
    const raw = formData.get(`target_${kpiKey}`);
    if (raw === null || raw === "") {
      deleteKpiKeys.push(kpiKey);
      continue;
    }
    const value = Number(raw);
    if (Number.isNaN(value) || value < 0) continue;
    upsertRows.push({ client_id: clientId, kpi_key: kpiKey, period_start: periodStart, target_value: value });
  }

  if (upsertRows.length > 0) {
    await supabase
      .from("targets")
      .upsert(upsertRows, { onConflict: "client_id,kpi_key,period_start" });
  }
  if (deleteKpiKeys.length > 0) {
    await supabase
      .from("targets")
      .delete()
      .eq("client_id", clientId)
      .eq("period_start", periodStart)
      .in("kpi_key", deleteKpiKeys);
  }

  redirect(`/agency/clients/${clientId}/targets?periodMonth=${periodMonth}&success=saved`);
}
