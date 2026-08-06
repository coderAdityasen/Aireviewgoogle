/**
 * =============================================================================
 * POSTER LAYOUT TUNING (edit this file to align each template by hand)
 * =============================================================================
 *
 * HOW IT WORKS
 * ------------
 * Every number below is a **fraction of the canvas** (0 = top/left, 1 = bottom/right).
 *
 *   logoTop: 0.10     → logo starts 10% down from the top
 *   headlineTop: 0.18 → headline starts 18% down
 *   qr.cy: 0.50       → QR vertical center at 50% (middle of poster)
 *   qr.size: 0.30     → QR width = 30% of poster width
 *   qr.cx: 0.50       → QR horizontal center (0.5 = middle)
 *
 * QUICK RECIPE — “move things up / down”
 * --------------------------------------
 * 1. Open the poster builder, pick the template you care about.
 * 2. Find that template id below (`midnight`, `clear`, `warm`, …).
 * 3. Change only that block’s numbers. Save the file. Refresh the browser.
 * 4. Live preview rebuilds the PNG with the new positions.
 *
 *   Want headline LOWER?  → increase  headlineTop   (e.g. 0.14 → 0.18)
 *   Want headline HIGHER? → decrease  headlineTop   (e.g. 0.18 → 0.12)
 *   Want QR LOWER?        → increase  qr.cy
 *   Want QR HIGHER?       → decrease  qr.cy
 *   Want QR BIGGER?       → increase  qr.size
 *   Want QR SMALLER?      → decrease  qr.size
 *   Want QR left/right?   → change    qr.cx   (0.5 = center, 0.45 = leftish)
 *   Bigger headline text? → increase  headlineFont
 *   Wider text wrap?      → increase  headlineMaxWidth
 *
 * SHOW / HIDE PIECES
 * ------------------
 * Each template can turn pieces on/off independently:
 *   showLogo, showHeadline, showSubtitle, showStars, showScanButton,
 *   showBrandStrip, showFooter, showBusinessName, drawQrFrame
 *
 * MODE
 * ----
 *   "art"   → designed PNG already has frame / stars / footer.
 *             Compositor only places logo, text, QR into slots.
 *             Background is drawn full-bleed with the art aspect ratio.
 *   "stack" → classic vertical layout (older jpg templates).
 *             Extra chrome (frame, stars, button, strip, footer) can be drawn.
 *
 * TEMPLATE IDS (must match poster-settings.ts)
 * --------------------------------------------
 *   midnight     → Prime Review
 *   clear        → Elite Stand
 *   warm         → Review Spot
 *   evergreen    → Review Pro
 * =============================================================================
 */

import type { PosterTemplateId } from "@/lib/qr/poster-settings";

/** All alignment knobs for one template. Edit values in POSTER_LAYOUTS below. */
export type PosterLayout = {
  /**
   * "art"   = designed background; place content in fixed slots.
   * "stack" = free vertical stack with optional drawn chrome.
   */
  mode: "art" | "stack";

  // ----- Logo (Google wordmark or business brand logo) -----
  /** Show logo at top. */
  showLogo: boolean;
  /** Distance from top of poster to top of logo (0–1). */
  logoTop: number;
  /** Logo height as fraction of poster height (0–1). */
  logoHeight: number;

  // ----- Stars (drawn by code; art templates usually keep this false) -----
  showStars: boolean;
  /** Vertical position of star row center (0–1). Only used when showStars. */
  starsTop: number;
  /** Star size as fraction of poster width. */
  starsSize: number;

  // ----- Headline -----
  showHeadline: boolean;
  /** Top of the headline block (0–1). */
  headlineTop: number;
  /** Max text width as fraction of poster width. */
  headlineMaxWidth: number;
  /** Font size as fraction of poster width. */
  headlineFont: number;
  /** Max lines before ellipsis. */
  headlineMaxLines: number;

  // ----- Subtitle -----
  showSubtitle: boolean;
  subtitleTop: number;
  subtitleMaxWidth: number;
  subtitleFont: number;
  subtitleMaxLines: number;

  // ----- QR code -----
  /**
   * QR center X (0–1). 0.5 = horizontal center.
   * Size is fraction of poster WIDTH.
   * cy is vertical center of the QR (0–1).
   */
  qr: {
    cx: number;
    cy: number;
    size: number;
  };
  /**
   * When true, draw white rounded plate + accent border around QR.
   * Turn OFF for designed art that already has a QR frame.
   */
  drawQrFrame: boolean;
  /** Outer frame size multiplier vs qr.size (only if drawQrFrame). ~1.15 typical. */
  qrFramePadding: number;

  // ----- SCAN ME button -----
  showScanButton: boolean;
  /** Top of the button (0–1). */
  scanButtonTop: number;
  /** Button width / height as fractions of poster width / height. */
  scanButtonWidth: number;
  scanButtonHeight: number;

  // ----- Brand color strip (3-color bar near bottom) -----
  showBrandStrip: boolean;
  brandStripTop: number;
  brandStripWidth: number;

  // ----- Footer (“Powered by …”) -----
  showFooter: boolean;
  footerTop: number;
  footerFont: number;

  // ----- Business display name (optional extra line) -----
  showBusinessName: boolean;
  businessNameTop: number;
  businessNameFont: number;
};

/**
 * Safe defaults used if a template id is missing from POSTER_LAYOUTS.
 * Prefer editing the named template blocks below instead of this.
 */
export const DEFAULT_POSTER_LAYOUT: PosterLayout = {
  mode: "stack",
  showLogo: true,
  logoTop: 0.08,
  logoHeight: 0.05,
  showStars: true,
  starsTop: 0.15,
  starsSize: 0.02,
  showHeadline: true,
  headlineTop: 0.18,
  headlineMaxWidth: 0.75,
  headlineFont: 0.045,
  headlineMaxLines: 3,
  showSubtitle: true,
  subtitleTop: 0.28,
  subtitleMaxWidth: 0.72,
  subtitleFont: 0.026,
  subtitleMaxLines: 2,
  qr: { cx: 0.5, cy: 0.55, size: 0.4 },
  drawQrFrame: true,
  qrFramePadding: 1.16,
  showScanButton: true,
  scanButtonTop: 0.78,
  scanButtonWidth: 0.42,
  scanButtonHeight: 0.05,
  showBrandStrip: true,
  brandStripTop: 0.88,
  brandStripWidth: 0.5,
  showFooter: true,
  footerTop: 0.9,
  footerFont: 0.02,
  showBusinessName: false,
  businessNameTop: 0.94,
  businessNameFont: 0.02,
};

/**
 * Per-template layouts. Edit each block independently.
 * Changes only affect that template’s export + live preview.
 */
export const POSTER_LAYOUTS: Record<PosterTemplateId, PosterLayout> = {
  // ---------------------------------------------------------------------------
  // Prime Review  (id: midnight)  — navy & gold designed PNG
  // Art already has: QR plate, stars, footer banner
  // ---------------------------------------------------------------------------
  midnight: {
    mode: "art",
    showLogo: true,
    logoTop: 0.078, // ↑ lower number = higher on poster
    logoHeight: 0.038,
    showStars: false, // art already draws gold stars
    starsTop: 0.72,
    starsSize: 0.02,
    showHeadline: true,
    headlineTop: 0.135,
    headlineMaxWidth: 0.68,
    headlineFont: 0.036,
    headlineMaxLines: 2,
    showSubtitle: true,
    subtitleTop: 0.185,
    subtitleMaxWidth: 0.64,
    subtitleFont: 0.02,
    subtitleMaxLines: 2,
    qr: {
      cx: 0.5, // horizontal center
      cy: 0.47, // vertical center of QR — raise/lower here
      size: 0.3, // QR size vs poster width
    },
    drawQrFrame: false, // plate is in the PNG
    qrFramePadding: 1.1,
    showScanButton: false,
    scanButtonTop: 0.72,
    scanButtonWidth: 0.42,
    scanButtonHeight: 0.05,
    showBrandStrip: false,
    brandStripTop: 0.88,
    brandStripWidth: 0.5,
    showFooter: false, // “Powered by…” is baked into the art
    footerTop: 0.92,
    footerFont: 0.02,
    showBusinessName: true,
    businessNameTop: 0.805, // between stars and footer banner
    businessNameFont: 0.022,
  },

  // ---------------------------------------------------------------------------
  // Elite Stand  (id: clear)  — forest green botanical designed PNG
  // Art already has: QR plate, stars, footer banner
  // ---------------------------------------------------------------------------
  clear: {
    mode: "art",
    showLogo: true,
    logoTop: 0.078,
    logoHeight: 0.038,
    showStars: false,
    starsTop: 0.72,
    starsSize: 0.02,
    showHeadline: true,
    headlineTop: 0.135,
    headlineMaxWidth: 0.68,
    headlineFont: 0.036,
    headlineMaxLines: 2,
    showSubtitle: true,
    subtitleTop: 0.185,
    subtitleMaxWidth: 0.64,
    subtitleFont: 0.02,
    subtitleMaxLines: 2,
    qr: {
      cx: 0.5,
      cy: 0.486,
      size: 0.3,
    },
    drawQrFrame: false,
    qrFramePadding: 1.1,
    showScanButton: false,
    scanButtonTop: 0.72,
    scanButtonWidth: 0.42,
    scanButtonHeight: 0.05,
    showBrandStrip: false,
    brandStripTop: 0.88,
    brandStripWidth: 0.5,
    showFooter: false,
    footerTop: 0.92,
    footerFont: 0.02,
    showBusinessName: true,
    businessNameTop: 0.805,
    businessNameFont: 0.022,
  },

  // ---------------------------------------------------------------------------
  // Review Spot  (id: warm)  — warm gold sunburst designed PNG
  // Art already has: cream QR plate, corner marks, stars, footer pill
  // Calibrated from blank warm.png + composed ref (balaji-gym-warm-qr)
  // ---------------------------------------------------------------------------
  warm: {
    mode: "art",
    showLogo: true,
    // Sit in the open sunburst area above the cream plate
    logoTop: 0.065,
    logoHeight: 0.036,
    showStars: false, // gold stars are in the PNG (~0.78)
    starsTop: 0.8,
    starsSize: 0.02,
    showHeadline: true,
    // Keep text fully above the cream plate (plate starts ~0.25)
    headlineTop: 0.118,
    headlineMaxWidth: 0.72,
    headlineFont: 0.034,
    headlineMaxLines: 2,
    showSubtitle: true,
    subtitleTop: 0.165,
    subtitleMaxWidth: 0.68,
    subtitleFont: 0.019,
    subtitleMaxLines: 2,
    qr: {
      cx: 0.5,
      cy: 0.475, // center of cream plate
      // Fill most of the area inside the corner brackets (was too small at 0.30)
      size: 0.44,
    },
    drawQrFrame: false,
    qrFramePadding: 1.1,
    showScanButton: false,
    scanButtonTop: 0.72,
    scanButtonWidth: 0.42,
    scanButtonHeight: 0.05,
    showBrandStrip: false,
    brandStripTop: 0.88,
    brandStripWidth: 0.5,
    showFooter: false, // powered-by pill is in the art
    footerTop: 0.92,
    footerFont: 0.02,
    // Below cream plate (~0.72), above gold stars (~0.78)
    showBusinessName: true,
    businessNameTop: 0.735,
    businessNameFont: 0.02,
  },

  // ---------------------------------------------------------------------------
  // Review Pro  (id: evergreen)  — deep green botanical designed PNG
  // Art already has: dark QR plate + mint/gold frame, stars, footer pill
  // Calibrated from blank evergreen.png + composed ref (balaji-gym-evergreen-qr)
  // ---------------------------------------------------------------------------
  evergreen: {
    mode: "art",
    showLogo: true,
    // Open dark field above the mint frame
    logoTop: 0.055,
    logoHeight: 0.034,
    showStars: false, // gold stars are in the PNG (~0.79)
    starsTop: 0.8,
    starsSize: 0.02,
    showHeadline: true,
    // Keep text fully above the framed plate (frame top ~0.21)
    headlineTop: 0.1,
    headlineMaxWidth: 0.72,
    headlineFont: 0.034,
    headlineMaxLines: 2,
    showSubtitle: true,
    subtitleTop: 0.148,
    subtitleMaxWidth: 0.68,
    subtitleFont: 0.019,
    subtitleMaxLines: 2,
    qr: {
      cx: 0.5,
      // Mint frame center (was 0.42 — sat too high in the plate)
      cy: 0.465,
      // Fill most of the dark plate inside corner marks (was too small at 0.36)
      size: 0.46,
    },
    drawQrFrame: false,
    qrFramePadding: 1.1,
    showScanButton: false,
    scanButtonTop: 0.72,
    scanButtonWidth: 0.42,
    scanButtonHeight: 0.05,
    showBrandStrip: false,
    brandStripTop: 0.88,
    brandStripWidth: 0.5,
    showFooter: false, // powered-by pill is in the art
    footerTop: 0.92,
    footerFont: 0.02,
    // Below mint frame (~0.72), above stars (~0.79) — avoid sitting on the border
    showBusinessName: true,
    businessNameTop: 0.735,
    businessNameFont: 0.02,
  },
};

export function getPosterLayout(id: PosterTemplateId): PosterLayout {
  return POSTER_LAYOUTS[id] ?? DEFAULT_POSTER_LAYOUT;
}
