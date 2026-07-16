import { ActivityChart } from "@/features/analytics/components/activity-chart";
import { getOwnerDashboardMetrics } from "@/features/analytics/server/queries";
import { MetricCard } from "@/components/layout/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export default async function AnalyticsIndexPage() { const metrics = await getOwnerDashboardMetrics(); return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="QR scans" value={metrics.counts.qr_scan} /><MetricCard label="Unique visitors" value={metrics.uniqueVisitors} /><MetricCard label="AI drafts generated" value={metrics.counts.review_generated} /><MetricCard label="Opened Google review page" value={metrics.counts.google_redirect_clicked} /></div><Card><CardHeader><CardTitle>14-day activity</CardTitle></CardHeader><CardContent><ActivityChart data={metrics.activity} /></CardContent></Card></div>; }
