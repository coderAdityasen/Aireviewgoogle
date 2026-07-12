import { MarketingHeader } from "@/components/layout/marketing-header";

export default function PrivacyPage() {
  return (
    <>
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-semibold">Privacy policy</h1>
        <div className="mt-6 space-y-4 text-sm leading-7 text-muted-foreground">
          <p>ReviewFlow collects only the data needed to operate QR feedback pages, analytics and owner dashboards.</p>
          <p>Raw IP addresses are not stored by default. IP addresses are salted and hashed for rate limiting and abuse prevention.</p>
          <p>Customers are told that AI helps rewrite customer-provided text and that they must review and approve the draft before using it.</p>
          <p>Business owners can delete feedback from their dashboard, and admins can process deletion requests through audit-backed workflows.</p>
        </div>
      </main>
    </>
  );
}
