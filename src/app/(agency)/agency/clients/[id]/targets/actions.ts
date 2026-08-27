"use server";

import { redirect } from "next/navigation";
import { requireAgencyUser } from "@/lib/auth/requireAgencyUser";
import { createClient } from "@/lib/supabase/server";
import { KPI_LABELS } from "@/lib/targets/kpiLabels";
import { getVisibleAdChannels } from "@/lib/targets/visibleAdChannels";
import { buildFiscalYearMonths } from "@/lib/targets/fiscalYearGrid";

// クライアントごとの事業年度開始月（§4-1）。クライアント編集画面がまだ無いため、
// 目標・予算画面から直接設定できるようにする。
export async function saveFiscalYearStartMonth(formData: FormData) {
  await requireAgencyUser();

  const clientId = String(formData.get("clientId") ?? "");
  const tab = String(formData.get("tab") ?? "channel");
  const fiscalStartMonth = Number(formData.get("fiscalYearStartMonth"));
  if (!clientId || !Number.isInteger(fiscalStartMonth) || fiscalStartMonth < 1 || fiscalStartMonth > 12) return;

  const supabase = await createClient();
  await supabase.from("clients").update({ fiscal_year_start_month: fiscalStartMonth }).eq("id", clientId);

  redirect(`/agency/clients/${clientId}/targets?tab=${tab}`);
}

// チャネル別計画（反響数目標・予算、§9-1・§9-2）を1拠点スコープ・年間12ヶ月ぶん一括保存する。
// campaign_targetsのUNIQUE制約はlocation_idがnullかどうかで別々の部分インデックスに分かれており
// PostgRESTのupsert(onConflict)では正しく指定できないため（campaign_metricsと同じ理由、
// upsertFunnelMetric.ts参照）、既存行をまとめてSELECTしてからinsert/update(id指定)/deleteに
// 振り分ける。
export async function saveChannelPlan(formData: FormData) {
  const agencyUser = await requireAgencyUser();

  const clientId = String(formData.get("clientId") ?? "");
  const locationIdRaw = String(formData.get("locationId") ?? "");
  const locationId = locationIdRaw === "" ? null : locationIdRaw;
  const fiscalStartMonth = Number(formData.get("fiscalStartMonth"));
  const baseYear = Number(formData.get("baseYear"));
  if (!clientId || !Number.isInteger(fiscalStartMonth) || !Number.isInteger(baseYear)) return;

  const supabase = await createClient();
  const channels = await getVisibleAdChannels(supabase, clientId);
  const months = buildFiscalYearMonths(fiscalStartMonth, baseYear);

  let existingQuery = supabase
    .from("campaign_targets")
    .select("id, channel_id, period_start")
    .eq("client_id", clientId)
    .in(
      "period_start",
      months.map((m) => m.periodStart),
    );
  existingQuery = locationId ? existingQuery.eq("location_id", locationId) : existingQuery.is("location_id", null);
  const { data: existingRows } = await existingQuery;
  const existingByKey = new Map((existingRows ?? []).map((r) => [`${r.channel_id}_${r.period_start}`, r.id]));

  const inserts: Record<string, unknown>[] = [];
  const updates: Record<string, unknown>[] = [];
  const deleteIds: string[] = [];

  for (const channel of channels) {
    for (const month of months) {
      const leadsStr = String(formData.get(`leads_${channel.id}_${month.key}`) ?? "").trim();
      const budgetStr = String(formData.get(`budget_${channel.id}_${month.key}`) ?? "").trim();
      const key = `${channel.id}_${month.periodStart}`;
      const existingId = existingByKey.get(key);

      if (leadsStr === "" && budgetStr === "") {
        if (existingId) deleteIds.push(existingId);
        continue;
      }

      const targetLeads = leadsStr === "" ? null : Number(leadsStr);
      const budgetAmount = budgetStr === "" ? null : Number(budgetStr);
      if (targetLeads != null && (Number.isNaN(targetLeads) || targetLeads < 0)) continue;
      if (budgetAmount != null && (Number.isNaN(budgetAmount) || budgetAmount < 0)) continue;

      const row = {
        client_id: clientId,
        location_id: locationId,
        channel_id: channel.id,
        period_start: month.periodStart,
        target_leads: targetLeads,
        budget_amount: budgetAmount,
        updated_by_type: "agency" as const,
        updated_by_id: agencyUser.id,
      };
      if (existingId) {
        updates.push({ id: existingId, ...row });
      } else {
        inserts.push({ ...row, created_by_type: "agency", created_by_id: agencyUser.id });
      }
    }
  }

  if (inserts.length > 0) await supabase.from("campaign_targets").insert(inserts);
  if (updates.length > 0) await supabase.from("campaign_targets").upsert(updates, { onConflict: "id" });
  if (deleteIds.length > 0) await supabase.from("campaign_targets").delete().in("id", deleteIds);

  redirect(
    `/agency/clients/${clientId}/targets?tab=channel&locationId=${locationId ?? ""}&year=${baseYear}&success=saved`,
  );
}

// 会社全体KPI（来場予約数・来場数・契約数、§4-1）を年間12ヶ月ぶん一括保存する。
// targetsテーブルのUNIQUE制約はlocation_idを持たない通常の制約のため、upsert(onConflict)を
// そのまま使える（campaign_targetsと異なる点、既存のsaveTargetsと同じ方式）。
export async function saveCompanyKpiGrid(formData: FormData) {
  await requireAgencyUser();

  const clientId = String(formData.get("clientId") ?? "");
  const fiscalStartMonth = Number(formData.get("fiscalStartMonth"));
  const baseYear = Number(formData.get("baseYear"));
  if (!clientId || !Number.isInteger(fiscalStartMonth) || !Number.isInteger(baseYear)) return;

  const months = buildFiscalYearMonths(fiscalStartMonth, baseYear);
  const supabase = await createClient();

  const upsertRows: { client_id: string; kpi_key: string; period_start: string; target_value: number }[] = [];
  const deletesByKpi = new Map<string, string[]>();

  for (const { kpiKey } of KPI_LABELS) {
    for (const month of months) {
      const raw = String(formData.get(`kpi_${kpiKey}_${month.key}`) ?? "").trim();
      if (raw === "") {
        const arr = deletesByKpi.get(kpiKey) ?? [];
        arr.push(month.periodStart);
        deletesByKpi.set(kpiKey, arr);
        continue;
      }
      const value = Number(raw);
      if (Number.isNaN(value) || value < 0) continue;
      upsertRows.push({ client_id: clientId, kpi_key: kpiKey, period_start: month.periodStart, target_value: value });
    }
  }

  if (upsertRows.length > 0) {
    await supabase.from("targets").upsert(upsertRows, { onConflict: "client_id,kpi_key,period_start" });
  }
  for (const [kpiKey, periodStarts] of deletesByKpi) {
    await supabase
      .from("targets")
      .delete()
      .eq("client_id", clientId)
      .eq("kpi_key", kpiKey)
      .in("period_start", periodStarts);
  }

  redirect(`/agency/clients/${clientId}/targets?tab=company&year=${baseYear}&success=saved`);
}
