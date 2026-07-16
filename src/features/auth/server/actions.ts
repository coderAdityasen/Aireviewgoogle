"use server";

import { redirect } from "next/navigation";
import { absoluteUrl } from "@/lib/utils";
import { loginSchema, resetPasswordSchema, signupSchema } from "@/lib/validation/auth";
import { safeLocalRedirect } from "@/lib/security/redirect";
import { createClient } from "@/lib/supabase/server";

export async function signInAction(_: unknown, formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });
  const next = safeLocalRedirect(String(formData.get("next") ?? ""));
  const plan = String(formData.get("plan") ?? "");

  if (!parsed.success) {
    return { ok: false, message: "Enter a valid email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, message: error.message };
  redirect(next !== "/dashboard" ? next : plan ? `/billing/checkout?plan=${encodeURIComponent(plan)}` : next);
}

export async function signUpAction(_: unknown, formData: FormData) {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password")
  });
  const plan = String(formData.get("plan") ?? "");

  if (!parsed.success) {
    return { ok: false, message: "Enter your name, a valid email and a password with at least 8 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: absoluteUrl("/api/auth/callback"),
      data: { full_name: parsed.data.fullName }
    }
  });

  if (error) return { ok: false, message: error.message };
  redirect(`/login?checkEmail=1${plan ? `&plan=${encodeURIComponent(plan)}` : ""}`);
}

export async function resetPasswordAction(_: unknown, formData: FormData) {
  const parsed = resetPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { ok: false, message: "Enter a valid email address." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: absoluteUrl("/dashboard/settings")
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Password reset instructions have been sent." };
}
