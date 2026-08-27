import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Table, Tr, Th, Td } from "@/components/ui/Table";
import { FormRow } from "@/components/ui/FormRow";
import { Button } from "@/components/ui/Button";
import { requireClientUser } from "@/lib/auth/requireClientUser";
import { createClient } from "@/lib/supabase/server";
import { inviteAdditionalUser, removeUser } from "./actions";

export const metadata = {
  title: "ユーザー管理 | 住宅マーケティング数値ダッシュボード（仮称）",
};

const ERROR_MESSAGES: Record<string, string> = {
  missing_fields: "氏名・メールアドレスを入力してください。",
  not_authorized: "権限エラーが発生しました。管理者にお問い合わせください。",
  email_exists:
    "このメールアドレスはすでに登録されています。別のメールアドレスを使用してください。",
  invite_failed:
    "招待メールの送信に失敗しました。時間をおいて再度お試しください。",
  profile_failed:
    "アカウントの作成に失敗しました。管理者にお問い合わせください。",
  remove_not_authorized: "権限エラーが発生しました。管理者にお問い合わせください。",
  remove_self_removal: "自分自身は削除できません。",
  remove_not_found: "対象のユーザーが見つかりませんでした。",
  remove_delete_failed: "削除に失敗しました。時間をおいて再度お試しください。",
};

const SUCCESS_MESSAGES: Record<string, string> = {
  invited:
    "招待メールを送信しました。相手が本人のメールでリンクを開き、パスワードを設定するとログインできるようになります。",
  removed: "ユーザーを削除しました。",
};

// spec §4.1：「追加のユーザー招待は…自分の所属側のユーザーを追加できる」の住宅会社側。
export default async function ClientUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const clientUser = await requireClientUser();
  const { error, success } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] : undefined;
  const successMessage = success ? SUCCESS_MESSAGES[success] : undefined;

  const supabase = await createClient();
  const { data: users } = await supabase
    .from("client_users")
    .select("id, name, email, created_at")
    .eq("client_id", clientUser.client_id)
    .order("created_at", { ascending: true });

  return (
    <>
      <PageHeader title="ユーザー管理" />
      {successMessage && (
        <p className="mb-4 rounded-control bg-success-tint px-3 py-2 text-xs text-success">
          {successMessage}
        </p>
      )}
      {errorMessage && (
        <p className="mb-4 rounded-control bg-danger-tint px-3 py-2 text-xs text-danger">
          {errorMessage}
        </p>
      )}
      <Panel title="担当者一覧" className="mb-4">
        {users && users.length > 0 ? (
          <Table>
            <thead>
              <Tr>
                <Th>氏名</Th>
                <Th>メールアドレス</Th>
                <Th>登録日</Th>
                <Th />
              </Tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <Tr key={u.id}>
                  <Td className="font-semibold text-navy">{u.name}</Td>
                  <Td>{u.email}</Td>
                  <Td>{new Date(u.created_at).toLocaleDateString("ja-JP")}</Td>
                  <Td>
                    {u.id === clientUser.id ? (
                      <span className="text-xs text-gray-400">(自分)</span>
                    ) : (
                      <form action={removeUser.bind(null, u.id)}>
                        <button
                          type="submit"
                          className="text-xs text-danger hover:underline"
                        >
                          削除
                        </button>
                      </form>
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <p className="text-sm text-gray-500">担当者がまだ登録されていません。</p>
        )}
      </Panel>
      <Panel title="担当者を追加" className="max-w-[420px]">
        <form action={inviteAdditionalUser}>
          <FormRow label="氏名">
            <input type="text" name="name" required />
          </FormRow>
          <FormRow label="メールアドレス">
            <input type="email" name="email" required />
          </FormRow>
          <p className="mb-4 text-xs text-gray-500">
            登録すると、上記のメールアドレス宛に招待メールが送信されます。本人がリンクからパスワードを設定するとログインできるようになります。
          </p>
          <Button type="submit" variant="primary">
            招待メールを送信
          </Button>
        </form>
      </Panel>
    </>
  );
}
