import Link from "next/link";
import { getOwnerBusinesses } from "@/features/businesses/server/queries";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function BusinessesPage() {
  const businesses = await getOwnerBusinesses();

  if (!businesses.length) {
    return <EmptyState title="No locations yet" description="Create a profile before generating public QR feedback pages." action={{ href: "/dashboard/businesses/new", label: "Create location" }} />;
  }

  return <div className="space-y-8">
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div><p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">Workspace</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-0.06em]">Store management</h2><p className="mt-2 text-sm font-medium text-muted-foreground">Manage active locations and the customer flows connected to them.</p></div>
      <Button asChild><Link href="/dashboard/businesses/new"><span className="text-lg leading-none">+</span>Add new location</Link></Button>
    </div>
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {businesses.map((business) => <Card key={business.id} className="overflow-hidden">
        <CardHeader className="flex-row items-start justify-between gap-4 pb-5"><div className="min-w-0"><CardTitle className="truncate text-2xl">{business.name}</CardTitle><p className="mt-2 inline-flex rounded-full bg-[#f0f4fa] px-3 py-1 text-sm font-semibold text-[#53627c]">{business.category}</p></div><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon name="store" className="h-6 w-6" /></span></CardHeader>
        <CardContent>
          <div className="rounded-2xl bg-[#f5f7fb] p-5"><div className="flex items-center justify-between border-b border-[#e3e9f2] pb-4"><span className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground">Public page</span><Badge className={business.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>{business.is_active ? "Active" : "Disabled"}</Badge></div><p className="mt-4 truncate text-sm font-semibold text-primary">/r/{business.slug}</p></div>
          <div className="mt-5 flex flex-wrap gap-2"><Button asChild variant="outline" className="flex-1"><Link href={`/dashboard/businesses/${business.id}/edit`}><Icon name="settings" className="h-4 w-4" />Settings</Link></Button><Button asChild variant="outline" className="flex-1"><Link href={`/dashboard/businesses/${business.id}/qr-campaigns`}>Customize QR</Link></Button><Button asChild variant="outline" size="icon" aria-label={`Open ${business.name} public page`}><Link href={`/r/${business.slug}`}><Icon name="externalLink" className="h-4 w-4" /></Link></Button></div>
        </CardContent>
      </Card>)}
    </div>
  </div>;
}
