import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar, type SidebarNavItem } from "@/components/layout/Sidebar";

// 住宅会社側レイアウト（spec §5 `/client/...`）。自社データに固定（クライアント切替なし）。
// Phase 3（認証）着手前のUIモックアップのため、ここではアクセス制御は行わない。

const NAV_ITEMS: SidebarNavItem[] = [
  { href: "/client/dashboard", label: "ダッシュボード" },
  { href: "/client/visits", label: "来場入力" },
  { href: "/client/proposals", label: "見積もり・図面出し" },
  { href: "/client/contracts", label: "契約入力" },
  { href: "/client/ad-connections", label: "広告アカウント接続" },
  { href: "/client/locations", label: "拠点管理" },
  { href: "/client/reports", label: "レポート" },
  { href: "/client/users", label: "ユーザー管理" },
];

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      sidebar={
        <Sidebar
          logo="HOUSING DASHBOARD"
          subtitle="住宅マーケティング数値ダッシュボード"
          navItems={NAV_ITEMS}
          userName="住宅会社担当者"
          userEmail="client@example.com"
        />
      }
    >
      {children}
    </AppShell>
  );
}
