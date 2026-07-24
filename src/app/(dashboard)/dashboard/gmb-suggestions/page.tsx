import Link from "next/link";
import { getOwnerBusinesses } from "@/features/businesses/server/queries";
import { requirePaidOwner } from "@/lib/billing/entitlements";
import { getStoredGmbSuggestions } from "@/features/businesses/server/gmb-actions";
import { GmbSuggestionsPanel } from "@/features/businesses/components/gmb-suggestions-panel";
import { EmptyState } from "@/components/layout/empty-state";
import { cn } from "@/lib/utils";

export default async function GmbSuggestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ business?: string }>;
}) {
  const params = await searchParams;
  const [{ entitlements }, businesses] = await Promise.all([
    requirePaidOwner(),
    getOwnerBusinesses(),
  ]);

  if (!businesses.length) {
    return (
      <EmptyState
        title="Add a location first"
        description="GMB profile suggestions need at least one business profile to analyze."
        action={{
          href: "/dashboard/businesses/new",
          label: "Set up a location",
        }}
      />
    );
  }

  const selected =
    businesses.find((b) => b.id === params.business) ?? businesses[0];

  const stored = entitlements.gmbSuggestions
    ? await getStoredGmbSuggestions(selected.id)
    : null;

  return (
    <div className="w-full space-y-6">
      <header className="space-y-1.5">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">
          Google Business Profile
        </p>
        <h1 className="text-2xl font-extrabold tracking-[-0.05em] text-foreground sm:text-3xl">
          GMB profile suggestions
        </h1>
        <p className="max-w-2xl text-sm font-medium leading-6 text-muted-foreground">
          One analysis produces profile suggestions and growth projections
          together. Generated once, saved permanently. Growth and Pro only.
        </p>
      </header>

      {businesses.length > 1 ? (
        <nav
          className="flex flex-wrap gap-2"
          aria-label="Choose location for GMB suggestions"
        >
          {businesses.map((business) => {
            const active = business.id === selected.id;
            return (
              <Link
                key={business.id}
                href={`/dashboard/gmb-suggestions?business=${business.id}`}
                className={cn(
                  "inline-flex min-h-10 cursor-pointer items-center rounded-full border px-4 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  active
                    ? "border-primary/30 bg-primary text-primary-foreground shadow-sm"
                    : "border-border/80 bg-white text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                {business.name}
              </Link>
            );
          })}
        </nav>
      ) : null}

      <GmbSuggestionsPanel
        businessId={selected.id}
        businessName={selected.name}
        unlocked={entitlements.gmbSuggestions}
        planName={entitlements.plan.name}
        initialSuggestions={stored?.suggestions ?? []}
        initialGeneratedAt={stored?.generatedAt ?? null}
        initialImpactReport={stored?.impactReport ?? null}
      />
    </div>
  );
}
