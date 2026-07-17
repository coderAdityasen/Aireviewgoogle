import Link from "next/link";
import { getOwnerBusinessWithCampaigns } from "@/features/businesses/server/queries";
import { LazyQrPreview } from "@/features/qr-campaigns/components/lazy-qr-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function BusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { business, campaigns } = await getOwnerBusinessWithCampaigns(id);
  const firstCampaign = campaigns[0];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>{business.name}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{business.category}</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/businesses/${business.id}/analytics`}>Analytics</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/dashboard/businesses/${business.id}/edit`}>Edit</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge className="mt-1">{business.is_active ? "Active" : "Disabled"}</Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Feedback page</p>
            <Link className="mt-1 block text-primary underline" href={`/r/${business.slug}`}>
              /r/{business.slug}
            </Link>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Google destination</p>
            <p className="mt-1 truncate text-sm">{business.google_review_url}</p>
          </div>
        </CardContent>
      </Card>
      {firstCampaign ? (
        <LazyQrPreview slug={business.slug} campaignToken={firstCampaign.public_token} businessName={business.name} logoUrl={business.logo_url} />
      ) : (
        <Card>
          <CardContent className="pt-5">Create a QR campaign to generate downloadable QR assets.</CardContent>
        </Card>
      )}
    </div>
  );
}
