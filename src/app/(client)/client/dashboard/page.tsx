import { PageHeader } from "@/components/layout/PageHeader";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { CURRENT_CLIENT_ID } from "@/lib/mock/data";

export default function ClientDashboardPage() {
  return (
    <>
      <PageHeader title="ダッシュボード" eyebrow="DASHBOARD" />
      <DashboardView clientId={CURRENT_CLIENT_ID} />
    </>
  );
}
