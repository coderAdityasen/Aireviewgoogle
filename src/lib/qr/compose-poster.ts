/**
 * Browser-side poster compositor.
 * Builds a real PNG (canvas → data URL / blob) with the live QR code drawn onto
 * a designed template background. Preview and download use the same pipeline.
 */

import {
  getPosterTemplate,
  type PosterTemplateId,
} from "@/lib/qr/poster-settings";
import {
  getPosterLayout,
  type PosterLayout,
} from "@/lib/qr/poster-layouts";
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
    // Cream + navy/gold reference template — dark text on light center panel
    bgTop: "#0b1b3a",
    bgBottom: "#c9a227",
    card: "#ffffff",
    text: "#0b1b3a",
    muted: "rgba(11,27,58,0.68)",
    accent: "#c9a227",
    accentSoft: "rgba(201,162,39,0.18)",
    star: "#d4af37",
    qrFrame: "#ffffff",
    badge: "#0b1b3a",
    footer: "rgba(11,27,58,0.5)",
    dark: false,
  },
  clear: {
    // Cream + forest green botanical reference template
    bgTop: "#0f3d2e",
    bgBottom: "#c9a227",
    card: "#ffffff",
    text: "#0f2a1c",
    muted: "rgba(15,42,28,0.65)",
    accent: "#0f3d2e",
    accentSoft: "rgba(15,61,46,0.12)",
    star: "#d4af37",
    qrFrame: "#ffffff",
    badge: "#0f3d2e",
    footer: "rgba(15,42,28,0.5)",
    dark: false,
  },
  warm: {
    // Warm gold sunburst reference — dark brown text on peach field
    bgTop: "#f4b183",
    bgBottom: "#c45c26",
    card: "#fbf0e0",
    text: "#5c2e0a",
    muted: "rgba(92,46,10,0.7)",
    accent: "#c9a227",
    accentSoft: "rgba(201,162,39,0.18)",
    star: "#d4af37",
    qrFrame: "#fbf0e0",
    badge: "#8b4513",
    footer: "rgba(92,46,10,0.55)",
    dark: false,
  },
  evergreen: {
    // Deep green botanical reference — light text on dark field
    bgTop: "#0a3d2e",
    bgBottom: "#052e16",
    card: "#0f2e24",
    text: "#ecfdf5",
    muted: "rgba(236,253,245,0.78)",
    accent: "#a8d5a2",
    accentSoft: "rgba(168,213,162,0.2)",
    star: "#d4af37",
    qrFrame: "#ffffff",
    badge: "#0f3d2e",
    footer: "rgba(236,253,245,0.6)",
    dark: true,
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

async function drawQrCenterLogo(
  ctx: CanvasRenderingContext2D,
  input: PosterComposeInput,
  cx: number,
  qrY: number,
  qrSize: number,
) {
  if (!input.logoOverlay || !input.qrLogoUrl) return;
  try {
    const mark = await loadImage(input.qrLogoUrl);
    const markSize = Math.round(qrSize * 0.22);
    fillRoundRect(
      ctx,
      cx - markSize / 2 - 8,
      qrY + qrSize / 2 - markSize / 2 - 8,
      markSize + 16,
      markSize + 16,
      markSize,
      "#ffffff",
    );
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, qrY + qrSize / 2, markSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(
      mark,
      cx - markSize / 2,
      qrY + qrSize / 2 - markSize / 2,
      markSize,
      markSize,
    );
    ctx.restore();
  } catch {
    // ignore logo failure
  }
}

async function drawLogoAt(
  ctx: CanvasRenderingContext2D,
  input: PosterComposeInput,
  cx: number,
  logoY: number,
  width: number,
  height: number,
  layout: PosterLayout,
) {
  if (!layout.showLogo) return;
  if (input.brandLogoUrl) {
    try {
      const logo = await loadImage(input.brandLogoUrl);
      const logoH = Math.round(height * layout.logoHeight);
      const logoW = Math.min(
        Math.round((logo.width / logo.height) * logoH),
        Math.round(width * 0.28),
      );
      ctx.drawImage(logo, cx - logoW / 2, logoY, logoW, logoH);
      return;
    } catch {
      // fall through to Google logo
    }
  }
  await drawGoogleLogo(ctx, cx, logoY, width, height);
}

/**
 * Draw every content layer using absolute positions from poster-layouts.ts.
 * Edit that file to move logo / text / QR / button independently per template.
 */
async function paintLayoutContent(
  ctx: CanvasRenderingContext2D,
  input: PosterComposeInput,
  layout: PosterLayout,
  theme: Theme,
  width: number,
  height: number,
) {
  const pageCx = width / 2;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  // Logo
  await drawLogoAt(
    ctx,
    input,
    pageCx,
    Math.round(height * layout.logoTop),
    width,
    height,
    layout,
  );

  // Drawn stars (art templates usually leave this off)
  if (layout.showStars) {
    const starSize = Math.max(10, Math.round(width * layout.starsSize));
    drawStars(
      ctx,
      pageCx,
      Math.round(height * layout.starsTop),
      5,
      starSize,
      theme.star,
    );
  }

  // Headline
  if (layout.showHeadline) {
    ctx.fillStyle = theme.text;
    ctx.font = `800 ${Math.round(width * layout.headlineFont)}px system-ui, Segoe UI, Arial, sans-serif`;
    const headlineLines = wrapText(
      ctx,
      input.headline || "Share your experience",
      width * layout.headlineMaxWidth,
      layout.headlineMaxLines,
    );
    drawCenteredLines(
      ctx,
      headlineLines,
      pageCx,
      Math.round(height * layout.headlineTop),
      Math.round(width * layout.headlineFont * 1.15),
    );
  }

  // Subtitle
  if (layout.showSubtitle) {
    ctx.fillStyle = theme.muted;
    ctx.font = `600 ${Math.round(width * layout.subtitleFont)}px system-ui, Segoe UI, Arial, sans-serif`;
    const subLines = wrapText(
      ctx,
      input.subtitle || "Scan to share your genuine visit",
      width * layout.subtitleMaxWidth,
      layout.subtitleMaxLines,
    );
    drawCenteredLines(
      ctx,
      subLines,
      pageCx,
      Math.round(height * layout.subtitleTop),
      Math.round(width * layout.subtitleFont * 1.25),
    );
  }

  // QR
  const qrSize = Math.round(width * layout.qr.size);
  const qrCx = width * layout.qr.cx;
  const qrCy = height * layout.qr.cy;
  const qrX = qrCx - qrSize / 2;
  const qrY = qrCy - qrSize / 2;

  if (layout.drawQrFrame) {
    const outer = Math.round(qrSize * layout.qrFramePadding);
    const frameX = qrCx - outer / 2;
    const frameY = qrCy - outer / 2;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.22)";
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 12;
    fillRoundRect(ctx, frameX, frameY, outer, outer, 28, theme.qrFrame);
    ctx.restore();
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 6;
    roundRect(ctx, frameX + 3, frameY + 3, outer - 6, outer - 6, 24);
    ctx.stroke();
  } else {
    // Soft pad so modules stay scannable over designed art
    fillRoundRect(ctx, qrX - 6, qrY - 6, qrSize + 12, qrSize + 12, 16, "#ffffff");
  }

  const qrImage = await loadImage(input.qrDataUrl);
  ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
  await drawQrCenterLogo(ctx, input, qrCx, qrY, qrSize);

  // SCAN ME
  if (layout.showScanButton) {
    const btnW = Math.round(width * layout.scanButtonWidth);
    const btnH = Math.round(height * layout.scanButtonHeight);
    const btnY = Math.round(height * layout.scanButtonTop);
    fillRoundRect(ctx, pageCx - btnW / 2, btnY, btnW, btnH, btnH / 2, theme.badge);
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 ${Math.round(width * 0.028)}px system-ui, Segoe UI, Arial, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.fillText("SCAN ME", pageCx, btnY + btnH / 2);
    ctx.textBaseline = "top";
  }

  // Brand strip
  if (layout.showBrandStrip) {
    const stripW = width * layout.brandStripWidth;
    const stripX = pageCx - stripW / 2;
    const stripY = Math.round(height * layout.brandStripTop);
    const stripeColors = ["#2463f3", "#f5b400", "#10b981"];
    const stripePart = stripW / stripeColors.length;
    stripeColors.forEach((color, index) => {
      ctx.fillStyle = color;
      ctx.fillRect(stripX + index * stripePart, stripY, stripePart + 1, 5);
    });
  }

  // Footer
  if (layout.showFooter) {
    ctx.fillStyle = theme.footer;
    ctx.font = `600 ${Math.round(width * layout.footerFont)}px system-ui, Segoe UI, Arial, sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillText(
      `${BRAND.poweredBy} · ${BRAND.poweredByUrl.replace(/^https?:\/\//, "")}`,
      pageCx,
      Math.round(height * layout.footerTop),
    );
  }

  // Business display name
  if (layout.showBusinessName) {
    const name =
      input.displayName?.trim() || input.campaignName?.trim() || "";
    if (name) {
      ctx.fillStyle = theme.muted;
      ctx.font = `700 ${Math.round(width * layout.businessNameFont)}px system-ui, Segoe UI, Arial, sans-serif`;
      ctx.textBaseline = "top";
      ctx.fillText(
        name.slice(0, 48),
        pageCx,
        Math.round(height * layout.businessNameTop),
      );
    }
  }
}

/**
 * Compose a full poster PNG as a data URL.
 * Per-template positions live in `src/lib/qr/poster-layouts.ts` — edit there.
 */
export async function composePosterPng(
  input: PosterComposeInput,
): Promise<string> {
  const theme = THEMES[input.template] ?? THEMES.midnight;
  const templateMeta = getPosterTemplate(input.template);
  const layout = getPosterLayout(input.template);

  let bgImage: HTMLImageElement | null = null;
  try {
    bgImage = await loadImage(templateMeta.backgroundImage);
  } catch {
    bgImage = null;
  }

  // Art mode matches the PNG aspect ratio so slot fractions land on the design.
  const width = input.width ?? 1080;
  const height =
    input.height ??
    (layout.mode === "art" && bgImage
      ? Math.round(width * (bgImage.height / Math.max(bgImage.width, 1)))
      : 1440);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");

  if (bgImage) {
    if (layout.mode === "art") {
      // Full-bleed, no crop — preserves calibrated art geometry
      ctx.drawImage(bgImage, 0, 0, width, height);
    } else {
      drawImageCover(ctx, bgImage, width, height);
    }
  } else {
    const bg = ctx.createLinearGradient(0, 0, width * 0.2, height);
    bg.addColorStop(0, theme.bgTop);
    bg.addColorStop(1, theme.bgBottom);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
    drawDecor(ctx, width, height, theme);
    const pad = Math.round(width * 0.07);
    fillRoundRect(
      ctx,
      pad,
      pad,
      width - pad * 2,
      height - pad * 2,
      36,
      theme.card,
    );
  }

  await paintLayoutContent(ctx, input, layout, theme, width, height);
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
