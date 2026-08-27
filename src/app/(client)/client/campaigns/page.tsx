import { requireClientUser } from "@/lib/auth/requireClientUser";
import { CampaignEntryView, type CampaignEntrySearchParams } from "@/components/campaigns/CampaignEntryView";

export const metadata = {
  title: "施策データ | 住宅マーケティング数値ダッシュボード（仮称）",
};

// 2026-08-27方針転換（improvement.md §1-2）：施策データ入力を住宅会社側からも行えるように
// する。施策マスタ管理（デフォルト施策の有効/無効・クライアント固有施策の追加）は
// 引き続き代理店のみ（spec.md §4.2.3「住宅会社側には追加権限を持たせない」）のため、
// channelsHrefは渡さない。制作・クリエイティブ費用も代理店のみ編集可（spec §4.2.4）。
export default async function ClientCampaignsPage({
  searchParams,
}: {
  searchParams: Promise<CampaignEntrySearchParams>;
}) {
  const clientUser = await requireClientUser();
  const sp = await searchParams;

  return (
    <CampaignEntryView
      clientId={clientUser.client_id}
      basePath="/client/campaigns"
      viewerType="client"
      searchParams={sp}
    />
  );
}
