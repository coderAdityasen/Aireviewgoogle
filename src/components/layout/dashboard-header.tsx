"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { MapPin, Settings } from "lucide-react";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-states";
import type { Business } from "@/types/database";

const copy: Array<{ match: string; title: string; description: string }> = [
  {
    match: "/dashboard/analytics",
    title: "Analytics",
    description: "Understand how customers move through your flow.",
  },
  {
    match: "/dashboard/reviews",
    title: "Reviews feed",
    description: "Recent customer reviews from your QR flow.",
  },
  {
    match: "/dashboard/feedback",
    title: "Private feedback",
    description: "Follow up on the issues customers chose to share directly.",
  },
  {
    match: "/dashboard/qr-campaigns",
    title: "QR campaigns",
    description: "Create, test and manage each campaign destination.",
  },
  {
    match: "/dashboard/qr-posters",
    title: "QR poster builder",
    description: "Generate print-ready assets for your active campaigns.",
  },
  {
    match: "/dashboard/stores",
    title: "Store Management",
    description: "Manage your active store locations and configurations.",
  },
  {
    match: "/dashboard/settings",
    title: "Settings",
    description: "Manage your profile and account preferences.",
  },
  {
    match: "/dashboard/billing",
    title: "Billing & plans",
    description: "Review your plan, usage and subscription status.",
  },
];

export function DashboardHeader({
  title,
  mode,
  businesses,
  account,
}: {
  title: string;
  mode: "owner" | "admin";
  businesses?: Array<Pick<Business, "id" | "name" | "is_active">>;
  account?: { name?: string | null; email?: string | null };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const matched = copy.find(
    (item) => pathname === item.match || pathname.startsWith(`${item.match}/`),
  );
  const isAnalytics = mode === "owner" && pathname.includes("/analytics");
  const range = searchParams.get("range") ?? "30";
  const activeBusiness = businesses?.find((business) =>
    pathname.startsWith(`/dashboard/businesses/${business.id}`),
  );
  const configurationHref =
    mode === "owner"
      ? activeBusiness
        ? `/dashboard/businesses/${activeBusiness.id}/edit`
        : businesses?.[0]
          ? `/dashboard/businesses/${businesses[0].id}/edit`
          : "/dashboard/businesses/new"
      : "/admin/settings";

  function changeRange(value: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("range", value);
    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  }

  const managedBusiness = activeBusiness?.name;
  const routeTitle =
    pathname.includes("/dashboard/businesses/") && pathname.endsWith("/edit")
      ? "Campaign settings"
      : pathname.includes("/dashboard/businesses/") && pathname.endsWith("/feedback")
        ? "Responses"
        : pathname.includes("/dashboard/businesses/") && pathname.endsWith("/qr-campaigns")
          ? "QR campaigns"
          : null;
  const routeDescription = managedBusiness
    ? `Managing ${managedBusiness}`
    : (matched?.description ?? "A clear view of your customer feedback workspace.");

  return (
    <header className="sticky top-0 z-20 -mx-4 mb-6 hidden min-h-[4.75rem] min-w-0 flex-wrap items-center justify-between gap-4 border-b border-border/70 bg-white/90 px-4 py-4 backdrop-blur-xl sm:-mx-7 sm:px-7 lg:-mx-10 lg:mb-8 lg:flex lg:px-10">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-extrabold tracking-[-0.055em] sm:text-2xl lg:text-[1.75rem]">
          {routeTitle ?? matched?.title ?? title}
        </h1>
        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 truncate text-xs font-medium text-muted-foreground sm:mt-1 sm:text-sm">
          {managedBusiness ? (
            <>
              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/70 sm:h-4 sm:w-4" aria-hidden="true" />
              <span className="truncate">
                Managing{" "}
                <span className="font-extrabold text-foreground">{managedBusiness}</span>
              </span>
            </>
          ) : (
            <span className="truncate">{routeDescription}</span>
          )}
        </p>
      </div>
      <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-2">
        {isAnalytics ? (
          <label className="sr-only" htmlFor="dashboard-range">
            Analytics date range
          </label>
        ) : null}
        {isAnalytics ? (
          <div className="relative">
            <select
              id="dashboard-range"
              value={range}
              onChange={(event) => changeRange(event.target.value)}
              disabled={isPending}
              aria-busy={isPending}
              className="h-10 max-w-40 cursor-pointer appearance-none rounded-xl border border-border bg-card px-3 pr-9 text-sm font-bold shadow-sm transition hover:border-primary/30 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
            {isPending ? (
              <LoadingSpinner
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-primary"
                label="Loading analytics"
              />
            ) : null}
          </div>
        ) : null}
        {/* Configuration: desktop only — hidden on mobile for a cleaner header */}
        <Button
          asChild
          size="sm"
          variant="outline"
          className="hidden lg:inline-flex"
        >
          <Link href={configurationHref}>
            <Settings className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Configuration
          </Link>
        </Button>
        {/* Profile lives in the mobile top bar (left of hamburger); keep it here on desktop */}
        <div className="hidden lg:block">
          <ProfileMenu
            name={account?.name}
            email={account?.email}
            mode={mode}
          />
        </div>
      </div>
    </header>
  );
}
