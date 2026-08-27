import type {
  AdPlatform,
  ConversionAction,
  ExchangedTokens,
  FetchedMetrics,
  RefreshedTokens,
} from "./types";

// 2026-08-24時点でプレースホルダーとする4メソッド（exchangeCodeForTokens /
// refreshAccessToken / fetchConversionActions / fetchMetrics）の共通実装。
// ユーザーと合意の上、各媒体の実際のOAuthトークン交換・レポート取得API呼び出しは
// 後日（媒体審査完了・OAuthクライアント発行後）本実装に差し替える前提とし、
// それまでは同期基盤・手動上書き保護ロジック自体をテストできるよう決定的な
// ダミー値を返す（エラーを投げない）。本実装に差し替える際はこのファイルを
// 参照せず、各platformファイル内に直接実装すること。
export function placeholderExchangeCodeForTokens(
  platform: AdPlatform,
): (params: { code: string; redirectUri: string }) => Promise<ExchangedTokens> {
  return async () => ({
    accessToken: `placeholder-access-token:${platform}`,
    refreshToken: `placeholder-refresh-token:${platform}`,
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    externalAccountId: `placeholder-account:${platform}`,
  });
}

export function placeholderRefreshAccessToken(
  platform: AdPlatform,
): (refreshToken: string) => Promise<RefreshedTokens> {
  return async (refreshToken) => ({
    accessToken: `placeholder-access-token:${platform}:${refreshToken.slice(0, 8)}`,
    refreshToken,
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  });
}

export function placeholderFetchConversionActions(
  platform: AdPlatform,
): () => Promise<ConversionAction[]> {
  return async () => [
    { id: `${platform}-inquiry`, name: "問い合わせ（プレースホルダー）" },
    { id: `${platform}-document-request`, name: "資料請求（プレースホルダー）" },
  ];
}

export function placeholderFetchMetrics(): () => Promise<FetchedMetrics> {
  return async () => ({
    cost: 0,
    impressions: 0,
    clicks: 0,
    leads: 0,
  });
}
