import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckoutButton } from "@/components/billing/checkout-button";
import { getPlan, type PlanKey } from "@/config/plans";
import { getCurrentUser } from "@/lib/auth/roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function BillingCheckoutPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const key = (params.plan ?? "starter") as PlanKey;
  const plan = getPlan(key);
  if (!user) redirect(`/signup?plan=${encodeURIComponent(params.plan ?? "starter")}`);
  if (!plan) redirect("/billing");

  return <main className="min-h-screen bg-[#f4f6fa] px-4 py-10 sm:px-7 sm:py-16"><div className="mx-auto max-w-5xl"><div className="mb-6 flex items-center justify-between"><Link href="/" className="flex items-center gap-2 text-xl font-extrabold tracking-[-0.06em]"><span className="grid h-8 w-8 place-items-center rounded-[10px] bg-primary text-sm text-white">R</span>Review<span className="text-primary">Flow</span></Link><span className="rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-muted-foreground shadow-sm">Secure checkout</span></div><div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"><Card className="order-2 lg:order-1"><CardHeader><p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary">Step 1 of 2 · Payment</p><CardTitle className="text-3xl">Start with {plan.name}</CardTitle><p className="text-sm font-medium text-muted-foreground">Your plan will be activated only after ReviewFlow verifies the checkout response and subscription state.</p></CardHeader><CardContent className="space-y-5"><CheckoutButton planKey={plan.key} /><p className="text-center text-xs font-medium leading-5 text-muted-foreground">Razorpay Test Mode is used locally. No card details are stored by ReviewFlow.</p><Button asChild variant="ghost" className="w-full"><Link href={`/billing?plan=${plan.key}`}>Back to plans</Link></Button></CardContent></Card><Card className="order-1 border-primary/15 bg-primary/[0.03] lg:order-2"><CardHeader><p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary">Selected plan</p><CardTitle className="text-2xl">{plan.name}</CardTitle><p className="text-4xl font-extrabold tracking-[-0.07em]">₹{plan.priceInr.toLocaleString("en-IN")}<span className="ml-1 text-sm font-bold tracking-normal text-muted-foreground">/month</span></p></CardHeader><CardContent><p className="text-sm font-medium leading-6 text-muted-foreground">{plan.tagline}</p><ul className="mt-6 space-y-3 text-sm font-medium text-foreground">{plan.features.map((feature) => <li key={feature}>✓ {feature}</li>)}</ul><p className="mt-7 rounded-2xl bg-white p-4 text-xs font-medium leading-5 text-muted-foreground shadow-sm">After confirmation, continue to onboarding to connect your first business and test the customer flow.</p></CardContent></Card></div></div></main>;
}
