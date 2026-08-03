import "server-only";

import {
  type GrowthBillingPeriod,
  type PlanKey,
} from "@/config/plans";
import { verifyHmacSha256 } from "@/lib/billing/crypto";

export type ProviderOrder = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receipt?: string | null;
  notes?: Record<string, string>;
};

export type ProviderPayment = {
  id: string;
  order_id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  notes?: Record<string, string>;
};

export type BillingProvider = {
  createOrder(input: {
    planKey: PlanKey;
    billingPeriod: GrowthBillingPeriod;
    amountInr: number;
    ownerId: string;
    email?: string | null;
  }): Promise<ProviderOrder>;
  fetchOrder(orderId: string): Promise<ProviderOrder>;
  fetchPayment(paymentId: string): Promise<ProviderPayment>;
  verifyCheckoutSignature(input: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean;
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
};

type RazorpayOrderResponse = ProviderOrder & { entity?: string };

export class RazorpayBillingProvider implements BillingProvider {
  private readonly baseUrl = "https://api.razorpay.com/v1";

  private get authHeader() {
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !secret) throw new Error("Razorpay server credentials are missing.");
    return `Basic ${Buffer.from(`${keyId}:${secret}`).toString("base64")}`;
  }

  async createOrder(input: {
    planKey: PlanKey;
    billingPeriod: GrowthBillingPeriod;
    amountInr: number;
    ownerId: string;
    email?: string | null;
  }) {
    const amountPaise = Math.round(input.amountInr * 100);
    if (amountPaise < 100) throw new Error("Order amount must be at least ₹1.");

    const response = await this.request<RazorpayOrderResponse>("/orders", {
      method: "POST",
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt: `rf_${input.ownerId.slice(0, 8)}_${Date.now()}`.slice(0, 40),
        notes: {
          reviewflow_owner_id: input.ownerId,
          reviewflow_plan_key: input.planKey,
          reviewflow_billing_period: input.billingPeriod,
          ...(input.email ? { reviewflow_email: input.email } : {}),
        },
      }),
    });
    return response;
  }

  fetchOrder(orderId: string) {
    return this.request<ProviderOrder>(`/orders/${encodeURIComponent(orderId)}`, {
      method: "GET",
    });
  }

  fetchPayment(paymentId: string) {
    return this.request<ProviderPayment>(
      `/payments/${encodeURIComponent(paymentId)}`,
      { method: "GET" },
    );
  }

  verifyCheckoutSignature(input: {
    orderId: string;
    paymentId: string;
    signature: string;
  }) {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) throw new Error("RAZORPAY_KEY_SECRET is missing.");
    // One-time Checkout signature: order_id|payment_id
    return verifyHmacSha256({
      signature: input.signature,
      secret,
      message: `${input.orderId}|${input.paymentId}`,
    });
  }

  verifyWebhookSignature(rawBody: string, signature: string) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) throw new Error("RAZORPAY_WEBHOOK_SECRET is missing.");
    return verifyHmacSha256({ signature, secret, message: rawBody });
  }

  private async request<T>(path: string, init: RequestInit) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Razorpay request failed (${response.status}): ${body.slice(0, 300)}`,
      );
    }
    return (await response.json()) as T;
  }
}

let testBillingProvider: TestBillingProvider | null = null;

export function getBillingProvider(): BillingProvider {
  if (process.env.BILLING_MOCK_MODE === "true") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("BILLING_MOCK_MODE cannot be enabled in production.");
    }
    if (!testBillingProvider) testBillingProvider = new TestBillingProvider();
    return testBillingProvider;
  }
  return new RazorpayBillingProvider();
}

export class TestBillingProvider implements BillingProvider {
  private readonly orders = new Map<string, ProviderOrder>();

  async createOrder(input: {
    planKey: PlanKey;
    billingPeriod: GrowthBillingPeriod;
    amountInr: number;
    ownerId: string;
  }) {
    const order: ProviderOrder = {
      id: `order_test_${input.ownerId.slice(0, 8)}_${input.billingPeriod}_${Date.now()}`,
      amount: Math.round(input.amountInr * 100),
      currency: "INR",
      status: "created",
      notes: {
        reviewflow_owner_id: input.ownerId,
        reviewflow_plan_key: input.planKey,
        reviewflow_billing_period: input.billingPeriod,
      },
    };
    this.orders.set(order.id, order);
    return order;
  }

  async fetchOrder(orderId: string) {
    const existing = this.orders.get(orderId);
    if (existing) {
      return { ...existing, status: "paid" };
    }
    // Fallback for isolated unit tests that never called createOrder.
    return {
      id: orderId,
      amount: 49900,
      currency: "INR",
      status: "paid",
      notes: {},
    };
  }

  async fetchPayment(paymentId: string) {
    return {
      id: paymentId,
      order_id: "order_test",
      amount: 49900,
      currency: "INR",
      status: "captured",
    };
  }

  verifyCheckoutSignature() {
    return true;
  }

  verifyWebhookSignature() {
    return true;
  }
}
