import Link from "next/link";
import { getOwnerBusinesses } from "@/features/businesses/server/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export default async function PosterBuilderIndexPage() { const businesses = await getOwnerBusinesses(); return <div className="grid gap-4 md:grid-cols-2">{businesses.map((business) => <Card key={business.id}><CardHeader><CardTitle>{business.name}</CardTitle><p className="text-sm text-muted-foreground">Build a print-ready poster for a campaign.</p></CardHeader><CardContent><Button asChild><Link href={`/dashboard/businesses/${business.id}/qr-campaigns`}>Choose campaign</Link></Button></CardContent></Card>)}{!businesses.length ? <p className="text-sm text-muted-foreground">Create a store to start building QR posters.</p> : null}</div>; }
