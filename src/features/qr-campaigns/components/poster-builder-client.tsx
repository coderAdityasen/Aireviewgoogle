"use client";

import { useMemo, useState } from "react";
import { LazyQrPreview } from "@/features/qr-campaigns/components/lazy-qr-preview";
import { EmptyState } from "@/components/layout/empty-state";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CampaignRecord = { business: { id: string; name: string; slug: string; logo_url?: string | null; brand_color?: string | null; poster_headline?: string | null; poster_template?: "light" | "dark" | null }; campaign: { id: string; name: string; public_token: string } };

export function PosterBuilderClient({ campaigns }: { campaigns: CampaignRecord[] }) {
  const [selectedId, setSelectedId] = useState(campaigns[0]?.campaign.id ?? "");
  const selected = useMemo(() => campaigns.find((item) => item.campaign.id === selectedId) ?? campaigns[0], [campaigns, selectedId]);

  if (!campaigns.length) return <EmptyState title="Create a campaign first" description="A poster needs an active campaign destination. Create a campaign, then return here to generate print-ready QR assets." action={{ href: "/dashboard/qr-campaigns", label: "Create campaign" }} />;
  if (!selected) return null;

  return <div className="min-w-0 space-y-5">
    <div><p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary">QR designs</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-0.06em]">Smart QR center</h2><p className="mt-2 text-sm font-medium text-muted-foreground">Choose a campaign, tune the poster and download a print-ready QR code.</p></div>
    <Card><CardHeader><CardTitle className="text-base uppercase tracking-[0.08em]">1. Choose a campaign</CardTitle></CardHeader><CardContent><Label htmlFor="poster-campaign">Campaign destination</Label><select id="poster-campaign" value={selected.campaign.id} onChange={(event) => setSelectedId(event.target.value)} className="mt-2 h-11 w-full rounded-xl border bg-card px-3 text-sm font-bold"><optgroup label="Campaigns">{campaigns.map((item) => <option key={item.campaign.id} value={item.campaign.id}>{item.business.name} · {item.campaign.name}</option>)}</optgroup></select></CardContent></Card>
    <LazyQrPreview key={`${selected.business.id}-${selected.campaign.id}`} businessId={selected.business.id} slug={selected.business.slug} campaignToken={selected.campaign.public_token} businessName={`${selected.business.name} · ${selected.campaign.name}`} logoUrl={selected.business.logo_url} brandColor={selected.business.brand_color ?? "#2463f3"} posterHeadline={selected.business.poster_headline} posterTemplate={selected.business.poster_template ?? "light"} />
  </div>;
}
