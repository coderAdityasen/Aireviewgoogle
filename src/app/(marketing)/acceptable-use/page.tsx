import { MarketingHeader } from "@/components/layout/marketing-header";

export default function AcceptableUsePage() {
  return (
    <>
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-semibold">Acceptable use</h1>
        <div className="mt-6 space-y-4 text-sm leading-7 text-muted-foreground">
          <p>Do not generate reviews for customers who did not genuinely interact with the business.</p>
          <p>Do not use business-profile information to create fake customer experiences.</p>
          <p>Do not suppress the Google review option based on a low rating. Every genuine customer receives the same review flow.</p>
          <p>Do not add fake facts, employee names, prices, timelines, service outcomes or artificial human signals.</p>
        </div>
      </main>
    </>
  );
}
