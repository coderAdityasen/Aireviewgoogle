import { getOwnerCampaigns } from "@/features/businesses/server/queries";
import { PosterBuilderClient } from "@/features/qr-campaigns/components/poster-builder-client";

export default async function PosterBuilderIndexPage() {
  const campaigns = await getOwnerCampaigns();
  return <PosterBuilderClient campaigns={campaigns.map(({ business, campaign }) => ({ business: { id: business.id, owner_id: business.owner_id, name: business.name, slug: business.slug, logo_url: business.logo_url, brand_color: business.brand_color, poster_headline: business.poster_headline, poster_template: business.poster_template, poster_settings: business.poster_settings }, campaign: { id: campaign.id, name: campaign.name, public_token: campaign.public_token } }))} />;
}
