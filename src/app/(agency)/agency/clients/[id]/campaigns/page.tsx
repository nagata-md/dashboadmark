import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { CampaignsView } from "@/components/campaigns/CampaignsView";
import { CampaignEntryView, type CampaignEntrySearchParams } from "@/components/campaigns/CampaignEntryView";
import { getClient } from "@/lib/mock/data";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "施策データ | 住宅マーケティング数値ダッシュボード（仮称）",
};

// spec §4.2.1（施策データ手動入力）・§4.2.3（クライアント固有施策）・
// §4.2.4（制作・クリエイティブ費用）。
export default async function AgencyCampaignsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<CampaignEntrySearchParams>;
}) {
  const { id: clientId } = await params;

  // Phase 1〜3で確認済みのモッククライアント（id: "1"/"2"）はモック実装のまま維持する。
  if (getClient(clientId)) {
    return (
      <>
        <PageHeader title="施策データ" eyebrow="CAMPAIGNS" />
        <CampaignsView clientId={clientId} />
      </>
    );
  }

  const supabase = await createClient();
  const { data: realClient } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .maybeSingle();
  if (!realClient) notFound();

  const sp = await searchParams;
  return (
    <CampaignEntryView
      clientId={clientId}
      basePath={`/agency/clients/${clientId}/campaigns`}
      channelsHref={`/agency/clients/${clientId}/campaigns/channels`}
      viewerType="agency"
      searchParams={sp}
    />
  );
}
