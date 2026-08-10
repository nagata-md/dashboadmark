import { PageHeader } from "@/components/layout/PageHeader";
import { ReportsView } from "@/components/reports/ReportsView";
import { CURRENT_CLIENT_ID } from "@/lib/mock/data";

export default function ClientReportsPage() {
  return (
    <>
      <PageHeader title="レポート" eyebrow="REPORTS" />
      <ReportsView clientId={CURRENT_CLIENT_ID} generatedByType="client" />
    </>
  );
}
