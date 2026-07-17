"use client";

import { useMemo, useState } from "react";
import { LazyQrPreview } from "@/features/qr-campaigns/components/lazy-qr-preview";
import { EmptyState } from "@/components/layout/empty-state";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CampaignRecord = { business: { id: string; name: string; slug: string; logo_url?: string | null }; campaign: { id: string; name: string; public_token: string } };

export function PosterBuilderClient({ campaigns }: { campaigns: CampaignRecord[] }) {
  const [selectedId, setSelectedId] = useState(campaigns[0]?.campaign.id ?? "");
  const selected = useMemo(() => campaigns.find((item) => item.campaign.id === selectedId) ?? campaigns[0], [campaigns, selectedId]);

  if (!campaigns.length) return <EmptyState title="Create a campaign first" description="A poster needs an active campaign destination. Create a campaign, then return here to generate print-ready QR assets." action={{ href: "/dashboard/qr-campaigns", label: "Create campaign" }} />;
  if (!selected) return null;

  return <div className="space-y-5"><Card><CardHeader><CardTitle>Choose a campaign</CardTitle></CardHeader><CardContent><Label htmlFor="poster-campaign">Campaign</Label><select id="poster-campaign" value={selected.campaign.id} onChange={(event) => setSelectedId(event.target.value)} className="mt-2 h-11 w-full rounded-md border bg-card px-3 text-sm"><optgroup label="Campaigns">{campaigns.map((item) => <option key={item.campaign.id} value={item.campaign.id}>{item.business.name} · {item.campaign.name}</option>)}</optgroup></select></CardContent></Card><LazyQrPreview slug={selected.business.slug} campaignToken={selected.campaign.public_token} businessName={`${selected.business.name} · ${selected.campaign.name}`} logoUrl={selected.business.logo_url} /></div>;
}
