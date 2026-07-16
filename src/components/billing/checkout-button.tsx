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
          const verification = await fetch("/api/billing/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planKey, ...result }) });
          if (!verification.ok) {
            const error = await verification.json().catch(() => ({}));
            toast.error(error.error ?? "Payment could not be verified.");
            return;
          }
          router.push("/billing/processing");
        },
        modal: { ondismiss: () => setPending(false) }
      });
      checkout.open();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start checkout.");
      setPending(false);
    }
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <Button onClick={startCheckout} disabled={pending} className="w-full">{pending ? "Starting secure checkout…" : "Start secure checkout"}</Button>
    </>
  );
}
