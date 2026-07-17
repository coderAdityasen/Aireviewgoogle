"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function BillingProcessing() {
  const router = useRouter();
  const [message, setMessage] = useState("Waiting for the verified subscription status…");
  useEffect(() => {
    let stopped = false;
    let attempts = 0;
    let timer: number | undefined;
    const poll = async () => {
      attempts += 1;
      try {
        const response = await fetch("/api/billing/status", { cache: "no-store" });
        const status = await response.json().catch(() => ({}));
        if (stopped) return;
        if (status.paid) { router.replace("/onboarding"); return; }
        if (attempts >= 8) { setMessage("The payment is still being confirmed. You can revisit Billing shortly."); return; }
        timer = window.setTimeout(() => void poll(), 2500);
      } catch {
        if (!stopped) setMessage("We could not check billing status. Please revisit Billing in a moment.");
      }
    };
    void poll();
    return () => { stopped = true; if (timer) window.clearTimeout(timer); };
  }, [router]);
  return <main className="mx-auto flex min-h-screen max-w-lg items-center justify-center px-4"><div className="w-full rounded-2xl border bg-card p-8 text-center shadow-sm" aria-live="polite" aria-busy={message.startsWith("Waiting") || undefined}><div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-primary/20 motion-reduce:animate-none" /><h1 className="mt-5 text-2xl font-semibold">Confirming your subscription</h1><p className="mt-3 text-sm text-muted-foreground">{message}</p></div></main>;
}
