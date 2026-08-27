import type { AdPlatformAdapter } from "./types";
import {
  placeholderExchangeCodeForTokens,
  placeholderFetchConversionActions,
  placeholderFetchMetrics,
  placeholderRefreshAccessToken,
} from "./placeholder";

// Google Ads API（spec §4.2.2）。OAuth認可URLの構築はGoogleの標準OAuth2エンドポイント
// （安定・公開済み）を使用した本実装。トークン交換・リフレッシュ・レポート取得
// （Google Ads API本体、GAQL等）は2026-08-24時点でプレースホルダー
// （要: developer-token取得・googleads.googleapis.comの実装、着手前に
// https://developers.google.com/google-ads/api/docs/start を確認すること）。
const AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPE = "https://www.googleapis.com/auth/adwords";

export const googleAdsAdapter: AdPlatformAdapter = {
  platform: "google_ads",

  getAuthorizationUrl({ state, redirectUri }) {
    const url = new URL(AUTHORIZATION_ENDPOINT);
    url.searchParams.set("client_id", process.env.GOOGLE_ADS_CLIENT_ID ?? "");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", SCOPE);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("state", state);
    return url.toString();
  },

  exchangeCodeForTokens: placeholderExchangeCodeForTokens("google_ads"),
  refreshAccessToken: placeholderRefreshAccessToken("google_ads"),
  fetchConversionActions: placeholderFetchConversionActions("google_ads"),
  fetchMetrics: placeholderFetchMetrics(),
};
