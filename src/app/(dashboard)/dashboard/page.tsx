import Link from "next/link";
import { LazyActivityChart } from "@/features/analytics/components/lazy-activity-chart";
import { getOwnerDashboardMetrics } from "@/features/analytics/server/queries";
import { MetricCard } from "@/components/layout/metric-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requirePaidOwner } from "@/lib/billing/entitlements";

export default async function DashboardPage() {
  const [metrics, owner] = await Promise.all([getOwnerDashboardMetrics(), requirePaidOwner()]);
  const entitlements = owner.entitlements;
  const active = metrics.businesses.filter((business) => business.is_active).length;

  if (!metrics.businesses.length) {
    return <EmptyState title="Your workspace is ready" description="Connect your first business to create a customer review flow, publish a QR campaign, and start receiving useful feedback." action={{ href: "/onboarding", label: "Start onboarding" }} />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="Active businesses" value={active} />
        <MetricCard label="Total QR scans" value={metrics.counts.qr_scan} />
        <MetricCard label="Unique visitors" value={metrics.uniqueVisitors} />
        <MetricCard label="AI drafts generated" value={metrics.counts.review_generated} />
        <MetricCard label="Average selected rating" value={metrics.averageRating || "—"} />
        <MetricCard label="Opened Google review page" value={metrics.counts.google_redirect_clicked} hint="A page open does not prove publication." />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between"><div><CardTitle>Plan usage</CardTitle><p className="mt-1 text-sm text-muted-foreground">{entitlements.plan.name} plan · resets with your billing period</p></div><Button asChild variant="outline" size="sm"><Link href="/billing">Manage plan</Link></Button></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3"><Usage label="Locations" value={entitlements.usage.businesses} limit={entitlements.plan.businesses} /><Usage label="QR campaigns" value={entitlements.usage.qrCampaigns} limit={entitlements.plan.qrCampaigns} /><Usage label="AI drafts" value={entitlements.usage.aiGenerations} limit={entitlements.plan.aiGenerations} /></CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <CardHeader><CardTitle>Daily activity</CardTitle><p className="mt-1 text-sm text-muted-foreground">Scans and Google review page opens over the last 14 days.</p></CardHeader>
          <CardContent>{metrics.counts.qr_scan ? <LazyActivityChart data={metrics.activity} /> : <EmptyState title="Your campaign is ready" description="Analytics will appear after customers scan the QR code. Test the customer flow or download a poster to get started." action={{ href: "/dashboard/qr-posters", label: "Download a QR poster" }} />}</CardContent>
        </Card>
        <Card><CardHeader><CardTitle>Recent activity</CardTitle><p className="mt-1 text-sm text-muted-foreground">The latest customer-flow signals.</p></CardHeader><CardContent><ActivityFeed items={metrics.recentActivity.map((item) => ({ label: eventLabel(item.eventType), detail: `${item.businessName} · ${new Date(item.createdAt).toLocaleString()}`, createdAt: item.createdAt }))} /></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between"><div><CardTitle>Businesses</CardTitle><p className="mt-1 text-sm text-muted-foreground">Manage locations and test each public flow.</p></div><Button asChild size="sm"><Link href="/onboarding">Add location</Link></Button></CardHeader>
        <CardContent className="space-y-3">{metrics.businesses.map((business) => <div key={business.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"><div><Link className="font-medium underline-offset-4 hover:underline" href={`/dashboard/businesses/${business.id}`}>{business.name}</Link><p className="text-sm text-muted-foreground">{business.is_active ? "Published" : "Disabled"}</p></div><div className="flex items-center gap-3"><Badge>{business.is_active ? "Active" : "Disabled"}</Badge><Button asChild variant="outline" size="sm"><Link href={`/dashboard/businesses/${business.id}`}>Open</Link></Button></div></div>)}</CardContent>
      </Card>
    </div>
  );
}

function Usage({ label, value, limit }: { label: string; value: number; limit: number }) {
  const width = Math.min(100, Math.round((value / limit) * 100));
  return <div><div className="flex justify-between text-sm"><span>{label}</span><span className="text-muted-foreground">{value}/{limit}</span></div><div className="mt-2 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${width}%` }} /></div>{width >= 80 ? <Link className="mt-2 block text-xs text-primary underline" href="/pricing">Near the limit · compare plans</Link> : null}</div>;
}

function eventLabel(eventType: string) {
  const labels: Record<string, string> = { qr_scan: "QR scan", review_generated: "Draft generated", review_copied: "Draft copied", google_redirect_clicked: "Opened Google review page", private_feedback_submitted: "Private feedback submitted", page_view: "Page viewed" };
  return labels[eventType] ?? eventType;
}
