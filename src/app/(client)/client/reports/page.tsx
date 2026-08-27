import { PageHeader } from "@/components/layout/PageHeader";
import { ReportsView } from "@/components/reports/ReportsView";
import { RealReports, type RealReportsSearchParams } from "@/components/reports/RealReports";
import { getClient } from "@/lib/mock/data";
import { requireClientUser } from "@/lib/auth/requireClientUser";
import { generateReport } from "./actions";

// spec §4.6 レポート閲覧・エクスポート（住宅会社側）。dashboard/page.tsxと同じ理由で
// requireClientUser()を先に呼び、ログイン中ユーザーのclient_idでモック/実データを判定する。
export default async function ClientReportsPage({
  searchParams,
}: {
  searchParams: Promise<RealReportsSearchParams>;
}) {
  const clientUser = await requireClientUser();

  if (getClient(clientUser.client_id)) {
    return (
      <>
        <PageHeader title="レポート" eyebrow="REPORTS" />
        <ReportsView clientId={clientUser.client_id} generatedByType="client" />
      </>
    );
  }

  const sp = await searchParams;

  return (
    <>
      <PageHeader title="レポート" eyebrow="REPORTS" />
      <RealReports clientId={clientUser.client_id} basePath="/client/reports" generateAction={generateReport} searchParams={sp} />
    </>
  );
}
