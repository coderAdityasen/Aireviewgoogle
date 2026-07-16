import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckoutButton } from "@/components/billing/checkout-button";
import { getPlan, type PlanKey } from "@/config/plans";
import { getCurrentUser } from "@/lib/auth/roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function BillingCheckoutPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/signup?plan=${encodeURIComponent((await searchParams).plan ?? "starter")}`);
  const key = ((await searchParams).plan ?? "starter") as PlanKey;
  const plan = getPlan(key);
  if (!plan) redirect("/pricing");
  return <main className="mx-auto max-w-lg px-4 py-12"><Card><CardHeader><p className="text-sm font-medium text-primary">Step 1 of 2</p><CardTitle>Confirm {plan.name}</CardTitle></CardHeader><CardContent className="space-y-5"><div><p className="text-4xl font-semibold">₹{plan.priceInr.toLocaleString("en-IN")}<span className="text-base font-normal text-muted-foreground"> / month</span></p><ul className="mt-4 space-y-2 text-sm text-muted-foreground">{plan.features.map((feature) => <li key={feature}>✓ {feature}</li>)}</ul></div><CheckoutButton planKey={plan.key} /><p className="text-center text-xs text-muted-foreground">Razorpay Test Mode is used locally. ReviewFlow verifies the checkout signature and subscription state on the server.</p><Button asChild variant="ghost" className="w-full"><Link href="/pricing">Back to plans</Link></Button></CardContent></Card></main>;
}
