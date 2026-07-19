"use client";

/* eslint-disable @next/next/no-img-element -- QR previews are generated data URLs and should not pass through image optimization. */

import { useEffect, useMemo, useState, useTransition } from "react";
import QRCode from "qrcode";
import { CheckCircle2, Copy, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { absoluteUrl } from "@/lib/utils";
import { updatePosterSettingsAction } from "@/features/qr-campaigns/server/actions";

export function QrPreview({ businessId, slug, campaignToken, businessName, logoUrl, brandColor = "#2463f3", posterHeadline, posterTemplate = "light" }: { businessId?: string; slug: string; campaignToken: string; businessName: string; logoUrl?: string | null; brandColor?: string; posterHeadline?: string | null; posterTemplate?: "light" | "dark" }) {
  const url = useMemo(() => absoluteUrl(`/r/${slug}?campaign=${campaignToken}`), [slug, campaignToken]);
  const [png, setPng] = useState("");
  const [svg, setSvg] = useState("");
  const [transparent, setTransparent] = useState(false);
  const [logoOverlay, setLogoOverlay] = useState(false);
  const [qrColor, setQrColor] = useState(brandColor);
  const [headline, setHeadline] = useState(posterHeadline?.trim() || "Share your experience");
  const [template, setTemplate] = useState<"light" | "dark">(posterTemplate);
  const [saving, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    void Promise.all([
      QRCode.toDataURL(url, { margin: 2, width: 700, errorCorrectionLevel: logoOverlay ? "H" : "M", color: { dark: qrColor, light: transparent ? "#0000" : "#ffffff" } }),
      QRCode.toString(url, { type: "svg", margin: 2, errorCorrectionLevel: logoOverlay ? "H" : "M", color: { dark: qrColor, light: transparent ? "#0000" : "#ffffff" } })
    ]).then(([nextPng, nextSvg]) => {
      if (!active) return;
      setPng(nextPng);
      setSvg(nextSvg);
    }).catch(() => {
      if (active) toast.error("QR preview could not be generated.");
    });
    return () => { active = false; };
  }, [url, transparent, logoOverlay, qrColor]);

  function download(filename: string, href: string) {
    if (!href) return;
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    a.click();
    toast.success(filename.endsWith(".png") ? "PNG downloaded." : "SVG downloaded.");
  }

  function saveConfiguration() {
    if (!businessId) {
      toast.success("Poster preview updated.");
      return;
    }
    startTransition(async () => {
      try {
        await updatePosterSettingsAction(businessId, { brandColor: qrColor, posterHeadline: headline, posterTemplate: template });
        toast.success("QR poster configuration saved.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Poster configuration could not be saved.");
      }
    });
  }

  const svgHref = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const posterDark = template === "dark";
  const posterClass = posterDark ? "bg-[#111a32] text-white" : "bg-white text-[#111a32]";

  return <div className="min-w-0 space-y-5">
    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,390px)_minmax(0,1fr)]">
      <Card title="Poster configuration">
        <div className="flex items-center justify-between border-b border-border/70 pb-4"><p className="text-base font-extrabold uppercase tracking-[0.08em]">2. Poster configuration</p><span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-primary">Live preview</span></div>
        <div className="mt-5 space-y-4">
          <div><Label htmlFor="poster-headline">Poster headline</Label><Input id="poster-headline" value={headline} onChange={(event) => setHeadline(event.target.value)} maxLength={160} className="mt-2" /></div>
          <div><Label htmlFor="poster-color">QR and accent color</Label><div className="mt-2 flex items-center gap-3"><input id="poster-color" type="color" value={qrColor} onChange={(event) => { setPng(""); setSvg(""); setQrColor(event.target.value); }} className="h-11 w-14 cursor-pointer rounded-xl border bg-white p-1" /><span className="text-sm font-bold text-muted-foreground">{qrColor.toUpperCase()}</span></div></div>
          <div><Label htmlFor="poster-template">Poster template</Label><select id="poster-template" value={template} onChange={(event) => setTemplate(event.target.value as "light" | "dark")} className="mt-2 h-11 w-full rounded-xl border bg-card px-3 text-sm font-bold"><option value="light">Light canvas</option><option value="dark">Dark canvas</option></select></div>
          <div className="space-y-3 rounded-xl bg-muted p-4 text-sm font-semibold"><label className="flex items-start gap-2"><input type="checkbox" checked={transparent} onChange={(event) => { setPng(""); setSvg(""); setTransparent(event.target.checked); }} className="mt-0.5 h-4 w-4" />Transparent QR background</label>{logoUrl ? <label className="flex items-start gap-2"><input type="checkbox" checked={logoOverlay} onChange={(event) => { setPng(""); setSvg(""); setLogoOverlay(event.target.checked); }} className="mt-0.5 h-4 w-4" />Add the business logo inside the QR</label> : <p className="text-xs font-medium text-muted-foreground">Add a logo in business configuration to place it inside the QR code.</p>}</div>
          <Button type="button" loading={saving} loadingLabel="Saving..." onClick={saveConfiguration} className="w-full"><CheckCircle2 className="h-4 w-4" />Save configuration</Button>
        </div>
      </Card>

      <Card title="Live poster preview"><div className="flex items-center justify-between border-b border-border/70 pb-4"><p className="text-base font-extrabold">Live poster preview</p><span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-primary">{posterDark ? "Dark" : "Light"}</span></div><div className="mt-5 flex justify-center"><div className={`w-full max-w-[310px] rounded-2xl p-5 text-center shadow-[0_18px_40px_rgba(20,35,65,0.12)] ${posterClass}`}><div className="flex min-h-[430px] flex-col items-center justify-center rounded-xl border border-current/10 px-4 py-7"><div className="grid h-12 w-12 place-items-center rounded-full text-xl font-black" style={{ backgroundColor: qrColor, color: "#fff" }}>{logoUrl && logoOverlay ? <img src={logoUrl} alt="" className="h-8 w-8 rounded-full object-cover" /> : "R"}</div><p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.24em] opacity-70">{businessName}</p><h3 className="mt-3 text-2xl font-extrabold leading-tight tracking-[-0.06em]">{headline}</h3><p className="mt-2 text-xs font-semibold opacity-70">Scan to share your genuine experience</p><div className="mt-6 rounded-xl bg-white p-3 shadow-sm">{png ? <img src={png} alt={`${businessName} QR code`} className="h-48 w-48" /> : <div className="grid h-48 w-48 place-items-center"><LoadingSpinner label="Generating QR preview" /></div>}</div><p className="mt-5 text-[10px] font-bold uppercase tracking-[0.16em] opacity-70">ReviewFlow customer flow</p></div></div></div><div className="mt-5 flex flex-wrap justify-center gap-2"><Button type="button" variant="outline" size="sm" onClick={() => void navigator.clipboard.writeText(url).then(() => toast.success("Campaign URL copied.")).catch(() => toast.error("URL could not be copied."))}><Copy className="h-4 w-4" />Copy URL</Button><Button type="button" variant="outline" size="sm" onClick={() => download(`${businessName}-qr.png`, png)} disabled={!png}><Download className="h-4 w-4" />PNG</Button><Button type="button" variant="outline" size="sm" onClick={() => download(`${businessName}-qr.svg`, svgHref)} disabled={!svg}><Download className="h-4 w-4" />SVG</Button><Button type="button" variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" />Print</Button></div></Card>
    </div>

    <Card title="Counter card"><div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,280px)] md:items-center"><div><p className="text-base font-extrabold">Use the same campaign on desks, receipts or packaging.</p><p className="mt-2 max-w-xl text-sm font-medium leading-6 text-muted-foreground">The preview updates immediately. Download a high-resolution PNG or SVG when the layout is ready.</p></div><div className="rounded-xl border bg-white p-4 text-center text-[#111a32]"><p className="text-sm font-extrabold">{businessName}</p>{png ? <img src={png} alt="" className="mx-auto mt-3 h-28 w-28" /> : null}<p className="mt-3 text-xs font-bold">Scan to review your visit</p></div></div></Card>
  </div>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="min-w-0 rounded-2xl border bg-card p-5 shadow-[0_10px_28px_rgba(35,52,84,0.05)] sm:p-6" aria-label={title}>{children}</section>;
}
