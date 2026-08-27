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

// spec §4.3：契約（成約）数の入力（住宅会社側）。契約金額（売上）はv1では扱わない（決定済み）。
export async function saveContracts(formData: FormData) {
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
      contracts: toNonNegativeInt(formData.get("contracts")),
    },
  });

  const periodQuery =
    period.periodType === "monthly"
      ? `periodType=monthly&periodMonth=${String(formData.get("periodMonth"))}`
      : `periodType=weekly&periodWeekStart=${period.periodStart}`;
  redirect(`/client/contracts?${periodQuery}&locationId=${locationId ?? ""}&success=saved`);
}
