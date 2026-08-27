import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { confirmInvite } from "./actions";

export const metadata = {
  title: "アカウント確認 | 住宅マーケティング数値ダッシュボード（仮称）",
};

// メール内リンクの遷移先（GET）。ここではトークンを検証せず、ユーザーのクリック
// （下のフォームのPOST）でのみ検証する（actions.ts参照）。
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{
    token_hash?: string;
    type?: string;
    next?: string;
  }>;
}) {
  const { token_hash: tokenHash, type, next } = await searchParams;

  if (!tokenHash || !type) {
    redirect("/login?error=invite_link_invalid");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy px-4">
      <div className="w-full max-w-[360px] rounded-panel bg-white p-9 text-center shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
        <div className="font-archivo mb-1.5 text-[22px] font-bold tracking-[0.06em] text-navy">
          HOUSING DASHBOARD
        </div>
        <p className="mb-6 text-sm text-gray-700">
          招待を確認し、アカウントを有効化します。
        </p>
        <form action={confirmInvite}>
          <input type="hidden" name="token_hash" value={tokenHash} />
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="next" value={next || "/set-password"} />
          <Button type="submit" variant="primary" className="w-full justify-center">
            アカウントを有効化する
          </Button>
        </form>
      </div>
    </div>
  );
}
