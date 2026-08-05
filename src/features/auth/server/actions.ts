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
  const selectedPlanDestination = plan ? `/billing/checkout?plan=${encodeURIComponent(plan)}` : null;
  const destination = selectedPlanDestination && (next === "/dashboard" || next === "/" || next === "/pricing") ? selectedPlanDestination : next;
  redirect(destination);
}

export async function signUpAction(_: unknown, formData: FormData) {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password")
  });
  const plan = String(formData.get("plan") ?? "");
  const next = safeLocalRedirect(String(formData.get("next") ?? ""));

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
  redirect(`/login?checkEmail=1${plan ? `&plan=${encodeURIComponent(plan)}` : ""}${next !== "/dashboard" ? `&next=${encodeURIComponent(next)}` : ""}`);
}

export async function resetPasswordAction(_: unknown, formData: FormData) {
  const parsed = resetPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { ok: false, message: "Enter a valid email address." };

  const supabase = await createClient();
  // Must go through /api/auth/callback so the recovery code becomes a session,
  // then land on /update-password (outside paid-dashboard gate).
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: absoluteUrl("/api/auth/callback?next=/update-password"),
  });

  if (error) return { ok: false, message: error.message };
  return {
    ok: true,
    message:
      "If an account exists for that email, password reset instructions have been sent. Check your inbox and spam folder.",
  };
}

/** Set a new password after recovery link (authenticated session required). */
export async function completePasswordResetAction(
  _: unknown,
  formData: FormData,
) {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");
  if (password.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { ok: false, message: "Passwords do not match." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      message: "Your reset link is invalid or expired. Request a new one.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, message: error.message };

  return {
    ok: true,
    message: "Password updated. You can sign in with your new password.",
  };
}
