"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInAction, signUpAction, resetPasswordAction } from "@/features/auth/server/actions";

type Mode = "login" | "signup" | "forgot";

const actions = {
  login: signInAction,
  signup: signUpAction,
  forgot: resetPasswordAction
};

export function AuthForm({ mode, next, plan }: { mode: Mode; next?: string; plan?: string }) {
  const [state, formAction, pending] = useActionState(actions[mode], { ok: false, message: "" });
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {plan ? <input type="hidden" name="plan" value={plan} /> : null}
      {mode === "signup" ? (
        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" name="fullName" autoComplete="name" required />
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      {mode !== "forgot" ? (
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} required className="pr-20" />
            <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute inset-y-0 right-3 text-xs font-medium text-muted-foreground underline underline-offset-4" aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>
      ) : null}
      {mode === "signup" && plan ? <p className="rounded-lg bg-primary/5 p-3 text-sm text-primary">Selected plan: <span className="font-semibold capitalize">{plan}</span>. You will finish payment after verifying your email.</p> : null}
      {state.message ? (
        <p className={state.ok ? "text-sm text-primary" : "text-sm text-destructive"} aria-live="polite">
          {state.message}
        </p>
      ) : null}
      <Button className="w-full" loading={pending} loadingLabel={mode === "forgot" ? "Sending…" : mode === "signup" ? "Creating…" : "Signing in…"}>
        {mode === "login" ? "Log in" : mode === "signup" ? "Create account" : "Send reset link"}
      </Button>
      <div className="text-center text-sm text-muted-foreground">
        {mode === "login" ? (
          <>
            <Link className="underline" href="/forgot-password">
              Forgot password
            </Link>{" "}
            ·{" "}
            <Link className="underline" href="/signup">
              Create account
            </Link>
          </>
        ) : (
          <Link className="underline" href="/login">
            Back to login
          </Link>
        )}
      </div>
    </form>
  );
}
