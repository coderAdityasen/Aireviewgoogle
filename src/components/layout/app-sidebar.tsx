"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Building2,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  Menu,
  MessageSquare,
  PanelsTopLeft,
  // Plus, // temporarily unused with "Set up new location" hidden
  Store,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const ownerWorkspaceNav = [
  ["Analytics overview", "/dashboard", LayoutDashboard],
  ["Store management", "/dashboard/stores", Store],
  ["Reviews feed", "/dashboard/reviews", Activity],
  ["Private feedback", "/dashboard/feedback", MessageSquare],
  ["Customize QR", "/dashboard/qr-posters", PanelsTopLeft],
] as const;

const ownerAccountNav = [
  ["Billing & plans", "/dashboard/billing", CreditCard],
] as const;

const adminNav = [
  ["Overview", "/admin", LayoutDashboard],
  ["Owners", "/admin/owners", Building2],
  ["Businesses", "/admin/businesses", Store],
  ["Analytics", "/admin/analytics", BarChart3],
  ["Feedback", "/admin/feedback", MessageSquare],
] as const;

export function AppSidebar({ mode }: { mode: "owner" | "admin" }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const workspaceNav = mode === "owner" ? ownerWorkspaceNav : adminNav;
  const accountNav = mode === "owner" ? ownerAccountNav : [];

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const renderLinks = (
    items: readonly (readonly [string, string, LucideIcon])[],
  ) =>
    items.map(([label, href, Icon]) => (
      <NavLink
        key={href}
        label={label}
        href={href}
        pathname={pathname}
        Icon={Icon}
        onNavigate={() => setOpen(false)}
      />
    ));

  const content = (
    <>
      {/* Temporarily hidden: Set up new location
      {mode === "owner" ? (
        <Link
          href="/onboarding"
          className="mx-4 mt-5 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2463f3] text-sm font-extrabold shadow-[0_8px_20px_rgba(36,99,243,0.22)] transition hover:bg-[#3a73f5] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Set up new location
        </Link>
      ) : null}
      */}
      <nav
        className="scroll-thin flex flex-1 flex-col overflow-y-auto px-3 py-6"
        aria-label="Main navigation"
      >
        {/* Primary nav — no section label (matches reference) */}
        <div className="space-y-1">{renderLinks(workspaceNav)}</div>

        {/* Billing + Google Maps pinned to bottom */}
        {mode === "owner" ? (
          <div className="mt-auto space-y-1 pt-4">
            {renderLinks(accountNav)}
            <a
              href="https://www.google.com/maps"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/55 transition hover:bg-white/10 hover:text-white"
            >
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
              Google Maps Listing
            </a>
          </div>
        ) : null}
      </nav>
    </>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[252px] flex-col bg-[#0b1428] text-white lg:flex">
        <Brand mode={mode} />
        {content}
      </aside>
      <div className="sticky top-0 z-40 flex items-center justify-between bg-[#0b1428] px-4 py-3 text-white lg:hidden">
        <Brand mode={mode} compact />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          aria-expanded={open}
          className="text-white hover:bg-white/10"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      {open ? (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/60"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(88vw,300px)] flex-col bg-[#0b1428] text-white shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4">
              <Brand mode={mode} compact />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            {content}
          </aside>
        </div>
      ) : null}
    </>
  );
}

function NavLink({
  label,
  href,
  pathname,
  Icon,
  onNavigate,
}: {
  label: string;
  href: string;
  pathname: string;
  Icon: LucideIcon;
  onNavigate: () => void;
}) {
  const active =
    pathname === href ||
    (href !== "/dashboard" &&
      href !== "/admin" &&
      pathname.startsWith(`${href}/`));
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150 ${active ? "bg-[#142653] text-white shadow-inner before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-r-full before:bg-[#3c7bff]" : "text-white/55 hover:bg-white/10 hover:text-white"}`}
    >
      <Icon className="h-[17px] w-[17px] shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}

function Brand({
  mode,
  compact = false,
}: {
  mode: "owner" | "admin";
  compact?: boolean;
}) {
  return (
    <div
      className={`flex items-center ${compact ? "" : "h-[76px] px-5"}`}
    >
      <Link
        href={mode === "owner" ? "/dashboard" : "/admin"}
        className="flex items-center gap-2.5 text-[1.25rem] font-extrabold tracking-[-0.055em]"
      >
        <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#2463f3] text-white shadow-[0_6px_16px_rgba(36,99,243,0.35)]">
          <PanelsTopLeft className="h-4 w-4" aria-hidden="true" />
        </span>
        <span>
          Review<span className="text-[#5b91ff]">Flow</span>
        </span>
      </Link>
    </div>
  );
}
