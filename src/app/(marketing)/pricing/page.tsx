import Link from "next/link";
import { MarketingHeader } from "@/components/layout/marketing-header";
import { Icon } from "@/components/ui/icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/config/plans";
import { getCurrentUser } from "@/lib/auth/roles";
import { redirect } from "next/navigation";

export default async function PricingPage() {
  if (await getCurrentUser()) redirect("/billing");
  return <><MarketingHeader /><main className="mx-auto max-w-7xl px-4 py-20 sm:px-7 sm:py-24"><div className="max-w-2xl"><p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary">Simple paid access</p><h1 className="mt-3 text-4xl font-extrabold tracking-[-0.07em] sm:text-5xl">A calmer way to collect real customer feedback</h1><p className="mt-5 text-base font-medium leading-7 text-muted-foreground">Choose the workspace size that matches your locations. Every plan keeps the customer in control and opens Google only after they choose to continue.</p></div><div className="mt-12 grid gap-6 lg:grid-cols-3">{Object.values(PLANS).map((plan, index) => <Card key={plan.key} className={index === 1 ? "border-2 border-primary shadow-[0_18px_50px_rgba(36,99,243,0.15)]" : ""}><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle className="text-xl">{plan.name}</CardTitle>{index === 1 ? <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-extrabold text-primary">Most flexible</span> : null}</div><p className="pt-3 text-4xl font-extrabold tracking-[-0.06em]">₹{plan.priceInr.toLocaleString("en-IN")}<span className="text-sm font-semibold text-muted-foreground">/month</span></p></CardHeader><CardContent><p className="text-sm font-semibold leading-6">{plan.businesses} location{plan.businesses === 1 ? "" : "s"} · {plan.qrCampaigns} QR campaigns · {plan.aiGenerations.toLocaleString("en-IN")} AI drafts per period</p><ul className="mt-6 space-y-3 text-sm font-medium text-muted-foreground">{plan.features.map((feature) => <li key={feature} className="flex gap-2"><Icon name="checkSmall" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{feature}</li>)}</ul><Button asChild className="mt-8 w-full"><Link href={`/billing/checkout?plan=${plan.key}`}>Choose {plan.name}</Link></Button></CardContent></Card>)}</div><p className="mt-9 text-center text-sm font-medium text-muted-foreground">No free tier. Test Mode is available locally; no live payment calls are made by this project.</p></main></>;
}
