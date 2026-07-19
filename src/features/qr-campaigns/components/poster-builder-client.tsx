"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

import { LazyQrPreview } from "@/features/qr-campaigns/components/lazy-qr-preview";
import { EmptyState } from "@/components/layout/empty-state";
import type { Json } from "@/types/database";

type CampaignRecord = {
  business: {
    id: string;
    owner_id: string;
    name: string;
    slug: string;
    logo_url?: string | null;
    brand_color?: string | null;
    poster_headline?: string | null;
    poster_template?: "light" | "dark" | null;
    poster_settings?: Json;
  };
  campaign: {
    id: string;
    name: string;
    public_token: string;
  };
};

export function PosterBuilderClient({
  campaigns
}: {
  campaigns: CampaignRecord[];
}) {
  const [selectedId, setSelectedId] = useState(
    campaigns[0]?.campaign.id ?? ""
  );

  const selected = useMemo(
    () =>
      campaigns.find((item) => item.campaign.id === selectedId) ??
      campaigns[0],
    [campaigns, selectedId]
  );

  if (!campaigns.length) {
    return (
      <EmptyState
        title="Create a campaign first"
        description="A poster needs an active campaign destination. Create a campaign, then return here to generate print-ready QR assets."
        action={{
          href: "/dashboard/qr-campaigns",
          label: "Create campaign"
        }}
      />
    );
  }

  if (!selected) return null;

  return (
    <div className="min-w-0">
      <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-[26px] font-extrabold tracking-[-0.045em] text-slate-950">
            Smart Poster Designer &amp; QR Customizer
          </h1>

          <p className="mt-1 text-sm font-medium text-slate-500">
            Configure your poster branding, choose a custom QR code style, and
            select a layout template. All changes sync live.
          </p>
        </div>

        {campaigns.length > 1 ? (
          <div className="relative w-full shrink-0 lg:w-[260px]">
            <select
              value={selected.campaign.id}
              onChange={(event) => setSelectedId(event.target.value)}
              className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              aria-label="Select campaign"
            >
              {campaigns.map((item) => (
                <option
                  key={item.campaign.id}
                  value={item.campaign.id}
                >
                  {item.business.name} · {item.campaign.name}
                </option>
              ))}
            </select>

            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        ) : null}
      </header>

      <LazyQrPreview
        key={`${selected.business.id}-${selected.campaign.id}`}
        businessId={selected.business.id}
        ownerId={selected.business.owner_id}
        slug={selected.business.slug}
        campaignToken={selected.campaign.public_token}
        businessName={selected.business.name}
        campaignName={selected.campaign.name}
        logoUrl={selected.business.logo_url}
        brandColor={selected.business.brand_color ?? "#2463f3"}
        posterHeadline={selected.business.poster_headline}
        posterTemplate={selected.business.poster_template ?? "light"}
        posterSettings={selected.business.poster_settings}
      />
    </div>
  );
}