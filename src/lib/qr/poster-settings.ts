import type { Json } from "@/types/database";

export const POSTER_TEMPLATES = [
  {
    id: "midnight",
    name: "Prime Review",
    description: "Dark premium poster",
    background: "#0b1428",
    surface: "#0e1c38",
    foreground: "#ffffff",
    accent: "#2463f3",
    /** Designed poster art used as the full-bleed background. */
    backgroundImage: "/poster-templates/midnight.jpg",
  },
  {
    id: "clear",
    name: "Elite Stand",
    description: "Bright clean poster",
    background: "#eef5ff",
    surface: "#ffffff",
    foreground: "#0f172a",
    accent: "#2463f3",
    backgroundImage: "/poster-templates/clear.jpg",
  },
  {
    id: "warm",
    name: "Review Spot",
    description: "Warm sunset poster",
    background: "#fff7ed",
    surface: "#fffaf5",
    foreground: "#431407",
    accent: "#ea580c",
    backgroundImage: "/poster-templates/warm.jpg",
  },
  {
    id: "evergreen",
    name: "Review Pro",
    description: "Deep green poster",
    background: "#052e16",
    surface: "#064e3b",
    foreground: "#ecfdf5",
    accent: "#10b981",
    backgroundImage: "/poster-templates/evergreen.jpg",
  },
  {
    id: "luxury-gold",
    name: "Gold Marble",
    description: "Premium gold & marble poster",
    background: "#f7f1e8",
    surface: "#fffdf8",
    foreground: "#3d2b1f",
    accent: "#c9a227",
    backgroundImage: "/poster-templates/luxury-gold.jpg",
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
