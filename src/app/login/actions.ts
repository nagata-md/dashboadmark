"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { agencyWorkspaceDomain } from "@/lib/auth/agencyDomain";

// 代理店担当者向け（spec §4.1.1）。自社Google Workspaceドメインのアカウントに絞って
// アカウント選択画面を出す（hdは強制力の無いヒントのため、最終判定は /auth/callback で行う）。
export async function signInWithGoogle() {
  const supabase = await createClient();
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        hd: agencyWorkspaceDomain(),
        prompt: "select_account",
      },
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    redirect("/login?error=google_unavailable");
  }

  redirect(data.url);
}

// 住宅会社担当者向け（spec §4.1.1）。代理店からの招待でパスワード設定済みの前提。
export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=invalid_credentials");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect("/login?error=invalid_credentials");
  }

  redirect("/client/dashboard");
}
