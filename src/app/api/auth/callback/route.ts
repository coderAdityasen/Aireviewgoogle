import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeLocalRedirect } from "@/lib/security/redirect";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Password recovery and email confirm both use this callback.
  const next = safeLocalRedirect(searchParams.get("next"), "/dashboard");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const loginUrl = new URL("/login", origin);
      loginUrl.searchParams.set(
        "error",
        "Your link is invalid or expired. Please try again.",
      );
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
