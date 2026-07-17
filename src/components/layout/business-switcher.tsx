"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import type { Business } from "@/types/database";

export function BusinessSwitcher({ businesses }: { businesses: Array<Pick<Business, "id" | "name" | "is_active">> }) {
  const pathname = usePathname();
  const activeBusiness = businesses.find((business) => pathname.startsWith(`/dashboard/businesses/${business.id}`));
  const label = activeBusiness?.name ?? "All locations";

  return <details className="group relative">
    <summary className="flex max-w-52 cursor-pointer list-none items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
      <span className="truncate">{label}</span>
      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition group-open:rotate-180" aria-hidden="true" />
      <span className="sr-only">Choose business location</span>
    </summary>
    <div className="absolute right-0 top-12 z-20 w-64 rounded-xl border bg-card p-2 shadow-lg">
      <LocationLink href="/dashboard" label="All locations" active={!activeBusiness} />
      {businesses.map((business) => <LocationLink key={business.id} href={`/dashboard/businesses/${business.id}`} label={business.name} active={activeBusiness?.id === business.id} isActive={business.is_active} />)}
    </div>
  </details>;
}

function LocationLink({ href, label, active, isActive }: { href: string; label: string; active: boolean; isActive?: boolean }) {
  return <Link href={href} aria-current={active ? "page" : undefined} className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "bg-primary/10 font-medium text-primary" : ""}`}>
    <span className="truncate">{label}</span>
    {active ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : <span className={`ml-2 h-2 w-2 shrink-0 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-300"}`} aria-label={isActive === false ? "Inactive" : undefined} />}
  </Link>;
}
