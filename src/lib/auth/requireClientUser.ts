import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// /client/* ページ共通のガード。未ログイン・住宅会社ユーザーでない場合は/loginへ戻す
// （spec §4.1.1：住宅会社担当者はメール+パスワード、client_usersに行があることが条件）。
export async function requireClientUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: clientUser } = await supabase
    .from("client_users")
    .select("id, client_id, name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (!clientUser) {
    redirect("/login");
  }

  return clientUser;
}
