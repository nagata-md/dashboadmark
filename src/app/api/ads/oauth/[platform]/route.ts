import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAuthorizedForClient, resolveCallerType } from "@/lib/auth/isAuthorizedForClient";
import { getAdapter, isAdPlatform } from "@/lib/ads/registry";
import { encryptToken } from "@/lib/crypto";

interface OAuthState {
  clientId: string;
  returnTo: string;
}

function encodeState(state: OAuthState): string {
  return Buffer.from(JSON.stringify(state)).toString("base64url");
}

function decodeState(raw: string): OAuthState | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (typeof parsed.clientId === "string" && typeof parsed.returnTo === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

// 広告アカウントのOAuth開始・コールバック（spec §4.2.2）。開始（?clientId=...）と
// コールバック（?code=...&state=...）の両方をこの1ルートで受ける。
export async function GET(
  request: Request,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform: platformParam } = await params;
  const url = new URL(request.url);

  if (!isAdPlatform(platformParam)) {
    return NextResponse.redirect(new URL("/login?error=invalid_platform", url.origin));
  }
  const platform = platformParam;
  const redirectUri = `${url.origin}/api/ads/oauth/${platform}`;
  const adapter = getAdapter(platform);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");

  // --- コールバック ---
  if (code && stateParam) {
    const state = decodeState(stateParam);
    if (!state) {
      return NextResponse.redirect(new URL("/login?error=oauth_state_invalid", url.origin));
    }

    const authorized = await isAuthorizedForClient(user.id, state.clientId);
    if (!authorized) {
      return NextResponse.redirect(
        new URL(`${state.returnTo}?error=not_authorized`, url.origin),
      );
    }

    try {
      const tokens = await adapter.exchangeCodeForTokens({ code, redirectUri });
      const conversionActions = await adapter.fetchConversionActions({
        accessToken: tokens.accessToken,
        externalAccountId: tokens.externalAccountId,
      });
      const callerType = await resolveCallerType(user.id);
      const service = createServiceClient();

      // spec §4.2.2「初期状態（未選択時）は取得できた全コンバージョンアクションを
      // 選択済みとして扱う」。
      const { error: upsertError } = await service.from("ad_connections").upsert(
        {
          client_id: state.clientId,
          platform,
          external_account_id: tokens.externalAccountId,
          access_token: encryptToken(tokens.accessToken),
          refresh_token: encryptToken(tokens.refreshToken),
          token_expires_at: tokens.expiresAt,
          connected_by_type: callerType,
          connected_by_id: user.id,
          status: "connected",
          available_conversion_actions: conversionActions,
          tracked_conversion_action_ids: conversionActions.map((a) => a.id),
        },
        { onConflict: "client_id,platform" },
      );

      if (upsertError) {
        return NextResponse.redirect(
          new URL(`${state.returnTo}?error=oauth_save_failed`, url.origin),
        );
      }
    } catch {
      return NextResponse.redirect(
        new URL(`${state.returnTo}?error=oauth_exchange_failed`, url.origin),
      );
    }

    return NextResponse.redirect(new URL(`${state.returnTo}?success=ad_connected`, url.origin));
  }

  // --- 開始 ---
  const clientId = url.searchParams.get("clientId");
  const returnTo = url.searchParams.get("returnTo") ?? "/agency/clients";
  if (!clientId) {
    return NextResponse.redirect(new URL(`${returnTo}?error=missing_client`, url.origin));
  }

  const authorized = await isAuthorizedForClient(user.id, clientId);
  if (!authorized) {
    return NextResponse.redirect(new URL(`${returnTo}?error=not_authorized`, url.origin));
  }

  const authorizationUrl = adapter.getAuthorizationUrl({
    state: encodeState({ clientId, returnTo }),
    redirectUri,
  });

  return NextResponse.redirect(authorizationUrl);
}
