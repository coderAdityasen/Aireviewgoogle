import "server-only";

import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBillingProvider, type ProviderSubscription } from "@/lib/billing/provider";
import { getPlan, getRazorpayPlanId, type PlanKey } from "@/config/plans";
import { type Subscription, type SubscriptionStatus } from "@/types/database";
import { mapProviderStatus } from "@/lib/billing/status";
export { mapProviderStatus } from "@/lib/billing/status";

const SUPPORTED_WEBHOOK_EVENTS = new Set([
  "subscription.authenticated",
  "subscription.activated",
  "subscription.charged",
  "subscription.updated",
  "subscription.pending",
  "subscription.halted",
  "subscription.paused",
  "subscription.resumed",
  "subscription.cancelled",
  "subscription.completed"
]);

export async function createSubscriptionForOwner(input: { ownerId: string; planKey: PlanKey; email?: string | null }) {
  const provider = getBillingProvider();
  const remote = await provider.createSubscription(input);
  return upsertSubscription({ ownerId: input.ownerId, planKey: input.planKey, providerSubscription: remote, eventAt: new Date(), status: mapProviderStatus(remote.status) });
}

export async function verifyCheckoutAndPersist(input: { ownerId: string; planKey: PlanKey; paymentId: string; subscriptionId: string; signature: string }) {
  const provider = getBillingProvider();
  if (!provider.verifyCheckoutSignature({ paymentId: input.paymentId, subscriptionId: input.subscriptionId, signature: input.signature })) {
    throw new Error("Razorpay checkout signature verification failed.");
  }
  const remote = await provider.fetchSubscription(input.subscriptionId);
  if (remote.id !== input.subscriptionId) throw new Error("Razorpay subscription could not be verified.");
  const notePlan = remote.notes?.reviewflow_plan_key;
  if (notePlan && notePlan !== input.planKey) throw new Error("The selected plan does not match the verified subscription.");
  const subscription = await upsertSubscription({ ownerId: input.ownerId, planKey: input.planKey, providerSubscription: remote, eventAt: new Date(), status: mapProviderStatus(remote.status) });
  const admin = createAdminClient();
  const { error } = await admin.from("payment_transactions").upsert({
    owner_id: input.ownerId,
    subscription_id: subscription.id,
    provider_payment_id: input.paymentId,
    amount: getPlan(input.planKey)?.priceInr ? getPlan(input.planKey)!.priceInr * 100 : 0,
    currency: "INR",
    status: "captured",
    paid_at: new Date().toISOString()
  }, { onConflict: "provider_payment_id" });
  if (error) throw error;
  return subscription;
}

export async function cancelOwnerSubscription(ownerId: string, cancelAtPeriodEnd: boolean) {
  const admin = createAdminClient();
  const { data: existing, error } = await admin.from("subscriptions").select("*").eq("owner_id", ownerId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  if (!existing) throw new Error("No subscription found.");
  const remote = await getBillingProvider().cancelSubscription(existing.provider_subscription_id, cancelAtPeriodEnd);
  return upsertSubscription({ ownerId, planKey: existing.plan_key as PlanKey, providerSubscription: remote, eventAt: new Date(), status: cancelAtPeriodEnd ? "active" : "cancelled", cancelAtPeriodEnd });
}

export async function processRazorpayWebhook(input: { eventId: string; eventType: string; rawBody: string; payload: RazorpayWebhookPayload }) {
  if (!SUPPORTED_WEBHOOK_EVENTS.has(input.eventType)) return { ignored: true };
  const admin = createAdminClient();
  const eventAt = new Date((input.payload.created_at ?? Math.floor(Date.now() / 1000)) * 1000);
  const hash = crypto.createHash("sha256").update(input.rawBody).digest("hex");
  const { data: existingEvent } = await admin.from("billing_events").select("id, processing_status").eq("provider_event_id", input.eventId).maybeSingle();
  if (existingEvent) return { duplicate: true, status: existingEvent.processing_status };
  const { error: eventError } = await admin.from("billing_events").insert({
    provider_event_id: input.eventId,
    event_type: input.eventType,
    event_created_at: eventAt.toISOString(),
    processing_status: "received",
    payload_sha256: hash
  });
  if (eventError) {
    const { data: raced } = await admin.from("billing_events").select("processing_status").eq("provider_event_id", input.eventId).maybeSingle();
    return { duplicate: Boolean(raced), status: raced?.processing_status };
  }

  try {
    const entity = input.payload.payload?.subscription?.entity;
    if (entity) {
      const ownerId = entity.notes?.reviewflow_owner_id;
      const planKey = (entity.notes?.reviewflow_plan_key as PlanKey | undefined) ?? inferPlanKey(entity.plan_id);
      if (!ownerId || !planKey) throw new Error("Webhook subscription is missing ReviewFlow ownership metadata.");
      await upsertSubscription({ ownerId, planKey, providerSubscription: entity, eventAt, status: mapProviderStatus(entity.status), cancelAtPeriodEnd: Boolean(entity.cancel_at_cycle_end ?? entity.cancel_at_period_end) });
    }
    const payment = input.payload.payload?.payment?.entity;
    if (payment?.id && entity?.notes?.reviewflow_owner_id) {
      const subscription = await admin.from("subscriptions").select("id").eq("provider_subscription_id", entity.id).maybeSingle();
      await admin.from("payment_transactions").upsert({ owner_id: entity.notes.reviewflow_owner_id, subscription_id: subscription.data?.id ?? null, provider_payment_id: payment.id, amount: payment.amount ?? 0, currency: payment.currency ?? "INR", status: payment.status === "failed" ? "failed" : "captured", paid_at: payment.status === "failed" ? null : new Date().toISOString() }, { onConflict: "provider_payment_id" });
    }
    await admin.from("billing_events").update({ processing_status: "processed", processed_at: new Date().toISOString() }).eq("provider_event_id", input.eventId);
    return { processed: true };
  } catch (error) {
    await admin.from("billing_events").update({ processing_status: "failed", processed_at: new Date().toISOString(), error_message: error instanceof Error ? error.message : "Unknown webhook error" }).eq("provider_event_id", input.eventId);
    throw error;
  }
}

async function upsertSubscription(input: { ownerId: string; planKey: PlanKey; providerSubscription: ProviderSubscription; eventAt: Date; status: SubscriptionStatus; cancelAtPeriodEnd?: boolean }): Promise<Subscription> {
  const admin = createAdminClient();
  const { data: existing } = await admin.from("subscriptions").select("id, last_provider_event_at, current_period_end, cancel_at_period_end").eq("provider_subscription_id", input.providerSubscription.id).maybeSingle();
  if (existing?.last_provider_event_at && new Date(existing.last_provider_event_at).getTime() > input.eventAt.getTime()) {
    const { data: current } = await admin.from("subscriptions").select("*").eq("id", existing.id).single();
    if (!current) throw new Error("Subscription state could not be read.");
    return current as Subscription;
  }
  const periodStart = toIso(input.providerSubscription.current_start ?? input.providerSubscription.start_at);
  const periodEnd = toIso(input.providerSubscription.current_end ?? input.providerSubscription.charge_at ?? input.providerSubscription.ended_at);
  const cancelAtPeriodEnd = input.cancelAtPeriodEnd ?? Boolean(existing?.cancel_at_period_end);
  const accessUntil = cancelAtPeriodEnd || input.status === "completed" ? periodEnd : input.status === "cancelled" || input.status === "halted" || input.status === "paused" ? null : periodEnd;
  const { data, error } = await admin.from("subscriptions").upsert({
    owner_id: input.ownerId,
    provider: "razorpay",
    provider_customer_id: null,
    provider_subscription_id: input.providerSubscription.id,
    plan_key: input.planKey,
    status: input.status,
    current_period_start: periodStart,
    current_period_end: periodEnd,
    access_until: accessUntil,
    cancel_at_period_end: cancelAtPeriodEnd,
    cancelled_at: input.status === "cancelled" ? input.eventAt.toISOString() : null,
    last_provider_event_at: input.eventAt.toISOString()
  }, { onConflict: "provider_subscription_id" }).select("*").single();
  if (error) throw error;
  if (!data) throw new Error("Subscription was not persisted.");
  return data as Subscription;
}

function inferPlanKey(providerPlanId?: string | null): PlanKey | null {
  if (!providerPlanId) return null;
  return (["starter", "growth", "pro"] as PlanKey[]).find((key) => {
    try { return getRazorpayPlanId(key) === providerPlanId; } catch { return false; }
  }) ?? null;
}

function toIso(seconds?: number | null) {
  return typeof seconds === "number" ? new Date(seconds * 1000).toISOString() : null;
}

export type RazorpayWebhookPayload = {
  created_at?: number;
  payload?: {
    subscription?: { entity?: ProviderSubscription & { cancel_at_cycle_end?: boolean; cancel_at_period_end?: boolean } };
    payment?: { entity?: { id?: string; amount?: number; currency?: string; status?: string } };
  };
};
