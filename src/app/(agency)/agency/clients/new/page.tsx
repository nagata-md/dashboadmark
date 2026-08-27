import { AppShell } from "@/components/layout/AppShell";
import { Sidebar, type SidebarNavItem } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { FormRow } from "@/components/ui/FormRow";
import { Button } from "@/components/ui/Button";
import { requireAgencyUser } from "@/lib/auth/requireAgencyUser";
import { createClientWithInitialUser } from "./actions";

export const metadata = {
  title: "新規クライアント登録 | 住宅マーケティング数値ダッシュボード（仮称）",
};

const NAV_ITEMS: SidebarNavItem[] = [
  { href: "/agency/clients", label: "クライアント一覧" },
  { href: "/agency/users", label: "ユーザー管理" },
];

const ERROR_MESSAGES: Record<string, string> = {
  missing_fields: "すべての項目を入力してください。",
  create_failed: "クライアントの作成に失敗しました。もう一度お試しください。",
  invite_not_authorized: "権限エラーが発生しました。管理者にお問い合わせください。",
  invite_email_exists:
    "このメールアドレスはすでに登録されています。別のメールアドレスを使用してください。",
  invite_invite_failed:
    "招待メールの送信に失敗しました。時間をおいて再度お試しください。",
  invite_profile_failed:
    "初期アカウントの作成に失敗しました。管理者にお問い合わせください。",
};

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const agencyUser = await requireAgencyUser();
  const { error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] : undefined;

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
      <PageHeader title="新規クライアント登録" />
      <Panel className="max-w-[480px]">
        {errorMessage && (
          <p className="mb-4 rounded-control bg-danger-tint px-3 py-2 text-xs text-danger">
            {errorMessage}
          </p>
        )}
        <form action={createClientWithInitialUser}>
          <FormRow label="クライアント名（住宅会社名）">
            <input type="text" name="clientName" required />
          </FormRow>
          <FormRow label="初期担当者の氏名">
            <input type="text" name="contactName" required />
          </FormRow>
          <FormRow label="初期担当者のメールアドレス">
            <input type="email" name="contactEmail" required />
          </FormRow>
          <p className="mb-4 text-xs text-gray-500">
            登録すると、上記のメールアドレス宛に招待メールが送信されます。本人がリンクからパスワードを設定するとログインできるようになります。
          </p>
          <Button type="submit" variant="primary">
            登録して招待メールを送信
          </Button>
        </form>
      </Panel>
    </AppShell>
  );
}
