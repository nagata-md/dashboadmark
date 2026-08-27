import type { AdPlatform, AdPlatformAdapter } from "./types";
import { googleAdsAdapter } from "./google-ads";
import { yahooAdsAdapter } from "./yahoo-ads";
import { metaAdsAdapter } from "./meta-ads";

const ADAPTERS: Record<AdPlatform, AdPlatformAdapter> = {
  google_ads: googleAdsAdapter,
  yahoo_ads: yahooAdsAdapter,
  meta_ads: metaAdsAdapter,
};

export function getAdapter(platform: AdPlatform): AdPlatformAdapter {
  return ADAPTERS[platform];
}

export function isAdPlatform(value: string): value is AdPlatform {
  return value in ADAPTERS;
}
