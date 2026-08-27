import { createServiceClient } from "@/lib/supabase/service";

// DBの is_authorized_for_client() と同じ判定をコード側で行うためのヘルパー
// （spec §6、masterplan E6）。ad_connections はRLSを設けていない（Service Role
// 専用）ため、この関数で明示的に認可チェックする。
export async function isAuthorizedForClient(
  userId: string,
  clientId: string,
): Promise<boolean> {
  const service = createServiceClient();

  const [{ data: agencyAssignment }, { data: clientMembership }] = await Promise.all([
    service
      .from("agency_user_clients")
      .select("client_id")
      .eq("agency_user_id", userId)
      .eq("client_id", clientId)
      .maybeSingle(),
    service
      .from("client_users")
      .select("id")
      .eq("id", userId)
      .eq("client_id", clientId)
      .maybeSingle(),
  ]);

  return !!agencyAssignment || !!clientMembership;
}

// ad_connections.connected_by_type の記録用（spec §6「編集履歴の記録」と同種の方針）。
export async function resolveCallerType(
  userId: string,
): Promise<"agency" | "client" | null> {
  const service = createServiceClient();

  const { data: agencyUser } = await service
    .from("agency_users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (agencyUser) return "agency";

  const { data: clientUser } = await service
    .from("client_users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (clientUser) return "client";

  return null;
}
