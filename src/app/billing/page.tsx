import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/roles";
import { getOwnerEntitlements } from "@/lib/billing/entitlements";
import { getPlan } from "@/config/plans";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { createClient } from "@/lib/supabase/server";
import { CancelSubscriptionButton } from "@/components/billing/cancel-subscription-button";
import { PlanSelection } from "@/components/billing/plan-selection";

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ required?: string; plan?: string; trial?: string }> }) {
  const user = await getCurrentUser();
  const params = await searchParams;
  if (!user) return <PublicBilling />;

  const entitlements = await getOwnerEntitlements(user.id);
  const subscription = entitlements.subscription;
  const selectedPlan = getPlan(params.plan);
  // Active paid sub (Growth/Pro) OR trial starter for display
  const activePlan = entitlements.paid
    ? entitlements.plan
    : null;
  const supabase = await createClient();
  const { data: payments } = await supabase
    .from("payment_transactions")
    .select("provider_payment_id, amount, currency, status, paid_at, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <main className="min-h-screen bg-[#f4f6fa] px-4 py-5 sm:px-7 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between gap-4 border-b border-border/70 pb-5">
          <Link href="/" className="flex cursor-pointer items-center gap-2 text-xl font-extrabold tracking-[-0.06em]"><span className="grid h-8 w-8 place-items-center rounded-[10px] bg-primary text-sm text-white shadow-[0_6px_16px_rgba(36,99,243,0.25)]">R</span>Review<span className="text-primary">Flow</span></Link>
          {entitlements.paid ? <Button asChild variant="outline" size="sm"><Link href="/dashboard">Back to workspace</Link></Button> : <Link href="/login?next=/billing" className="cursor-pointer text-sm font-extrabold text-muted-foreground hover:text-foreground">Sign in</Link>}
        </header>

        <div className="mx-auto max-w-3xl py-10 text-center sm:py-14">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary">Billing & plans</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.07em] sm:text-5xl">
            {params.trial === "expired"
              ? "Your free trial has ended"
              : params.required
                ? "Choose a plan to continue"
                : entitlements.paid
                  ? "Manage your plan"
                  : "Choose a plan for your workspace"}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm font-medium leading-6 text-muted-foreground">
            {params.trial === "expired"
              ? "Upgrade to Growth or Pro to reopen your dashboard, QR flows, and AI features."
              : params.required
                ? "Starter is a free 7-day trial. After that, upgrade to Growth or Pro to keep access."
                : "Starter is free for 7 days. Growth and Pro unlock unlimited AI regenerations, private feedback, and more reviews."}
          </p>
        </div>

        {params.required || params.trial === "expired" ? (
          <div className="mx-auto mb-7 flex max-w-3xl gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-950" role="status">
            <Icon name="shield" className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <p className="font-extrabold">
                {params.trial === "expired" ? "Trial expired — upgrade required" : "Access requires an active plan"}
              </p>
              <p className="mt-1 leading-5 text-amber-950/75">
                Dashboard, QR publishing, AI generation and public review pages stay locked until you upgrade to Growth or Pro.
              </p>
            </div>
          </div>
        ) : null}
        {selectedPlan && selectedPlan.key !== "starter" ? (
          <div className="mx-auto mb-7 max-w-3xl rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-left text-sm font-bold text-primary">
            {selectedPlan.name} is selected. Continue below to start checkout.
          </div>
        ) : null}

        {activePlan ? (
          <Card className="mx-auto mb-8 max-w-3xl">
            <CardContent className="flex flex-wrap items-center justify-between gap-5 p-5 sm:p-6">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xl font-extrabold tracking-[-0.05em]">{activePlan.name}</span>
                  <Badge>
                    {entitlements.trialActive
                      ? "Free trial"
                      : (subscription?.status ?? "active")}
                  </Badge>
                </div>
                <p className="mt-2 text-sm font-medium text-muted-foreground">
                  {entitlements.trialActive && entitlements.trialEndsAt
                    ? `Trial ends ${new Date(entitlements.trialEndsAt).toLocaleDateString()}`
                    : subscription?.access_until
                      ? `Access until ${new Date(subscription.access_until).toLocaleDateString()}`
                      : "Your workspace is active."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm"><Link href="/dashboard">Go to dashboard</Link></Button>
                {subscription ? <CancelSubscriptionButton scheduled={subscription.cancel_at_period_end} /> : null}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <PlanSelection currentPlanKey={activePlan?.key} selectedPlanKey={selectedPlan?.key} />

        {entitlements.paid ? (
          <Card className="mx-auto mt-8 max-w-3xl">
            <CardHeader>
              <CardTitle>Current usage</CardTitle>
              <p className="text-sm font-medium text-muted-foreground">
                {entitlements.plan.aiLimitScope === "lifetime"
                  ? "Starter AI regenerations are lifetime totals (not monthly)."
                  : "Usage for your current plan."}
              </p>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-3">
              <Usage label="Locations" value={entitlements.usage.businesses} limit={entitlements.plan.businesses} />
              <Usage label="Review requests" value={entitlements.usage.reviewRequests} limit={entitlements.plan.reviewRequests} />
              <Usage label="Regenerations" value={entitlements.usage.aiGenerations} limit={entitlements.plan.aiGenerations} />
            </CardContent>
          </Card>
        ) : null}

        <Card className="mx-auto mt-8 max-w-3xl"><CardHeader><CardTitle>Payment history</CardTitle><p className="text-sm font-medium text-muted-foreground">Verified provider transactions for this account.</p></CardHeader><CardContent>{payments?.length ? <div className="space-y-2">{payments.map((payment) => <div key={payment.provider_payment_id} className="flex flex-wrap justify-between gap-3 border-b py-3 text-sm last:border-0"><span>{new Date(payment.paid_at ?? payment.created_at).toLocaleDateString()} · {payment.currency} {(payment.amount / 100).toLocaleString("en-IN")}</span><Badge>{payment.status}</Badge></div>)}</div> : <p className="rounded-2xl bg-muted p-4 text-sm font-medium text-muted-foreground">Verified payments will appear here after checkout.</p>}</CardContent></Card>
        <p className="py-8 text-center text-xs font-medium text-muted-foreground">Razorpay Test Mode is used locally. ReviewFlow verifies payment signatures and subscription state on the server.</p>
      </div>
    </main>
  );
}

function PublicBilling() {
  return <main className="min-h-screen bg-[#f4f6fa] px-4 py-8 sm:px-7 sm:py-12"><div className="mx-auto max-w-6xl"><header className="flex items-center justify-between"><Link href="/" className="flex items-center gap-2 text-xl font-extrabold tracking-[-0.06em]"><span className="grid h-8 w-8 place-items-center rounded-[10px] bg-primary text-sm text-white">R</span>Review<span className="text-primary">Flow</span></Link><Button asChild variant="outline" size="sm"><Link href="/login?next=/billing">Sign in</Link></Button></header><section className="mx-auto mt-16 max-w-2xl text-center"><p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary">Billing & plans</p><h1 className="mt-4 text-4xl font-extrabold tracking-[-0.07em] sm:text-5xl">A simple plan for your workspace.</h1><p className="mt-5 text-base font-medium leading-7 text-muted-foreground">Sign in to compare plans, start secure checkout and connect your first location.</p><div className="mt-8 flex justify-center gap-3"><Button asChild><Link href="/pricing">Compare plans</Link></Button><Button asChild variant="outline"><Link href="/login?next=/billing">Sign in</Link></Button></div></section></div></main>;
}

function Usage({ label, value, limit }: { label: string; value: number; limit: number }) {
  const unlimited = limit < 0;
  const width = unlimited ? 8 : Math.min(100, Math.round((value / Math.max(limit, 1)) * 100));
  return (
    <div>
      <div className="flex justify-between text-sm font-bold">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {unlimited ? `${value} / Unlimited` : `${value}/${limit}`}
        </span>
      </div>
      <div className="mt-3 h-2.5 rounded-full bg-muted">
        <div
          className="h-2.5 rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
