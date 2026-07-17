"use client";

import Script from "next/script";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { PlanKey } from "@/config/plans";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open(): void };
  }
}

export function CheckoutButton({ planKey }: { planKey: PlanKey }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [checkoutReady, setCheckoutReady] = useState(false);

  async function startCheckout() {
    setPending(true);
    try {
      const response = await fetch("/api/billing/create-subscription", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planKey }) });
      const created = await response.json();
      if (!response.ok) throw new Error(created.error ?? "Unable to start checkout.");
      if (created.testMode) {
        const verification = await fetch("/api/billing/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planKey, razorpay_payment_id: `test_payment_${Date.now()}`, razorpay_subscription_id: created.subscriptionId, razorpay_signature: "test" }) });
        if (!verification.ok) throw new Error("Test billing verification failed.");
        router.push("/billing/processing");
        return;
      }
      if (!window.Razorpay) throw new Error("Razorpay Checkout is still loading. Try again in a moment.");
      const checkout = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        subscription_id: created.subscriptionId,
        name: "ReviewFlow",
        description: `${created.plan.name} monthly plan`,
        handler: async (result: { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string }) => {
          try {
            const verification = await fetch("/api/billing/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planKey, ...result }) });
            if (!verification.ok) {
              const error = await verification.json().catch(() => ({}));
              throw new Error(error.error ?? "Payment could not be verified.");
            }
            router.push("/billing/processing");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Payment could not be verified.");
            setPending(false);
          }
        },
        modal: { ondismiss: () => setPending(false) }
      });
      checkout.open();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start checkout.");
      setPending(false);
    }
  }

  return <><Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" onLoad={() => setCheckoutReady(true)} onError={() => toast.error("Razorpay Checkout could not be loaded. Check your network connection.")} /><Button onClick={() => void startCheckout()} loading={pending} loadingLabel="Starting secure checkout…" disabled={pending} className="w-full">{checkoutReady ? "Start secure checkout" : "Continue to checkout"}</Button></>;
}
