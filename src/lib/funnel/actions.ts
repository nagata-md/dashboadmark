"use server";

import { redirect } from "next/navigation";
import { requireAgencyOrClientUser } from "@/lib/auth/requireAgencyOrClientUser";
import { resolvePeriod } from "@/lib/campaigns/period";
import { upsertFunnelMetric } from "./upsertFunnelMetric";

function toNonNegativeInt(value: FormDataEntryValue | null): number {
  if (value === null || value === "") return 0;
  const n = Number(value);
  return Number.isNaN(n) || n < 0 ? 0 : Math.floor(n);
}

// spec §4.3：来場予約数・来場数・見積もり数・図面出し数・契約（成約）数の入力。
// improvement.md §1-2（2026-08-27）：旧`/client/visits`・`/client/proposals`・
// `/client/contracts`の3画面を1画面に統合し、あわせて代理店側からも入力できるようにした
// （旧3アクションのfunnel_metrics書き込みロジックを1つに統合）。
export async function saveFunnelMetrics(formData: FormData) {
  const actor = await requireAgencyOrClientUser();
  // 住宅会社ユーザーは自分の所属クライアント固定（hidden inputの値は信用しない、
  // 旧saveVisits等と同じ方針）。代理店ユーザーはクライアント横断のためhidden inputの値を使う。
  const clientId = actor.type === "client" ? (actor.clientId ?? "") : String(formData.get("clientId") ?? "");
  if (!clientId) return;

  const basePath = String(formData.get("basePath") ?? "");
  if (!basePath) return;

  const locationIdRaw = String(formData.get("locationId") ?? "");
  const locationId = locationIdRaw === "" ? null : locationIdRaw;

  const period = resolvePeriod({
    periodType: String(formData.get("periodType") ?? ""),
    periodMonth: String(formData.get("periodMonth") ?? ""),
    periodWeekStart: String(formData.get("periodWeekStart") ?? ""),
  });
  if (!period) return;

  await upsertFunnelMetric({
    clientId,
    locationId,
    periodType: period.periodType,
    periodStart: period.periodStart,
    actorType: actor.type,
    actorId: actor.id,
    fields: {
      visit_reservations: toNonNegativeInt(formData.get("visit_reservations")),
      visits: toNonNegativeInt(formData.get("visits")),
      estimates: toNonNegativeInt(formData.get("estimates")),
      floor_plans: toNonNegativeInt(formData.get("floor_plans")),
      contracts: toNonNegativeInt(formData.get("contracts")),
    },
  });

  const periodQuery =
    period.periodType === "monthly"
      ? `periodType=monthly&periodMonth=${String(formData.get("periodMonth"))}`
      : `periodType=weekly&periodWeekStart=${period.periodStart}`;
  redirect(`${basePath}?${periodQuery}&locationId=${locationId ?? ""}&success=saved`);
}
