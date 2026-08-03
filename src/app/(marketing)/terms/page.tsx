import { MarketingHeader } from "@/components/layout/marketing-header";
import { MarketingFooter } from "@/components/layout/marketing-footer";

export default function TermsPage() {
  return (
    <>
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-semibold">Terms of service</h1>
        <div className="mt-6 space-y-4 text-sm leading-7 text-muted-foreground">
          <p>Businesses are responsible for configuring only their official Google review destination.</p>
          <p>ReviewFlow cannot verify whether a Google review was published. Analytics label this action as opening the Google review page.</p>
          <p>Owners may not use ReviewFlow to fabricate reviews, hide negative customer feedback or selectively route customers by sentiment.</p>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
