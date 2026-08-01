import { Button } from "@/components/ui/Button";
import { FormRow } from "@/components/ui/FormRow";

export const metadata = {
  title: "ログイン | 住宅マーケティング数値ダッシュボード（仮称）",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy px-4">
      <div className="w-full max-w-[360px] rounded-panel bg-white p-9 text-center shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
        <div className="font-archivo mb-1.5 text-[22px] font-bold tracking-[0.06em] text-navy">
          HOUSING DASHBOARD
        </div>
        <p className="mb-6 text-sm text-gray-700">
          住宅マーケティング数値ダッシュボード（仮称）
        </p>
        <form className="text-left">
          <FormRow label="メールアドレス">
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
            />
          </FormRow>
          <FormRow label="パスワード">
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
            />
          </FormRow>
          <Button type="submit" variant="primary" className="mt-2 w-full justify-center">
            ログイン
          </Button>
        </form>
      </div>
    </div>
  );
}
