import { getAdminOverview } from "@/features/admin/server/queries";
import { MetricCard } from "@/components/layout/metric-card";

export default async function AdminAnalyticsPage() {
  const overview = await getAdminOverview();
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Total QR scans" value={overview.counts.qr_scan} />
      <MetricCard label="Unique visitors" value={overview.uniqueVisitors} />
      <MetricCard label="Generated review drafts" value={overview.counts.review_generated} />
      <MetricCard label="Copy-to-clipboard events" value={overview.counts.review_copied} />
      <MetricCard label="Opened Google review page" value={overview.counts.google_redirect_clicked} />
      <MetricCard label="Estimated conversion rate" value={`${overview.scanToRedirect}%`} />
    </div>
  );
}
