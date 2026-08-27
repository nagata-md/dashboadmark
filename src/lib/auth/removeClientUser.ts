import { createServiceClient } from "@/lib/supabase/service";

interface RemoveClientUserInput {
  callerId: string;
  callerType: "agency" | "client";
  clientId: string;
  targetUserId: string;
}

type RemoveClientUserResult =
  | { ok: true }
  | {
      ok: false;
      error: "not_authorized" | "self_removal" | "not_found" | "delete_failed";
    };

// 住宅会社担当者の削除（spec §4.1「自分の所属側のユーザーを追加できる」の裏返し、
// 2026-08-24追加）。inviteClientUser.ts と同じ認可方針（callerが代理店の担当割当を
// 持つか、住宅会社担当者本人が自分のclient_idに対してか）で、コード側で明示的に
// 認可チェックする（masterplan E6）。
export async function removeClientUser({
  callerId,
  callerType,
  clientId,
  targetUserId,
}: RemoveClientUserInput): Promise<RemoveClientUserResult> {
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

  // 自分自身を削除すると、住宅会社側にログインできる担当者がいなくなる恐れがある
  // ため、本人による自己削除は禁止する（代理店側からの削除は対象外）。
  if (callerType === "client" && callerId === targetUserId) {
    return { ok: false, error: "self_removal" };
  }

  const { data: target } = await service
    .from("client_users")
    .select("id")
    .eq("id", targetUserId)
    .eq("client_id", clientId)
    .maybeSingle();

  if (!target) {
    return { ok: false, error: "not_found" };
  }

  const { error: profileError } = await service
    .from("client_users")
    .delete()
    .eq("id", targetUserId);

  if (profileError) {
    return { ok: false, error: "delete_failed" };
  }

  const { error: authError } = await service.auth.admin.deleteUser(targetUserId);

  if (authError) {
    return { ok: false, error: "delete_failed" };
  }

  return { ok: true };
}
