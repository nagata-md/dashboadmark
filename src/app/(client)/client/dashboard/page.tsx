import { PageHeader } from "@/components/layout/PageHeader";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { RealDashboard, type RealDashboardSearchParams } from "@/components/dashboard/RealDashboard";
import { getClient } from "@/lib/mock/data";
import { requireClientUser } from "@/lib/auth/requireClientUser";

// spec §4.5 ダッシュボード（住宅会社側）。2026-08-27修正：requireClientUser()を先に呼び、
// ログイン中ユーザーのclient_idでモック/実データを判定する（client/ad-connections/page.tsxの
// 旧実装は固定のCURRENT_CLIENT_IDを先に判定していたため常にモックが出る不具合があった。同じ轍を踏まない）。
export default async function ClientDashboardPage({
  searchParams,
}: {
  searchParams: Promise<RealDashboardSearchParams>;
}) {
  const clientUser = await requireClientUser();

  if (getClient(clientUser.client_id)) {
    return (
      <>
        <PageHeader title="ダッシュボード" eyebrow="DASHBOARD" />
        <DashboardView clientId={clientUser.client_id} />
      </>
    );
  }

  const sp = await searchParams;

  return (
    <>
      <PageHeader title="ダッシュボード" eyebrow="DASHBOARD" />
      <RealDashboard clientId={clientUser.client_id} searchParams={sp} />
    </>
  );
}
