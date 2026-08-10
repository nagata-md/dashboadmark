import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar, type SidebarNavItem } from "@/components/layout/Sidebar";
import { getClient } from "@/lib/mock/data";

// 代理店側クライアントスコープのレイアウト（spec §5 `/agency/clients/[id]/...`）。
// Phase 3（認証）着手前のUIモックアップのため、ここではアクセス制御は行わない
// （代理店ユーザーが割当のあるクライアントのみアクセスできる制約は spec §4.1・masterplan Phase 3 で追加する）。

function navItemsFor(id: string): SidebarNavItem[] {
  return [
    { href: `/agency/clients/${id}/dashboard`, label: "ダッシュボード" },
    { href: `/agency/clients/${id}/campaigns`, label: "施策データ" },
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
  const { id } = await params;
  const client = getClient(id);
  if (!client) notFound();

  return (
    <AppShell
      sidebar={
        <Sidebar
          logo="HOUSING DASHBOARD"
          subtitle="住宅マーケティング数値ダッシュボード（代理店）"
          navItems={navItemsFor(id)}
          userName="代理店担当者"
          userEmail="agency@example.com"
        />
      }
    >
      <div className="mb-3 text-[11px] text-gray-500">
        <span className="font-archivo uppercase tracking-[0.1em]">CLIENT</span>{" "}
        <span className="font-semibold text-navy">{client.name}</span>
      </div>
      {children}
    </AppShell>
  );
}
