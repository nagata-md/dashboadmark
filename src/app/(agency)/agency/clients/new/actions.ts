"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { inviteClientUser } from "@/lib/auth/inviteClientUser";

// spec §4.1：新規クライアント登録と同時に住宅会社側の初期アカウントを発行する。
export async function createClientWithInitialUser(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const name = String(formData.get("clientName") ?? "").trim();
  const contactName = String(formData.get("contactName") ?? "").trim();
  const contactEmail = String(formData.get("contactEmail") ?? "").trim();
  const externalClientIdRaw = String(formData.get("externalClientId") ?? "").trim();
  const externalClientId = externalClientIdRaw === "" ? null : externalClientIdRaw;

  if (!name || !contactName || !contactEmail) {
    redirect("/agency/clients/new?error=missing_fields");
  }

  // clients_select の RLS（is_authorized_for_client）は、この時点ではまだ存在しない
  // agency_user_clients の割当を前提とするため、.select() で RETURNING を要求すると
  // INSERT自体が「new row violates row-level security policy」で失敗する
  // （PostgreSQLはRETURNING行にSELECTポリシーも要求するため）。
  // そのためidをこちらで生成し、RETURNINGなしでINSERTする。
  const clientId = crypto.randomUUID();

  const { error: clientError } = await supabase
    .from("clients")
    .insert({ id: clientId, name, external_client_id: externalClientId });

  if (clientError) {
    // clients_external_client_id_unique（0005）違反を専用のエラーメッセージに変換する。
    if (clientError.code === "23505") {
      redirect("/agency/clients/new?error=external_client_id_duplicate");
    }
    redirect("/agency/clients/new?error=create_failed");
  }

  const { error: assignError } = await supabase
    .from("agency_user_clients")
    .insert({ agency_user_id: user.id, client_id: clientId });

  if (assignError) {
    redirect("/agency/clients/new?error=create_failed");
  }

  const inviteResult = await inviteClientUser({
    callerId: user.id,
    callerType: "agency",
    clientId,
    email: contactEmail,
    name: contactName,
  });

  if (!inviteResult.ok) {
    redirect(`/agency/clients/new?error=invite_${inviteResult.error}`);
  }

  redirect("/agency/clients?success=client_created");
}
