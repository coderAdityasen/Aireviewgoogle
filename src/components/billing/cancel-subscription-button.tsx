"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CancelSubscriptionButton({ scheduled }: { scheduled: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function cancel() {
    if (
      !window.confirm(
        "Mark this plan as ending when access expires? Growth is a one-time payment with no auto-renewal — you keep access until the paid period ends.",
      )
    ) {
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelAtPeriodEnd: true }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Cancellation failed.");
      toast.success(
        "Noted. Access remains available until your paid period ends. Renew anytime with another one-time payment.",
      );
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Cancellation failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      loading={pending}
      loadingLabel="Scheduling…"
      onClick={() => void cancel()}
      disabled={scheduled}
    >
      {scheduled ? "Ends at period end" : "End at period end"}
    </Button>
  );
}
