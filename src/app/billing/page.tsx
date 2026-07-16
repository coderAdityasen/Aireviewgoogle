import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/roles";
import { getOwnerEntitlements } from "@/lib/billing/entitlements";
import { PLANS } from "@/config/plans";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { CancelSubscriptionButton } from "@/components/billing/cancel-subscription-button";

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ required?: string }> }) {
  const user = await getCurrentUser();
  const params = await searchParams;
  if (!user) return <PublicBilling />;
  const entitlements = await getOwnerEntitlements(user.id);
  const subscription = entitlements.subscription;
  const supabase = await createClient();
  const { data: payments } = await supabase.from("payment_transactions").select("provider_payment_id, amount, currency, status, paid_at, created_at").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(20);
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-medium text-primary">ReviewFlow billing</p><h1 className="mt-2 text-3xl font-semibold">Keep your review flow running</h1><p className="mt-2 text-muted-foreground">Your data remains yours even if access pauses.</p></div>
        <Button asChild variant="outline"><Link href="/pricing">Compare plans</Link></Button>
      </div>
      {params.required ? <p className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">An active paid entitlement is required for onboarding and dashboard services.</p> : null}
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <Card className="md:col-span-2"><CardHeader><CardTitle>Current plan</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex flex-wrap items-center gap-3"><span className="text-3xl font-semibold capitalize">{entitlements.plan.name}</span><Badge>{subscription?.status ?? "Not started"}</Badge></div><p className="text-sm text-muted-foreground">{subscription?.access_until ? `Access until ${new Date(subscription.access_until).toLocaleDateString()}` : "Choose a plan to unlock your workspace."}</p><div className="grid gap-3 sm:grid-cols-3"><Usage label="Business locations" value={entitlements.usage.businesses} limit={entitlements.plan.businesses} /><Usage label="QR campaigns" value={entitlements.usage.qrCampaigns} limit={entitlements.plan.qrCampaigns} /><Usage label="AI generations" value={entitlements.usage.aiGenerations} limit={entitlements.plan.aiGenerations} /></div><div className="pt-2">{subscription ? <CancelSubscriptionButton scheduled={subscription.cancel_at_period_end} /> : null}</div></CardContent></Card>
        <Card><CardHeader><CardTitle>Next step</CardTitle></CardHeader><CardContent>{entitlements.paid ? <Button asChild className="w-full"><Link href="/onboarding">Continue setup</Link></Button> : <Button asChild className="w-full"><Link href="/pricing">Choose a paid plan</Link></Button>}</CardContent></Card>
      </div>
      <Card className="mt-5"><CardHeader><CardTitle>Payment history</CardTitle></CardHeader><CardContent>{payments?.length ? <div className="space-y-2">{payments.map((payment) => <div key={payment.provider_payment_id} className="flex flex-wrap justify-between gap-3 border-b py-2 text-sm last:border-0"><span>{new Date(payment.paid_at ?? payment.created_at).toLocaleDateString()} · {payment.currency} {(payment.amount / 100).toLocaleString("en-IN")}</span><Badge>{payment.status}</Badge></div>)}</div> : <p className="text-sm text-muted-foreground">Verified payments will appear here.</p>}</CardContent></Card>
      <Card className="mt-5"><CardHeader><CardTitle>Plan options</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3">{Object.values(PLANS).map((plan) => <Link key={plan.key} href={`/billing/checkout?plan=${plan.key}`} className="rounded-lg border p-4 transition hover:border-primary"><p className="font-semibold">{plan.name}</p><p className="mt-1 text-xl font-semibold">₹{plan.priceInr.toLocaleString("en-IN")}<span className="text-sm font-normal text-muted-foreground">/month</span></p></Link>)}</CardContent></Card>
    </main>
  );
}

function PublicBilling() { return <main className="mx-auto max-w-xl px-4 py-16 text-center"><h1 className="text-3xl font-semibold">Billing & plans</h1><p className="mt-3 text-muted-foreground">Sign in to view your subscription or choose a paid plan to get started.</p><div className="mt-6 flex justify-center gap-3"><Button asChild><Link href="/pricing">View plans</Link></Button><Button asChild variant="outline"><Link href="/login?next=/billing">Sign in</Link></Button></div></main>; }
function Usage({ label, value, limit }: { label: string; value: number; limit: number }) { const width = Math.min(100, Math.round((value / limit) * 100)); return <div><div className="flex justify-between text-xs"><span>{label}</span><span>{value}/{limit}</span></div><div className="mt-2 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${width}%` }} /></div></div>; }
