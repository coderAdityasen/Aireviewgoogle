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
  // Lightbulb, // unused while GMB suggestions nav is commented out
  Mail,
  Menu,
  MessageSquare,
  PanelsTopLeft,
  Plus,
  Store,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileMenu } from "@/components/layout/profile-menu";
import type { DashboardNavCounts } from "@/features/businesses/server/gmb-actions";
import { cn } from "@/lib/utils";

/** Open: ease-out ~280ms · Close: slightly faster ~220ms */
const DRAWER_MS_OPEN = 280;
const DRAWER_MS_CLOSE = 220;

const ownerWorkspaceNav = [
  ["Analytics overview", "/dashboard", LayoutDashboard, null],
  ["Store management", "/dashboard/stores", Store, null],
  ["Reviews feed", "/dashboard/reviews", Activity, "reviews"],
  ["Private feedback", "/dashboard/feedback", MessageSquare, "privateFeedback"],
  // ["GMB suggestions", "/dashboard/gmb-suggestions", Lightbulb, "gmbSuggestions"],
  ["Customize QR", "/dashboard/qr-posters", PanelsTopLeft, null],
] as const;

const ownerAccountNav = [
  ["Billing & plans", "/dashboard/billing", CreditCard, null],
] as const;

const adminNav = [
  ["Overview", "/admin", LayoutDashboard, null],
  ["Owners", "/admin/owners", Building2, null],
  ["Businesses", "/admin/businesses", Store, null],
  ["Analytics", "/admin/analytics", BarChart3, null],
  ["Feedback", "/admin/feedback", MessageSquare, null],
  ["Custom plan leads", "/admin/custom-plan-inquiries", Mail, null],
] as const;

type BadgeKey = keyof DashboardNavCounts;

export function AppSidebar({
  mode,
  planKey,
  navCounts,
  account,
}: {
  mode: "owner" | "admin";
  planKey?: string | null;
  privateFeedback?: boolean;
  navCounts?: DashboardNavCounts;
  account?: { name?: string | null; email?: string | null };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  /** Keep DOM mounted while exit animation plays */
  const [mounted, setMounted] = useState(false);
  /** True after mount so CSS can transition from off-screen → on */
  const [entered, setEntered] = useState(false);
  const workspaceNav = mode === "owner" ? ownerWorkspaceNav : adminNav;
  const accountNav = mode === "owner" ? ownerAccountNav : [];
  void planKey;

  // Open / close mount lifecycle for enter + exit animation
  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setEntered(true));
      });
      return () => window.cancelAnimationFrame(id);
    }
    setEntered(false);
    const t = window.setTimeout(() => setMounted(false), DRAWER_MS_CLOSE);
    return () => window.clearTimeout(t);
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const badgeFor = (key: BadgeKey | null | undefined) => {
    if (!key || !navCounts) return null;
    const value = navCounts[key];
    return typeof value === "number" ? value : null;
  };

  const renderLinks = (
    items: readonly (readonly [
      string,
      string,
      LucideIcon,
      BadgeKey | null,
    ])[],
    options?: { animate?: boolean; staggerBase?: number },
  ) =>
    items.map(([label, href, Icon, badgeKey], index) => (
      <NavLink
        key={href}
        label={label}
        href={href}
        pathname={pathname}
        Icon={Icon}
        badge={badgeFor(badgeKey)}
        onNavigate={() => setOpen(false)}
        animate={Boolean(options?.animate)}
        visible={options?.animate ? entered : true}
        staggerIndex={(options?.staggerBase ?? 0) + index}
      />
    ));

  const content = (animateNav: boolean) => (
    <>
      {mode === "owner" ? (
        <Link
          href="/dashboard/businesses/new"
          onClick={() => setOpen(false)}
          className={cn(
            "mx-4 mt-5 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#2463f3] text-sm font-extrabold shadow-[0_8px_20px_rgba(36,99,243,0.22)] transition hover:bg-[#3a73f5] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
            animateNav &&
              "motion-safe:transition-[opacity,transform] motion-safe:duration-300 motion-safe:ease-out",
            animateNav &&
              !entered &&
              "motion-safe:translate-y-2 motion-safe:opacity-0",
            animateNav &&
              entered &&
              "motion-safe:translate-y-0 motion-safe:opacity-100",
          )}
          style={
            animateNav
              ? { transitionDelay: entered ? "40ms" : "0ms" }
              : undefined
          }
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Set up new location
        </Link>
      ) : null}
      <nav
        className="scroll-thin flex flex-1 flex-col overflow-y-auto px-3 py-6"
        aria-label="Main navigation"
      >
        <div className="space-y-1">
          {renderLinks(workspaceNav, {
            animate: animateNav,
            staggerBase: mode === "owner" ? 1 : 0,
          })}
        </div>

        {mode === "owner" ? (
          <div className="mt-auto space-y-1 pt-4">
            {renderLinks(accountNav, {
              animate: animateNav,
              staggerBase: workspaceNav.length + 1,
            })}
            <a
              href="https://www.google.com/maps"
              target="_blank"
              rel="noreferrer"
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/55 transition hover:bg-white/10 hover:text-white",
                animateNav &&
                  "motion-safe:transition-[opacity,transform] motion-safe:duration-300 motion-safe:ease-out",
                animateNav &&
                  !entered &&
                  "motion-safe:translate-x-[-8px] motion-safe:opacity-0",
                animateNav &&
                  entered &&
                  "motion-safe:translate-x-0 motion-safe:opacity-100",
              )}
              style={
                animateNav
                  ? {
                      transitionDelay: entered
                        ? `${(workspaceNav.length + accountNav.length + 1) * 35 + 60}ms`
                        : "0ms",
                    }
                  : undefined
              }
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
        {content(false)}
      </aside>

      {/* Mobile top bar: brand · profile · hamburger (morphs to X when open) */}
      <div className="sticky top-0 z-40 flex items-center justify-between gap-2 bg-[#0b1428] px-3 py-2.5 text-white sm:px-4 sm:py-3 lg:hidden">
        <Brand mode={mode} compact />
        <div className="flex shrink-0 items-center gap-1.5">
          <ProfileMenu
            name={account?.name}
            email={account?.email}
            mode={mode}
            variant="dark"
            compact
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls="mobile-nav-drawer"
            className="h-10 w-10 text-white transition active:scale-95 hover:bg-white/10"
          >
            <span className="relative grid h-5 w-5 place-items-center">
              <Menu
                className={cn(
                  "absolute h-5 w-5 transition-all duration-300 ease-out motion-reduce:duration-0",
                  open
                    ? "scale-75 rotate-90 opacity-0"
                    : "scale-100 rotate-0 opacity-100",
                )}
                aria-hidden="true"
              />
              <X
                className={cn(
                  "absolute h-5 w-5 transition-all duration-300 ease-out motion-reduce:duration-0",
                  open
                    ? "scale-100 rotate-0 opacity-100"
                    : "scale-75 -rotate-90 opacity-0",
                )}
                aria-hidden="true"
              />
            </span>
          </Button>
        </div>
      </div>

      {/* Mobile drawer (keeps mounted during exit animation) */}
      {mounted ? (
        <div
          id="mobile-nav-drawer"
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          {/* Backdrop — fade */}
          <button
            type="button"
            className={cn(
              "absolute inset-0 cursor-pointer bg-slate-950/60 motion-safe:transition-opacity motion-reduce:transition-none",
              entered ? "opacity-100" : "opacity-0",
            )}
            style={{
              transitionDuration: entered
                ? `${DRAWER_MS_OPEN}ms`
                : `${DRAWER_MS_CLOSE}ms`,
              transitionTimingFunction: entered
                ? "cubic-bezier(0.16, 1, 0.3, 1)"
                : "ease-in",
            }}
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          />

          {/* Panel — slide from left */}
          <aside
            className={cn(
              "absolute inset-y-0 left-0 flex w-[min(88vw,300px)] flex-col bg-[#0b1428] text-white shadow-2xl will-change-transform motion-safe:transition-transform motion-reduce:transition-none",
              entered ? "translate-x-0" : "-translate-x-full",
            )}
            style={{
              transitionDuration: entered
                ? `${DRAWER_MS_OPEN}ms`
                : `${DRAWER_MS_CLOSE}ms`,
              transitionTimingFunction: entered
                ? "cubic-bezier(0.16, 1, 0.3, 1)"
                : "ease-in",
            }}
          >
            <div className="flex items-center justify-between px-5 py-4">
              <Brand mode={mode} compact />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="text-white transition active:scale-95 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            {content(true)}
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
  badge,
  onNavigate,
  animate = false,
  visible = true,
  staggerIndex = 0,
}: {
  label: string;
  href: string;
  pathname: string;
  Icon: LucideIcon;
  badge?: number | null;
  onNavigate: () => void;
  /** Only true for mobile drawer links */
  animate?: boolean;
  visible?: boolean;
  staggerIndex?: number;
}) {
  const active =
    pathname === href ||
    (href !== "/dashboard" &&
      href !== "/admin" &&
      pathname.startsWith(`${href}/`));
  const showBadge = typeof badge === "number" && badge > 0;

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150",
        active
          ? "bg-[#142653] text-white shadow-inner before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-r-full before:bg-[#3c7bff]"
          : "text-white/55 hover:bg-white/10 hover:text-white",
        // Stagger only in the mobile drawer
        animate &&
          "motion-safe:transition-[opacity,transform] motion-safe:duration-300 motion-safe:ease-out",
        animate &&
          !visible &&
          "motion-safe:translate-x-[-10px] motion-safe:opacity-0",
        animate &&
          visible &&
          "motion-safe:translate-x-0 motion-safe:opacity-100",
      )}
      style={
        animate
          ? {
              transitionDelay: visible
                ? `${staggerIndex * 35 + 50}ms`
                : "0ms",
            }
          : undefined
      }
    >
      <Icon className="h-[17px] w-[17px] shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {showBadge ? (
        <span
          className={cn(
            "inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-extrabold tabular-nums",
            active
              ? "bg-[#3c7bff] text-white"
              : "bg-white/15 text-white/90",
          )}
          aria-label={`${badge} items`}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
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
    <div className={`flex items-center ${compact ? "" : "h-[76px] px-5"}`}>
      <Link
        href={mode === "owner" ? "/dashboard" : "/admin"}
        className="flex items-center gap-2.5 text-[1.25rem] font-extrabold tracking-[-0.055em]"
      >
        <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#2463f3] text-sm font-extrabold text-white shadow-[0_6px_16px_rgba(36,99,243,0.35)]">
          R
        </span>
        <span>
          Review<span className="text-[#5b91ff]">Flow</span>
        </span>
      </Link>
    </div>
  );
}
