import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePaidOwner } from "@/lib/billing/entitlements";
import { getOwnerBusinesses } from "@/features/businesses/server/queries";
import { formatReviewDisplayText } from "@/features/ai/server/prompt";
import { formatLimit } from "@/config/plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/layout/empty-state";

/** Page size for Growth/Custom (plan is unlimited; feed is paginated). */
const FEED_PAGE_SIZE = 25;

type ReviewRow = {
  id: string;
  rating: number;
  original_notes: string | null;
  generated_draft: string | null;
  final_edited_text: string | null;
  created_at: string;
  businesses: { name: string } | { name: string }[] | null;
};

function businessName(row: ReviewRow) {
  if (!row.businesses) return "Location";
  if (Array.isArray(row.businesses)) return row.businesses[0]?.name ?? "Location";
  return row.businesses.name ?? "Location";
}

function reviewText(row: ReviewRow) {
  // Prefer the text the customer copied and took to Google.
  return formatReviewDisplayText({
    finalEditedText: row.final_edited_text,
    generatedDraft: row.generated_draft,
    originalNotes: row.original_notes,
    firstOnly: true,
  });
}

function stars(rating: number) {
  return "★".repeat(rating) + "☆".repeat(Math.max(0, 5 - rating));
}

function googleContinueFeed(supabase: Awaited<ReturnType<typeof createClient>>, businessIds: string[]) {
  return supabase
    .from("customer_feedback")
    .select(
      "id, rating, original_notes, generated_draft, final_edited_text, created_at, businesses(name)",
    )
    .in("business_id", businessIds)
    .eq("submitted_privately", false)
    .eq("continued_to_google", true)
    .not("final_edited_text", "is", null)
    .order("created_at", { ascending: false });
}

export default async function ReviewActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const { entitlements } = await requirePaidOwner();
  const businesses = await getOwnerBusinesses();

  if (!businesses.length) {
    return (
      <EmptyState
        title="No locations yet"
        description="Connect a location first. Reviews from your QR flow will appear here."
        action={{ href: "/dashboard/businesses/new", label: "Set up a location" }}
      />
    );
  }

  // Starter: hard plan cap (e.g. 10). Growth/Custom: paginated, no plan cap.
  const planCap = entitlements.reviewsLimit;
  const isPlanCapped = planCap !== null;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const pageSize = isPlanCapped ? planCap : FEED_PAGE_SIZE;
  // Fetch one extra row on paginated plans to know if "Next" is available without a count.
  const fetchLimit = isPlanCapped ? pageSize : pageSize + 1;
  const rangeFrom = isPlanCapped ? 0 : (page - 1) * pageSize;
  const rangeTo = rangeFrom + fetchLimit - 1;

  const supabase = await createClient();
  const businessIds = businesses.map((business) => business.id);

  const { data, error } = await googleContinueFeed(supabase, businessIds).range(
    rangeFrom,
    rangeTo,
  );

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-medium text-destructive" role="alert">
            Could not load reviews: {error.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  const rows = (data ?? []) as unknown as ReviewRow[];
  const hasNextPage = !isPlanCapped && rows.length > pageSize;
  const reviews = hasNextPage ? rows.slice(0, pageSize) : rows;
  const hasPrevPage = !isPlanCapped && page > 1;

  // Only hit the count query when Starter's page is full — needed for upgrade CTA.
  let totalReviews = reviews.length;
  if (isPlanCapped && reviews.length >= planCap) {
    const { count, error: countError } = await supabase
      .from("customer_feedback")
      .select("id", { count: "exact", head: true })
      .in("business_id", businessIds)
      .eq("submitted_privately", false)
      .eq("continued_to_google", true)
      .not("final_edited_text", "is", null);

    if (countError) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Recent reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-destructive" role="alert">
              Could not load reviews: {countError.message}
            </p>
          </CardContent>
        </Card>
      );
    }
    totalReviews = count ?? reviews.length;
  }

  const showUpgrade = isPlanCapped && totalReviews > planCap;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Recent reviews</CardTitle>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              Reviews customers copied and continued with to Google Maps (not
              private messages, not unused drafts).
              {isPlanCapped
                ? ` Starter shows the latest ${planCap}.`
                : ` Showing ${FEED_PAGE_SIZE} per page.`}
            </p>
          </div>
          <Badge variant="primary">
            {isPlanCapped
              ? totalReviews > reviews.length
                ? `Showing ${reviews.length} of ${totalReviews} · limit ${formatLimit(planCap)}`
                : `${reviews.length} review${reviews.length === 1 ? "" : "s"} · limit ${formatLimit(planCap)}`
              : `Page ${page} · ${reviews.length} review${reviews.length === 1 ? "" : "s"}`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {reviews.length ? (
          reviews.map((row) => (
            <article
              key={row.id}
              className="rounded-2xl border border-border/70 bg-card p-4 shadow-[0_4px_14px_rgba(15,23,42,0.03)] transition-colors hover:border-primary/15"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-extrabold tracking-[-0.02em]">
                    {businessName(row)}
                  </p>
                  <p
                    className="mt-1 text-sm font-bold text-amber-500"
                    aria-label={`${row.rating} out of 5 stars`}
                  >
                    {stars(row.rating)}{" "}
                    <span className="font-semibold text-muted-foreground">
                      {row.rating}/5
                    </span>
                  </p>
                </div>
                <time
                  className="text-xs font-medium text-muted-foreground"
                  dateTime={row.created_at}
                >
                  {new Date(row.created_at).toLocaleString()}
                </time>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-6 text-foreground/90">
                {reviewText(row)}
              </p>
            </article>
          ))
        ) : (
          <EmptyState
            title="No Google reviews yet"
            description="When a customer taps “Copy & continue on Google Maps”, that review is saved here for your feed."
          />
        )}

        {!isPlanCapped && (hasPrevPage || hasNextPage) ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
            {hasPrevPage ? (
              <Button asChild variant="outline" size="sm">
                <Link href={page <= 2 ? "/dashboard/reviews" : `/dashboard/reviews?page=${page - 1}`}>
                  Previous
                </Link>
              </Button>
            ) : (
              <span />
            )}
            <p className="text-xs font-medium text-muted-foreground">Page {page}</p>
            {hasNextPage ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/reviews?page=${page + 1}`}>Next</Link>
              </Button>
            ) : (
              <span />
            )}
          </div>
        ) : null}

        {showUpgrade ? (
          <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/5 p-5 text-center">
            <p className="text-sm font-medium leading-6 text-muted-foreground">
              You have <strong>{totalReviews} reviews</strong>, but Starter only
              shows the <strong>{planCap} most recent</strong>. Upgrade to Growth
              or Custom to unlock the full feed.
            </p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/billing">Upgrade to see more reviews</Link>
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
