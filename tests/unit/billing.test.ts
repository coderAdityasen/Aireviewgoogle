import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { checkoutSignature, verifyHmacSha256 } from "@/lib/billing/crypto";
import { mapProviderStatus } from "@/lib/billing/status";
import {
  DEFAULT_GROWTH_BILLING_PERIOD,
  GROWTH_BILLING_OPTIONS,
  addMonths,
  getGrowthBillingOption,
} from "@/config/plans";

describe("Razorpay billing safety", () => {
  it("verifies the checkout HMAC over order and payment IDs", () => {
    const signature = checkoutSignature({
      orderId: "order_123",
      paymentId: "pay_123",
      secret: "checkout-secret",
    });
    expect(
      verifyHmacSha256({
        message: "order_123|pay_123",
        secret: "checkout-secret",
        signature,
      }),
    ).toBe(true);
    expect(
      verifyHmacSha256({
        message: "order_123|pay_123",
        secret: "checkout-secret",
        signature: "bad",
      }),
    ).toBe(false);
  });

  it("verifies the raw webhook body signature", () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = "webhook-secret";
    const body = JSON.stringify({ event: "payment.captured" });
    const signature = createHmac("sha256", "webhook-secret")
      .update(body)
      .digest("hex");
    expect(
      verifyHmacSha256({ message: body, secret: "webhook-secret", signature }),
    ).toBe(true);
    expect(
      verifyHmacSha256({
        message: `${body} `,
        secret: "webhook-secret",
        signature,
      }),
    ).toBe(false);
  });

  it("maps provider states without treating paused or halted as paid", () => {
    expect(mapProviderStatus("active")).toBe("active");
    expect(mapProviderStatus("paused")).toBe("paused");
    expect(mapProviderStatus("cancelled")).toBe("cancelled");
  });
});

describe("Growth one-time billing options", () => {
  it("exposes 1 month, 6 months, and 1 year prices", () => {
    expect(GROWTH_BILLING_OPTIONS).toHaveLength(3);
    expect(getGrowthBillingOption("1m")?.priceInr).toBe(499);
    expect(getGrowthBillingOption("6m")?.priceInr).toBe(1999);
    expect(getGrowthBillingOption("12m")?.priceInr).toBe(2999);
    expect(getGrowthBillingOption("3m")).toBeNull();
    expect(DEFAULT_GROWTH_BILLING_PERIOD).toBe("12m");
  });

  it("adds calendar months for access windows", () => {
    const start = new Date("2026-01-15T12:00:00.000Z");
    expect(addMonths(start, 1).toISOString()).toBe("2026-02-15T12:00:00.000Z");
    expect(addMonths(start, 6).toISOString()).toBe("2026-07-15T12:00:00.000Z");
    expect(addMonths(start, 12).toISOString()).toBe("2027-01-15T12:00:00.000Z");
  });
});
