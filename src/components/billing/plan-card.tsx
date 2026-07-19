import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { PlanConfig } from "@/config/plans";

export function PlanCard({ plan, highlighted = false, current = false, selected = false, href = `/billing/checkout?plan=${plan.key}` }: { plan: PlanConfig; highlighted?: boolean; current?: boolean; selected?: boolean; href?: string }) {
  return (
    <article className={`relative flex h-full flex-col rounded-[1.35rem] border bg-white p-5 transition duration-200 ${highlighted ? "border-primary shadow-[0_16px_40px_rgba(36,99,243,0.13)] lg:-translate-y-1" : "border-border/80 shadow-[0_8px_24px_rgba(35,52,84,0.04)] hover:border-primary/30 hover:shadow-[0_12px_30px_rgba(35,52,84,0.08)]"} ${selected ? "ring-2 ring-primary ring-offset-2" : ""}`}>
      {highlighted ? <span className="absolute -top-3 left-5 rounded-full bg-primary px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white">Popular</span> : null}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">{plan.name}</p>
          <h3 className="mt-2 text-xl font-extrabold tracking-[-0.04em] text-foreground">{plan.tagline}</h3>
        </div>
        {current ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-emerald-700">Current</span> : null}
      </div>
      <p className="mt-6 text-4xl font-extrabold tracking-[-0.07em] text-foreground">₹{plan.priceInr.toLocaleString("en-IN")}<span className="ml-1 text-sm font-bold tracking-normal text-muted-foreground">/month</span></p>
      <div className="mt-5 grid gap-2 rounded-xl bg-[#f5f7fb] p-3.5 text-sm font-bold text-foreground">
        <p>{plan.businesses} location{plan.businesses === 1 ? "" : "s"}</p>
        <p>{plan.qrCampaigns} QR campaigns</p>
        <p>{plan.aiGenerations.toLocaleString("en-IN")} AI drafts per period</p>
      </div>
      <ul className="mt-5 flex-1 space-y-2.5 text-sm font-medium leading-5 text-muted-foreground">
        {plan.features.map((feature) => <li key={feature} className="flex gap-2"><Icon name="checkSmall" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{feature}</li>)}
      </ul>
      <Button asChild variant={current ? "outline" : highlighted ? "default" : "outline"} className="mt-7 w-full">
        <Link href={current ? "/dashboard/billing" : href}>{current ? "Manage plan" : `Choose ${plan.name}`}</Link>
      </Button>
    </article>
  );
}
