"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function BillingProcessing() {
  const router = useRouter();
  const [message, setMessage] = useState("Waiting for the verified subscription status…");
  useEffect(() => {
    let stopped = false;
    let attempts = 0;
    const poll = async () => {
      attempts += 1;
      const response = await fetch("/api/billing/status", { cache: "no-store" });
      const status = await response.json().catch(() => ({}));
      if (stopped) return;
      if (status.paid) { router.replace("/onboarding"); return; }
      if (attempts >= 8) { setMessage("The payment is still being confirmed. You can revisit Billing shortly."); return; }
      setTimeout(poll, 2500);
    };
    void poll();
    return () => { stopped = true; };
  }, [router]);
  return <main className="mx-auto flex min-h-screen max-w-lg items-center justify-center px-4"><div className="w-full rounded-2xl border bg-card p-8 text-center shadow-sm"><div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-primary/20" /><h1 className="mt-5 text-2xl font-semibold">Confirming your subscription</h1><p className="mt-3 text-sm text-muted-foreground">{message}</p></div></main>;
}
