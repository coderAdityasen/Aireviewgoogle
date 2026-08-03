import { getCurrentUser } from "@/lib/auth/roles";
import { getOwnerEntitlements } from "@/lib/billing/entitlements";
import { formatGrowthPurchaseSummary } from "@/config/plans";
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
  const currentPlan = entitlements.paid ? entitlements.plan : null;
  const supabase = await createClient();
  const { data: payments } = await supabase
    .from("payment_transactions")
    .select(
      "provider_payment_id, amount, currency, status, paid_at, created_at",
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(12);

  const latestCaptured = payments?.find((p) => p.status === "captured") ?? payments?.[0];
  const purchase =
    currentPlan?.key === "growth"
      ? formatGrowthPurchaseSummary({
          amountPaise: latestCaptured?.amount,
          periodStart: subscription?.current_period_start,
          periodEnd:
            subscription?.current_period_end ?? subscription?.access_until,
        })
      : null;

  const priceIntervalLabel = !currentPlan
    ? "Not active"
    : currentPlan.key === "starter"
      ? "Free 7-day trial"
      : currentPlan.contactSales
        ? "Custom pricing"
        : (purchase?.priceLabel ?? "Growth one-time");

  const billingCycleLabel =
    currentPlan?.key === "starter"
      ? "Trial"
      : currentPlan?.contactSales
        ? "Sales-assisted"
        : purchase?.cycleLabel ??
          (subscription?.current_period_end
            ? "One-time access (no auto-renewal)"
            : "-");

  // Prefer paid access window; only show trial end when user is on trial only.
  const accessUntilLabel = subscription?.access_until
    ? new Date(subscription.access_until).toLocaleDateString()
    : entitlements.trialActive && entitlements.trialEndsAt
      ? new Date(entitlements.trialEndsAt).toLocaleDateString()
      : "-";

  return (
    <div className="space-y-5 pb-8">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary">
          Account
        </p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.06em]">
          Billing & plans
        </h2>
        <p className="mt-2 text-sm font-medium text-muted-foreground">
          Manage access, usage and the plan that powers your customer flows.
        </p>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="flex-row items-center justify-between gap-4 border-b bg-white">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-white">
              ▤
            </span>
            <div>
              <CardTitle className="text-base uppercase tracking-[0.08em]">
                Subscription & usage
              </CardTitle>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                Your current billing period
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-muted-foreground">Current plan</p>
            <Badge className="mt-1">
              {currentPlan?.name ?? "No active plan"}
              {purchase?.option ? ` · ${purchase.option.label}` : ""}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 p-5 sm:p-6">
          <Usage
            label="Business locations"
            value={entitlements.usage.businesses}
            limit={entitlements.plan.businesses}
          />
          <Usage
            label="Review requests"
            value={entitlements.usage.reviewRequests}
            limit={entitlements.plan.reviewRequests}
          />
          <Usage
            label="Regenerations"
            value={entitlements.usage.aiGenerations}
            limit={entitlements.plan.aiGenerations}
          />
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-primary">
                Current subscription
              </p>
              <CardTitle className="mt-2 text-2xl">
                {currentPlan?.name ?? "Choose a plan"}
                {purchase?.option ? (
                  <span className="ml-2 text-base font-bold text-muted-foreground">
                    · {purchase.option.label}
                  </span>
                ) : null}
              </CardTitle>
            </div>
            {subscription ? <Badge>{subscription.status}</Badge> : null}
          </CardHeader>
          <CardContent>
            <div className="grid gap-5 sm:grid-cols-2">
              <Detail label="Price & duration" value={priceIntervalLabel} />
              <Detail label="Access until" value={accessUntilLabel} />
              <Detail label="Billing cycle" value={billingCycleLabel} />
              <Detail
                label="Payment provider"
                value={
                  currentPlan?.key === "starter"
                    ? "No payment on trial"
                    : "Razorpay"
                }
              />
              {latestCaptured && currentPlan?.key === "growth" ? (
                <Detail
                  label="Last payment"
                  value={`₹${Math.round(latestCaptured.amount / 100).toLocaleString("en-IN")} · ${new Date(latestCaptured.paid_at ?? latestCaptured.created_at).toLocaleDateString()}`}
                />
              ) : null}
              {subscription?.current_period_start &&
              subscription?.current_period_end ? (
                <Detail
                  label="Access window"
                  value={`${new Date(subscription.current_period_start).toLocaleDateString()} → ${new Date(subscription.current_period_end).toLocaleDateString()}`}
                />
              ) : null}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {subscription && currentPlan ? (
                <CancelSubscriptionButton
                  scheduled={subscription.cancel_at_period_end}
                />
              ) : null}
              <Button asChild>
                <Link href="#plans">
                  {subscription ? "Change plan" : "Choose a plan"}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent invoices</CardTitle>
            <p className="text-sm font-medium text-muted-foreground">
              Verified transactions only.
            </p>
          </CardHeader>
          <CardContent>
            {payments?.length ? (
              <div className="space-y-3">
                {payments.slice(0, 5).map((payment) => (
                  <div
                    key={payment.provider_payment_id}
                    className="flex items-center justify-between gap-3 border-b pb-3 text-sm last:border-0"
                  >
                    <span className="font-semibold">
                      {new Date(
                        payment.paid_at ?? payment.created_at,
                      ).toLocaleDateString()}{" "}
                      · ₹
                      {Math.round(payment.amount / 100).toLocaleString("en-IN")}
                    </span>
                    <Badge>{payment.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl bg-muted p-4 text-sm font-medium text-muted-foreground">
                No invoices yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div id="plans" className="pt-3">
        <PlanSelection currentPlanKey={currentPlan?.key} />
      </div>
    </div>
  );
}

function Usage({
  label,
  value,
  limit,
}: {
  label: string;
  value: number;
  limit: number;
}) {
  const unlimited = limit < 0;
  const width = unlimited
    ? 8
    : Math.min(100, Math.round((value / Math.max(limit, 1)) * 100));
  return (
    <div>
      <div className="flex flex-wrap justify-between gap-2 text-sm font-bold">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {unlimited
            ? `${value.toLocaleString("en-IN")} / Unlimited`
            : `${value.toLocaleString("en-IN")} / ${limit.toLocaleString("en-IN")} used`}
        </span>
      </div>
      <div className="mt-2 h-2.5 rounded-full bg-muted">
        <div
          className="h-2.5 rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-extrabold">{value}</p>
    </div>
  );
}
