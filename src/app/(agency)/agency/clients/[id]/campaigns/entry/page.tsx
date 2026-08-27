import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { FormRow } from "@/components/ui/FormRow";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { resolvePeriod, type PeriodParams } from "@/lib/campaigns/period";
import { FIELD_LABELS, type FieldKey } from "@/lib/campaigns/fieldKeys";
import { saveCampaignMetric } from "./actions";

export const metadata = {
  title: "施策データ入力 | 住宅マーケティング数値ダッシュボード（仮称）",
};

type SearchParams = PeriodParams & {
  channelId?: string;
  locationId?: string;
};

// spec §4.2.1・§4.2.3：1施策・1期間・1拠点ぶんの数値入力フォーム。
// 表示する入力項目はchannel.enabled_fields/required_fields（デフォルト17施策・
// クライアント固有施策どちらも共通の仕組み、§4.2.3）に従う。
export default async function CampaignEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id: clientId } = await params;
  const sp = await searchParams;
  const period = resolvePeriod(sp);
  const channelId = sp.channelId;
  const locationId = sp.locationId && sp.locationId !== "" ? sp.locationId : null;

  if (!period || !channelId) notFound();

  const supabase = await createClient();
  const { data: channel } = await supabase
    .from("campaign_channels")
    .select("id, name, enabled_fields, required_fields")
    .eq("id", channelId)
    .maybeSingle();
  if (!channel) notFound();

  let existingQuery = supabase
    .from("campaign_metrics")
    .select("cost, impressions, clicks, followers, posts, views, inflow_rate, leads")
    .eq("client_id", clientId)
    .eq("channel_id", channelId)
    .eq("period_type", period.periodType)
    .eq("period_start", period.periodStart);
  existingQuery = locationId
    ? existingQuery.eq("location_id", locationId)
    : existingQuery.is("location_id", null);
  const { data: existing } = await existingQuery.maybeSingle();

  const enabledFields = (channel.enabled_fields ?? []) as FieldKey[];
  const requiredFields = (channel.required_fields ?? []) as FieldKey[];

  return (
    <>
      <PageHeader title={`施策データ入力：${channel.name}`} eyebrow="CAMPAIGNS" />
      <Panel className="max-w-[420px]">
        <form action={saveCampaignMetric}>
          <input type="hidden" name="clientId" value={clientId} />
          <input type="hidden" name="channelId" value={channelId} />
          <input type="hidden" name="locationId" value={locationId ?? ""} />
          <input type="hidden" name="periodType" value={period.periodType} />
          {period.periodType === "monthly" ? (
            <input type="hidden" name="periodMonth" value={sp.periodMonth} />
          ) : (
            <input
              type="hidden"
              name="periodWeekStart"
              value={sp.periodWeekStart}
            />
          )}

          {enabledFields.map((key) => {
            const required = requiredFields.includes(key);
            const existingValue = existing
              ? (existing as Record<string, number | null>)[key]
              : null;
            return (
              <FormRow
                key={key}
                label={`${FIELD_LABELS[key]}${required ? "" : "（任意）"}`}
              >
                <input
                  type="number"
                  name={key}
                  min={0}
                  max={key === "inflow_rate" ? 100 : undefined}
                  step={key === "inflow_rate" ? 0.1 : undefined}
                  required={required}
                  defaultValue={existingValue ?? ""}
                />
              </FormRow>
            );
          })}

          <FormRow label="反響数">
            <input
              type="number"
              name="leads"
              min={0}
              required
              defaultValue={existing?.leads ?? ""}
            />
          </FormRow>

          <Button type="submit" variant="primary">
            保存
          </Button>
        </form>
      </Panel>
    </>
  );
}
