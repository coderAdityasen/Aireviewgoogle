"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const ownerNav = [["Overview", "/dashboard"], ["Stores", "/dashboard/stores"], ["Review activity", "/dashboard/reviews"], ["Private feedback", "/dashboard/feedback"], ["QR campaigns", "/dashboard/qr-campaigns"], ["QR poster builder", "/dashboard/qr-posters"], ["Analytics", "/dashboard/analytics"], ["Billing & plans", "/dashboard/billing"], ["Settings", "/dashboard/settings"]] as const;
const adminNav = [["Overview", "/admin"], ["Owners", "/admin/owners"], ["Businesses", "/admin/businesses"], ["Analytics", "/admin/analytics"], ["Feedback", "/admin/feedback"], ["AI usage", "/admin/ai-usage"], ["Audit logs", "/admin/audit-logs"], ["Settings", "/admin/settings"]] as const;

export function AppSidebar({ mode }: { mode: "owner" | "admin" }) {
  const pathname = usePathname();
  const nav = mode === "owner" ? ownerNav : adminNav;
  const signOut = () => { void fetch("/api/auth/signout", { method: "POST" }).then(() => { window.location.href = "/login"; }); };
  const links = nav.map(([label, href]) => <Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${isActive(pathname, href) ? "bg-[#2563eb] text-white shadow-lg shadow-blue-950/30" : "text-white/65 hover:bg-white/10 hover:text-white"}`}><span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />{label}</Link>);
  return <>
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[270px] flex-col bg-[#0b1730] text-white lg:flex"><Brand mode={mode} /><nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6" aria-label="Main navigation">{links}{mode === "owner" ? <a href="https://www.google.com/maps" target="_blank" rel="noreferrer" className="mt-6 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/65 hover:bg-white/10 hover:text-white"><ExternalLink className="h-4 w-4" />Google Maps listing</a> : null}</nav><div className="border-t border-white/10 p-4"><Button variant="ghost" className="w-full justify-start text-white/70 hover:bg-white/10 hover:text-white" onClick={signOut}><LogOut className="mr-3 h-4 w-4" />Log out</Button></div></aside>
    <div className="border-b bg-[#0b1730] px-4 py-3 text-white lg:hidden"><details><summary className="flex cursor-pointer list-none items-center justify-between"><Brand mode={mode} compact /><span className="text-sm">Menu⌄</span></summary><nav className="mt-4 space-y-1" aria-label="Mobile navigation">{links}</nav><Button variant="ghost" className="mt-3 w-full justify-start text-white/70 hover:bg-white/10 hover:text-white" onClick={signOut}><LogOut className="mr-3 h-4 w-4" />Log out</Button></details></div>
  </>;
}

function Brand({ mode, compact = false }: { mode: "owner" | "admin"; compact?: boolean }) { return <div className={`flex items-center justify-between border-b border-white/10 ${compact ? "border-b-0" : "h-20 px-6"}`}><Link href={mode === "owner" ? "/dashboard" : "/admin"} className="text-xl font-semibold tracking-tight">Review<span className="text-[#66b7ff]">Flow</span></Link>{!compact ? <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-white/60">{mode}</span> : null}</div>; }
function isActive(pathname: string, href: string) { return pathname === href || (href !== "/dashboard" && href !== "/admin" && pathname.startsWith(`${href}/`)); }
