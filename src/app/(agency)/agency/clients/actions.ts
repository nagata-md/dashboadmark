"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// 外部アプリ連携用のクライアント識別子（clients.external_client_id、2026-08-27追加）を
// クライアント一覧から編集する。RLS（clients_update）が代理店・住宅会社双方に更新を
// 許可しているため、呼び出し元の権限チェックはRLSに委ねる。
export async function updateExternalClientId(clientId: string, formData: FormData) {
  const supabase = await createClient();

  const raw = String(formData.get("externalClientId") ?? "").trim();
  const externalClientId = raw === "" ? null : raw;

  const { error } = await supabase
    .from("clients")
    .update({ external_client_id: externalClientId })
    .eq("id", clientId);

  if (error) {
    if (error.code === "23505") {
      redirect("/agency/clients?error=external_client_id_duplicate");
    }
    redirect("/agency/clients?error=external_client_id_update_failed");
  }

  redirect("/agency/clients?success=external_client_id_updated");
}
