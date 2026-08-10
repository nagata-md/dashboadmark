import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ReportsView } from "@/components/reports/ReportsView";
import { getClient } from "@/lib/mock/data";

export default async function AgencyReportsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = getClient(id);
  if (!client) notFound();

  return (
    <>
      <PageHeader title="レポート" eyebrow="REPORTS" />
      <ReportsView clientId={id} generatedByType="agency" />
    </>
  );
}
