"use client";

import Script from "next/script";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_GROWTH_BILLING_PERIOD,
  GROWTH_BILLING_OPTIONS,
  type GrowthBillingPeriod,
  type PlanKey,
} from "@/config/plans";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open(): void };
  }
}

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="pointer-events-none h-4 w-4 text-muted-foreground"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 7.5 10 12.5 15 7.5" />
    </svg>
  );
}

export function CheckoutButton({
  planKey,
  billingPeriod: initialPeriod = DEFAULT_GROWTH_BILLING_PERIOD,
}: {
  planKey: PlanKey;
  billingPeriod?: GrowthBillingPeriod;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [checkoutReady, setCheckoutReady] = useState(false);
  const [billingPeriod, setBillingPeriod] =
    useState<GrowthBillingPeriod>(initialPeriod);

  const selected =
    GROWTH_BILLING_OPTIONS.find((option) => option.key === billingPeriod) ??
    GROWTH_BILLING_OPTIONS.find(
      (option) => option.key === DEFAULT_GROWTH_BILLING_PERIOD,
    )!;

  async function startCheckout() {
    setPending(true);
    try {
      const response = await fetch("/api/billing/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey, billingPeriod }),
      });
      const created = await response.json();
      if (!response.ok) {
        throw new Error(created.error ?? "Unable to start checkout.");
      }

      if (created.testMode) {
        const verification = await fetch("/api/billing/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planKey,
            billingPeriod,
            razorpay_payment_id: `test_payment_${Date.now()}`,
            razorpay_order_id: created.orderId,
            razorpay_signature: "test",
          }),
        });
        if (!verification.ok) throw new Error("Test billing verification failed.");
        router.push("/billing/processing");
        return;
      }

      if (!window.Razorpay) {
        throw new Error(
          "Razorpay Checkout is still loading. Try again in a moment.",
        );
      }

      const checkout = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        order_id: created.orderId,
        amount: created.amount,
        currency: created.currency ?? "INR",
        name: "ReviewFlow",
        description: `Growth · ${created.label} (one-time)`,
        handler: async (result: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verification = await fetch("/api/billing/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                planKey,
                billingPeriod,
                ...result,
              }),
            });
            if (!verification.ok) {
              const error = await verification.json().catch(() => ({}));
              throw new Error(error.error ?? "Payment could not be verified.");
            }
            router.push("/billing/processing");
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Payment could not be verified.",
            );
            setPending(false);
          }
        },
        modal: { ondismiss: () => setPending(false) },
      });
      checkout.open();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to start checkout.",
      );
      setPending(false);
    }
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setCheckoutReady(true)}
        onError={() =>
          toast.error(
            "Razorpay Checkout could not be loaded. Check your network connection.",
          )
        }
      />

      <div className="space-y-4">
        <div>
          <label
            htmlFor="checkout-billing-period"
            className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground"
          >
            Billing period
          </label>
          <div className="relative">
            <select
              id="checkout-billing-period"
              value={billingPeriod}
              disabled={pending}
              onChange={(event) =>
                setBillingPeriod(event.target.value as GrowthBillingPeriod)
              }
              className="h-11 w-full appearance-none rounded-xl border border-border/90 bg-white py-2 pl-3.5 pr-10 text-sm font-bold text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
            >
              {GROWTH_BILLING_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.key === "1m"
                    ? "1 month"
                    : option.key === "6m"
                      ? "6 months"
                      : "1 year"}
                  {` — ₹${option.priceInr.toLocaleString("en-IN")}`}
                  {option.badge ? ` (${option.badge})` : ""}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              <ChevronDownIcon />
            </span>
          </div>
        </div>

        <p className="text-center text-3xl font-extrabold tracking-[-0.06em] text-foreground">
          ₹{selected.priceInr.toLocaleString("en-IN")}
          <span className="ml-1 text-sm font-bold tracking-normal text-muted-foreground">
            {selected.months === 1
              ? "/month"
              : selected.months === 12
                ? "/year"
                : "/6 months"}
          </span>
        </p>
      </div>

      <Button
        onClick={() => void startCheckout()}
        loading={pending}
        loadingLabel="Starting secure checkout…"
        disabled={pending}
        className="w-full"
      >
        {checkoutReady
          ? `Pay ₹${selected.priceInr.toLocaleString("en-IN")}`
          : "Continue to checkout"}
      </Button>
    </>
  );
}
