import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { FormRow } from "@/components/ui/FormRow";
import { Button } from "@/components/ui/Button";
import { PeriodTypeFields } from "@/components/forms/PeriodTypeFields";
import { requireClientUser } from "@/lib/auth/requireClientUser";
import { createClient } from "@/lib/supabase/server";
import { resolvePeriod, withDefaultPeriod, type PeriodParams } from "@/lib/campaigns/period";
import { getFunnelMetric } from "@/lib/funnel/upsertFunnelMetric";
import { saveVisits } from "./actions";

export const metadata = {
  title: "来場入力 | 住宅マーケティング数値ダッシュボード（仮称）",
};

type SearchParams = PeriodParams & { locationId?: string; success?: string };

// spec §4.3：来場予約数・来場数の入力（住宅会社側）。
export default async function VisitsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const clientUser = await requireClientUser();
  const sp = await searchParams;
  const effectiveSp = withDefaultPeriod(sp);
  const period = resolvePeriod(effectiveSp);
  const locationId = sp.locationId && sp.locationId !== "" ? sp.locationId : null;

  const supabase = await createClient();
  const { data: locations } = await supabase
    .from("locations")
    .select("id, name")
    .eq("client_id", clientUser.client_id)
    .order("created_at", { ascending: true });

  const existing = period
    ? await getFunnelMetric(clientUser.client_id, locationId, period.periodType, period.periodStart)
    : null;

  return (
    <>
      <PageHeader title="来場入力" />
      {sp.success === "saved" && (
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
        <Panel title="来場予約数・来場数" className="max-w-[420px]">
          <form action={saveVisits}>
            <input type="hidden" name="locationId" value={locationId ?? ""} />
            <input type="hidden" name="periodType" value={period.periodType} />
            {period.periodType === "monthly" ? (
              <input type="hidden" name="periodMonth" value={effectiveSp.periodMonth} />
            ) : (
              <input type="hidden" name="periodWeekStart" value={effectiveSp.periodWeekStart} />
            )}
            <FormRow label="来場予約数">
              <input
                type="number"
                name="visit_reservations"
                min={0}
                defaultValue={existing?.visit_reservations ?? 0}
              />
            </FormRow>
            <FormRow label="来場数">
              <input type="number" name="visits" min={0} defaultValue={existing?.visits ?? 0} />
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
