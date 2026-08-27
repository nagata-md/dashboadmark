import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAgencyDomainEmail } from "@/lib/auth/agencyDomain";

// Google OAuth（代理店担当者専用、spec §4.1.1）のコールバック。
// ドメインが一致しない場合は agency_users を作らず即座にサインアウトする。
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  const cookieStore = await cookies();
  let pendingCookies: { name: string; value: string; options: CookieOptions }[] =
    [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          pendingCookies = cookiesToSet;
        },
      },
    },
  );

  function redirectTo(path: string) {
    const response = NextResponse.redirect(new URL(path, url));
    pendingCookies.forEach(({ name, value, options }) =>
      response.cookies.set(name, value, options),
    );
    return response;
  }

  if (!code) {
    return redirectTo("/login?error=missing_code");
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user?.email) {
    return redirectTo("/login?error=auth_failed");
  }

  if (!isAgencyDomainEmail(data.user.email)) {
    await supabase.auth.signOut();
    return redirectTo("/login?error=domain_not_allowed");
  }

  // agency_users_insert ポリシーは is_agency_user() 前提のため、
  // 初回作成（まだ agency_users に行が無い状態）は Service Role 経由でのみ可能。
  const service = createServiceClient();
  const { data: existing } = await service
    .from("agency_users")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!existing) {
    const name =
      (data.user.user_metadata?.full_name as string | undefined) ??
      (data.user.user_metadata?.name as string | undefined) ??
      data.user.email;
    const { error: insertError } = await service.from("agency_users").insert({
      id: data.user.id,
      name,
      email: data.user.email,
    });
    if (insertError) {
      await supabase.auth.signOut();
      return redirectTo("/login?error=provision_failed");
    }
  }

  return redirectTo("/agency/clients");
}
