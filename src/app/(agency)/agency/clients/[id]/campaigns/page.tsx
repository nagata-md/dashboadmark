import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { CampaignsView } from "@/components/campaigns/CampaignsView";
import { getClient } from "@/lib/mock/data";

export default async function AgencyCampaignsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = getClient(id);
  if (!client) notFound();

  return (
    <>
      <PageHeader title="施策データ" eyebrow="CAMPAIGNS" />
      <CampaignsView clientId={id} />
    </>
  );
}
