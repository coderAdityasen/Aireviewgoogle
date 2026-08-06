import type { Json } from "@/types/database";

export const POSTER_TEMPLATES = [
  {
    id: "midnight",
    name: "Prime Review",
    description: "Navy & gold luxury poster",
    background: "#f7f4ee",
    surface: "#ffffff",
    foreground: "#0b1b3a",
    accent: "#c9a227",
    /** Designed poster art used as the full-bleed background. */
    backgroundImage: "/poster-templates/midnight.png",
  },
  {
    id: "clear",
    name: "Elite Stand",
    description: "Forest green botanical poster",
    background: "#f4f7f2",
    surface: "#ffffff",
    foreground: "#0f2a1c",
    accent: "#0f3d2e",
    backgroundImage: "/poster-templates/clear.png",
  },
  {
    id: "warm",
    name: "Review Spot",
    description: "Warm gold sunburst poster",
    background: "#f4b183",
    surface: "#fbf0e0",
    foreground: "#5c2e0a",
    accent: "#c9a227",
    backgroundImage: "/poster-templates/warm.png",
  },
  {
    id: "evergreen",
    name: "Review Pro",
    description: "Deep green botanical poster",
    background: "#0a3d2e",
    surface: "#0f2e24",
    foreground: "#ecfdf5",
    accent: "#a8d5a2",
    backgroundImage: "/poster-templates/evergreen.png",
  },
] as const;

export const QR_STYLES = [
  { id: "mono", name: "Mono Grid", color: "#111827", description: "Classic contrast" },
  { id: "cobalt", name: "Cobalt Pulse", color: "#2463f3", description: "Brand blue" },
  { id: "mint", name: "Mint Signal", color: "#059669", description: "Fresh green" },
  { id: "coral", name: "Coral Bold", color: "#ef4444", description: "Warm accent" }
] as const;

export type PosterTemplateId = (typeof POSTER_TEMPLATES)[number]["id"];
export type QrStyleId = (typeof QR_STYLES)[number]["id"];

export type PosterSettings = {
  displayName: string;
  headline: string;
  subtitle: string;
  template: PosterTemplateId;
  qrStyle: QrStyleId;
  qrColor: string;
  brandLogoUrl: string | null;
  qrLogoUrl: string | null;
};

export const DEFAULT_POSTER_SETTINGS: PosterSettings = {
  displayName: "",
  headline: "Share your experience",
  subtitle: "Scan to share your genuine visit",
  template: "midnight",
  qrStyle: "cobalt",
  qrColor: "#2463f3",
  brandLogoUrl: null,
  qrLogoUrl: null
};

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isHexColor = (value: unknown): value is string => typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
const isTemplate = (value: unknown): value is PosterTemplateId => POSTER_TEMPLATES.some((item) => item.id === value);
const isQrStyle = (value: unknown): value is QrStyleId => QR_STYLES.some((item) => item.id === value);
const cleanText = (value: unknown, fallback: string, maxLength: number) => typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : fallback;
const cleanUrl = (value: unknown) => typeof value === "string" && /^https?:\/\//i.test(value) ? value : null;

export function parsePosterSettings(value: unknown, legacyTemplate: "light" | "dark" = "light"): PosterSettings {
  const source = isRecord(value) ? value : {};
  const legacyDefault = legacyTemplate === "dark" ? "midnight" : "clear";
  const template = isTemplate(source.template) ? source.template : legacyDefault;
  const style = QR_STYLES.find((item) => item.id === source.qrStyle);

  return {
    displayName: cleanText(source.displayName, "", 100),
    headline: cleanText(source.headline, DEFAULT_POSTER_SETTINGS.headline, 160),
    subtitle: cleanText(source.subtitle, DEFAULT_POSTER_SETTINGS.subtitle, 160),
    template,
    qrStyle: isQrStyle(source.qrStyle) ? source.qrStyle : DEFAULT_POSTER_SETTINGS.qrStyle,
    qrColor: isHexColor(source.qrColor) ? source.qrColor : style?.color ?? DEFAULT_POSTER_SETTINGS.qrColor,
    brandLogoUrl: cleanUrl(source.brandLogoUrl),
    qrLogoUrl: cleanUrl(source.qrLogoUrl)
  };
}

export function posterSettingsToJson(settings: PosterSettings): Json {
  return settings as unknown as Json;
}

export function getPosterTemplate(id: PosterTemplateId) {
  return POSTER_TEMPLATES.find((item) => item.id === id) ?? POSTER_TEMPLATES[0];
}
