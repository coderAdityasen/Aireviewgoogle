import Link from "next/link";
import { MarketingHeader } from "@/components/layout/marketing-header";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export default function HomePage() {
  return (
    <>
      <MarketingHeader />
      <main>
        <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-normal sm:text-5xl">
              ReviewFlow
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
              QR-powered customer feedback that helps real customers write clearer reviews from their own experience,
              then opens your official Google review page.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/signup">Start collecting feedback</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/pricing">View pricing</Link>
              </Button>
            </div>
          </div>
          <div className="rounded-md border bg-card p-6 shadow-sm">
            <div className="grid gap-4">
              {[
                ["qr", "Campaign QR codes route through your app for analytics before Google opens."],
                ["check", "AI rewrites only the customer’s own notes and preserves mixed or negative sentiment."],
                ["shield", "Owner, admin and public data paths are separated with Supabase RLS and server guards."]
              ].map(([icon, text]) => (
                <div key={text as string} className="flex gap-3 rounded-md border p-4">
                  <Icon name={icon as "qr" | "check" | "shield"} className="h-5 w-5 shrink-0 text-primary" />
                  <p className="text-sm text-muted-foreground">{text as string}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
