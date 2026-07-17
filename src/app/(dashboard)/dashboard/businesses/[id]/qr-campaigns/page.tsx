import { CampaignForm } from "@/features/qr-campaigns/components/campaign-form";
import { LazyQrPreview } from "@/features/qr-campaigns/components/lazy-qr-preview";
import { setQrCampaignActiveAction } from "@/features/qr-campaigns/server/actions";
import { getOwnerBusinessWithCampaigns } from "@/features/businesses/server/queries";
import { Badge } from "@/components/ui/badge";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function QrCampaignsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { business, campaigns } = await getOwnerBusinessWithCampaigns(id);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create named QR campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <CampaignForm businessId={business.id} />
        </CardContent>
      </Card>
      {campaigns.map((campaign) => (
        <Card key={campaign.id}>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{campaign.name}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge>{campaign.is_active ? "Active" : "Disabled"}</Badge>
              <form
                action={async () => {
                  "use server";
                  await setQrCampaignActiveAction(campaign.id, business.id, !campaign.is_active);
                }}
              >
                <FormSubmitButton size="sm" variant="outline" loadingLabel={campaign.is_active ? "Disabling…" : "Enabling…"}>
                  {campaign.is_active ? "Disable" : "Enable"}
                </FormSubmitButton>
              </form>
            </div>
          </CardHeader>
          <CardContent>
            <LazyQrPreview slug={business.slug} campaignToken={campaign.public_token} businessName={`${business.name}-${campaign.name}`} logoUrl={business.logo_url} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
