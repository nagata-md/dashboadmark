import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Secret key（旧service_role key相当）専用クライアント。RLS を完全にバイパスするため、
// サーバー専用コード（広告APIの同期バッチ・PDF生成・ad_connections の読み書き）
// からのみ呼び出す。ブラウザや Client Component から import しないこと（spec §6）。
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
