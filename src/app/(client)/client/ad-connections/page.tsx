import { PageHeader } from "@/components/layout/PageHeader";
import { AdConnectionsView } from "@/components/ads/AdConnectionsView";
import { CURRENT_CLIENT_ID } from "@/lib/mock/data";

export default function ClientAdConnectionsPage() {
  return (
    <>
      <PageHeader title="広告アカウント接続" eyebrow="AD CONNECTIONS" />
      <AdConnectionsView clientId={CURRENT_CLIENT_ID} />
    </>
  );
}
