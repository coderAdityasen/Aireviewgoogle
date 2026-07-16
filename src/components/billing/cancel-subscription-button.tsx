"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
export function CancelSubscriptionButton({ scheduled }: { scheduled: boolean }) { const router = useRouter(); const [pending, setPending] = useState(false); async function cancel() { if (!window.confirm("Cancel at the end of the current billing period? Your data will be preserved.")) return; setPending(true); const response = await fetch("/api/billing/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cancelAtPeriodEnd: true }) }); const json = await response.json(); setPending(false); if (!response.ok) { toast.error(json.error ?? "Cancellation failed."); return; } toast.success("Cancellation scheduled. Access remains available until the period ends."); router.refresh(); } return <Button type="button" variant="outline" onClick={cancel} disabled={pending || scheduled}>{scheduled ? "Cancellation scheduled" : pending ? "Saving…" : "Cancel at period end"}</Button>; }
