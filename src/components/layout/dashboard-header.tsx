"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { BusinessSwitcher } from "@/components/layout/business-switcher";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-states";
import type { Business } from "@/types/database";

const copy: Array<{ match: string; title: string; description: string }> = [
  { match: "/dashboard/analytics", title: "Analytics", description: "Understand how customers move through your flow." },
  { match: "/dashboard/reviews", title: "Review activity", description: "See drafts, copies, page opens and private feedback signals." },
  { match: "/dashboard/feedback", title: "Private feedback", description: "Follow up on the issues customers chose to share directly." },
  { match: "/dashboard/qr-campaigns", title: "QR campaigns", description: "Create, test and manage each campaign destination." },
  { match: "/dashboard/qr-posters", title: "QR poster builder", description: "Generate print-ready assets for your active campaigns." },
  { match: "/dashboard/stores", title: "Stores", description: "Manage locations, destinations and active status." },
  { match: "/dashboard/settings", title: "Settings", description: "Manage your profile and account preferences." }
];

export function DashboardHeader({ title, mode, businesses }: { title: string; mode: "owner" | "admin"; businesses?: Array<Pick<Business, "id" | "name" | "is_active">> }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const matched = copy.find((item) => pathname === item.match || pathname.startsWith(`${item.match}/`));
  const isAnalytics = mode === "owner" && pathname.includes("/analytics");
  const range = searchParams.get("range") ?? "30";
  const action = mode === "owner" ? pathname === "/dashboard" ? { href: "/onboarding", label: "Add location" } : pathname.includes("qr-campaigns") ? { href: "/dashboard/qr-campaigns", label: "Create campaign" } : { href: "/onboarding", label: "Add location" } : null;

  function changeRange(value: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("range", value);
    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  }

  return <header className="sticky top-0 z-20 -mx-4 mb-8 flex min-h-16 flex-wrap items-center justify-between gap-4 border-b bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"><div className="min-w-0"><p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Workspace</p><h1 className="truncate text-xl font-semibold">{matched?.title ?? title}</h1><p className="mt-0.5 hidden max-w-xl truncate text-sm text-muted-foreground sm:block">{matched?.description ?? "A clear view of your customer feedback workspace."}</p></div><div className="flex flex-wrap items-center justify-end gap-2">{isAnalytics ? <label className="sr-only" htmlFor="dashboard-range">Analytics date range</label> : null}{isAnalytics ? <div className="relative"><select id="dashboard-range" value={range} onChange={(event) => changeRange(event.target.value)} disabled={isPending} aria-busy={isPending} className="h-10 rounded-md border bg-card px-3 pr-9 text-sm disabled:cursor-wait disabled:opacity-70"><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select>{isPending ? <LoadingSpinner className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-primary" label="Loading analytics" /> : null}</div> : null}{businesses ? <BusinessSwitcher businesses={businesses} /> : null}{action ? <Button asChild size="sm"><Link href={action.href}>{action.label}</Link></Button> : null}<Button asChild variant="outline" size="sm"><Link href={mode === "owner" ? "/dashboard/settings" : "/admin/settings"}>Settings</Link></Button></div></header>;
}
