"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CancelSubscriptionButton({ scheduled }: { scheduled: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function cancel() {
    if (!window.confirm("Cancel at the end of the current billing period? Your data will be preserved.")) return;
    setPending(true);
    try {
      const response = await fetch("/api/billing/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cancelAtPeriodEnd: true }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Cancellation failed.");
      toast.success("Cancellation scheduled. Access remains available until the period ends.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Cancellation failed.");
    } finally {
      setPending(false);
    }
  }

  return <Button type="button" variant="outline" loading={pending} loadingLabel="Scheduling…" onClick={() => void cancel()} disabled={scheduled}> {scheduled ? "Cancellation scheduled" : "Cancel at period end"} </Button>;
}
