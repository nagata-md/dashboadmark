import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAuthorizedForClient } from "@/lib/auth/isAuthorizedForClient";
import { syncConnection } from "@/lib/ads/sync";

// 「今すぐ同期」（spec §4.2.2）。担当者が任意のタイミングで手動実行できる。
export async function POST(
  request: Request,
  { params }: { params: Promise<{ connectionId: string }> },
) {
  const { connectionId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  const { data: connection } = await service
    .from("ad_connections")
    .select("client_id")
    .eq("id", connectionId)
    .maybeSingle();

  if (!connection) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const authorized = await isAuthorizedForClient(user.id, connection.client_id);
  if (!authorized) {
    return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  }

  const result = await syncConnection(connectionId);

  const returnTo = new URL(request.url).searchParams.get("returnTo");
  if (returnTo) {
    const query = result.ok ? "success=synced" : `error=sync_failed`;
    return NextResponse.redirect(new URL(`${returnTo}?${query}`, request.url), 303);
  }

  return NextResponse.json(result);
}
