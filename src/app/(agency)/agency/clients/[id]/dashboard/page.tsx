import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { RealDashboard, type RealDashboardSearchParams } from "@/components/dashboard/RealDashboard";
import { getClient } from "@/lib/mock/data";
import { createClient } from "@/lib/supabase/server";

// spec §4.5 ダッシュボード。campaigns/page.tsx と同じハイブリッド分岐
// （モッククライアントは従来通りDashboardView、実クライアントはRealDashboard）。
export default async function AgencyDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<RealDashboardSearchParams>;
}) {
  const { id } = await params;

  if (getClient(id)) {
    return (
      <>
        <PageHeader title="ダッシュボード" eyebrow="DASHBOARD" />
        <DashboardView clientId={id} />
      </>
    );
  }

  const supabase = await createClient();
  const { data: realClient } = await supabase.from("clients").select("id").eq("id", id).maybeSingle();
  if (!realClient) notFound();

  const sp = await searchParams;

  return (
    <>
      <PageHeader title="ダッシュボード" eyebrow="DASHBOARD" />
      <RealDashboard clientId={id} searchParams={sp} />
    </>
  );
}
