import { ActivityChart } from "@/features/analytics/components/activity-chart";
import { getBusinessAnalytics } from "@/features/analytics/server/queries";
import { MetricCard } from "@/components/layout/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function BusinessAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analytics = await getBusinessAnalytics(id);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total QR scans" value={analytics.counts.qr_scan} />
        <MetricCard label="Unique scan sessions" value={analytics.uniqueVisitors} />
        <MetricCard label="Generated review drafts" value={analytics.counts.review_generated} />
        <MetricCard label="Opened Google review page" value={analytics.counts.google_redirect_clicked} />
        <MetricCard label="Scan-to-copy conversion" value={`${analytics.scanToCopy}%`} />
        <MetricCard label="Scan-to-Google redirect conversion" value={`${analytics.scanToRedirect}%`} />
        <MetricCard label="Copy-to-Google redirect conversion" value={`${analytics.copyToRedirect}%`} />
        <MetricCard label="Average selected rating" value={analytics.averageRating || "N/A"} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Activity by day</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityChart data={analytics.activity} />
        </CardContent>
      </Card>
    </div>
  );
}
