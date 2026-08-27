"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormRow } from "@/components/ui/FormRow";
import { createClient } from "@/lib/supabase/client";

// 招待リンク（/auth/confirm）経由でのみ到達する想定（住宅会社担当者、spec §4.1.1）。
export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("パスワードは8文字以上で入力してください。");
      return;
    }
    if (password !== confirmPassword) {
      setError("パスワードが一致しません。");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    setSubmitting(false);

    if (updateError) {
      setError(
        "パスワードの設定に失敗しました。招待リンクの有効期限が切れている場合は、代理店担当者に再招待を依頼してください。",
      );
      return;
    }

    router.push("/client/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy px-4">
      <div className="w-full max-w-[360px] rounded-panel bg-white p-9 text-center shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
        <div className="font-archivo mb-1.5 text-[22px] font-bold tracking-[0.06em] text-navy">
          HOUSING DASHBOARD
        </div>
        <p className="mb-6 text-sm text-gray-700">パスワードの設定</p>
        <form className="text-left" onSubmit={handleSubmit}>
          <FormRow label="新しいパスワード">
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormRow>
          <FormRow label="新しいパスワード（確認）">
            <input
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </FormRow>
          {error && <p className="mb-3 text-xs text-danger">{error}</p>}
          <Button
            type="submit"
            variant="primary"
            disabled={submitting}
            className="mt-2 w-full justify-center"
          >
            {submitting ? "設定中…" : "パスワードを設定してログイン"}
          </Button>
        </form>
      </div>
    </div>
  );
}
