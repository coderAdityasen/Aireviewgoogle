import { z } from "zod";
import { normalizeGoogleReviewUrl } from "@/lib/security/google-url";

export const businessSchema = z.object({
  campaignName: z.string().max(80).optional().default(""),
  ownerFullName: z.string().min(2).max(120).optional(),
  name: z.string().min(2).max(160),
  category: z.string().min(2).max(80),
  description: z.string().max(600).optional().default(""),
  services: z.string().max(1000).optional().default(""),
  phone: z.string().max(40).optional().default(""),
  email: z.string().email().optional().or(z.literal("")).default(""),
  website: z.string().url().optional().or(z.literal("")).default(""),
  addressLine: z.string().max(180).optional().default(""),
  city: z.string().max(80).optional().default(""),
  state: z.string().max(80).optional().default(""),
  country: z.string().max(80).optional().default(""),
  logoUrl: z.string().url().optional().or(z.literal("")).default(""),
  brandColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#0f766e"),
  googleReviewUrl: z.string().transform((value) => normalizeGoogleReviewUrl(value)),
  googlePlaceId: z.string().max(200).optional().default(""),
  googleMapsUrl: z.string().url().optional().or(z.literal("")).default(""),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  defaultLanguage: z.string().min(2).max(12).default("en"),
  experienceTags: z.string().max(1000).optional().default(""),
  ratingTags1: z.string().max(1000).optional().default(""),
  ratingTags2: z.string().max(1000).optional().default(""),
  ratingTags3: z.string().max(1000).optional().default(""),
  ratingTags4: z.string().max(1000).optional().default(""),
  ratingTags5: z.string().max(1000).optional().default(""),
  lowRatingSupportMessage: z.string().max(400).optional().default(""),
  contactFields: z.string().max(200).optional().default("name,email"),
  posterHeadline: z.string().max(160).optional().default(""),
  posterTemplate: z.enum(["light", "dark"]).default("light")
});

export const qrCampaignSchema = z.object({
  businessId: z.string().uuid(),
  name: z.string().min(2).max(80)
});

export type BusinessInput = z.infer<typeof businessSchema>;
export type QrCampaignInput = z.infer<typeof qrCampaignSchema>;
