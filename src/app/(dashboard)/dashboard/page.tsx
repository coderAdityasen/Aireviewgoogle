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
import { getOwnerBusinesses } from "@/features/businesses/server/queries";
import { Icon } from "@/components/ui/icon";

export default async function DashboardPage() {
  const [metrics, owner, ownerBusinesses] = await Promise.all([getOwnerDashboardMetrics(), requirePaidOwner(), getOwnerBusinesses()]);
  const entitlements = owner.entitlements;
  const firstBusiness = ownerBusinesses[0];

  if (!metrics.businesses.length || !firstBusiness) {
    return <EmptyState title="Your workspace is ready" description="Connect your first location to create a customer review flow and start receiving useful feedback." action={{ href: "/onboarding", label: "Set up a location" }} />;
  }

  return <div className="space-y-7">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Total QR Scans" value={metrics.counts.qr_scan} hint="Tracked QR and campaign scans" icon={<Icon name="qr" className="h-6 w-6" />} iconClassName="text-slate-500" />
      <MetricCard label="Google Review Page Opens" value={metrics.counts.google_redirect_clicked} hint="A page open does not confirm publication" icon={<Icon name="externalLink" className="h-6 w-6" />} iconClassName="text-blue-600" />
      <MetricCard label="Average Star Rating" value={metrics.averageRating ? `${metrics.averageRating.toFixed(1)}★` : "—"} hint="Based on customer-selected ratings" icon={<Icon name="star" className="h-6 w-6 fill-current" />} iconClassName="text-amber-500" />
      <MetricCard label="Private Feedback" value={metrics.counts.private_feedback_submitted} hint="Direct customer messages" icon={<Icon name="message" className="h-6 w-6" />} iconClassName="text-rose-500" />
    </div>

    <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
      <Card><CardHeader><CardTitle>Activity</CardTitle><p className="mt-1 text-sm font-medium text-muted-foreground">Scans and Google page opens across your active flows.</p></CardHeader><CardContent>{metrics.counts.qr_scan ? <LazyActivityChart data={metrics.activity} /> : <EmptyState title="Your flow is ready" description="Analytics will appear after customers scan your QR code." action={{ href: "/dashboard/qr-posters", label: "Download QR" }} />}</CardContent></Card>
      <Card><CardHeader><CardTitle>Quick start</CardTitle><p className="mt-1 text-sm font-medium text-muted-foreground">Test the customer experience before sharing it.</p></CardHeader><CardContent className="space-y-3"><div className="rounded-2xl border border-border/50 bg-muted/40 p-4"><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">Active location</p><p className="mt-2 text-lg font-extrabold tracking-[-0.04em]">{firstBusiness.name}</p><Badge className="mt-2" variant={firstBusiness.is_active ? "success" : "warning"}>{firstBusiness.is_active ? "Active" : "Disabled"}</Badge></div><Button asChild className="w-full"><Link href={`/r/${firstBusiness.slug}`}>Test customer flow</Link></Button><Button asChild variant="outline" className="w-full"><Link href="/dashboard/qr-posters">Download QR</Link></Button></CardContent></Card>
    </div>

    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <Card><CardHeader className="flex-row items-center justify-between"><div><CardTitle>Locations</CardTitle><p className="mt-1 text-sm font-medium text-muted-foreground">Your active review destinations.</p></div><Button asChild size="sm"><Link href="/onboarding">Add location</Link></Button></CardHeader><CardContent className="space-y-2">{metrics.businesses.map((business) => <div key={business.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 transition-colors hover:border-primary/20 hover:bg-muted/30"><div className="min-w-0"><Link className="truncate text-sm font-extrabold hover:text-primary" href={`/dashboard/businesses/${business.id}`}>{business.name}</Link><p className="mt-1 text-xs font-medium text-muted-foreground">{business.is_active ? "Accepting customer feedback" : "Disabled"}</p></div><Badge variant={business.is_active ? "success" : "warning"}>{business.is_active ? "Active" : "Disabled"}</Badge></div>)}</CardContent></Card>
      <div className="space-y-6"><Card><CardHeader className="flex-row items-center justify-between"><div><CardTitle>Plan usage</CardTitle><p className="mt-1 text-sm font-medium text-muted-foreground">{entitlements.plan.name} plan</p></div><Button asChild variant="outline" size="sm"><Link href="/billing">Manage</Link></Button></CardHeader><CardContent className="space-y-4"><Usage label="Locations" value={entitlements.usage.businesses} limit={entitlements.plan.businesses} /><Usage label="Review requests" value={entitlements.usage.reviewRequests} limit={entitlements.plan.reviewRequests} /><Usage label="Regenerations" value={entitlements.usage.aiGenerations} limit={entitlements.plan.aiGenerations} /></CardContent></Card><Card><CardHeader><CardTitle>Recent activity</CardTitle></CardHeader><CardContent><ActivityFeed items={metrics.recentActivity.slice(0, 5).map((item) => ({ label: eventLabel(item.eventType), detail: `${item.businessName} · ${new Date(item.createdAt).toLocaleString()}`, createdAt: item.createdAt }))} /></CardContent></Card></div>
    </div>
  </div>;
}

function Usage({ label, value, limit }: { label: string; value: number; limit: number }) {
  const unlimited = limit < 0;
  const width = unlimited ? 8 : Math.min(100, Math.round((value / Math.max(limit, 1)) * 100));
  return (
    <div>
      <div className="flex justify-between text-sm font-bold">
        <span>{label}</span>
        <span className="text-muted-foreground">{unlimited ? `${value} / ∞` : `${value}/${limit}`}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-muted">
        <div className="h-2 rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
function eventLabel(eventType: string) { const labels: Record<string, string> = { qr_scan: "QR scan", review_generated: "Draft generated", review_copied: "Draft copied", google_redirect_clicked: "Opened Google review page", private_feedback_submitted: "Private feedback submitted", page_view: "Page viewed" }; return labels[eventType] ?? eventType; }
