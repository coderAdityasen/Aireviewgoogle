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

  function download(filename: string, href: string) {
    if (!href) return;
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = filename;
    anchor.click();
    toast.success(`${filename.endsWith(".svg") ? "SVG" : "PNG"} downloaded.`);
  }

  async function exportPoster() {
    if (!png) return;
    setExporting(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 1600;
      const context = canvas.getContext("2d");
      if (!context)
        throw new Error("Your browser could not prepare the poster export.");
      context.fillStyle = selectedTemplate.background;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = selectedTemplate.surface;
      roundRect(context, 90, 80, 1020, 1440, 42);
      context.fill();
      context.textAlign = "center";
      context.fillStyle = selectedTemplate.foreground;
      context.font = "700 30px Arial";
      context.fillText(displayName.slice(0, 42), 600, 180);
      context.font = "800 64px Arial";
      drawWrappedText(context, headline, 600, 310, 820, 76, 3);
      context.font = "500 30px Arial";
      drawWrappedText(context, subtitle, 600, 510, 790, 42, 2);
      const qrImage = await loadImage(png);
      context.fillStyle = "#ffffff";
      roundRect(context, 300, 610, 600, 600, 30);
      context.fill();
      context.drawImage(qrImage, 340, 650, 520, 520);
      if (logoOverlay && qrLogoUrl) {
        const qrLogo = await loadImage(qrLogoUrl);
        context.fillStyle = "#ffffff";
        context.beginPath();
        context.arc(600, 910, 70, 0, Math.PI * 2);
        context.fill();
        context.save();
        context.beginPath();
        context.arc(600, 910, 54, 0, Math.PI * 2);
        context.clip();
        context.drawImage(qrLogo, 546, 856, 108, 108);
        context.restore();
      }
      context.fillStyle = selectedTemplate.accent;
      roundRect(context, 370, 1270, 460, 84, 20);
      context.fill();
      context.fillStyle = "#ffffff";
      context.font = "800 30px Arial";
      context.fillText("SCAN TO SHARE", 600, 1322);
      context.font = "500 22px Arial";
      context.fillText("ReviewFlow customer link", 600, 1430);
      download(
        `${displayName || businessName}-poster.png`,
        canvas.toDataURL("image/png"),
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Poster export could not be created.",
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-w-0">
      <div className="grid min-w-0 items-start gap-7 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 space-y-5">
          <EditorCard title="Poster Configuration" number="1">
            <div className="grid gap-x-4 gap-y-4 md:grid-cols-2">
              <Field
                label="Business Shop Name"
                htmlFor="poster-display-name"
              >
                <Input
                  id="poster-display-name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  maxLength={100}
                />
              </Field>
              <div>
                <Label>Upload brand logo</Label>
                <ImageUpload
                  id="brand-logo-upload"
                  uploading={uploading === "brand"}
                  onChange={(file) => void uploadImage(file, "brand")}
                />
              </div>
              <Field
                label="Poster title heading"
                htmlFor="poster-headline"
                className="md:col-span-2"
              >
                <Input
                  id="poster-headline"
                  value={headline}
                  onChange={(event) => setHeadline(event.target.value)}
                  maxLength={160}
                />
              </Field>
              <Field
                label="Poster message subtitle"
                htmlFor="poster-subtitle"
                className="md:col-span-2"
              >
                <Input
                  id="poster-subtitle"
                  value={subtitle}
                  onChange={(event) => setSubtitle(event.target.value)}
                  maxLength={160}
                />
              </Field>
            </div>
          </EditorCard>

          <EditorCard
            title="Poster Layout Templates"
            number="2"
            action={
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => cycleTemplate(-1)}
                  className="grid h-9 w-9 rounded-full bg-primary text-white transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Previous poster template"
                >
                  <ArrowRight className="m-auto h-4 w-4 rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={() => cycleTemplate(1)}
                  className="grid h-9 w-9 rounded-full bg-primary text-white transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Next poster template"
                >
                  <ArrowRight className="m-auto h-4 w-4" />
                </button>
              </div>
            }
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {POSTER_TEMPLATES.map((item) => (
                <TemplateTile
                  key={item.id}
                  item={item}
                  selected={template === item.id}
                  onClick={() => setTemplate(item.id)}
                  qrColor={qrColor}
                />
              ))}
            </div>
          </EditorCard>

          <EditorCard title="QR Code Design Options" number="3">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
            <div className="mt-6 grid gap-5 border-t border-slate-200 pt-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-end">
              <div>
                <Label>Custom color</Label>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex gap-2">
                    {QR_STYLES.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        aria-label={`Use ${item.name} color`}
                        onClick={() => {
                          setQrStyle(item.id);
                          setQrColor(item.color);
                        }}
                        className="h-9 w-9 rounded-full border-2 border-white shadow-[0_0_0_1px_#cbd5e1] transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        style={{ backgroundColor: item.color }}
                      />
                    ))}
                  </div>
                  <label
                    className="relative h-9 w-9 cursor-pointer overflow-hidden rounded-full border-2 border-white shadow-[0_0_0_1px_#cbd5e1] focus-within:ring-2 focus-within:ring-primary"
                    aria-label="Choose custom QR color"
                  >
                    <Settings className="pointer-events-none absolute inset-2 z-10 h-5 w-5 text-white drop-shadow" />
                    <input
                      type="color"
                      value={qrColor}
                      onChange={(event) => setQrColor(event.target.value)}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                  </label>
                  <span className="text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">
                    {qrColor}
                  </span>
                </div>
              </div>
              <div>
                <Label>Upload QR code logo</Label>
                <ImageUpload
                  id="qr-logo-upload"
                  uploading={uploading === "qr"}
                  onChange={(file) => void uploadImage(file, "qr")}
                />
                <div className="mt-2 flex min-h-5 items-center justify-end">
                  {qrLogoUrl ? (
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
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
            </div>
            <div className="mt-5 flex flex-wrap gap-4 border-t border-slate-200 pt-5 text-xs font-semibold text-slate-500">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={transparent}
                  onChange={(event) => setTransparent(event.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                Transparent QR background
              </label>
              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                High-resolution QR output
              </span>
            </div>
          </EditorCard>
        </div>

        <div className="min-w-0 xl:sticky xl:top-5 xl:self-start">
          <section
            className="min-w-0 rounded-[16px] border border-dashed border-slate-300 bg-white p-4"
            aria-label="Live poster preview"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <h2 className="text-[14px] font-extrabold text-slate-950">
                Live Poster Mockup
              </h2>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-[9px] font-extrabold text-blue-600">
                {selectedTemplate.name}
              </span>
            </div>
            <div className="mt-5 flex justify-center py-1">
              <div
                id="reviewflow-poster-print"
                className="aspect-[3/4] w-full max-w-[272px] overflow-hidden rounded-[6px] p-3 shadow-[0_18px_45px_rgba(15,23,42,0.16)]"
                style={{
                  background: posterBackground(template),
                  color: selectedTemplate.foreground,
                }}
              >
                <div
                  className="flex h-full min-h-0 flex-col items-center overflow-hidden rounded-[4px] border border-white/10 px-4 py-4 text-center"
                  style={{ backgroundColor: selectedTemplate.surface }}
                >
                  <div className="flex h-8 shrink-0 items-center justify-center">
                    {brandLogoUrl ? (
                      <img
                        src={brandLogoUrl}
                        alt={`${displayName} logo`}
                        className="h-8 max-w-24 rounded-lg object-contain"
                      />
                    ) : (
                      <div
                        className="grid h-8 w-8 place-items-center rounded-lg text-xs font-black text-white"
                        style={{ backgroundColor: selectedTemplate.accent }}
                      >
                        {displayName.slice(0, 1).toUpperCase() || "R"}
                      </div>
                    )}
                  </div>
                  <p className="mt-1 max-w-full truncate text-[7px] font-extrabold uppercase tracking-[0.14em] opacity-70">
                    {displayName || businessName}
                  </p>
                  <h3 className="mt-1.5 line-clamp-2 max-w-full text-[16px] font-extrabold leading-[1.08] tracking-[-0.04em]">
                    {headline}
                  </h3>
                  <p className="mt-1 line-clamp-2 max-w-full text-[8px] font-semibold leading-[1.2] opacity-70">
                    {subtitle}
                  </p>
                  <div className="relative mt-2 shrink-0 rounded-xl bg-white p-1.5 shadow-sm">
                    {png ? (
                      <img
                        src={png}
                        alt={`${displayName || businessName} QR code`}
                        className="aspect-square w-28 sm:w-32"
                      />
                    ) : (
                        <div className="grid aspect-square w-28 place-items-center sm:w-32">
                        <LoadingSpinner label="Generating QR" />
                      </div>
                    )}
                    {logoOverlay && qrLogoUrl ? (
                      <div className="pointer-events-none absolute left-1/2 top-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white p-1 shadow-sm">
                        <img
                          src={qrLogoUrl}
                          alt=""
                          className="h-full w-full rounded-full object-cover"
                        />
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-1.5 shrink-0 text-[10px] leading-none tracking-[0.16em] text-amber-400" aria-label="Five star rating">★★★★★</div>
                  <p className="mt-1 shrink-0 text-[7px] font-extrabold uppercase tracking-[0.1em] opacity-80">Review us on Google</p>
                  <div
                    className="mt-1.5 shrink-0 rounded-md px-3 py-1 text-[7px] font-extrabold uppercase tracking-[0.1em] text-white"
                    style={{ backgroundColor: selectedTemplate.accent }}
                  >
                    Scan to share
                  </div>
                  <div className="mt-auto flex w-full shrink-0 items-center gap-1.5 pt-3">
                    <span className="h-0.5 flex-1 rounded-full bg-primary" />
                    <span className="h-0.5 flex-1 rounded-full bg-amber-400" />
                    <span className="h-0.5 flex-1 rounded-full bg-emerald-500" />
                  </div>
                  <p className="mt-2 shrink-0 truncate text-[7px] font-bold opacity-60">
                    Powered by ReviewFlow · {campaignName}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-slate-800">
                    Campaign Active QR Review Link:
                  </p>
                  <button
                    type="button"
                    className="mt-1 flex min-w-0 w-full items-center gap-2 truncate text-left text-xs font-medium text-primary hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    onClick={() => void copyCampaignUrl()}
                    aria-busy={copying}
                    aria-label="Copy campaign active QR review link"
                    title={url}
                  >
                    <span className="min-w-0 truncate">{url}</span>
                    <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <Button
                type="button"
                size="sm"
                className="flex items-center align-middle h-10 min-w-0 w-full gap-1.5 px-2 text-xs whitespace-nowrap"
                loading={saving}
                loadingLabel="Saving..."
                onClick={saveConfiguration}
              >
                <Check className="h-4 w-4 shrink-0" />
                <span className="truncate">Save</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-10 min-w-0 w-full gap-1.5 px-2 text-xs whitespace-nowrap"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4 shrink-0" />
                <span className="truncate">Print</span>
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-10 min-w-0 w-full gap-1.5 whitespace-nowrap bg-slate-900 px-2 text-xs text-white hover:bg-slate-800"
                loading={exporting}
                loadingLabel="Exporting..."
                onClick={() => void exportPoster()}
                disabled={!png}
              >
                <Download className="h-4 w-4 shrink-0" />
                <span className="truncate">Export</span>
              </Button>
            </div>
          </section>
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
      className="min-w-0 rounded-[16px] border border-slate-200 bg-white px-6 py-5 shadow-[0_2px_8px_rgba(15,23,42,0.025)]"
      aria-label={title}
    >
      <div className="flex min-h-9 items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <h2 className="text-[14px] font-extrabold uppercase tracking-[-0.01em] text-slate-950">
          {number}. {title}
        </h2>

        {action}
      </div>

      <div className="pt-5">{children}</div>
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
      className={`min-w-0 rounded-[14px] border bg-white p-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        selected
          ? "border-2 border-blue-600 bg-blue-50/40"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div
        className="aspect-[3/4] overflow-hidden rounded-[7px] p-2"
        style={{ backgroundColor: item.background }}
      >
        <div
          className="flex h-full flex-col items-center rounded-[5px] border border-white/10 px-2 py-3 text-center"
          style={{
            backgroundColor: item.surface,
            color: item.foreground,
          }}
        >
          <span
            className="h-1.5 w-10 rounded-full"
            style={{ backgroundColor: item.accent }}
          />

          <span className="mt-3 h-2 w-14 rounded bg-current opacity-60" />
          <span className="mt-1.5 h-1.5 w-16 rounded bg-current opacity-30" />

          <FakeQr color={qrColor} />

          <span
            className="mt-auto h-1.5 w-12 rounded"
            style={{ backgroundColor: item.accent }}
          />
        </div>
      </div>

      <span className="mt-2 block truncate text-center text-[11px] font-extrabold text-slate-950">
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
      className={`min-w-0 rounded-[14px] border bg-white p-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
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
      className={`grid ${large ? "h-28 w-28 grid-cols-9 gap-0.5 p-3" : "mt-5 h-16 w-16 grid-cols-9 gap-px p-1"} rounded-lg bg-white`}
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

function posterBackground(template: PosterTemplateId) {
  if (template === "midnight") return "linear-gradient(155deg, #0b1428 18%, #183978 100%)";
  if (template === "warm") return "linear-gradient(155deg, #fff7ed 10%, #fed7aa 100%)";
  if (template === "evergreen") return "linear-gradient(155deg, #ecfdf5 10%, #a7f3d0 100%)";
  return getPosterTemplate(template).background;
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = candidate;
  }
  if (line) lines.push(line);
  lines
    .slice(0, maxLines)
    .forEach((entry, index) =>
      context.fillText(entry, x, y + index * lineHeight),
    );
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("An image could not be included in the export."));
    image.src = source;
  });
}