import { PageHeader } from "@/components/layout/PageHeader";
import { AdConnectionsView } from "@/components/ads/AdConnectionsView";
import { RealAdConnections } from "@/components/ads/RealAdConnections";
import { getClient } from "@/lib/mock/data";
import { requireClientUser } from "@/lib/auth/requireClientUser";

const ERROR_MESSAGES: Record<string, string> = {
  not_authorized: "権限エラーが発生しました。管理者にお問い合わせください。",
  missing_client: "クライアント情報が取得できませんでした。",
  oauth_state_invalid: "接続情報の有効期限が切れました。もう一度お試しください。",
  oauth_exchange_failed: "OAuth接続に失敗しました。時間をおいて再度お試しください。",
  oauth_save_failed: "接続情報の保存に失敗しました。時間をおいて再度お試しください。",
  sync_failed: "同期に失敗しました。時間をおいて再度お試しください。",
};

const SUCCESS_MESSAGES: Record<string, string> = {
  ad_connected: "広告アカウントを接続しました。",
  synced: "同期を実行しました。",
};

// spec §4.2.2：接続操作は代理店・住宅会社どちらの管理画面からも行える。
export default async function ClientAdConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] : undefined;
  const successMessage = success ? SUCCESS_MESSAGES[success] : undefined;

  // 2026-08-27修正：ログイン中の住宅会社ユーザーの client_id ではなく固定のモック定数
  // （CURRENT_CLIENT_ID="1"）を先に判定していたため、実クライアントでログインしても
  // 常にモック画面が表示されてしまう不具合があった（Phase 6実装時に混入・テスト改善フェーズで発見）。
  // 認証を先に行い、実際にログインしているユーザーのclient_idでモック/実データを判定する。
  const clientUser = await requireClientUser();

  if (getClient(clientUser.client_id)) {
    return (
      <>
        <PageHeader title="広告アカウント接続" eyebrow="AD CONNECTIONS" />
        <AdConnectionsView clientId={clientUser.client_id} />
      </>
    );
  }

  return (
    <>
      <PageHeader title="広告アカウント接続" eyebrow="AD CONNECTIONS" />
      {successMessage && (
        <p className="mb-4 rounded-control bg-success-tint px-3 py-2 text-xs text-success">
          {successMessage}
        </p>
      )}
      {errorMessage && (
        <p className="mb-4 rounded-control bg-danger-tint px-3 py-2 text-xs text-danger">
          {errorMessage}
        </p>
      )}
      <RealAdConnections clientId={clientUser.client_id} returnTo="/client/ad-connections" />
    </>
  );
}
