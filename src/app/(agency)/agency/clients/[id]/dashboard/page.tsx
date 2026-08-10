import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { getClient } from "@/lib/mock/data";

export default async function AgencyDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = getClient(id);
  if (!client) notFound();

  return (
    <>
      <PageHeader title="ダッシュボード" eyebrow="DASHBOARD" />
      <DashboardView clientId={id} />
    </>
  );
}
