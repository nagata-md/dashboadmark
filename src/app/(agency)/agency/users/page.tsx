import { AppShell } from "@/components/layout/AppShell";
import { Sidebar, type SidebarNavItem } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Table, Tr, Th, Td } from "@/components/ui/Table";
import { requireAgencyUser } from "@/lib/auth/requireAgencyUser";
import { agencyWorkspaceDomain } from "@/lib/auth/agencyDomain";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "ユーザー管理 | 住宅マーケティング数値ダッシュボード（仮称）",
};

const NAV_ITEMS: SidebarNavItem[] = [
  { href: "/agency/clients", label: "クライアント一覧" },
  { href: "/agency/users", label: "ユーザー管理" },
];

// spec §4.1：代理店担当者は自社Google Workspaceドメインでの認証・初回ログイン時の
// 自動発行制（招待不要、spec §4.1.1）のため、この画面は一覧表示のみとする
// （2026-08-24、ユーザーと確認して確定）。
export default async function AgencyUsersPage() {
  const agencyUser = await requireAgencyUser();

  const supabase = await createClient();
  const { data: agencyUsers } = await supabase
    .from("agency_users")
    .select("id, name, email, created_at")
    .order("created_at", { ascending: true });

  return (
    <AppShell
      sidebar={
        <Sidebar
          logo="HOUSING DASHBOARD"
          subtitle="住宅マーケティング数値ダッシュボード（代理店）"
          navItems={NAV_ITEMS}
          userName={agencyUser.name}
          userEmail={agencyUser.email}
        />
      }
    >
      <PageHeader title="ユーザー管理" />
      <p className="mb-4 text-sm text-gray-600">
        代理店担当者は招待不要です。自社Googleアカウント（
        <span className="font-semibold">{agencyWorkspaceDomain()}</span>
        ）でこの画面にログインすると、初回ログイン時に自動的にアカウントが作成されます。
      </p>
      <Panel title="代理店担当者一覧">
        {agencyUsers && agencyUsers.length > 0 ? (
          <Table>
            <thead>
              <Tr>
                <Th>氏名</Th>
                <Th>メールアドレス</Th>
                <Th>登録日</Th>
              </Tr>
            </thead>
            <tbody>
              {agencyUsers.map((u) => (
                <Tr key={u.id}>
                  <Td className="font-semibold text-navy">{u.name}</Td>
                  <Td>{u.email}</Td>
                  <Td>{new Date(u.created_at).toLocaleDateString("ja-JP")}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <p className="text-sm text-gray-500">担当者がまだ登録されていません。</p>
        )}
      </Panel>
    </AppShell>
  );
}
