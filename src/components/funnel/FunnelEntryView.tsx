import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { FormRow } from "@/components/ui/FormRow";
import { Button } from "@/components/ui/Button";
import { PeriodTypeFields } from "@/components/forms/PeriodTypeFields";
import { createClient } from "@/lib/supabase/server";
import { resolvePeriod, withDefaultPeriod, type PeriodParams } from "@/lib/campaigns/period";
import { getFunnelMetric } from "@/lib/funnel/upsertFunnelMetric";
import { saveFunnelMetrics } from "@/lib/funnel/actions";

const ACTOR_LABELS: Record<string, string> = {
  agency: "代理店",
  client: "住宅会社",
};

export interface FunnelEntrySearchParams extends PeriodParams {
  locationId?: string;
  success?: string;
}

// spec §4.3：来場予約数・来場数・見積もり数・図面出し数・契約（成約）数の入力。
// improvement.md §1-2（2026-08-27）：旧`/client/visits`・`/client/proposals`・
// `/client/contracts`の3画面遷移をやめ、1画面（来場／商談／契約の3パネルに分けつつ同一フォーム）
// に統合。同時に代理店側からも入力できるようにした（`/agency/clients/[id]/funnel`）。
export async function FunnelEntryView({
  clientId,
  basePath,
  searchParams,
}: {
  clientId: string;
  basePath: string;
  searchParams: FunnelEntrySearchParams;
}) {
  const effectiveSp = withDefaultPeriod(searchParams);
  const period = resolvePeriod(effectiveSp);
  const locationId = searchParams.locationId && searchParams.locationId !== "" ? searchParams.locationId : null;

  const supabase = await createClient();
  const { data: locations } = await supabase
    .from("locations")
    .select("id, name")
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });

  const existing = period ? await getFunnelMetric(clientId, locationId, period.periodType, period.periodStart) : null;

  const lastUpdatedLabel =
    existing?.updated_at && existing.updated_by_type
      ? `最終更新: ${ACTOR_LABELS[existing.updated_by_type] ?? existing.updated_by_type} · ${new Date(existing.updated_at).toLocaleString("ja-JP")}`
      : null;

  return (
    <>
      <PageHeader title="来場〜契約入力" eyebrow="FUNNEL" />
      {searchParams.success === "saved" && (
        <p className="mb-4 rounded-control bg-success-tint px-3 py-2 text-xs text-success">
          保存しました。
        </p>
      )}

      <Panel title="期間・拠点を選択" className="mb-4 max-w-[560px]">
        <form method="get" className="flex flex-wrap items-end gap-4">
          <PeriodTypeFields
            defaultType={period?.periodType ?? "monthly"}
            defaultMonth={effectiveSp.periodMonth}
            defaultWeekStart={effectiveSp.periodWeekStart}
          />
          <FormRow label="拠点" className="mb-0">
            <select name="locationId" defaultValue={locationId ?? ""}>
              <option value="">全社共通</option>
              {(locations ?? []).map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </FormRow>
          <Button type="submit" variant="primary">
            表示
          </Button>
        </form>
      </Panel>

      {period ? (
        <Panel title="来場・商談・契約" className="max-w-[560px]">
          {lastUpdatedLabel && <p className="mb-4 text-xs text-gray-500">{lastUpdatedLabel}</p>}
          <form action={saveFunnelMetrics}>
            <input type="hidden" name="clientId" value={clientId} />
            <input type="hidden" name="basePath" value={basePath} />
            <input type="hidden" name="locationId" value={locationId ?? ""} />
            <input type="hidden" name="periodType" value={period.periodType} />
            {period.periodType === "monthly" ? (
              <input type="hidden" name="periodMonth" value={effectiveSp.periodMonth} />
            ) : (
              <input type="hidden" name="periodWeekStart" value={effectiveSp.periodWeekStart} />
            )}

            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">来場</div>
            <FormRow label="来場予約数">
              <input type="number" name="visit_reservations" min={0} defaultValue={existing?.visit_reservations ?? 0} />
            </FormRow>
            <FormRow label="来場数">
              <input type="number" name="visits" min={0} defaultValue={existing?.visits ?? 0} />
            </FormRow>

            <div className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">商談</div>
            <FormRow label="見積もり数">
              <input type="number" name="estimates" min={0} defaultValue={existing?.estimates ?? 0} />
            </FormRow>
            <FormRow label="図面出し数">
              <input type="number" name="floor_plans" min={0} defaultValue={existing?.floor_plans ?? 0} />
            </FormRow>

            <div className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">契約</div>
            <FormRow label="契約（成約）数">
              <input type="number" name="contracts" min={0} defaultValue={existing?.contracts ?? 0} />
            </FormRow>

            <Button type="submit" variant="primary">
              保存
            </Button>
          </form>
        </Panel>
      ) : (
        <p className="text-sm text-gray-500">
          期間・拠点を選択して「表示」を押すと、入力フォームが表示されます。
        </p>
      )}
    </>
  );
}
