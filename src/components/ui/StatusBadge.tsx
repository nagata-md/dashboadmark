import type { ReactNode } from "react";
import type { ConnectionStatus, IntegrationStatus } from "@/lib/mock/types";

type Tone = "success" | "warning" | "danger" | "neutral";

const TONE_CLASSES: Record<Tone, string> = {
  success: "border-success bg-success-tint text-success before:bg-success",
  warning: "border-warning bg-warning-tint text-warning before:bg-warning",
  danger: "border-danger bg-danger-tint text-danger before:bg-danger",
  neutral: "border-gray-300 bg-gray-050 text-gray-700 before:bg-gray-450",
};

export function StatusBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded border px-2 py-1 text-[11.5px] font-semibold before:block before:h-1.5 before:w-1.5 before:rounded-full ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

/** 媒体単位の審査状況（spec §4.2.2 フェーズドロールアウト） */
export function IntegrationStatusBadge({ status }: { status: IntegrationStatus }) {
  return status === "active" ? (
    <StatusBadge tone="success">連携可能</StatusBadge>
  ) : (
    <StatusBadge tone="warning">審査待ち</StatusBadge>
  );
}

/** 広告アカウント接続の状態（spec §4.2.2 / §6 ad_connections.status） */
export function ConnectionStatusBadge({ status }: { status: ConnectionStatus | "none" }) {
  if (status === "connected") return <StatusBadge tone="success">連携中</StatusBadge>;
  if (status === "error") return <StatusBadge tone="danger">エラー</StatusBadge>;
  return <StatusBadge tone="neutral">未接続</StatusBadge>;
}
