import { requireClientUser } from "@/lib/auth/requireClientUser";
import { FunnelEntryView, type FunnelEntrySearchParams } from "@/components/funnel/FunnelEntryView";

export const metadata = {
  title: "来場〜契約入力 | 住宅マーケティング数値ダッシュボード（仮称）",
};

// spec §4.3：来場予約数〜契約数の入力（住宅会社側）。improvement.md §1-2で
// 旧`/client/visits`・`/client/proposals`・`/client/contracts`を統合した画面。
export default async function ClientFunnelPage({
  searchParams,
}: {
  searchParams: Promise<FunnelEntrySearchParams>;
}) {
  const clientUser = await requireClientUser();
  const sp = await searchParams;

  return <FunnelEntryView clientId={clientUser.client_id} basePath="/client/funnel" searchParams={sp} />;
}
