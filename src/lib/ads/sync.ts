import { createServiceClient } from "@/lib/supabase/service";
import { encryptToken, decryptToken } from "@/lib/crypto";
import { getAdapter } from "./registry";
import type { AdPlatform } from "./types";

type SyncResult =
  | { ok: true; skipped: false }
  | { ok: true; skipped: true; reason: "manually_overridden" | "disconnected" }
  | { ok: false; error: string };

function currentMonthStart(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// Phase 6 同期基盤（spec §4.2.2）。日次自動同期・「今すぐ同期」・「APIの値に戻す」の
// いずれからも呼ばれる共通ロジック。月初〜当日までの月間累計を取得し、当月分の
// campaign_metrics 行（period_type='monthly'）に上書き保存する（E7の「生データのまま
// 保持」方針に沿い、週次按分等の集計はlib/metrics/側で行うためここでは行わない）。
//
// force=true は「APIの値に戻す」専用（spec §4.2.2 決定済み）：手動上書き保護を
// バイパスして強制的にAPIの値で上書きし、manually_overridden を false に戻す。
export async function syncConnection(
  connectionId: string,
  { force = false }: { force?: boolean } = {},
): Promise<SyncResult> {
  const service = createServiceClient();

  const { data: connection, error: connectionError } = await service
    .from("ad_connections")
    .select(
      "id, client_id, platform, external_account_id, access_token, refresh_token, token_expires_at, tracked_conversion_action_ids, status",
    )
    .eq("id", connectionId)
    .maybeSingle();

  if (connectionError || !connection) {
    return { ok: false, error: "connection_not_found" };
  }

  if (connection.status === "disconnected") {
    return { ok: true, skipped: true, reason: "disconnected" };
  }

  const platform = connection.platform as AdPlatform;
  const adapter = getAdapter(platform);

  const { data: channel } = await service
    .from("campaign_channels")
    .select("id")
    .is("client_id", null)
    .eq("platform", platform)
    .eq("method", "api")
    .maybeSingle();

  if (!channel) {
    return { ok: false, error: "channel_not_found" };
  }

  const periodStart = currentMonthStart();

  if (!force) {
    const { data: existing } = await service
      .from("campaign_metrics")
      .select("manually_overridden")
      .eq("client_id", connection.client_id)
      .eq("channel_id", channel.id)
      .eq("period_type", "monthly")
      .eq("period_start", periodStart)
      .is("location_id", null)
      .maybeSingle();

    if (existing?.manually_overridden) {
      return { ok: true, skipped: true, reason: "manually_overridden" };
    }
  }

  try {
    let accessToken = decryptToken(connection.access_token as string);

    const tokenExpired =
      connection.token_expires_at && new Date(connection.token_expires_at) <= new Date();
    if (tokenExpired) {
      const refreshed = await adapter.refreshAccessToken(
        decryptToken(connection.refresh_token as string),
      );
      accessToken = refreshed.accessToken;
      await service
        .from("ad_connections")
        .update({
          access_token: encryptToken(refreshed.accessToken),
          refresh_token: encryptToken(refreshed.refreshToken),
          token_expires_at: refreshed.expiresAt,
        })
        .eq("id", connectionId);
    }

    const trackedConversionActionIds: string[] =
      (connection.tracked_conversion_action_ids as string[] | null) ??
      (await adapter.fetchConversionActions({
        accessToken,
        externalAccountId: connection.external_account_id ?? "",
      })).map((a) => a.id);

    const metrics = await adapter.fetchMetrics({
      accessToken,
      externalAccountId: connection.external_account_id ?? "",
      trackedConversionActionIds,
      periodStart,
      periodEnd: todayIso(),
    });

    const { data: existingRow } = await service
      .from("campaign_metrics")
      .select("id")
      .eq("client_id", connection.client_id)
      .eq("channel_id", channel.id)
      .eq("period_type", "monthly")
      .eq("period_start", periodStart)
      .is("location_id", null)
      .maybeSingle();

    const rowValues = {
      cost: metrics.cost,
      impressions: metrics.impressions,
      clicks: metrics.clicks,
      leads: metrics.leads,
      source: "api" as const,
      manually_overridden: false,
      synced_at: new Date().toISOString(),
    };

    if (existingRow) {
      await service.from("campaign_metrics").update(rowValues).eq("id", existingRow.id);
    } else {
      await service.from("campaign_metrics").insert({
        client_id: connection.client_id,
        location_id: null,
        channel_id: channel.id,
        period_type: "monthly",
        period_start: periodStart,
        ...rowValues,
      });
    }

    await service
      .from("ad_connections")
      .update({ status: "connected", last_synced_at: new Date().toISOString() })
      .eq("id", connectionId);

    return { ok: true, skipped: false };
  } catch (error) {
    await service.from("ad_connections").update({ status: "error" }).eq("id", connectionId);
    return { ok: false, error: error instanceof Error ? error.message : "unknown_error" };
  }
}
