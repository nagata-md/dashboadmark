import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar, type SidebarNavItem } from "@/components/layout/Sidebar";
import { getClient } from "@/lib/mock/data";
import { requireAgencyUser } from "@/lib/auth/requireAgencyUser";
import { createClient } from "@/lib/supabase/server";

// 代理店側クライアントスコープのレイアウト（spec §5 `/agency/clients/[id]/...`）。
// 2026-08-20：認証ガードを追加。ダッシュボード・施策データ・レポートはまだ
// lib/mock/data のモックアップのため、clientId が "1"/"2" 等のモック値の場合は
// モックから、実際に /agency/clients/new で作成したクライアントの場合は
// Supabase から名前を取得するハイブリッド構成（Phase 5以降でモック側を置き換えるまでの過渡的対応）。

// 2026-08-27方針転換（improvement.md §1-2）：来場〜契約入力を代理店側からも行えるようにした
// （従来は住宅会社専用だった、spec.md §4.3参照）。
function navItemsFor(id: string): SidebarNavItem[] {
  return [
    { href: `/agency/clients/${id}/dashboard`, label: "ダッシュボード" },
    { href: `/agency/clients/${id}/campaigns`, label: "施策データ" },
    { href: `/agency/clients/${id}/funnel`, label: "来場〜契約入力" },
    { href: `/agency/clients/${id}/targets`, label: "目標設定" },
    { href: `/agency/clients/${id}/locations`, label: "拠点管理" },
    { href: `/agency/clients/${id}/reports`, label: "レポート" },
  ];
}

export default async function AgencyClientLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const agencyUser = await requireAgencyUser();
  const { id } = await params;

  let clientName = getClient(id)?.name;

  if (!clientName) {
    const supabase = await createClient();
    const { data: realClient } = await supabase
      .from("clients")
      .select("name")
      .eq("id", id)
      .maybeSingle();
    clientName = realClient?.name;
  }

  if (!clientName) notFound();

  return (
    <AppShell
      sidebar={
        <Sidebar
          logo="HOUSING DASHBOARD"
          subtitle="住宅マーケティング数値ダッシュボード（代理店）"
          navItems={navItemsFor(id)}
          userName={agencyUser.name}
          userEmail={agencyUser.email}
        />
      }
    >
      <div className="mb-3 text-[11px] text-gray-500">
        <span className="font-archivo uppercase tracking-[0.1em]">CLIENT</span>{" "}
        <span className="font-semibold text-navy">{clientName}</span>
      </div>
      {children}
    </AppShell>
  );
}
