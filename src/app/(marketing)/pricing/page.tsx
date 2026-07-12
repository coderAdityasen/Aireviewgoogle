import { MarketingHeader } from "@/components/layout/marketing-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PricingPage() {
  return (
    <>
      <MarketingHeader />
      <main className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="text-3xl font-semibold">Pricing</h1>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Starter", "$29", "1 business, 3 QR campaigns"],
            ["Growth", "$79", "5 businesses, advanced analytics"],
            ["Platform", "Custom", "Admin controls, higher AI limits"]
          ].map(([name, price, detail]) => (
            <Card key={name}>
              <CardHeader>
                <CardTitle>{name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{price}</p>
                <p className="mt-3 text-sm text-muted-foreground">{detail}</p>
                <Button asChild className="mt-6 w-full">
                  <Link href="/signup">Get started</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
