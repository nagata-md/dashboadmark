import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface CallerIdentity {
  type: "agency" | "client";
  id: string;
  name: string;
  /** "client"の場合のみ、その担当者が所属するクライアントのID */
  clientId: string | null;
}

// 施策データ（campaign_metrics）・来場〜契約データ（funnel_metrics）はいずれのテーブルも
// RLSが代理店・住宅会社どちらの書き込みも許可しており（is_authorized_for_client()、ロール
// を問わない）、2026-08-27の方針転換（improvement.md §1-2）で両側からの入力・編集を
// 可能にした。呼び出し元（Server Action）はこのヘルパーで実際の担当者種別を判定し、
// created_by_type/updated_by_typeに反映する。requireAgencyUser/requireClientUserと同じ
// ガード方式（未ログイン・該当ロール無しは/loginへ）。
export async function requireAgencyOrClientUser(): Promise<CallerIdentity> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: agencyUser } = await supabase
    .from("agency_users")
    .select("id, name")
    .eq("id", user.id)
    .maybeSingle();
  if (agencyUser) {
    return { type: "agency", id: agencyUser.id, name: agencyUser.name, clientId: null };
  }

  const { data: clientUser } = await supabase
    .from("client_users")
    .select("id, name, client_id")
    .eq("id", user.id)
    .maybeSingle();
  if (clientUser) {
    return { type: "client", id: clientUser.id, name: clientUser.name, clientId: clientUser.client_id };
  }

  redirect("/login");
}
