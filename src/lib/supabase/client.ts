import { createBrowserClient } from "@supabase/ssr";

// ブラウザ（Client Component）向け。auth.uid() ベースの RLS を前提に、
// Publishable key（旧anon key相当）のみでアクセスする（spec §6）。
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
