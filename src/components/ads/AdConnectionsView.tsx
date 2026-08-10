"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { MOCK_AD_CONNECTIONS, MOCK_PLATFORM_INTEGRATIONS } from "@/lib/mock/data";
import type { AdConnection } from "@/lib/mock/types";
import { AdConnectionPanel, PLATFORM_LABELS } from "./AdConnectionPanel";

// spec §4.2.2「反響数としてカウントするコンバージョンアクションは、広告アカウントごとに
// 担当者が選択する」。初期状態（未選択時）は全件選択として扱い、変更は次回以降の同期から反映する。
export function AdConnectionsView({ clientId }: { clientId: string }) {
  const [connections, setConnections] = useState<AdConnection[]>(() =>
    MOCK_AD_CONNECTIONS.filter((c) => c.clientId === clientId),
  );
  const [savedNote, setSavedNote] = useState<string | null>(null);

  function toggleAction(connectionId: string, actionId: string) {
    setConnections((prev) =>
      prev.map((c) => {
        if (c.id !== connectionId) return c;
        const current = c.trackedConversionActionIds ?? c.availableConversionActions.map((a) => a.id);
        const next = current.includes(actionId) ? current.filter((id) => id !== actionId) : [...current, actionId];
        return { ...c, trackedConversionActionIds: next };
      }),
    );
    setSavedNote(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel title="広告アカウント接続状況">
        <AdConnectionPanel integrations={MOCK_PLATFORM_INTEGRATIONS} connections={connections} />
      </Panel>

      {connections.length === 0 && (
        <Panel>
          <p className="text-sm text-gray-700">
            接続済みの広告アカウントはありません。上のステータスが「連携可能」の媒体からOAuth接続してください。
          </p>
        </Panel>
      )}

      {connections.map((conn) => {
        const tracked = conn.trackedConversionActionIds ?? conn.availableConversionActions.map((a) => a.id);
        return (
          <Panel key={conn.id} title="コンバージョンアクション選択">
            <p className="mb-1 font-semibold text-ink">{PLATFORM_LABELS[conn.platform]}</p>
            <p className="mb-3 text-xs text-gray-700">
              反響（問い合わせ・資料請求等）に該当するコンバージョンアクションを選択してください。選択されたアクションの合算値が「反響数」として同期されます。変更は次回以降の同期分から反映されます。
            </p>
            <div className="flex flex-col gap-2">
              {conn.availableConversionActions.map((action) => (
                <label key={action.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={tracked.includes(action.id)}
                    onChange={() => toggleAction(conn.id, action.id)}
                  />
                  {action.name}
                </label>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Button type="button" variant="primary" onClick={() => setSavedNote("選択を保存しました。")}>
                保存
              </Button>
              {savedNote && <span className="text-xs text-success">{savedNote}</span>}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
