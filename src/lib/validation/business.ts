import { z } from "zod";
import { normalizeGoogleReviewUrl } from "@/lib/security/google-url";

/** Empty, or a valid http(s) URL. Bare domains like `example.com` get `https://`. */
export function optionalHttpUrl(fieldLabel: string) {
  return z
    .string()
    .trim()
    .transform((value) => {
      if (!value) return "";
      return /^https?:\/\//i.test(value) ? value : `https://${value}`;
    })
    .superRefine((value, ctx) => {
      if (!value) return;
      try {
        const url = new URL(value);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          ctx.addIssue({
            code: "custom",
            message: `Enter a valid ${fieldLabel} or leave blank.`,
          });
        }
      } catch {
        ctx.addIssue({
          code: "custom",
          message: `Enter a valid ${fieldLabel} or leave blank.`,
        });
      }
    })
    .default("");
}

const optionalEmail = z
  .string()
  .trim()
  .transform((value) => value)
  .superRefine((value, ctx) => {
    if (!value) return;
    const result = z.string().email().safeParse(value);
    if (!result.success) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid email or leave blank.",
      });
    }
  })
  .default("");

export const businessSchema = z.object({
  campaignName: z.string().max(80).optional().default(""),
  ownerFullName: z.string().min(2).max(120).optional(),
  name: z.string().trim().min(2, "Business name is required.").max(160),
  category: z.string().trim().min(2, "Category is required.").max(80),
  description: z.string().max(600).optional().default(""),
  services: z.string().max(1000).optional().default(""),
  phone: z.string().max(40).optional().default(""),
  email: optionalEmail,
  website: optionalHttpUrl("website URL"),
  addressLine: z.string().max(180).optional().default(""),
  city: z.string().max(80).optional().default(""),
  state: z.string().max(80).optional().default(""),
  country: z.string().max(80).optional().default(""),
  logoUrl: optionalHttpUrl("logo URL"),
  brandColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#0f766e"),
  googleReviewUrl: z.string().transform((value) => normalizeGoogleReviewUrl(value)),
  googlePlaceId: z.string().max(200).optional().default(""),
  googleMapsUrl: optionalHttpUrl("Google Maps URL"),
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
