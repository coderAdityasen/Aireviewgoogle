import { getCurrentUser } from "@/lib/auth/roles";
import { getOwnerEntitlements } from "@/lib/billing/entitlements";
import { getPlan } from "@/config/plans";
import { createClient } from "@/lib/supabase/server";
import { CancelSubscriptionButton } from "@/components/billing/cancel-subscription-button";
import { PlanSelection } from "@/components/billing/plan-selection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function DashboardBillingPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const entitlements = await getOwnerEntitlements(user.id);
  const subscription = entitlements.subscription;
  const currentPlan = subscription ? getPlan(subscription.plan_key) : null;
  const supabase = await createClient();
  const { data: payments } = await supabase.from("payment_transactions").select("provider_payment_id, amount, currency, status, paid_at, created_at").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(12);

  return <div className="space-y-5 pb-8">
    <div><p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary">Account</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-0.06em]">Billing & plans</h2><p className="mt-2 text-sm font-medium text-muted-foreground">Manage access, usage and the plan that powers your customer flows.</p></div>

    <Card className="overflow-hidden"><CardHeader className="flex-row items-center justify-between gap-4 border-b bg-white"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-white">▤</span><div><CardTitle className="text-base uppercase tracking-[0.08em]">Subscription & usage</CardTitle><p className="mt-1 text-sm font-medium text-muted-foreground">Your current billing period</p></div></div><div className="text-right"><p className="text-xs font-bold text-muted-foreground">Current plan</p><Badge className="mt-1">{currentPlan?.name ?? "No active plan"}</Badge></div></CardHeader><CardContent className="grid gap-5 p-5 sm:p-6"><Usage label="Business locations" value={entitlements.usage.businesses} limit={entitlements.plan.businesses} /><Usage label="QR campaigns" value={entitlements.usage.qrCampaigns} limit={entitlements.plan.qrCampaigns} /><Usage label="AI review drafts" value={entitlements.usage.aiGenerations} limit={entitlements.plan.aiGenerations} /></CardContent></Card>

    <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
      <Card><CardHeader className="flex-row items-center justify-between gap-4"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-primary">Current subscription</p><CardTitle className="mt-2 text-2xl">{currentPlan?.name ?? "Choose a plan"}</CardTitle></div>{subscription ? <Badge>{subscription.status}</Badge> : null}</CardHeader><CardContent><div className="grid gap-5 sm:grid-cols-2"><Detail label="Price & interval" value={currentPlan ? `₹${currentPlan.priceInr.toLocaleString("en-IN")} / month` : "Not active"} /><Detail label="Access until" value={subscription?.access_until ? new Date(subscription.access_until).toLocaleDateString() : "-"} /><Detail label="Billing cycle" value={subscription?.current_period_end ? "Monthly renewal" : "-"} /><Detail label="Payment provider" value="Razorpay Test Mode" /></div><div className="mt-6 flex flex-wrap gap-2">{subscription && currentPlan ? <CancelSubscriptionButton scheduled={subscription.cancel_at_period_end} /> : null}<Button asChild><Link href="#plans">{subscription ? "Change plan" : "Choose a plan"}</Link></Button></div></CardContent></Card>
      <Card><CardHeader><CardTitle>Recent invoices</CardTitle><p className="text-sm font-medium text-muted-foreground">Verified transactions only.</p></CardHeader><CardContent>{payments?.length ? <div className="space-y-3">{payments.slice(0, 5).map((payment) => <div key={payment.provider_payment_id} className="flex items-center justify-between gap-3 border-b pb-3 text-sm last:border-0"><span className="font-semibold">{new Date(payment.paid_at ?? payment.created_at).toLocaleDateString()}</span><Badge>{payment.status}</Badge></div>)}</div> : <p className="rounded-xl bg-muted p-4 text-sm font-medium text-muted-foreground">No invoices yet.</p>}</CardContent></Card>
    </div>

    <div id="plans" className="pt-3"><PlanSelection currentPlanKey={currentPlan?.key} /></div>
  </div>;
}

function Usage({ label, value, limit }: { label: string; value: number; limit: number }) {
  const width = Math.min(100, Math.round((value / limit) * 100));
  return <div><div className="flex flex-wrap justify-between gap-2 text-sm font-bold"><span>{label}</span><span className="text-muted-foreground">{value.toLocaleString("en-IN")} / {limit.toLocaleString("en-IN")} used</span></div><div className="mt-2 h-2.5 rounded-full bg-muted"><div className="h-2.5 rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${width}%` }} /></div></div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-bold text-muted-foreground">{label}</p><p className="mt-1 text-sm font-extrabold">{value}</p></div>;
}
