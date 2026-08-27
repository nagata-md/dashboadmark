export type AdPlatform = "google_ads" | "yahoo_ads" | "meta_ads";

export const AD_PLATFORMS: AdPlatform[] = ["google_ads", "yahoo_ads", "meta_ads"];

export interface ExchangedTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string | null; // ISO timestamp、無期限の場合はnull
  externalAccountId: string;
}

export interface RefreshedTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string | null;
}

export interface ConversionAction {
  id: string;
  name: string;
}

export interface FetchedMetrics {
  cost: number;
  impressions: number | null;
  clicks: number | null;
  leads: number;
}

// 媒体ごとのOAuth接続・データ取得を抽象化するインターフェース（E1・masterplan Phase 6）。
// 2026-08-24時点では各媒体の実際のレポート取得API呼び出し（fetchConversionActions /
// fetchMetrics）はプレースホルダー実装（ユーザーと合意の上、各媒体API呼び出し部分は
// 後日実装）。OAuth接続画面・同期基盤・手動上書き保護は本インターフェース経由で本実装済み。
export interface AdPlatformAdapter {
  platform: AdPlatform;

  getAuthorizationUrl(params: { state: string; redirectUri: string }): string;

  exchangeCodeForTokens(params: {
    code: string;
    redirectUri: string;
  }): Promise<ExchangedTokens>;

  refreshAccessToken(refreshToken: string): Promise<RefreshedTokens>;

  fetchConversionActions(params: {
    accessToken: string;
    externalAccountId: string;
  }): Promise<ConversionAction[]>;

  fetchMetrics(params: {
    accessToken: string;
    externalAccountId: string;
    trackedConversionActionIds: string[];
    periodStart: string; // YYYY-MM-DD
    periodEnd: string; // YYYY-MM-DD
  }): Promise<FetchedMetrics>;
}
