import crypto from "node:crypto";

export function verifyHmacSha256(input: { message: string; secret: string; signature: string }) {
  const expected = crypto.createHmac("sha256", input.secret).update(input.message).digest("hex");
  const left = Buffer.from(input.signature, "utf8");
  const right = Buffer.from(expected, "utf8");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function checkoutSignature(input: { paymentId: string; subscriptionId: string; secret: string }) { return crypto.createHmac("sha256", input.secret).update(`${input.paymentId}|${input.subscriptionId}`).digest("hex"); }
