"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Activity, BarChart3, Building2, CreditCard, ExternalLink, LayoutDashboard, LogOut, Menu, MessageSquare, PanelsTopLeft, QrCode, Settings, Store, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const ownerNav = [
  ["Overview", "/dashboard", LayoutDashboard],
  ["Stores", "/dashboard/stores", Store],
  ["Review activity", "/dashboard/reviews", Activity],
  ["Private feedback", "/dashboard/feedback", MessageSquare],
  ["QR campaigns", "/dashboard/qr-campaigns", QrCode],
  ["QR poster builder", "/dashboard/qr-posters", PanelsTopLeft],
  ["Analytics", "/dashboard/analytics", BarChart3],
  ["Billing & plans", "/dashboard/billing", CreditCard],
  ["Settings", "/dashboard/settings", Settings]
] as const;
const adminNav = [["Overview", "/admin", LayoutDashboard], ["Owners", "/admin/owners", Building2], ["Businesses", "/admin/businesses", Store], ["Analytics", "/admin/analytics", BarChart3], ["Feedback", "/admin/feedback", MessageSquare], ["AI usage", "/admin/ai-usage", Activity], ["Audit logs", "/admin/audit-logs", PanelsTopLeft], ["Settings", "/admin/settings", Settings]] as const;

export function AppSidebar({ mode }: { mode: "owner" | "admin" }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const nav = mode === "owner" ? ownerNav : adminNav;

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  const links = nav.map(([label, href, Icon]) => <NavLink key={href} label={label} href={href} pathname={pathname} Icon={Icon} onNavigate={() => setOpen(false)} />);
  const googleLink = mode === "owner" ? <a href="https://www.google.com/maps" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/65 hover:bg-white/10 hover:text-white"><ExternalLink className="h-4 w-4" />Google Maps listing</a> : null;

  return <>
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[270px] flex-col bg-[#0b1730] text-white lg:flex"><Brand mode={mode} /><nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6" aria-label="Main navigation">{links}{googleLink ? <div className="mt-5 border-t border-white/10 pt-4">{googleLink}</div> : null}</nav><div className="border-t border-white/10 p-4"><Button variant="ghost" className="w-full justify-start text-white/70 hover:bg-white/10 hover:text-white" loading={signingOut} loadingLabel="Signing out…" onClick={() => void signOut}><LogOut className="mr-3 h-4 w-4" />Log out</Button></div></aside>
    <div className="sticky top-0 z-40 flex items-center justify-between border-b bg-[#0b1730] px-4 py-3 text-white lg:hidden"><Brand mode={mode} compact /><Button type="button" variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Open navigation" aria-expanded={open} className="text-white hover:bg-white/10"><Menu className="h-5 w-5" /></Button></div>
    {open ? <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Mobile navigation"><button type="button" className="absolute inset-0 bg-slate-950/50" onClick={() => setOpen(false)} aria-label="Close navigation" /><aside className="absolute inset-y-0 left-0 flex w-[min(86vw,300px)] flex-col bg-[#0b1730] text-white shadow-2xl"><div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><Brand mode={mode} compact /><Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close navigation" className="text-white hover:bg-white/10"><X className="h-5 w-5" /></Button></div><nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5" aria-label="Main navigation">{links}{googleLink ? <div className="mt-5 border-t border-white/10 pt-4">{googleLink}</div> : null}</nav><div className="border-t border-white/10 p-4"><Button variant="ghost" className="w-full justify-start text-white/70 hover:bg-white/10 hover:text-white" loading={signingOut} loadingLabel="Signing out…" onClick={() => void signOut}><LogOut className="mr-3 h-4 w-4" />Log out</Button></div></aside></div> : null}
  </>;
}

function NavLink({ label, href, pathname, Icon, onNavigate }: { label: string; href: string; pathname: string; Icon: LucideIcon; onNavigate: () => void }) {
  const active = pathname === href || (href !== "/dashboard" && href !== "/admin" && pathname.startsWith(`${href}/`));
  return <Link href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active ? "bg-[#2563eb] text-white shadow-lg shadow-blue-950/30" : "text-white/65 hover:bg-white/10 hover:text-white"}`}><Icon className="h-4 w-4 shrink-0" aria-hidden="true" /><span>{label}</span></Link>;
}

function Brand({ mode, compact = false }: { mode: "owner" | "admin"; compact?: boolean }) { return <div className={`flex items-center justify-between ${compact ? "" : "h-20 border-b border-white/10 px-6"}`}><Link href={mode === "owner" ? "/dashboard" : "/admin"} className="text-xl font-semibold tracking-tight">Review<span className="text-[#66b7ff]">Flow</span></Link>{!compact ? <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-white/60">{mode}</span> : null}</div>; }
