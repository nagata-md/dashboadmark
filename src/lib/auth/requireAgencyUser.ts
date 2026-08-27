import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// /agency/* ページ共通のガード。未ログイン・代理店ユーザーでない場合は/loginへ戻す
// （spec §4.1.1：代理店担当者はGoogle認証、agency_usersに行があることが条件）。
export async function requireAgencyUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: agencyUser } = await supabase
    .from("agency_users")
    .select("id, name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (!agencyUser) {
    redirect("/login");
  }

  return agencyUser;
}
