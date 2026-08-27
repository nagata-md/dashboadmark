import { createServiceClient } from "@/lib/supabase/service";

interface InviteClientUserInput {
  callerId: string;
  callerType: "agency" | "client";
  clientId: string;
  email: string;
  name: string;
}

type InviteClientUserResult =
  | { ok: true; userId: string }
  | {
      ok: false;
      error: "not_authorized" | "email_exists" | "invite_failed" | "profile_failed";
    };

// 住宅会社担当者の招待（spec §4.1）。代理店担当者（担当クライアントへ初期発行・追加招待）、
// 住宅会社担当者本人（自社への追加招待、spec §4.1「自分の所属側のユーザーを追加できる」）の
// どちらの呼び出しにも対応する。admin.inviteUserByEmail は Service Role でのみ呼べる Admin
// API のため、認可チェック（callerが当該clientIdに対して権限を持つか）もこの関数内で
// コードとして明示的に行う（RLSはバイパスするため、masterplan E6の方針に合わせる）。
export async function inviteClientUser({
  callerId,
  callerType,
  clientId,
  email,
  name,
}: InviteClientUserInput): Promise<InviteClientUserResult> {
  const service = createServiceClient();

  const isAuthorized =
    callerType === "agency"
      ? await service
          .from("agency_user_clients")
          .select("client_id")
          .eq("agency_user_id", callerId)
          .eq("client_id", clientId)
          .maybeSingle()
          .then(({ data }) => !!data)
      : await service
          .from("client_users")
          .select("id")
          .eq("id", callerId)
          .eq("client_id", clientId)
          .maybeSingle()
          .then(({ data }) => !!data);

  if (!isAuthorized) {
    return { ok: false, error: "not_authorized" };
  }

  const { data: invited, error: inviteError } =
    await service.auth.admin.inviteUserByEmail(email, {
      redirectTo: "/set-password",
      data: { name, client_id: clientId },
    });

  if (inviteError || !invited.user) {
    if (inviteError?.code === "email_exists") {
      return { ok: false, error: "email_exists" };
    }
    return { ok: false, error: "invite_failed" };
  }

  const { error: profileError } = await service.from("client_users").insert({
    id: invited.user.id,
    client_id: clientId,
    name,
    email,
  });

  if (profileError) {
    return { ok: false, error: "profile_failed" };
  }

  return { ok: true, userId: invited.user.id };
}
