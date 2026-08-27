import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ReportsView } from "@/components/reports/ReportsView";
import { RealReports, type RealReportsSearchParams } from "@/components/reports/RealReports";
import { getClient } from "@/lib/mock/data";
import { createClient } from "@/lib/supabase/server";
import { generateReport } from "./actions";

// spec §4.6 レポート閲覧・エクスポート。campaigns/page.tsx と同じハイブリッド分岐。
export default async function AgencyReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<RealReportsSearchParams>;
}) {
  const { id } = await params;

  if (getClient(id)) {
    return (
      <>
        <PageHeader title="レポート" eyebrow="REPORTS" />
        <ReportsView clientId={id} generatedByType="agency" />
      </>
    );
  }

  const supabase = await createClient();
  const { data: realClient } = await supabase.from("clients").select("id").eq("id", id).maybeSingle();
  if (!realClient) notFound();

  const sp = await searchParams;

  return (
    <>
      <PageHeader title="レポート" eyebrow="REPORTS" />
      <RealReports
        clientId={id}
        basePath={`/agency/clients/${id}/reports`}
        generateAction={generateReport.bind(null, id)}
        searchParams={sp}
      />
    </>
  );
}
