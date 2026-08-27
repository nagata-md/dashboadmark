import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server Component / Route Handler 向け。auth.uid() ベースの RLS を前提に、
// Publishable key（旧anon key相当）+ ログインユーザーのセッションCookieでアクセスする（spec §6）。
// Server Component からは Cookie を書き込めないため、setAll は src/proxy.ts
// （Next.js 16 では `middleware.ts` の後継、Phase 3 で追加）でのセッション更新に委ねる。
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component から呼ばれた場合は書き込めない。
            // ミドルウェアでセッションを更新している前提であれば無視してよい。
          }
        },
      },
    },
  );
}
