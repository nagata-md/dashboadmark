import { Button } from "@/components/ui/Button";
import { FormRow } from "@/components/ui/FormRow";
import { signInWithGoogle, signInWithPassword } from "./actions";

export const metadata = {
  title: "ログイン | 住宅マーケティング数値ダッシュボード（仮称）",
};

// spec §4.1.1：代理店担当者はGoogle認証、住宅会社担当者はメール+パスワードの2方式を1画面に併記する。
const ERROR_MESSAGES: Record<string, string> = {
  domain_not_allowed: "社内Googleアカウント以外ではログインできません。",
  auth_failed: "Googleログインに失敗しました。もう一度お試しください。",
  google_unavailable: "Googleログインは現在利用できません。",
  provision_failed:
    "アカウントの作成に失敗しました。管理者にお問い合わせください。",
  invalid_credentials: "メールアドレスまたはパスワードが正しくありません。",
  invite_link_invalid:
    "招待リンクが無効です。代理店担当者に再招待を依頼してください。",
  missing_code: "ログインに失敗しました。もう一度お試しください。",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] : undefined;

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy px-4">
      <div className="w-full max-w-[360px] rounded-panel bg-white p-9 text-center shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
        <div className="font-archivo mb-1.5 text-[22px] font-bold tracking-[0.06em] text-navy">
          HOUSING DASHBOARD
        </div>
        <p className="mb-6 text-sm text-gray-700">
          住宅マーケティング数値ダッシュボード（仮称）
        </p>

        {errorMessage && (
          <p className="mb-4 rounded-control bg-danger-tint px-3 py-2 text-left text-xs text-danger">
            {errorMessage}
          </p>
        )}

        <div className="mb-6 text-left">
          <p className="mb-2 text-xs font-semibold text-gray-700">
            代理店担当者の方
          </p>
          <form action={signInWithGoogle}>
            <Button type="submit" className="w-full justify-center">
              Googleでログイン
            </Button>
          </form>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-300" />
          <span className="text-[11px] text-gray-500">または</span>
          <div className="h-px flex-1 bg-gray-300" />
        </div>

        <div className="text-left">
          <p className="mb-2 text-xs font-semibold text-gray-700">
            住宅会社担当者の方
          </p>
          <form action={signInWithPassword}>
            <FormRow label="メールアドレス">
              <input type="email" name="email" autoComplete="email" required />
            </FormRow>
            <FormRow label="パスワード">
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
              />
            </FormRow>
            <Button
              type="submit"
              variant="primary"
              className="mt-2 w-full justify-center"
            >
              ログイン
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
