import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { syncConnection } from "@/lib/ads/sync";

// Vercel Cron が1日1回呼ぶ日次同期バッチ（E4, spec §4.2.2）。
// 対象は platform_integrations.status = 'active' かつ ad_connections.status != 'disconnected'
// の組み合わせのみ（審査待ちの媒体・未接続のクライアントは対象外）。
// クライアント・接続単位で処理を独立させ、1件の失敗が他に波及しないようにする（spec §8）。
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();

  const { data: activeIntegrations } = await service
    .from("platform_integrations")
    .select("platform")
    .eq("status", "active");

  const activePlatforms = (activeIntegrations ?? []).map((i) => i.platform);
  if (activePlatforms.length === 0) {
    return NextResponse.json({ synced: 0, skipped: 0, failed: 0 });
  }

  const { data: connections } = await service
    .from("ad_connections")
    .select("id")
    .in("platform", activePlatforms)
    .neq("status", "disconnected");

  const results = await Promise.all(
    (connections ?? []).map((c) => syncConnection(c.id)),
  );

  const synced = results.filter((r) => r.ok && !r.skipped).length;
  const skipped = results.filter((r) => r.ok && r.skipped).length;
  const failed = results.filter((r) => !r.ok).length;

  return NextResponse.json({ synced, skipped, failed, total: results.length });
}
