"use client";

/* eslint-disable @next/next/no-img-element -- QR previews are generated data URLs and public storage images. */

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import QRCode from "qrcode";
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  Printer,
  Settings,
  Sparkles,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { absoluteUrl } from "@/lib/utils";
import { createClient } from "@/lib/supabase/browser";
import {
  getPosterTemplate,
  parsePosterSettings,
  POSTER_TEMPLATES,
  QR_STYLES,
  type PosterSettings,
  type PosterTemplateId,
  type QrStyleId,
} from "@/lib/qr/poster-settings";
import { updatePosterSettingsAction } from "@/features/qr-campaigns/server/actions";
import {
  composePosterPng,
  downloadDataUrl,
  posterFilename,
} from "@/lib/qr/compose-poster";
import type { Json } from "@/types/database";

type QrPreviewProps = {
  businessId?: string;
  ownerId?: string;
  slug: string;
  campaignToken: string;
  businessName: string;
  campaignName?: string;
  logoUrl?: string | null;
  brandColor?: string;
  posterHeadline?: string | null;
  posterTemplate?: "light" | "dark";
  posterSettings?: Json;
};

export function QrPreview({
  businessId,
  ownerId,
  slug,
  campaignToken,
  businessName,
  campaignName = "customer flow",
  logoUrl,
  brandColor = "#2463f3",
  posterHeadline,
  posterTemplate = "light",
  posterSettings,
}: QrPreviewProps) {
  const url = useMemo(
    () => absoluteUrl(`/r/${slug}?campaign=${campaignToken}`),
    [slug, campaignToken],
  );
  const initialSettings = useMemo(() => {
    const stored = parsePosterSettings(posterSettings, posterTemplate);
    const hasStoredSettings = Boolean(
      posterSettings &&
      typeof posterSettings === "object" &&
      !Array.isArray(posterSettings) &&
      Object.keys(posterSettings).length,
    );
    return {
      ...stored,
      displayName: stored.displayName || businessName,
      headline: hasStoredSettings
        ? stored.headline
        : posterHeadline?.trim() || stored.headline,
      qrColor: hasStoredSettings ? stored.qrColor : brandColor,
      brandLogoUrl: stored.brandLogoUrl ?? logoUrl ?? null,
    };
  }, [
    posterSettings,
    posterHeadline,
    brandColor,
    logoUrl,
    businessName,
    posterTemplate,
  ]);

  const [displayName, setDisplayName] = useState(
    initialSettings.displayName || businessName,
  );
  const [headline, setHeadline] = useState(initialSettings.headline);
  const [subtitle, setSubtitle] = useState(initialSettings.subtitle);
  const [template, setTemplate] = useState<PosterTemplateId>(
    initialSettings.template,
  );
  const [qrStyle, setQrStyle] = useState<QrStyleId>(initialSettings.qrStyle);
  const [qrColor, setQrColor] = useState(initialSettings.qrColor);
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(
    initialSettings.brandLogoUrl ?? logoUrl ?? null,
  );
  const [qrLogoUrl, setQrLogoUrl] = useState<string | null>(
    initialSettings.qrLogoUrl,
  );
  const [transparent, setTransparent] = useState(false);
  const [logoOverlay, setLogoOverlay] = useState(
    Boolean(initialSettings.qrLogoUrl),
  );
  const [png, setPng] = useState("");
  const [, setSvg] = useState("");
  const [posterImage, setPosterImage] = useState("");
  const [composing, setComposing] = useState(false);
  const [uploading, setUploading] = useState<"brand" | "qr" | null>(null);
  const [exporting, setExporting] = useState(false);
  const [copying, setCopying] = useState(false);
  const [saving, startTransition] = useTransition();

  const selectedTemplate = getPosterTemplate(template);

  function cycleTemplate(direction: -1 | 1) {
    const currentIndex = POSTER_TEMPLATES.findIndex(
      (item) => item.id === template,
    );
    const nextIndex =
      (currentIndex + direction + POSTER_TEMPLATES.length) %
      POSTER_TEMPLATES.length;
    setTemplate(POSTER_TEMPLATES[nextIndex].id);
  }

  useEffect(() => {
    let active = true;
    void Promise.all([
      QRCode.toDataURL(url, {
        margin: 2,
        width: 1000,
        errorCorrectionLevel: logoOverlay ? "H" : "M",
        color: { dark: qrColor, light: transparent ? "#0000" : "#ffffff" },
      }),
      QRCode.toString(url, {
        type: "svg",
        margin: 2,
        errorCorrectionLevel: logoOverlay ? "H" : "M",
        color: { dark: qrColor, light: transparent ? "#0000" : "#ffffff" },
      }),
    ])
      .then(([nextPng, nextSvg]) => {
        if (!active) return;
        setPng(nextPng);
        setSvg(nextSvg);
      })
      .catch(() => {
        if (active) toast.error("QR preview could not be generated.");
      });
    return () => {
      active = false;
    };
  }, [url, qrColor, transparent, logoOverlay]);

  // Live poster image: real template art + current QR composited together
  useEffect(() => {
    if (!png) {
      setPosterImage("");
      return;
    }
    let active = true;
    setComposing(true);
    void composePosterPng({
      displayName,
      headline,
      subtitle,
      campaignName,
      qrDataUrl: png,
      brandLogoUrl,
      qrLogoUrl,
      logoOverlay,
      template,
      width: 720,
      height: 960,
    })
      .then((image) => {
        if (!active) return;
        setPosterImage(image);
      })
      .catch(() => {
        if (active) setPosterImage("");
      })
      .finally(() => {
        if (active) setComposing(false);
      });
    return () => {
      active = false;
    };
  }, [
    png,
    displayName,
    headline,
    subtitle,
    campaignName,
    brandLogoUrl,
    qrLogoUrl,
    logoOverlay,
    template,
  ]);

  async function uploadImage(file: File, target: "brand" | "qr") {
    if (!ownerId) {
      toast.error("Save the business before uploading poster images.");
      return;
    }
    if (!file.type.startsWith("image/") || file.size > 2_000_000) {
      toast.error("Choose an image smaller than 2 MB.");
      return;
    }
    setUploading(target);
    try {
      const supabase = createClient();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "");
      const path = `${ownerId}/posters/${crypto.randomUUID()}-${safeName}`;
      const { error } = await supabase.storage
        .from("business-logos")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage
        .from("business-logos")
        .getPublicUrl(path);
      if (target === "brand") setBrandLogoUrl(data.publicUrl);
      else {
        setQrLogoUrl(data.publicUrl);
        setLogoOverlay(true);
      }
      toast.success(
        target === "brand" ? "Poster logo uploaded." : "QR logo uploaded.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The image could not be uploaded.",
      );
    } finally {
      setUploading(null);
    }
  }

  function saveConfiguration() {
    if (!businessId) {
      toast.success("Poster preview updated.");
      return;
    }
    const settings: PosterSettings = {
      displayName,
      headline,
      subtitle,
      template,
      qrStyle,
      qrColor,
      brandLogoUrl,
      qrLogoUrl,
    };
    startTransition(async () => {
      try {
        await updatePosterSettingsAction(businessId, {
          brandColor: qrColor,
          posterHeadline: headline,
          posterTemplate: template === "midnight" ? "dark" : "light",
          posterSettings: settings,
        });
        toast.success("Poster configuration saved.");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Poster configuration could not be saved.",
        );
      }
    });
  }

  async function copyCampaignUrl() {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Campaign URL copied.");
    } catch {
      toast.error("URL could not be copied.");
    } finally {
      setCopying(false);
    }
  }

  async function exportPoster() {
    if (!png) return;
    setExporting(true);
    try {
      // Same compositor as the live preview (WYSIWYG), higher print resolution
      const dataUrl = await composePosterPng({
        displayName: displayName || businessName,
        headline,
        subtitle,
        campaignName,
        qrDataUrl: png,
        brandLogoUrl,
        qrLogoUrl,
        logoOverlay,
        template,
        width: 1080,
        height: 1440,
      });
      downloadDataUrl(
        posterFilename(displayName || businessName, template),
        dataUrl,
      );
      toast.success("Full poster downloaded — matches the preview.");
    } catch (error) {
      // Fallback: download the on-screen poster image if high-res compose fails
      if (posterImage) {
        downloadDataUrl(
          posterFilename(displayName || businessName, template),
          posterImage,
        );
        toast.success("Poster downloaded from preview.");
        return;
      }
      toast.error(
        error instanceof Error
          ? error.message
          : "Poster export could not be created.",
      );
    } finally {
      setExporting(false);
    }
  }

  function downloadQrOnly() {
    if (!png) return;
    downloadDataUrl(
      posterFilename(`${displayName || businessName}-qr-only`, template),
      png,
    );
    toast.success("QR code PNG downloaded.");
  }

  return (
    <div className="min-w-0">
      {/* Mobile: preview first. Desktop: editor left, sticky preview right. */}
      <div className="grid min-w-0 items-start gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] xl:gap-6">
        {/* Preview — first on mobile */}
        <div className="order-1 min-w-0 xl:order-2 xl:sticky xl:top-4 xl:self-start">
          <section
            className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]"
            aria-label="Live poster preview"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
              <div>
                <h2 className="text-sm font-extrabold tracking-[-0.02em] text-slate-950">
                  Live preview
                </h2>
                <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                  Updates as you edit
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-extrabold text-primary">
                {selectedTemplate.name}
              </span>
            </div>

            <div className="flex justify-center bg-gradient-to-b from-slate-50 to-white px-4 py-5 sm:px-6 sm:py-6">
              <div
                id="reviewflow-poster-print"
                className="relative aspect-[3/4] w-full max-w-[220px] overflow-hidden rounded-xl shadow-[0_16px_40px_rgba(15,23,42,0.16)] ring-1 ring-slate-200/90 sm:max-w-[260px]"
              >
                {posterImage ? (
                  <img
                    src={posterImage}
                    alt={`${displayName || businessName} poster with QR code`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="relative flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
                    <img
                      src={selectedTemplate.backgroundImage}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="relative z-10 flex flex-col items-center gap-3 rounded-xl bg-black/30 px-4 py-3 backdrop-blur-sm">
                      <LoadingSpinner label="Building poster" />
                      <p className="text-xs font-semibold text-white drop-shadow">
                        {composing || !png
                          ? "Building poster…"
                          : "Preparing preview…"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3 border-t border-slate-100 px-4 py-4 sm:px-5">
              <div className="rounded-xl border border-blue-100 bg-blue-50/80 p-3 sm:p-3.5">
                <p className="text-[11px] font-extrabold text-slate-800">
                  Campaign QR link
                </p>
                <button
                  type="button"
                  className="mt-1 flex min-w-0 w-full cursor-pointer items-center gap-2 text-left text-xs font-medium text-primary hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => void copyCampaignUrl()}
                  aria-busy={copying}
                  aria-label="Copy campaign QR review link"
                  title={url}
                >
                  <span className="min-w-0 flex-1 truncate">{url}</span>
                  <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="h-10 w-full gap-1.5 text-xs"
                  loading={saving}
                  loadingLabel="Saving…"
                  onClick={saveConfiguration}
                >
                  <Check className="h-4 w-4 shrink-0" />
                  Save
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-10 w-full gap-1.5 bg-slate-900 text-xs text-white hover:bg-slate-800"
                  loading={exporting}
                  loadingLabel="…"
                  onClick={() => void exportPoster()}
                  disabled={!png || (!posterImage && composing)}
                >
                  <Download className="h-4 w-4 shrink-0" />
                  Download
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-10 w-full gap-1.5 text-xs"
                  onClick={() => window.print()}
                >
                  <Printer className="h-4 w-4 shrink-0" />
                  Print
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-10 w-full gap-1.5 text-xs"
                  onClick={downloadQrOnly}
                  disabled={!png}
                >
                  <Download className="h-4 w-4 shrink-0" />
                  QR only
                </Button>
              </div>
            </div>
          </section>
        </div>

        {/* Editor controls */}
        <div className="order-2 min-w-0 space-y-4 sm:space-y-5 xl:order-1">
          <EditorCard title="Poster setup" number="1">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Business name" htmlFor="poster-display-name">
                <Input
                  id="poster-display-name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  maxLength={100}
                  placeholder="Your shop name"
                />
              </Field>
              <div>
                <Label className="text-[13px] font-bold text-slate-700">
                  Brand logo
                </Label>
                <ImageUpload
                  id="brand-logo-upload"
                  uploading={uploading === "brand"}
                  onChange={(file) => void uploadImage(file, "brand")}
                />
              </div>
              <Field
                label="Headline"
                htmlFor="poster-headline"
                className="sm:col-span-2"
              >
                <Input
                  id="poster-headline"
                  value={headline}
                  onChange={(event) => setHeadline(event.target.value)}
                  maxLength={160}
                  placeholder="Love our service?"
                />
              </Field>
              <Field
                label="Subtitle"
                htmlFor="poster-subtitle"
                className="sm:col-span-2"
              >
                <Input
                  id="poster-subtitle"
                  value={subtitle}
                  onChange={(event) => setSubtitle(event.target.value)}
                  maxLength={160}
                  placeholder="Scan to leave a Google review"
                />
              </Field>
            </div>
          </EditorCard>

          <EditorCard
            title="Layout templates"
            number="2"
            action={
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => cycleTemplate(-1)}
                  className="grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-primary text-white transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Previous poster template"
                >
                  <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={() => cycleTemplate(1)}
                  className="grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-primary text-white transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Next poster template"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            }
          >
            {/* Horizontal scroll on small screens; grid on larger */}
            <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 scroll-smooth sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 lg:grid-cols-5">
              {POSTER_TEMPLATES.map((item) => (
                <div
                  key={item.id}
                  className="w-[7.5rem] shrink-0 sm:w-auto sm:min-w-0"
                >
                  <TemplateTile
                    item={item}
                    selected={template === item.id}
                    onClick={() => setTemplate(item.id)}
                    qrColor={qrColor}
                  />
                </div>
              ))}
            </div>
          </EditorCard>

          <EditorCard title="QR design" number="3">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {QR_STYLES.map((item) => (
                <QrStyleTile
                  key={item.id}
                  item={item}
                  selected={qrStyle === item.id}
                  onClick={() => {
                    setQrStyle(item.id);
                    setQrColor(item.color);
                  }}
                />
              ))}
            </div>
            <div className="mt-5 grid gap-5 border-t border-slate-100 pt-5 sm:grid-cols-2">
              <div>
                <Label className="text-[13px] font-bold text-slate-700">
                  QR color
                </Label>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  {QR_STYLES.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      aria-label={`Use ${item.name} color`}
                      onClick={() => {
                        setQrStyle(item.id);
                        setQrColor(item.color);
                      }}
                      className="h-8 w-8 cursor-pointer rounded-full border-2 border-white shadow-[0_0_0_1px_#cbd5e1] transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      style={{ backgroundColor: item.color }}
                    />
                  ))}
                  <label
                    className="relative h-8 w-8 cursor-pointer overflow-hidden rounded-full border-2 border-white shadow-[0_0_0_1px_#cbd5e1] focus-within:ring-2 focus-within:ring-primary"
                    aria-label="Choose custom QR color"
                  >
                    <Settings className="pointer-events-none absolute inset-1.5 z-10 h-5 w-5 text-white drop-shadow" />
                    <input
                      type="color"
                      value={qrColor}
                      onChange={(event) => setQrColor(event.target.value)}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                  </label>
                  <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
                    {qrColor}
                  </span>
                </div>
              </div>
              <div>
                <Label className="text-[13px] font-bold text-slate-700">
                  QR center logo
                </Label>
                <ImageUpload
                  id="qr-logo-upload"
                  uploading={uploading === "qr"}
                  onChange={(file) => void uploadImage(file, "qr")}
                />
                {qrLogoUrl ? (
                  <label className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={logoOverlay}
                      onChange={(event) =>
                        setLogoOverlay(event.target.checked)
                      }
                      className="h-4 w-4 accent-primary"
                    />
                    Show logo in QR
                  </label>
                ) : null}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-500">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={transparent}
                  onChange={(event) => setTransparent(event.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                Transparent QR background
              </label>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Print-ready export
              </span>
            </div>
          </EditorCard>
        </div>
      </div>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #reviewflow-poster-print,
          #reviewflow-poster-print * {
            visibility: visible !important;
          }
          #reviewflow-poster-print {
            position: fixed !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 90vw !important;
            max-width: 600px !important;
          }
        }
      `}</style>
    </div>
  );
}

function EditorCard({
  title,
  number,
  action,
  children,
}: {
  title: string;
  number: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className="min-w-0 rounded-2xl border border-slate-200/90 bg-white px-4 py-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)] sm:px-5 sm:py-5"
      aria-label={title}
    >
      <div className="flex min-h-8 items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <h2 className="text-[12px] font-extrabold uppercase tracking-[0.04em] text-slate-800 sm:text-[13px]">
          <span className="mr-1.5 text-primary">{number}.</span>
          {title}
        </h2>
        {action}
      </div>
      <div className="pt-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} className="text-[13px] font-bold text-slate-700">
        {label}
      </Label>

      <div className="mt-2 [&_input]:h-11 [&_input]:rounded-lg [&_input]:border-slate-200 [&_input]:text-sm">
        {children}
      </div>
    </div>
  );
}

function ImageUpload({
  id,
  uploading,
  onChange,
}: {
  id: string;
  uploading: boolean;
  onChange: (file: File) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="mt-2 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-blue-500 bg-white px-4 text-sm font-bold text-blue-600 transition hover:bg-blue-50 focus-within:ring-4 focus-within:ring-blue-500/10"
    >
      <input
        id={id}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="sr-only"
        disabled={uploading}
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file) {
            onChange(file);
          }

          event.currentTarget.value = "";
        }}
      />

      {uploading ? (
        <LoadingSpinner label="Uploading image" />
      ) : (
        <>
          <Upload className="h-4 w-4" />
          Upload Image
        </>
      )}
    </label>
  );
}

function TemplateTile({
  item,
  selected,
  onClick,
  qrColor,
}: {
  item: (typeof POSTER_TEMPLATES)[number];
  selected: boolean;
  onClick: () => void;
  qrColor: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`w-full min-w-0 cursor-pointer rounded-xl border bg-white p-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:p-2 ${
        selected
          ? "border-2 border-primary bg-primary/[0.04] shadow-[0_6px_16px_rgba(36,99,243,0.14)]"
          : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <div
        className="relative aspect-[3/4] overflow-hidden rounded-lg"
        style={{ background: item.background }}
      >
        <img
          src={item.backgroundImage}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 flex flex-col items-center px-1.5 py-2 text-center">
          <span
            className="mt-0.5 text-[8px] leading-none drop-shadow-sm"
            style={{ color: item.foreground }}
          >
            ★★★★★
          </span>
          <span
            className="mt-1 h-1 w-8 rounded opacity-70"
            style={{ backgroundColor: item.foreground }}
          />
          <div
            className="mt-1.5 rounded border bg-white p-0.5 shadow-sm"
            style={{ borderColor: item.accent }}
          >
            <FakeQr color={qrColor} />
          </div>
          <span
            className="mt-auto mb-0.5 rounded-full px-1.5 py-0.5 text-[6px] font-extrabold uppercase tracking-wide text-white shadow-sm"
            style={{ backgroundColor: item.accent }}
          >
            Scan
          </span>
        </div>
      </div>
      <span className="mt-1.5 block truncate text-center text-[10px] font-extrabold text-slate-900 sm:text-[11px]">
        {item.name}
      </span>
    </button>
  );
}

function QrStyleTile({
  item,
  selected,
  onClick,
}: {
  item: (typeof QR_STYLES)[number];
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`min-w-0 cursor-pointer rounded-[14px] border bg-white p-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        selected
          ? "border-2 border-blue-600 bg-blue-50/40"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="grid aspect-square place-items-center rounded-lg bg-white">
        <FakeQr color={item.color} large />
      </div>

      <span className="mt-2 block truncate text-center text-[11px] font-extrabold text-slate-950">
        {item.name}
      </span>
    </button>
  );
}

function FakeQr({ color, large = false }: { color: string; large?: boolean }) {
  const cells = Array.from({ length: 81 }, (_, index) => index);
  return (
    <div
      className={`grid ${large ? "h-28 w-28 grid-cols-9 gap-0.5 p-3" : "h-12 w-12 grid-cols-9 gap-px p-1"} rounded-md bg-white`}
      aria-hidden="true"
    >
      {cells.map((index) => (
        <span
          key={index}
          className="rounded-[1px]"
          style={{
            backgroundColor:
              (index * 17 + (index % 5)) % 7 < 3 ? color : "transparent",
          }}
        />
      ))}
    </div>
  );
}

