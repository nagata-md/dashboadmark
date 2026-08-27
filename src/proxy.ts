import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 で `middleware.ts` は `proxy.ts` にリネームされた
// （node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md）。
// `@supabase/ssr` の createServerClient は、ここで毎リクエストの
// セッション（Cookie）を更新しないと原因不明の予期しないログアウト・認証エラーが
// 起きると明記されているため、Phase 3 の他の認証実装より先にこれを用意する
// （src/lib/supabase/server.ts の setAll のコメント参照）。
//
// 認証状態によるルートガード（未ログイン時の /login リダイレクト等）は、
// Supabase Auth の有効化とログインフォームの接続が済んだ後に追加する
// （現時点ではログイン手段が無く、ガードを入れると全ルートがリダイレクト
// ループになりモックアップの動作確認ができなくなるため）。
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // トークンが期限切れなら更新する。戻り値は使わないが、呼び出し自体が
  // 更新済みセッションを上のCookieに反映させる（Supabase推奨パターン）。
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
