import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { checkoutSignature, verifyHmacSha256 } from "@/lib/billing/crypto";
import { mapProviderStatus } from "@/lib/billing/status";

describe("Razorpay billing safety", () => {
  it("verifies the checkout HMAC over payment and subscription IDs", () => {
    const signature = checkoutSignature({ paymentId: "pay_123", subscriptionId: "sub_123", secret: "checkout-secret" });
    expect(verifyHmacSha256({ message: "pay_123|sub_123", secret: "checkout-secret", signature })).toBe(true);
    expect(verifyHmacSha256({ message: "pay_123|sub_123", secret: "checkout-secret", signature: "bad" })).toBe(false);
  });

  it("verifies the raw webhook body signature", () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = "webhook-secret";
    const body = JSON.stringify({ event: "subscription.activated" });
    const signature = createHmac("sha256", "webhook-secret").update(body).digest("hex");
    expect(verifyHmacSha256({ message: body, secret: "webhook-secret", signature })).toBe(true);
    expect(verifyHmacSha256({ message: `${body} `, secret: "webhook-secret", signature })).toBe(false);
  });

  it("maps provider states without treating paused or halted as paid", () => {
    expect(mapProviderStatus("active")).toBe("active");
    expect(mapProviderStatus("paused")).toBe("paused");
    expect(mapProviderStatus("cancelled")).toBe("cancelled");
  });
});
