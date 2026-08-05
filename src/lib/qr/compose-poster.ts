/**
 * Browser-side poster compositor.
 * Builds a real PNG (canvas → data URL / blob) with the live QR code drawn onto
 * a designed template background. Preview and download use the same pipeline.
 */

import {
  getPosterTemplate,
  type PosterTemplateId,
} from "@/lib/qr/poster-settings";
import { BRAND } from "@/config/brand";

export type PosterComposeInput = {
  displayName: string;
  headline: string;
  subtitle: string;
  campaignName?: string;
  qrDataUrl: string;
  brandLogoUrl?: string | null;
  qrLogoUrl?: string | null;
  logoOverlay?: boolean;
  template: PosterTemplateId;
  /** Export resolution. Default 1080×1440 (3:4 print-friendly). */
  width?: number;
  height?: number;
};

type Theme = {
  bgTop: string;
  bgBottom: string;
  card: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
  star: string;
  qrFrame: string;
  badge: string;
  footer: string;
  dark: boolean;
};

const THEMES: Record<PosterTemplateId, Theme> = {
  midnight: {
    bgTop: "#07111f",
    bgBottom: "#12306a",
    card: "#0e1c38",
    text: "#ffffff",
    muted: "rgba(255,255,255,0.72)",
    accent: "#2463f3",
    accentSoft: "rgba(36,99,243,0.25)",
    star: "#f5b400",
    qrFrame: "#ffffff",
    badge: "#2463f3",
    footer: "rgba(255,255,255,0.55)",
    dark: true,
  },
  clear: {
    bgTop: "#eef5ff",
    bgBottom: "#dbeafe",
    card: "#ffffff",
    text: "#0f172a",
    muted: "rgba(15,23,42,0.62)",
    accent: "#2463f3",
    accentSoft: "rgba(36,99,243,0.12)",
    star: "#f5b400",
    qrFrame: "#ffffff",
    badge: "#2463f3",
    footer: "rgba(15,23,42,0.45)",
    dark: false,
  },
  warm: {
    bgTop: "#fff7ed",
    bgBottom: "#fdba74",
    card: "#fffaf5",
    text: "#431407",
    muted: "rgba(67,20,7,0.65)",
    accent: "#ea580c",
    accentSoft: "rgba(234,88,12,0.15)",
    star: "#f59e0b",
    qrFrame: "#ffffff",
    badge: "#ea580c",
    footer: "rgba(67,20,7,0.5)",
    dark: false,
  },
  evergreen: {
    bgTop: "#052e16",
    bgBottom: "#065f46",
    card: "#064e3b",
    text: "#ecfdf5",
    muted: "rgba(236,253,245,0.72)",
    accent: "#10b981",
    accentSoft: "rgba(16,185,129,0.22)",
    star: "#fbbf24",
    qrFrame: "#ffffff",
    badge: "#059669",
    footer: "rgba(236,253,245,0.55)",
    dark: true,
  },
  "luxury-gold": {
    bgTop: "#f7f1e8",
    bgBottom: "#e8d5b5",
    card: "#fffdf8",
    text: "#3d2b1f",
    muted: "rgba(61,43,31,0.62)",
    accent: "#c9a227",
    accentSoft: "rgba(201,162,39,0.18)",
    star: "#d4af37",
    qrFrame: "#fffef9",
    badge: "#ea580c",
    footer: "rgba(61,43,31,0.5)",
    dark: false,
  },
};

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    // Only force CORS for remote/blob assets. Local /public files stay same-origin
    // so canvas export is never tainted by missing ACAO headers.
    if (/^(https?:|blob:)/i.test(source)) {
      image.crossOrigin = "anonymous";
    }
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("An image could not be included in the poster."));
    image.src = source;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
) {
  ctx.fillStyle = fill;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length >= maxLines) break;
    } else {
      line = candidate;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.length > 0) {
    // ellipsis if truncated
    let last = lines[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 1) {
      last = last.slice(0, -1);
    }
    if (words.join(" ").length > lines.join(" ").length) {
      lines[maxLines - 1] = `${last}…`;
    }
  }
  return lines;
}

function drawCenteredLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
) {
  lines.forEach((entry, index) => {
    ctx.fillText(entry, x, y + index * lineHeight);
  });
  return lines.length * lineHeight;
}

/** Hosted real Google wordmark (downloaded from Google branding assets into /public). */
export const GOOGLE_LOGO_SRC = "/branding/google-logo-wordmark.png";
/** Multicolor Google “G” mark fallback. */
export const GOOGLE_G_LOGO_SRC = "/branding/google-g-logo.svg";

/**
 * Draw the real Google logo (wordmark). Falls back to the multicolor G, then a
 * tiny colored badge if assets fail to load (should not happen in production).
 * Paths are same-origin `/public` assets so canvas export stays untainted.
 */
async function drawGoogleLogo(
  ctx: CanvasRenderingContext2D,
  cx: number,
  y: number,
  posterWidth: number,
  posterHeight: number,
): Promise<number> {
  const logoH = Math.round(posterHeight * 0.055);
  const maxW = Math.round(posterWidth * 0.34);

  const candidates = [GOOGLE_LOGO_SRC, GOOGLE_G_LOGO_SRC];

  for (const src of candidates) {
    try {
      const logo = await loadImage(src);
      const naturalRatio = logo.width / Math.max(logo.height, 1);
      let drawH = logoH;
      let drawW = Math.round(drawH * naturalRatio);
      if (drawW > maxW) {
        drawW = maxW;
        drawH = Math.round(drawW / naturalRatio);
      }
      ctx.drawImage(logo, cx - drawW / 2, y, drawW, drawH);
      return y + drawH + Math.round(posterHeight * 0.018);
    } catch {
      // try next asset
    }
  }

  // Last-resort: simple multicolor G badge (never the primary path)
  const size = Math.round(posterHeight * 0.07);
  const cy = y + size / 2;
  const r = size / 2;
  const colors = ["#4285F4", "#EA4335", "#FBBC05", "#34A853"];
  const segs = [
    { start: -0.2, end: 0.55, color: colors[0] },
    { start: 0.55, end: 1.15, color: colors[2] },
    { start: 1.15, end: 1.75, color: colors[3] },
    { start: 1.75, end: 2.35, color: colors[1] },
  ];
  ctx.lineWidth = size * 0.18;
  for (const seg of segs) {
    ctx.strokeStyle = seg.color;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.72, Math.PI * seg.start, Math.PI * seg.end);
    ctx.stroke();
  }
  ctx.fillStyle = colors[0];
  ctx.fillRect(cx, cy - size * 0.09, r * 0.78, size * 0.18);
  return y + size + Math.round(posterHeight * 0.02);
}

function drawStars(
  ctx: CanvasRenderingContext2D,
  cx: number,
  y: number,
  count: number,
  size: number,
  color: string,
) {
  const gap = size * 1.35;
  const startX = cx - ((count - 1) * gap) / 2;
  ctx.fillStyle = color;
  for (let i = 0; i < count; i += 1) {
    const x = startX + i * gap;
    drawStar(ctx, x, y, 5, size / 2, size / 4.4);
  }
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outer: number,
  inner: number,
) {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outer);
  for (let i = 0; i < spikes; i += 1) {
    ctx.lineTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * inner, cy + Math.sin(rot) * inner);
    rot += step;
  }
  ctx.lineTo(cx, cy - outer);
  ctx.closePath();
  ctx.fill();
}

function drawDecor(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  theme: Theme,
) {
  // Soft orbs
  const orbs = [
    { x: w * 0.12, y: h * 0.18, r: w * 0.22, a: 0.12 },
    { x: w * 0.88, y: h * 0.28, r: w * 0.18, a: 0.1 },
    { x: w * 0.7, y: h * 0.85, r: w * 0.2, a: 0.08 },
  ];
  for (const orb of orbs) {
    const g = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
    g.addColorStop(0, theme.accent);
    g.addColorStop(1, "transparent");
    ctx.globalAlpha = orb.a;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Corner rings
  ctx.strokeStyle = theme.accentSoft;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(w * 0.08, h * 0.08, w * 0.1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(w * 0.92, h * 0.92, w * 0.12, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * Cover-draw an image onto the canvas (object-fit: cover).
 */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  const scale = Math.max(width / image.width, height / image.height);
  const drawW = image.width * scale;
  const drawH = image.height * scale;
  const x = (width - drawW) / 2;
  const y = (height - drawH) / 2;
  ctx.drawImage(image, x, y, drawW, drawH);
}

/**
 * Compose a full poster PNG as a data URL.
 * Uses designed template background images from /public/poster-templates.
 */
export async function composePosterPng(
  input: PosterComposeInput,
): Promise<string> {
  const width = input.width ?? 1080;
  const height = input.height ?? 1440;
  const theme = THEMES[input.template] ?? THEMES.midnight;
  const templateMeta = getPosterTemplate(input.template);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");

  // Designed template background image (fallback: gradient + decor)
  let usedBackgroundImage = false;
  try {
    const bgImage = await loadImage(templateMeta.backgroundImage);
    drawImageCover(ctx, bgImage, width, height);
    usedBackgroundImage = true;
  } catch {
    const bg = ctx.createLinearGradient(0, 0, width * 0.2, height);
    bg.addColorStop(0, theme.bgTop);
    bg.addColorStop(1, theme.bgBottom);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
    drawDecor(ctx, width, height, theme);
  }

  // Content area — slightly tighter when art already provides a framed panel
  const pad = Math.round(width * (usedBackgroundImage ? 0.11 : 0.07));
  const cardX = pad;
  const cardY = pad;
  const cardW = width - pad * 2;
  const cardH = height - pad * 2;

  if (!usedBackgroundImage) {
    fillRoundRect(ctx, cardX, cardY, cardW, cardH, 36, theme.card);
    ctx.strokeStyle = theme.dark
      ? "rgba(255,255,255,0.08)"
      : "rgba(15,23,42,0.06)";
    ctx.lineWidth = 2;
    roundRect(ctx, cardX + 2, cardY + 2, cardW - 4, cardH - 4, 34);
    ctx.stroke();
  }

  const cx = width / 2;
  let y = cardY + Math.round(height * (usedBackgroundImage ? 0.05 : 0.06));

  // Business brand logo when set; otherwise real Google logo
  if (input.brandLogoUrl) {
    try {
      const logo = await loadImage(input.brandLogoUrl);
      const logoH = Math.round(height * 0.055);
      const logoW = Math.min(
        Math.round((logo.width / logo.height) * logoH),
        Math.round(width * 0.28),
      );
      ctx.drawImage(logo, cx - logoW / 2, y, logoW, logoH);
      y += logoH + Math.round(height * 0.018);
    } catch {
      y = await drawGoogleLogo(ctx, cx, y, width, height);
    }
  } else {
    y = await drawGoogleLogo(ctx, cx, y, width, height);
  }

  // Stars
  drawStars(ctx, cx, y + 10, 5, 22, theme.star);
  y += 42;

  // Headline
  ctx.fillStyle = theme.text;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = `800 ${Math.round(width * 0.048)}px system-ui, Segoe UI, Arial, sans-serif`;
  const headlineLines = wrapText(
    ctx,
    input.headline || "Share your experience",
    cardW * 0.82,
    3,
  );
  const headlineH = drawCenteredLines(
    ctx,
    headlineLines,
    cx,
    y,
    Math.round(width * 0.055),
  );
  y += headlineH + Math.round(height * 0.012);

  // Subtitle
  ctx.fillStyle = theme.muted;
  ctx.font = `600 ${Math.round(width * 0.028)}px system-ui, Segoe UI, Arial, sans-serif`;
  const subLines = wrapText(
    ctx,
    input.subtitle || "Scan to share your genuine visit",
    cardW * 0.8,
    2,
  );
  const subH = drawCenteredLines(
    ctx,
    subLines,
    cx,
    y,
    Math.round(width * 0.036),
  );
  y += subH + Math.round(height * 0.03);

  // QR frame + code
  const qrOuter = Math.round(width * 0.46);
  const qrInner = Math.round(qrOuter * 0.86);
  const qrFrameX = cx - qrOuter / 2;
  const qrFrameY = y;

  // Shadow
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.22)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 12;
  fillRoundRect(ctx, qrFrameX, qrFrameY, qrOuter, qrOuter, 28, theme.qrFrame);
  ctx.restore();

  // Accent border
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 6;
  roundRect(ctx, qrFrameX + 3, qrFrameY + 3, qrOuter - 6, qrOuter - 6, 24);
  ctx.stroke();

  const qrImage = await loadImage(input.qrDataUrl);
  const qrX = cx - qrInner / 2;
  const qrY = qrFrameY + (qrOuter - qrInner) / 2;
  ctx.drawImage(qrImage, qrX, qrY, qrInner, qrInner);

  // Optional center logo on QR
  if (input.logoOverlay && input.qrLogoUrl) {
    try {
      const mark = await loadImage(input.qrLogoUrl);
      const markSize = Math.round(qrInner * 0.22);
      fillRoundRect(
        ctx,
        cx - markSize / 2 - 8,
        qrY + qrInner / 2 - markSize / 2 - 8,
        markSize + 16,
        markSize + 16,
        markSize,
        "#ffffff",
      );
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, qrY + qrInner / 2, markSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(
        mark,
        cx - markSize / 2,
        qrY + qrInner / 2 - markSize / 2,
        markSize,
        markSize,
      );
      ctx.restore();
    } catch {
      // ignore logo failure
    }
  }

  y = qrFrameY + qrOuter + Math.round(height * 0.035);

  // CTA button
  const btnW = Math.round(width * 0.42);
  const btnH = Math.round(height * 0.055);
  fillRoundRect(ctx, cx - btnW / 2, y, btnW, btnH, btnH / 2, theme.badge);
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 ${Math.round(width * 0.028)}px system-ui, Segoe UI, Arial, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.fillText("SCAN ME", cx, y + btnH / 2);
  ctx.textBaseline = "top";
  y += btnH + Math.round(height * 0.035);

  // Brand strip
  const stripY = cardY + cardH - Math.round(height * 0.07);
  const stripW = cardW * 0.55;
  const stripX = cx - stripW / 2;
  const stripeColors = ["#2463f3", "#f5b400", "#10b981"];
  const stripeH = 5;
  const stripePart = stripW / stripeColors.length;
  stripeColors.forEach((color, index) => {
    ctx.fillStyle = color;
    ctx.fillRect(stripX + index * stripePart, stripY, stripePart + 1, stripeH);
  });

  // Footer
  ctx.fillStyle = theme.footer;
  ctx.font = `600 ${Math.round(width * 0.02)}px system-ui, Segoe UI, Arial, sans-serif`;
  ctx.textBaseline = "top";
  const footer =
    input.displayName?.trim() ||
    input.campaignName?.trim() ||
    BRAND.poweredByCompany;
  // Canvas can't be a hyperlink; show company + URL as plain text on print posters.
  ctx.fillText(
    `${BRAND.poweredBy} · ${BRAND.poweredByUrl.replace(/^https?:\/\//, "")}`,
    cx,
    stripY + 14,
  );
  if (footer && footer !== BRAND.poweredByCompany) {
    ctx.fillText(footer.slice(0, 48), cx, stripY + 28);
  }

  return canvas.toDataURL("image/png");
}

/** Convert a data URL to a Blob for reliable downloads. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);/)?.[1] ?? "image/png";
  const isBase64 = /;base64/i.test(header);
  if (isBase64) {
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }
  return new Blob([decodeURIComponent(data)], { type: mime });
}

/** Trigger a browser file download from a data URL or Blob. */
export function downloadBlob(filename: string, blob: Blob) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Delay revoke so the browser can finish the download handoff.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}

export function downloadDataUrl(filename: string, dataUrl: string) {
  downloadBlob(filename, dataUrlToBlob(dataUrl));
}

/** Safe filename for poster exports. */
export function posterFilename(displayName: string, template: string) {
  const base = (displayName || "poster")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${base || "poster"}-${template}-qr.png`;
}
