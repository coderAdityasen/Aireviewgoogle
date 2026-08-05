"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, CreditCard, LogOut, Settings } from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { cn } from "@/lib/utils";

export function ProfileMenu({
  name,
  email,
  mode,
  variant = "light",
  compact = false,
}: {
  name?: string | null;
  email?: string | null;
  mode: "owner" | "admin";
  /** light = dashboard header; dark = mobile top bar on navy shell */
  variant?: "light" | "dark";
  /** Avatar-only control (mobile top bar) */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const displayName =
    name?.trim() ||
    email?.split("@")[0] ||
    (mode === "admin" ? "Administrator" : "Account");
  const initials =
    displayName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "RF";
  const settingsHref =
    mode === "owner" ? "/dashboard/settings" : "/admin/settings";
  const isDark = variant === "dark";

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function signOut() {
    setSigningOut(true);
    try {
      const response = await fetch("/api/auth/signout", { method: "POST" });
      if (!response.ok) throw new Error("Sign out failed.");
      window.location.href = "/login";
    } catch (error) {
      setSigningOut(false);
      toast.error(
        error instanceof Error ? error.message : "Unable to sign out.",
      );
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "flex cursor-pointer items-center gap-2 rounded-full border p-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          compact ? "pr-1" : "pr-2.5",
          isDark
            ? "border-white/10 hover:border-white/25 hover:bg-white/10"
            : "border-transparent hover:border-border hover:bg-muted/60",
        )}
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#4d3df2] to-[#2463f3] text-xs font-extrabold text-white shadow-sm ring-2 ring-white/20">
          {initials}
        </span>
        {!compact ? (
          <>
            <span
              className={cn(
                "hidden max-w-28 truncate text-sm font-extrabold sm:block",
                isDark ? "text-white" : "text-foreground",
              )}
            >
              {displayName}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition duration-200",
                open ? "rotate-180" : "",
                isDark ? "text-white/70" : "text-muted-foreground",
              )}
              aria-hidden="true"
            />
          </>
        ) : null}
        <span className="sr-only">Open account menu</span>
      </button>
      {open ? (
        <div
          role="menu"
          className={cn(
            "absolute top-12 z-50 w-64 origin-top-right animate-fade-up rounded-2xl border border-border bg-white p-2 shadow-[0_18px_45px_rgba(20,35,65,0.16)]",
            // On the mobile top bar, keep the menu on-screen (avatar sits left of hamburger).
            compact ? "right-0 sm:right-0" : "right-0",
          )}
        >
          <div className="border-b border-border/70 px-3 pb-3 pt-2">
            <p className="truncate text-sm font-extrabold text-foreground">
              {displayName}
            </p>
            <p className="mt-1 truncate text-xs font-medium text-muted-foreground">
              {email ?? "Signed-in account"}
            </p>
          </div>
          <Link
            role="menuitem"
            href={settingsHref}
            onClick={() => setOpen(false)}
            className="mt-2 flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Settings
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            My profile
          </Link>
          <Link
            role="menuitem"
            href={mode === "owner" ? "/dashboard/billing" : "/admin/settings"}
            onClick={() => setOpen(false)}
            className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <CreditCard
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            {mode === "owner" ? "Billing & plans" : "Admin settings"}
          </Link>
          <button
            role="menuitem"
            type="button"
            disabled={signingOut}
            onClick={() => void signOut()}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-destructive transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {signingOut ? (
              <LoadingSpinner
                label="Signing out"
                className="text-destructive"
              />
            ) : (
              <LogOut className="h-4 w-4" aria-hidden="true" />
            )}{" "}
            {signingOut ? "Signing out..." : "Log out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
