import type { AdPlatformAdapter } from "./types";
import {
  placeholderExchangeCodeForTokens,
  placeholderFetchConversionActions,
  placeholderFetchMetrics,
  placeholderRefreshAccessToken,
} from "./placeholder";

// Yahoo!広告API（spec §4.2.2）。OAuth認可エンドポイントはYahoo! JAPAN IDのYConnect
// を想定しているが、2026-08-24時点で実際のURL・パラメータは未確認（実装着手前に
// https://ads-developers.yahoo.co.jp/ のOAuth関連ドキュメントで確定させること）。
// トークン交換・リフレッシュ・レポート取得も含め、この媒体は全メソッドが
// プレースホルダー。
const AUTHORIZATION_ENDPOINT = "https://auth.login.yahoo.co.jp/yconnect/v2/authorization";

export const yahooAdsAdapter: AdPlatformAdapter = {
  platform: "yahoo_ads",

  getAuthorizationUrl({ state, redirectUri }) {
    const url = new URL(AUTHORIZATION_ENDPOINT);
    url.searchParams.set("client_id", process.env.YAHOO_ADS_CLIENT_ID ?? "");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", state);
    return url.toString();
  },

  exchangeCodeForTokens: placeholderExchangeCodeForTokens("yahoo_ads"),
  refreshAccessToken: placeholderRefreshAccessToken("yahoo_ads"),
  fetchConversionActions: placeholderFetchConversionActions("yahoo_ads"),
  fetchMetrics: placeholderFetchMetrics(),
};
