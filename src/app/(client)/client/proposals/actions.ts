"use server";

import { redirect } from "next/navigation";
import { requireClientUser } from "@/lib/auth/requireClientUser";
import { resolvePeriod } from "@/lib/campaigns/period";
import { upsertFunnelMetric } from "@/lib/funnel/upsertFunnelMetric";

function toNonNegativeInt(value: FormDataEntryValue | null): number {
  if (value === null || value === "") return 0;
  const n = Number(value);
  return Number.isNaN(n) || n < 0 ? 0 : Math.floor(n);
}

// spec §4.3：見積もり数・図面出し数の入力（住宅会社側）。来場から分岐する並列の2段階
// のため、件数の合算・重複排除は行わない（§3）。
export async function saveProposals(formData: FormData) {
  const clientUser = await requireClientUser();

  const locationIdRaw = String(formData.get("locationId") ?? "");
  const locationId = locationIdRaw === "" ? null : locationIdRaw;

  const period = resolvePeriod({
    periodType: String(formData.get("periodType") ?? ""),
    periodMonth: String(formData.get("periodMonth") ?? ""),
    periodWeekStart: String(formData.get("periodWeekStart") ?? ""),
  });
  if (!period) return;

  await upsertFunnelMetric({
    clientId: clientUser.client_id,
    locationId,
    periodType: period.periodType,
    periodStart: period.periodStart,
    actorId: clientUser.id,
    fields: {
      estimates: toNonNegativeInt(formData.get("estimates")),
      floor_plans: toNonNegativeInt(formData.get("floor_plans")),
    },
  });

  const periodQuery =
    period.periodType === "monthly"
      ? `periodType=monthly&periodMonth=${String(formData.get("periodMonth"))}`
      : `periodType=weekly&periodWeekStart=${period.periodStart}`;
  redirect(`/client/proposals?${periodQuery}&locationId=${locationId ?? ""}&success=saved`);
}
