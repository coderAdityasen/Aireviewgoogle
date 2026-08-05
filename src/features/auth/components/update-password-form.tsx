"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completePasswordResetAction } from "@/features/auth/server/actions";

export function UpdatePasswordForm({ email }: { email?: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    completePasswordResetAction,
    { ok: false, message: "" },
  );

  useEffect(() => {
    if (state.ok) {
      const t = window.setTimeout(() => router.push("/login"), 1500);
      return () => window.clearTimeout(t);
    }
  }, [state.ok, router]);

  return (
    <form action={formAction} className="space-y-4">
      {email ? (
        <p className="text-sm font-medium text-muted-foreground">
          Account: <span className="font-extrabold text-foreground">{email}</span>
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          placeholder="At least 8 characters"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          placeholder="Repeat password"
        />
      </div>
      {state.message ? (
        <p
          className={
            state.ok
              ? "rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm font-medium text-emerald-800"
              : "rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-medium text-red-800"
          }
          aria-live="polite"
          role={state.ok ? "status" : "alert"}
        >
          {state.message}
        </p>
      ) : null}
      <Button
        className="w-full"
        loading={pending}
        loadingLabel="Updating…"
        disabled={state.ok}
      >
        Update password
      </Button>
      <p className="text-center text-sm font-medium text-muted-foreground">
        <Link
          href="/login"
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          Back to login
        </Link>
      </p>
    </form>
  );
}
