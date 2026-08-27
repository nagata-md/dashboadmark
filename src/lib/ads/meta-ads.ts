import type { AdPlatformAdapter } from "./types";
import {
  placeholderExchangeCodeForTokens,
  placeholderFetchConversionActions,
  placeholderFetchMetrics,
  placeholderRefreshAccessToken,
} from "./placeholder";

// Meta Marketing API（spec §4.2.2）。OAuth認可URLの構築はFacebook Loginの標準
// エンドポイント（安定・公開済み）を使用した本実装。Graph APIバージョンは実装着手時に
// https://developers.facebook.com/docs/graph-api/changelog で最新の安定版を確認し
// 更新すること。トークン交換・リフレッシュ・レポート取得（Marketing API本体）は
// 2026-08-24時点でプレースホルダー（Standard Access取得の実績要件、spec §10も参照）。
const GRAPH_API_VERSION = "v21.0";
const AUTHORIZATION_ENDPOINT = `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth`;
const SCOPE = "ads_read,ads_management";

export const metaAdsAdapter: AdPlatformAdapter = {
  platform: "meta_ads",

  getAuthorizationUrl({ state, redirectUri }) {
    const url = new URL(AUTHORIZATION_ENDPOINT);
    url.searchParams.set("client_id", process.env.META_ADS_CLIENT_ID ?? "");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", SCOPE);
    url.searchParams.set("state", state);
    return url.toString();
  },

  exchangeCodeForTokens: placeholderExchangeCodeForTokens("meta_ads"),
  refreshAccessToken: placeholderRefreshAccessToken("meta_ads"),
  fetchConversionActions: placeholderFetchConversionActions("meta_ads"),
  fetchMetrics: placeholderFetchMetrics(),
};
