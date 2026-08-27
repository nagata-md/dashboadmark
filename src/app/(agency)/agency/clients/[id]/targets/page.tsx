import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { FormRow } from "@/components/ui/FormRow";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { KPI_LABELS } from "@/lib/targets/kpiLabels";
import { saveTargets } from "./actions";

export const metadata = {
  title: "目標設定 | 住宅マーケティング数値ダッシュボード（仮称）",
};

// spec §4.4：代理店担当者がクライアントごとに月次でKPI目標値を設定する
// （拠点別の目標設定は行わない、会社全体に対してのみ設定する）。
export default async function TargetsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ periodMonth?: string; success?: string }>;
}) {
  const { id: clientId } = await params;
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .maybeSingle();
  if (!client) notFound();

  const periodMonth = sp.periodMonth ?? "";
  const periodStart = periodMonth ? `${periodMonth}-01` : null;

  const { data: targets } = periodStart
    ? await supabase
        .from("targets")
        .select("kpi_key, target_value")
        .eq("client_id", clientId)
        .eq("period_start", periodStart)
    : { data: null };

  const targetByKpiKey = new Map((targets ?? []).map((t) => [t.kpi_key, t.target_value]));

  return (
    <>
      <PageHeader title="目標設定" />
      {sp.success === "saved" && (
        <p className="mb-4 rounded-control bg-success-tint px-3 py-2 text-xs text-success">
          保存しました。
        </p>
      )}
      <Panel title="対象月を選択" className="mb-4 max-w-[420px]">
        <form method="get" className="flex flex-wrap items-end gap-4">
          <FormRow label="対象月" className="mb-0">
            <input type="month" name="periodMonth" defaultValue={periodMonth} />
          </FormRow>
          <Button type="submit" variant="primary">
            表示
          </Button>
        </form>
      </Panel>

      {periodStart ? (
        <Panel title="月次KPI目標" className="max-w-[420px]">
          <form action={saveTargets}>
            <input type="hidden" name="clientId" value={clientId} />
            <input type="hidden" name="periodMonth" value={periodMonth} />
            {KPI_LABELS.map(({ kpiKey, label }) => (
              <FormRow key={kpiKey} label={label}>
                <input
                  type="number"
                  name={`target_${kpiKey}`}
                  min={0}
                  defaultValue={targetByKpiKey.get(kpiKey) ?? ""}
                />
              </FormRow>
            ))}
            <p className="mb-4 text-xs text-gray-500">
              空欄で保存すると、その項目の目標は未設定に戻ります。
            </p>
            <Button type="submit" variant="primary">
              保存
            </Button>
          </form>
        </Panel>
      ) : (
        <p className="text-sm text-gray-500">
          対象月を選択して「表示」を押すと、目標設定フォームが表示されます。
        </p>
      )}
    </>
  );
}
