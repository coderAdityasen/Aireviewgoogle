import Link from "next/link";
import { BusinessSwitcher } from "@/components/layout/business-switcher";
import type { Business } from "@/types/database";

export function DashboardHeader({ title, mode, businesses }: { title: string; mode: "owner" | "admin"; businesses?: Array<Pick<Business, "id" | "name" | "is_active">> }) { return <header className="sticky top-0 z-20 -mx-4 mb-8 flex min-h-16 items-center justify-between gap-4 border-b bg-white/95 px-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Workspace</p><h1 className="text-xl font-semibold">{title}</h1></div><div className="flex items-center gap-2">{businesses ? <BusinessSwitcher businesses={businesses} /> : null}<Link href={mode === "owner" ? "/dashboard/settings" : "/admin/settings"} aria-label="Settings" className="rounded-lg border bg-card px-3 py-2 text-sm hover:bg-muted">Settings</Link></div></header>; }
