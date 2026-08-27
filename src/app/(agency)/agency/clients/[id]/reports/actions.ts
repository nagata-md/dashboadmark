"use server";

import { redirect } from "next/navigation";
import { requireAgencyUser } from "@/lib/auth/requireAgencyUser";
import { createClient } from "@/lib/supabase/server";
import { resolveReportPeriod, type ReportPeriodParams } from "@/lib/reports/period";
import { generateReportSnapshot } from "@/lib/reports/generateReport";

function readPeriodParams(formData: FormData, prefix: "" | "compare"): ReportPeriodParams {
  if (prefix === "") {
    return {
      periodType: String(formData.get("periodType") ?? ""),
      periodMonth: String(formData.get("periodMonth") ?? ""),
      periodWeekStart: String(formData.get("periodWeekStart") ?? ""),
      customStart: String(formData.get("customStart") ?? ""),
      customEnd: String(formData.get("customEnd") ?? ""),
    };
  }
  return {
    periodType: String(formData.get("periodType") ?? ""),
    periodMonth: String(formData.get("comparePeriodMonth") ?? ""),
    periodWeekStart: String(formData.get("compareWeekStart") ?? ""),
    customStart: String(formData.get("compareCustomStart") ?? ""),
    customEnd: String(formData.get("compareCustomEnd") ?? ""),
  };
}

// spec §4.6：レポート生成（代理店側）。基準期間（必須）＋任意の比較期間の集計結果を
// スナップショットとして reports テーブルに保存する（生成後に元データが変わっても内容は不変）。
export async function generateReport(clientId: string, formData: FormData) {
  const agencyUser = await requireAgencyUser();

  const base = resolveReportPeriod(readPeriodParams(formData, ""));
  if (!base) {
    redirect(`/agency/clients/${clientId}/reports?error=invalid_period`);
  }

  const includeCompare = formData.get("includeCompare") === "on";
  const compare = includeCompare ? resolveReportPeriod(readPeriodParams(formData, "compare")) : null;
  if (includeCompare && !compare) {
    redirect(`/agency/clients/${clientId}/reports?error=invalid_period`);
  }

  const supabase = await createClient();
  const snapshot = await generateReportSnapshot(supabase, clientId, base, compare);

  const { data: inserted, error } = await supabase
    .from("reports")
    .insert({
      client_id: clientId,
      period_type: base.periodType,
      period_start: base.periodStart,
      period_end: base.periodEnd,
      snapshot_data: snapshot,
      generated_by_type: "agency",
      generated_by_id: agencyUser.id,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    redirect(`/agency/clients/${clientId}/reports?error=generate_failed`);
  }

  redirect(`/agency/clients/${clientId}/reports?success=generated&selected=${inserted.id}`);
}
