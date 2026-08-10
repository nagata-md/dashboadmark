"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConnectionStatusBadge, IntegrationStatusBadge } from "@/components/ui/StatusBadge";
import type { AdConnection, Platform, PlatformIntegration } from "@/lib/mock/types";

// spec §4.2.2 フェーズドロールアウト：媒体単位の審査状況（platform_integrations）と
// クライアントごとの接続状態（ad_connections）を分けて表示する。審査待ちはOAuth接続ボタンを
// 非活性にし、審査完了後も未接続の間は手動入力で運用を継続する（実際のOAuth処理はPhase 6）。

export const PLATFORM_LABELS: Record<Platform, string> = {
  google_ads: "Google広告",
  yahoo_ads: "Yahoo広告",
  meta_ads: "Meta広告（Facebook/Instagram）",
};

export function AdConnectionPanel({
  integrations,
  connections,
}: {
  integrations: PlatformIntegration[];
  connections: AdConnection[];
}) {
  const [note, setNote] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {note && <p className="rounded border border-gray-300 bg-gray-050 px-3 py-2 text-xs text-gray-700">{note}</p>}
      {integrations.map((integration) => {
        const connection = connections.find((c) => c.platform === integration.platform);
        const pending = integration.status === "pending_review";
        return (
          <div
            key={integration.platform}
            className="flex flex-wrap items-center gap-3 rounded-panel border border-gray-300 p-3"
          >
            <div className="min-w-[180px] flex-1">
              <div className="font-semibold text-ink">{PLATFORM_LABELS[integration.platform]}</div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <IntegrationStatusBadge status={integration.status} />
                <ConnectionStatusBadge status={connection?.status ?? "none"} />
              </div>
              {connection && (
                <div className="mt-1 text-[11px] text-gray-500">
                  アカウントID: {connection.externalAccountId} ／ 最終同期:{" "}
                  {connection.lastSyncedAt
                    ? new Date(connection.lastSyncedAt).toLocaleString("ja-JP")
                    : "未同期"}
                </div>
              )}
              {pending && (
                <div className="mt-1 text-[11px] text-warning">
                  審査待ちのため、この媒体は §4.2.1 と同じ手動入力フォームで運用してください。
                </div>
              )}
              {!pending && !connection && (
                <div className="mt-1 text-[11px] text-gray-500">
                  未接続です。接続が完了するまでは手動入力で運用してください。
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={pending}
                onClick={() => setNote("（モック）OAuth接続フローはPhase 6で実装します。")}
              >
                {connection ? "再接続" : "OAuth接続"}
              </Button>
              {connection && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setNote("（モック）今すぐ同期を実行しました。Phase 6で実データ同期に接続します。")}
                >
                  今すぐ同期
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
