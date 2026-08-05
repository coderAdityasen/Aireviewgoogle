import "server-only";

import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getBillingProvider,
  type ProviderOrder,
} from "@/lib/billing/provider";
import { revalidateOwnerAccess } from "@/lib/billing/cache";
import {
  addMonths,
  getGrowthBillingOption,
  type GrowthBillingPeriod,
  type PlanKey,
} from "@/config/plans";
import { type Subscription, type SubscriptionStatus } from "@/types/database";
import { mapProviderStatus } from "@/lib/billing/status";
export { mapProviderStatus } from "@/lib/billing/status";

const SUPPORTED_WEBHOOK_EVENTS = new Set([
  "payment.captured",
  "payment.failed",
  "order.paid",
  // Keep legacy subscription events so older webhooks do not hard-fail.
  "subscription.authenticated",
  "subscription.activated",
  "subscription.charged",
  "subscription.updated",
  "subscription.pending",
  "subscription.halted",
  "subscription.paused",
  "subscription.resumed",
  "subscription.cancelled",
  "subscription.completed",
]);

export async function createOrderForOwner(input: {
  ownerId: string;
  planKey: PlanKey;
  billingPeriod: GrowthBillingPeriod;
  email?: string | null;
}) {
  if (input.planKey !== "growth") {
    throw new Error("Only the Growth plan supports self-serve checkout.");
  }
  const option = getGrowthBillingOption(input.billingPeriod);
  if (!option) throw new Error("Choose a valid billing period.");

  const provider = getBillingProvider();
  const order = await provider.createOrder({
    planKey: input.planKey,
    billingPeriod: input.billingPeriod,
    amountInr: option.priceInr,
    ownerId: input.ownerId,
    email: input.email,
  });

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency ?? "INR",
    billingPeriod: option.key,
    priceInr: option.priceInr,
    label: option.label,
    months: option.months,
  };
}

export async function verifyCheckoutAndPersist(input: {
  ownerId: string;
  planKey: PlanKey;
  billingPeriod: GrowthBillingPeriod;
  paymentId: string;
  orderId: string;
  signature: string;
}) {
  if (input.planKey !== "growth") {
    throw new Error("Only the Growth plan supports self-serve checkout.");
  }
  const option = getGrowthBillingOption(input.billingPeriod);
  if (!option) throw new Error("Choose a valid billing period.");

  const provider = getBillingProvider();
  if (
    !provider.verifyCheckoutSignature({
      orderId: input.orderId,
      paymentId: input.paymentId,
      signature: input.signature,
    })
  ) {
    throw new Error("Razorpay checkout signature verification failed.");
  }

  const order = await provider.fetchOrder(input.orderId);
  if (order.id !== input.orderId) {
    throw new Error("Razorpay order could not be verified.");
  }

  const noteOwner = order.notes?.reviewflow_owner_id;
  const notePlan = order.notes?.reviewflow_plan_key as PlanKey | undefined;
  const notePeriod = order.notes?.reviewflow_billing_period as
    | GrowthBillingPeriod
    | undefined;

  if (noteOwner && noteOwner !== input.ownerId) {
    throw new Error("This payment does not belong to the signed-in account.");
  }
  if (notePlan && notePlan !== input.planKey) {
    throw new Error("The selected plan does not match the verified order.");
  }
  if (notePeriod && notePeriod !== input.billingPeriod) {
    throw new Error("The selected billing period does not match the verified order.");
  }

  const expectedPaise = option.priceInr * 100;
  if (typeof order.amount === "number" && order.amount !== expectedPaise) {
    throw new Error("Paid amount does not match the selected plan option.");
  }

  // Prefer remote payment amount when available (live mode).
  if (process.env.BILLING_MOCK_MODE !== "true") {
    const payment = await provider.fetchPayment(input.paymentId);
    if (payment.order_id && payment.order_id !== input.orderId) {
      throw new Error("Payment is not linked to the verified order.");
    }
    if (
      payment.status &&
      payment.status !== "captured" &&
      payment.status !== "authorized"
    ) {
      throw new Error("Payment is not captured yet.");
    }
  }

  const subscription = await grantAccessFromOneTimePayment({
    ownerId: input.ownerId,
    planKey: input.planKey,
    billingPeriod: option.key,
    months: option.months,
    providerOrderId: input.orderId,
    eventAt: new Date(),
  });

  const admin = createAdminClient();
  const { error } = await admin.from("payment_transactions").upsert(
    {
      owner_id: input.ownerId,
      subscription_id: subscription.id,
      provider_payment_id: input.paymentId,
      amount: expectedPaise,
      currency: "INR",
      status: "captured",
      paid_at: new Date().toISOString(),
    },
    { onConflict: "provider_payment_id" },
  );
  if (error) throw error;
  revalidateOwnerAccess(input.ownerId);
  return subscription;
}

/**
 * One-time payments have no Razorpay subscription to cancel.
 * Mark local access to end at the current period end (already paid-through).
 */
export async function cancelOwnerSubscription(
  ownerId: string,
  cancelAtPeriodEnd: boolean,
) {
  const admin = createAdminClient();
  const { data: existing, error } = await admin
    .from("subscriptions")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!existing) throw new Error("No subscription found.");

  const now = new Date();
  const accessUntil =
    existing.access_until ?? existing.current_period_end ?? now.toISOString();

  if (cancelAtPeriodEnd) {
    const { data, error: updateError } = await admin
      .from("subscriptions")
      .update({
        cancel_at_period_end: true,
        last_provider_event_at: now.toISOString(),
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (updateError) throw updateError;
    revalidateOwnerAccess(ownerId);
    return data as Subscription;
  }

  const { data, error: updateError } = await admin
    .from("subscriptions")
    .update({
      status: "cancelled",
      cancel_at_period_end: false,
      cancelled_at: now.toISOString(),
      access_until: null,
      last_provider_event_at: now.toISOString(),
    })
    .eq("id", existing.id)
    .select("*")
    .single();
  if (updateError) throw updateError;
  void accessUntil;
  revalidateOwnerAccess(ownerId);
  return data as Subscription;
}

export async function processRazorpayWebhook(input: {
  eventId: string;
  eventType: string;
  rawBody: string;
  payload: RazorpayWebhookPayload;
}) {
  if (!SUPPORTED_WEBHOOK_EVENTS.has(input.eventType)) {
    return { ignored: true };
  }
  const admin = createAdminClient();
  const eventAt = new Date(
    (input.payload.created_at ?? Math.floor(Date.now() / 1000)) * 1000,
  );
  const hash = crypto.createHash("sha256").update(input.rawBody).digest("hex");
  const { data: existingEvent } = await admin
    .from("billing_events")
    .select("id, processing_status")
    .eq("provider_event_id", input.eventId)
    .maybeSingle();
  if (existingEvent) {
    return { duplicate: true, status: existingEvent.processing_status };
  }

  const { error: eventError } = await admin.from("billing_events").insert({
    provider_event_id: input.eventId,
    event_type: input.eventType,
    event_created_at: eventAt.toISOString(),
    processing_status: "received",
    payload_sha256: hash,
  });
  if (eventError) {
    const { data: raced } = await admin
      .from("billing_events")
      .select("processing_status")
      .eq("provider_event_id", input.eventId)
      .maybeSingle();
    return { duplicate: Boolean(raced), status: raced?.processing_status };
  }

  try {
    // One-time payment / order webhooks
    if (
      input.eventType === "payment.captured" ||
      input.eventType === "order.paid"
    ) {
      await handleOneTimePaymentWebhook(input.payload, eventAt);
    }

    // Legacy subscription entity (if still configured on older accounts)
    const entity = input.payload.payload?.subscription?.entity;
    if (entity) {
      const ownerId = entity.notes?.reviewflow_owner_id;
      const planKey =
        (entity.notes?.reviewflow_plan_key as PlanKey | undefined) ?? "growth";
      if (ownerId) {
        await upsertLegacySubscriptionFromProvider({
          ownerId,
          planKey,
          providerSubscription: entity,
          eventAt,
          status: mapProviderStatus(entity.status),
          cancelAtPeriodEnd: Boolean(
            entity.cancel_at_cycle_end ?? entity.cancel_at_period_end,
          ),
        });
      }
    }

    await admin
      .from("billing_events")
      .update({
        processing_status: "processed",
        processed_at: new Date().toISOString(),
      })
      .eq("provider_event_id", input.eventId);
    return { processed: true };
  } catch (error) {
    await admin
      .from("billing_events")
      .update({
        processing_status: "failed",
        processed_at: new Date().toISOString(),
        error_message:
          error instanceof Error ? error.message : "Unknown webhook error",
      })
      .eq("provider_event_id", input.eventId);
    throw error;
  }
}

async function handleOneTimePaymentWebhook(
  payload: RazorpayWebhookPayload,
  eventAt: Date,
) {
  const payment = payload.payload?.payment?.entity;
  const orderEntity = payload.payload?.order?.entity;
  const notes =
    orderEntity?.notes ??
    payment?.notes ??
    ({} as Record<string, string>);

  const ownerId = notes.reviewflow_owner_id;
  const planKey = (notes.reviewflow_plan_key as PlanKey | undefined) ?? "growth";
  const billingPeriod = notes.reviewflow_billing_period as
    | GrowthBillingPeriod
    | undefined;
  const option = getGrowthBillingOption(billingPeriod);
  if (!ownerId || !option || planKey !== "growth") return;

  const orderId = orderEntity?.id ?? payment?.order_id;
  if (!orderId) return;

  const subscription = await grantAccessFromOneTimePayment({
    ownerId,
    planKey,
    billingPeriod: option.key,
    months: option.months,
    providerOrderId: orderId,
    eventAt,
  });

  if (payment?.id) {
    const admin = createAdminClient();
    await admin.from("payment_transactions").upsert(
      {
        owner_id: ownerId,
        subscription_id: subscription.id,
        provider_payment_id: payment.id,
        amount: payment.amount ?? option.priceInr * 100,
        currency: payment.currency ?? "INR",
        status: payment.status === "failed" ? "failed" : "captured",
        paid_at:
          payment.status === "failed" ? null : eventAt.toISOString(),
      },
      { onConflict: "provider_payment_id" },
    );
  }
}

/**
 * Persist paid access. Reuses the latest active row for the owner when possible
 * so renewals extend the current window instead of fragmenting history.
 * `provider_subscription_id` stores the Razorpay order id for one-time payments.
 */
async function grantAccessFromOneTimePayment(input: {
  ownerId: string;
  planKey: PlanKey;
  billingPeriod: GrowthBillingPeriod;
  months: number;
  providerOrderId: string;
  eventAt: Date;
}): Promise<Subscription> {
  const admin = createAdminClient();
  const { data: byOrder } = await admin
    .from("subscriptions")
    .select("*")
    .eq("provider_subscription_id", input.providerOrderId)
    .maybeSingle();

  if (byOrder) {
    // Idempotent: same order already granted access.
    return byOrder as Subscription;
  }

  const { data: latest } = await admin
    .from("subscriptions")
    .select("*")
    .eq("owner_id", input.ownerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const now = input.eventAt;
  const existingEnd =
    latest?.access_until && new Date(latest.access_until).getTime() > now.getTime()
      ? new Date(latest.access_until)
      : latest?.current_period_end &&
          new Date(latest.current_period_end).getTime() > now.getTime()
        ? new Date(latest.current_period_end)
        : now;

  const periodStart = existingEnd.getTime() > now.getTime() ? existingEnd : now;
  // If still active, stack the new purchase after current end.
  const base = periodStart.getTime() > now.getTime() ? periodStart : now;
  const periodEnd = addMonths(base, input.months);

  // Prefer updating the latest active/authenticated row; otherwise insert new.
  const canUpdateLatest =
    latest &&
    ["active", "authenticated", "charged", "resumed", "created", "pending"].includes(
      latest.status,
    );

  if (canUpdateLatest && latest) {
    const { data, error } = await admin
      .from("subscriptions")
      .update({
        provider_subscription_id: input.providerOrderId,
        plan_key: input.planKey,
        status: "active",
        current_period_start: (periodStart.getTime() > now.getTime()
          ? latest.current_period_start ?? now.toISOString()
          : now.toISOString()),
        current_period_end: periodEnd.toISOString(),
        access_until: periodEnd.toISOString(),
        cancel_at_period_end: false,
        cancelled_at: null,
        last_provider_event_at: now.toISOString(),
      })
      .eq("id", latest.id)
      .select("*")
      .single();
    if (error) throw error;
    if (!data) throw new Error("Subscription was not updated.");
    return data as Subscription;
  }

  const { data, error } = await admin
    .from("subscriptions")
    .insert({
      owner_id: input.ownerId,
      provider: "razorpay",
      provider_customer_id: null,
      provider_subscription_id: input.providerOrderId,
      plan_key: input.planKey,
      status: "active" satisfies SubscriptionStatus,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      access_until: periodEnd.toISOString(),
      cancel_at_period_end: false,
      cancelled_at: null,
      last_provider_event_at: now.toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  if (!data) throw new Error("Subscription was not persisted.");
  return data as Subscription;
}

/** Legacy path for older Razorpay subscription webhooks. */
async function upsertLegacySubscriptionFromProvider(input: {
  ownerId: string;
  planKey: PlanKey;
  providerSubscription: {
    id: string;
    status: string;
    current_start?: number | null;
    current_end?: number | null;
    charge_at?: number | null;
    ended_at?: number | null;
    start_at?: number | null;
  };
  eventAt: Date;
  status: SubscriptionStatus;
  cancelAtPeriodEnd?: boolean;
}): Promise<Subscription> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("subscriptions")
    .select("id, last_provider_event_at, cancel_at_period_end")
    .eq("provider_subscription_id", input.providerSubscription.id)
    .maybeSingle();

  if (
    existing?.last_provider_event_at &&
    new Date(existing.last_provider_event_at).getTime() > input.eventAt.getTime()
  ) {
    const { data: current } = await admin
      .from("subscriptions")
      .select("*")
      .eq("id", existing.id)
      .single();
    if (!current) throw new Error("Subscription state could not be read.");
    return current as Subscription;
  }

  const periodStart = toIso(
    input.providerSubscription.current_start ??
      input.providerSubscription.start_at,
  );
  const periodEnd = toIso(
    input.providerSubscription.current_end ??
      input.providerSubscription.charge_at ??
      input.providerSubscription.ended_at,
  );
  const cancelAtPeriodEnd =
    input.cancelAtPeriodEnd ?? Boolean(existing?.cancel_at_period_end);
  const accessUntil =
    cancelAtPeriodEnd || input.status === "completed"
      ? periodEnd
      : input.status === "cancelled" ||
          input.status === "halted" ||
          input.status === "paused"
        ? null
        : periodEnd;

  const { data, error } = await admin
    .from("subscriptions")
    .upsert(
      {
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
        cancelled_at:
          input.status === "cancelled" ? input.eventAt.toISOString() : null,
        last_provider_event_at: input.eventAt.toISOString(),
      },
      { onConflict: "provider_subscription_id" },
    )
    .select("*")
    .single();
  if (error) throw error;
  if (!data) throw new Error("Subscription was not persisted.");
  return data as Subscription;
}

function toIso(seconds?: number | null) {
  return typeof seconds === "number"
    ? new Date(seconds * 1000).toISOString()
    : null;
}

export type RazorpayWebhookPayload = {
  created_at?: number;
  payload?: {
    subscription?: {
      entity?: {
        id: string;
        status: string;
        current_start?: number | null;
        current_end?: number | null;
        charge_at?: number | null;
        ended_at?: number | null;
        start_at?: number | null;
        cancel_at_cycle_end?: boolean;
        cancel_at_period_end?: boolean;
        notes?: Record<string, string>;
      };
    };
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        amount?: number;
        currency?: string;
        status?: string;
        notes?: Record<string, string>;
      };
    };
    order?: {
      entity?: ProviderOrder;
    };
  };
};
