import Link from "next/link";
import { ActivityChart } from "@/features/analytics/components/activity-chart";
import { getOwnerDashboardMetrics } from "@/features/analytics/server/queries";
import { MetricCard } from "@/components/layout/metric-card";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const metrics = await getOwnerDashboardMetrics();
  const active = metrics.businesses.filter((business) => business.is_active).length;

  if (!metrics.businesses.length) {
    return (
      <EmptyState
        title="Create your first business"
        description="Add your business profile, validate the Google review URL and generate your first QR feedback page."
        action={{ href: "/dashboard/businesses/new", label: "Start onboarding" }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active businesses" value={active} />
        <MetricCard label="Total QR scans" value={metrics.counts.qr_scan} />
        <MetricCard label="Unique visitors" value={metrics.uniqueVisitors} />
        <MetricCard label="Opened Google review page" value={`${metrics.conversion}%`} hint="Scan-to-Google redirect conversion" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Daily activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityChart data={metrics.activity} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Businesses</CardTitle>
          <Button asChild size="sm">
            <Link href="/dashboard/businesses/new">New business</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {metrics.businesses.map((business) => (
            <div key={business.id} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Link className="font-medium underline-offset-4 hover:underline" href={`/dashboard/businesses/${business.id}`}>
                  {business.name}
                </Link>
                <p className="text-sm text-muted-foreground">{business.is_active ? "Published" : "Disabled"}</p>
              </div>
              <Badge>{business.is_active ? "Active" : "Disabled"}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
