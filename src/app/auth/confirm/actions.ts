"use server";

import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// 招待・パスワードリセット等のリンク確認（spec §4.1.1）。
// トークンの検証は、ユーザー本人によるこのServer Action呼び出し（POST）でのみ行う。
// GETリクエスト（メールクライアントによる自動リンクスキャン等）でverifyOtpを呼ぶと、
// ユーザーが実際にリンクをクリックする前にトークンが消費され「招待リンクが無効です」
// になってしまう不具合が実際に発生したため、ページ表示（GET）とトークン検証（POST）を分離した。
export async function confirmInvite(formData: FormData) {
  const tokenHash = String(formData.get("token_hash") ?? "");
  const type = String(formData.get("type") ?? "") as EmailOtpType;
  const next = String(formData.get("next") || "/set-password");

  if (!tokenHash || !type) {
    redirect("/login?error=invite_link_invalid");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    redirect("/login?error=invite_link_invalid");
  }

  redirect(next);
}
