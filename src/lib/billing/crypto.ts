import crypto from "node:crypto";

export function verifyHmacSha256(input: {
  message: string;
  secret: string;
  signature: string;
}) {
  const expected = crypto
    .createHmac("sha256", input.secret)
    .update(input.message)
    .digest("hex");
  const left = Buffer.from(input.signature, "utf8");
  const right = Buffer.from(expected, "utf8");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

/** Razorpay one-time Checkout HMAC: order_id|payment_id */
export function checkoutSignature(input: {
  orderId: string;
  paymentId: string;
  secret: string;
}) {
  return crypto
    .createHmac("sha256", input.secret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");
}
