import Link from "next/link";
import type { Business } from "@/types/database";

export function BusinessSwitcher({ businesses }: { businesses: Array<Pick<Business, "id" | "name" | "is_active">> }) {
  return <details className="relative"><summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium"><span className="max-w-44 truncate">All locations</span><span aria-hidden="true">⌄</span></summary><div className="absolute right-0 top-12 z-20 w-64 rounded-xl border bg-card p-2 shadow-lg"><Link href="/dashboard" className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">All locations</Link>{businesses.map((business) => <Link key={business.id} href={`/dashboard/businesses/${business.id}`} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-muted"><span className="truncate">{business.name}</span><span className={`ml-2 h-2 w-2 rounded-full ${business.is_active ? "bg-emerald-500" : "bg-slate-300"}`} /></Link>)}</div></details>;
}
