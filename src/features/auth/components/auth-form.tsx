"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  signInAction,
  signUpAction,
  resetPasswordAction,
} from "@/features/auth/server/actions";

type Mode = "login" | "signup" | "forgot";

const actions = {
  login: signInAction,
  signup: signUpAction,
  forgot: resetPasswordAction,
};

export function AuthForm({
  mode,
  next,
  plan,
}: {
  mode: Mode;
  next?: string;
  plan?: string;
}) {
  const [state, formAction, pending] = useActionState(actions[mode], {
    ok: false,
    message: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const loginHref = `/login${next || plan ? `?${new URLSearchParams({ ...(next ? { next } : {}), ...(plan ? { plan } : {}) }).toString()}` : ""}`;
  const signupHref = `/signup${next || plan ? `?${new URLSearchParams({ ...(next ? { next } : {}), ...(plan ? { plan } : {}) }).toString()}` : ""}`;

  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {plan ? <input type="hidden" name="plan" value={plan} /> : null}
      {mode === "signup" ? (
        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            name="fullName"
            autoComplete="name"
            placeholder="Alex Rivera"
            required
          />
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@business.com"
          required
        />
      </div>
      {mode !== "forgot" ? (
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              className="pr-12"
              placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      ) : null}
      {mode === "signup" && plan ? (
        <p className="rounded-xl border border-primary/15 bg-primary/5 px-3.5 py-3 text-sm font-medium text-primary">
          Selected plan:{" "}
          <span className="font-extrabold capitalize">{plan}</span>. You will finish payment after
          verifying your email.
        </p>
      ) : null}
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
        loadingLabel={
          mode === "forgot" ? "Sending…" : mode === "signup" ? "Creating…" : "Signing in…"
        }
      >
        {mode === "login"
          ? "Log in"
          : mode === "signup"
            ? "Create account"
            : "Send reset link"}
      </Button>
      <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1 pt-1 text-center text-sm font-medium text-muted-foreground">
        {mode === "login" ? (
          <>
            <Link
              className="rounded-md px-1 font-semibold text-primary underline-offset-4 hover:underline"
              href="/forgot-password"
            >
              Forgot password
            </Link>
            <span className="text-border" aria-hidden="true">
              ·
            </span>
            <Link
              className="rounded-md px-1 font-semibold text-primary underline-offset-4 hover:underline"
              href={signupHref}
            >
              Create account
            </Link>
          </>
        ) : (
          <Link
            className="rounded-md px-1 font-semibold text-primary underline-offset-4 hover:underline"
            href={loginHref}
          >
            Back to login
          </Link>
        )}
      </div>
    </form>
  );
}
