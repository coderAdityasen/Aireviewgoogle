import "server-only";

import { getRazorpayPlanId, type PlanKey } from "@/config/plans";
import { verifyHmacSha256 } from "@/lib/billing/crypto";

export type ProviderSubscription = {
  id: string;
  plan_id?: string;
  status: string;
  current_start?: number | null;
  current_end?: number | null;
  charge_at?: number | null;
  ended_at?: number | null;
  start_at?: number | null;
  notes?: Record<string, string>;
};

export type BillingProvider = {
  createSubscription(input: { planKey: PlanKey; ownerId: string; email?: string | null }): Promise<ProviderSubscription>;
  fetchSubscription(subscriptionId: string): Promise<ProviderSubscription>;
  cancelSubscription(subscriptionId: string, cancelAtCycleEnd: boolean): Promise<ProviderSubscription>;
  verifyCheckoutSignature(input: { paymentId: string; subscriptionId: string; signature: string }): boolean;
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
};

type RazorpayResponse = ProviderSubscription & { customer_id?: string };

export class RazorpayBillingProvider implements BillingProvider {
  private readonly baseUrl = "https://api.razorpay.com/v1";

  private get authHeader() {
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !secret) throw new Error("Razorpay server credentials are missing.");
    return `Basic ${Buffer.from(`${keyId}:${secret}`).toString("base64")}`;
  }

  async createSubscription(input: { planKey: PlanKey; ownerId: string; email?: string | null }) {
    const response = await this.request<RazorpayResponse>("/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        plan_id: getRazorpayPlanId(input.planKey),
        total_count: 120,
        customer_notify: 1,
        notes: { reviewflow_owner_id: input.ownerId, reviewflow_plan_key: input.planKey }
      })
    });
    return response;
  }

  fetchSubscription(subscriptionId: string) {
    return this.request<RazorpayResponse>(`/subscriptions/${encodeURIComponent(subscriptionId)}`, { method: "GET" });
  }

  cancelSubscription(subscriptionId: string, cancelAtCycleEnd: boolean) {
    return this.request<RazorpayResponse>(`/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {
      method: "POST",
      body: JSON.stringify({ cancel_at_cycle_end: cancelAtCycleEnd ? 1 : 0 })
    });
  }

  verifyCheckoutSignature(input: { paymentId: string; subscriptionId: string; signature: string }) {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) throw new Error("RAZORPAY_KEY_SECRET is missing.");
    return verifyHmacSha256({ signature: input.signature, secret, message: `${input.paymentId}|${input.subscriptionId}` });
  }

  verifyWebhookSignature(rawBody: string, signature: string) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) throw new Error("RAZORPAY_WEBHOOK_SECRET is missing.");
    return verifyHmacSha256({ signature, secret, message: rawBody });
  }

  private async request<T>(path: string, init: RequestInit) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { Authorization: this.authHeader, "Content-Type": "application/json", ...(init.headers ?? {}) }
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Razorpay request failed (${response.status}): ${body.slice(0, 300)}`);
    }
    return (await response.json()) as T;
  }
}

export function getBillingProvider(): BillingProvider {
  if (process.env.BILLING_MOCK_MODE === "true") {
    if (process.env.NODE_ENV === "production") throw new Error("BILLING_MOCK_MODE cannot be enabled in production.");
    return new TestBillingProvider();
  }
  return new RazorpayBillingProvider();
}

export class TestBillingProvider implements BillingProvider {
  async createSubscription(input: { planKey: PlanKey; ownerId: string }) {
    return {
      id: `test_sub_${input.ownerId.slice(0, 8)}_${input.planKey}`,
      status: "active",
      current_start: Math.floor(Date.now() / 1000),
      current_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      notes: { reviewflow_owner_id: input.ownerId, reviewflow_plan_key: input.planKey }
    };
  }
  async fetchSubscription(subscriptionId: string) {
    return { id: subscriptionId, status: "active", current_start: Math.floor(Date.now() / 1000), current_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 };
  }
  async cancelSubscription(subscriptionId: string, cancelAtCycleEnd: boolean) {
    return { id: subscriptionId, status: cancelAtCycleEnd ? "active" : "cancelled", current_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 };
  }
  verifyCheckoutSignature() { return true; }
  verifyWebhookSignature() { return true; }
}
