"use client";

/* eslint-disable @next/next/no-img-element -- QR previews are generated data URLs and should not pass through image optimization. */

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Copy, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { absoluteUrl } from "@/lib/utils";

export function QrPreview({
  slug,
  campaignToken,
  businessName,
  logoUrl
}: {
  slug: string;
  campaignToken: string;
  businessName: string;
  logoUrl?: string | null;
}) {
  const url = useMemo(() => absoluteUrl(`/r/${slug}?campaign=${campaignToken}`), [slug, campaignToken]);
  const [png, setPng] = useState("");
  const [svg, setSvg] = useState("");
  const [transparent, setTransparent] = useState(false);
  const [logoOverlay, setLogoOverlay] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([
      QRCode.toDataURL(url, {
        margin: 2,
        width: 320,
        errorCorrectionLevel: logoOverlay ? "H" : "M",
        color: { dark: "#111111", light: transparent ? "#0000" : "#ffffff" }
      }),
      QRCode.toString(url, {
        type: "svg",
        margin: 2,
        errorCorrectionLevel: logoOverlay ? "H" : "M",
        color: { dark: "#111111", light: transparent ? "#0000" : "#ffffff" }
      })
    ]).then(([nextPng, nextSvg]) => {
      if (!active) return;
      setPng(nextPng);
      setSvg(nextSvg);
    }).catch(() => {
      if (active) toast.error("QR preview could not be generated.");
    });
    return () => { active = false; };
  }, [url, transparent, logoOverlay]);

  function download(filename: string, href: string) {
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    a.click();
  }

  const svgHref = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div className="rounded-md border bg-card p-5">
        <div className="relative mx-auto aspect-square w-full max-w-80 bg-white p-3">
          {png ? <img src={png} alt={`${businessName} QR code`} className="h-full w-full" /> : <div className="grid h-full place-items-center"><LoadingSpinner label="Generating QR preview" /></div>}
          {logoUrl && logoOverlay ? (
            <img
              src={logoUrl}
              alt=""
              className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-md bg-white object-contain p-1"
            />
          ) : null}
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={transparent} onChange={(event) => { setPng(""); setSvg(""); setTransparent(event.target.checked); }} />
            Transparent QR background
          </label>
          {logoUrl ? (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={logoOverlay} onChange={(event) => { setPng(""); setSvg(""); setLogoOverlay(event.target.checked); }} />
              Add small logo overlay with high error correction
            </label>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void navigator.clipboard.writeText(url).then(() => toast.success("URL copied.")).catch(() => toast.error("URL could not be copied."))}>
            <Copy className="h-4 w-4" />
            Copy URL
          </Button>
          <Button type="button" variant="outline" onClick={() => download(`${businessName}-qr.png`, png)} disabled={!png}>
            <Download className="h-4 w-4" />
            PNG
          </Button>
          <Button type="button" variant="outline" onClick={() => download(`${businessName}-qr.svg`, svgHref)} disabled={!svg}>
            <Download className="h-4 w-4" />
            SVG
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border bg-card p-6">
          <div className="aspect-[1/1.414] rounded-sm border bg-white p-6 text-center text-black">
            <h3 className="text-2xl font-semibold">{businessName}</h3>
            <p className="mt-2 text-sm">Scan to share your genuine experience</p>
            {png ? <img src={png} alt="" className="mx-auto mt-8 h-52 w-52" /> : null}
            <p className="mt-8 text-xs">AI helps rewrite only what you provide. You approve before opening Google.</p>
          </div>
          <Button type="button" variant="outline" className="mt-3" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print A4 poster
          </Button>
        </div>
        <div className="rounded-md border bg-card p-6">
          <div className="aspect-[3/2] rounded-sm border bg-white p-4 text-center text-black">
            <p className="text-sm font-medium">{businessName}</p>
            {png ? <img src={png} alt="" className="mx-auto mt-3 h-28 w-28" /> : null}
            <p className="mt-3 text-xs">Scan to review your visit</p>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Small counter-card design for reception desks, invoices and packaging inserts.</p>
        </div>
      </div>
    </div>
  );
}
