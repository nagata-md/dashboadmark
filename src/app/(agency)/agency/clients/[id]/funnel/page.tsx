import { PageHeader } from "@/components/layout/PageHeader";
import { getClient } from "@/lib/mock/data";
import { FunnelEntryView, type FunnelEntrySearchParams } from "@/components/funnel/FunnelEntryView";

export const metadata = {
  title: "来場〜契約入力 | 住宅マーケティング数値ダッシュボード（仮称）",
};

// 2026-08-27方針転換（improvement.md §1-2）：来場〜契約入力を代理店側からも行えるように
// する。認証は親レイアウト（`agency/clients/[id]/layout.tsx`）のrequireAgencyUser()で
// 既にガード済み。この機能はモック実装が存在しないため、Phase 1〜3のモッククライアント
// （id: "1"/"2"）では利用不可（他画面のようなモック分岐は無く、代わりに案内文のみ表示）。
export default async function AgencyFunnelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<FunnelEntrySearchParams>;
}) {
  const { id: clientId } = await params;

  if (getClient(clientId)) {
    return (
      <>
        <PageHeader title="来場〜契約入力" eyebrow="FUNNEL" />
        <p className="text-sm text-gray-500">この機能はモッククライアントでは利用できません。</p>
      </>
    );
  }

  const sp = await searchParams;
  return <FunnelEntryView clientId={clientId} basePath={`/agency/clients/${clientId}/funnel`} searchParams={sp} />;
}
