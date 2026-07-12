import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { getAdminEmailAllowlist, getSupabasePublicEnv } from "@/lib/env";

function isProtectedDashboard(pathname: string) {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

function isAdminPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  if (!isProtectedDashboard(pathname) && !isAdminPath(pathname)) {
    return response;
  }

  const { url, key } = getSupabasePublicEnv();
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([header, value]) => response.headers.set(header, value));
      }
    }
  });

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;

  if (claimsError || !claims?.sub) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, account_status")
    .eq("id", claims.sub)
    .maybeSingle();

  if (!profile || profile.account_status !== "active") {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("suspended", "1");
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminPath(pathname)) {
    const email = typeof claims.email === "string" ? claims.email.toLowerCase() : "";
    const allowlisted = email && getAdminEmailAllowlist().includes(email);
    if (profile.role !== "admin" && !allowlisted) {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = "/dashboard";
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"]
};
