"use server";

import { redirect } from "next/navigation";
import { requireClientUser } from "@/lib/auth/requireClientUser";
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

// spec §4.6：レポート生成（住宅会社側）。代理店側actions.tsと同じロジック（clientIdの取得元だけ異なる）。
export async function generateReport(formData: FormData) {
  const clientUser = await requireClientUser();
  const clientId = clientUser.client_id;

  const base = resolveReportPeriod(readPeriodParams(formData, ""));
  if (!base) {
    redirect(`/client/reports?error=invalid_period`);
  }

  const includeCompare = formData.get("includeCompare") === "on";
  const compare = includeCompare ? resolveReportPeriod(readPeriodParams(formData, "compare")) : null;
  if (includeCompare && !compare) {
    redirect(`/client/reports?error=invalid_period`);
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
      generated_by_type: "client",
      generated_by_id: clientUser.id,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    redirect(`/client/reports?error=generate_failed`);
  }

  redirect(`/client/reports?success=generated&selected=${inserted.id}`);
}
