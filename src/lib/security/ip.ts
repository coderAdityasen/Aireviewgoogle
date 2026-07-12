import { createHash, randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { getIpHashSecret } from "@/lib/env";

export function getClientIp(request: Request | NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("x-real-ip") || "0.0.0.0";
}

export function hashIp(ip: string) {
  return createHash("sha256").update(`${getIpHashSecret()}:${ip}`).digest("hex");
}

export function hashSubject(parts: Array<string | null | undefined>) {
  return createHash("sha256")
    .update(`${getIpHashSecret()}:${parts.filter(Boolean).join(":")}`)
    .digest("hex");
}

export function getOrCreateAnonymousId(value?: string | null) {
  return value && value.length > 16 ? value : randomUUID();
}

export function detectDeviceType(userAgent: string | null) {
  if (!userAgent) return "unknown";
  if (/tablet|ipad/i.test(userAgent)) return "tablet";
  if (/mobi|android|iphone/i.test(userAgent)) return "mobile";
  return "desktop";
}
