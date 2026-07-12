import { getAdminOverview } from "@/features/admin/server/queries";
import { MetricCard } from "@/components/layout/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminPage() {
  const overview = await getAdminOverview();
  const activeBusinesses = overview.businesses.filter((business) => business.is_active).length;
  const suspendedOwners = overview.owners.filter((owner) => owner.account_status === "suspended").length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total business owners" value={overview.owners.filter((owner) => owner.role === "business_owner").length} />
        <MetricCard label="Active businesses" value={activeBusinesses} />
        <MetricCard label="Suspended businesses" value={overview.businesses.length - activeBusinesses} />
        <MetricCard label="Total QR scans" value={overview.counts.qr_scan} />
        <MetricCard label="Unique visitors" value={overview.uniqueVisitors} />
        <MetricCard label="Generated review drafts" value={overview.counts.review_generated} />
        <MetricCard label="Review copies" value={overview.counts.review_copied} />
        <MetricCard label="Google redirects" value={overview.counts.google_redirect_clicked} hint="Opened Google review page" />
        <MetricCard label="Scan-to-redirect conversion" value={`${overview.scanToRedirect}%`} />
        <MetricCard label="AI tokens" value={overview.aiTokens} />
        <MetricCard label="Approx. AI cost" value={`$${overview.aiCost.toFixed(4)}`} />
        <MetricCard label="Suspended owners" value={suspendedOwners} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent private feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {overview.recentFeedback.map((feedback) => (
            <div key={feedback.id} className="rounded-md border p-3 text-sm">
              <p className="font-medium">Rating {feedback.rating}/5</p>
              <p className="text-muted-foreground">{feedback.original_notes}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
