import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar, type SidebarNavItem } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Table, Tr, Th, Td } from "@/components/ui/Table";
import { requireAgencyUser } from "@/lib/auth/requireAgencyUser";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "クライアント一覧 | 住宅マーケティング数値ダッシュボード（仮称）",
};

const NAV_ITEMS: SidebarNavItem[] = [
  { href: "/agency/clients", label: "クライアント一覧" },
  { href: "/agency/users", label: "ユーザー管理" },
];

// spec §4.1：代理店担当者が担当クライアントを一覧・新規登録する画面（Phase 4）。
export default async function AgencyClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const agencyUser = await requireAgencyUser();
  const { success } = await searchParams;
  const showSuccessMessage = success === "client_created";

  const supabase = await createClient();
  // clients_select の RLS（is_authorized_for_client）により、
  // 自分が割当済みのクライアントのみ返る。
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

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
      <PageHeader
        title="クライアント一覧"
        actions={
          <Link href="/agency/clients/new">
            <Button variant="primary">新規クライアント登録</Button>
          </Link>
        }
      />
      {showSuccessMessage && (
        <p className="mb-4 rounded-control bg-success-tint px-3 py-2 text-xs text-success">
          クライアントを登録し、招待メールを送信しました。相手が本人のメールでリンクを開き、パスワードを設定するとログインできるようになります。
        </p>
      )}
      <Panel>
        {clients && clients.length > 0 ? (
          <Table>
            <thead>
              <Tr>
                <Th>クライアント名</Th>
                <Th>登録日</Th>
                <Th />
              </Tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <Tr key={client.id}>
                  <Td className="font-semibold text-navy">{client.name}</Td>
                  <Td>
                    {new Date(client.created_at).toLocaleDateString("ja-JP")}
                  </Td>
                  <Td>
                    <Link
                      href={`/agency/clients/${client.id}/dashboard`}
                      className="text-accent hover:underline"
                    >
                      ダッシュボードを開く
                    </Link>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <p className="text-sm text-gray-500">
            担当しているクライアントがまだありません。「新規クライアント登録」から追加してください。
          </p>
        )}
      </Panel>
    </AppShell>
  );
}
