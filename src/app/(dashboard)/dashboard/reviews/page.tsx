import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePaidOwner } from "@/lib/billing/entitlements";
import { getOwnerBusinesses } from "@/features/businesses/server/queries";
import { formatLimit } from "@/config/plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/layout/empty-state";

type ReviewRow = {
  id: string;
  rating: number;
  original_notes: string | null;
  generated_draft: string | null;
  final_edited_text: string | null;
  submitted_privately: boolean;
  created_at: string;
  businesses: { name: string } | { name: string }[] | null;
};

function businessName(row: ReviewRow) {
  if (!row.businesses) return "Location";
  if (Array.isArray(row.businesses)) return row.businesses[0]?.name ?? "Location";
  return row.businesses.name ?? "Location";
}

function reviewText(row: ReviewRow) {
  const text = (
    row.final_edited_text ??
    row.generated_draft ??
    row.original_notes ??
    ""
  ).trim();
  if (!text) return "No review text captured.";
  // AI drafts may be stored as numbered options — show a single clean block.
  return text
    .replace(/^\s*\d+\.\s*/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stars(rating: number) {
  return "★".repeat(rating) + "☆".repeat(Math.max(0, 5 - rating));
}

export default async function ReviewActivityPage() {
  const { entitlements } = await requirePaidOwner();
  const businesses = await getOwnerBusinesses();

  if (!businesses.length) {
    return (
      <EmptyState
        title="No locations yet"
        description="Connect a location first. Reviews from your QR flow will appear here."
        action={{ href: "/onboarding", label: "Set up a location" }}
      />
    );
  }

  // Starter: 10. Growth/Pro: high cap (practical unlimited for the feed UI).
  const isCapped = entitlements.reviewsLimit !== null;
  const limit = entitlements.reviewsLimit ?? 500;
  const reviewsLimit = entitlements.reviewsLimit;

  const supabase = await createClient();
  const businessIds = businesses.map((business) => business.id);

  // Prefer filtering by owned business IDs (same pattern as private feedback).
  // Filtering via businesses.owner_id on a join is less reliable in PostgREST.
  const [{ data, error }, { count: totalCount, error: countError }] =
    await Promise.all([
      supabase
        .from("customer_feedback")
        .select(
          "id, rating, original_notes, generated_draft, final_edited_text, submitted_privately, created_at, businesses(name)",
        )
        .in("business_id", businessIds)
        .eq("submitted_privately", false)
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("customer_feedback")
        .select("id", { count: "exact", head: true })
        .in("business_id", businessIds)
        .eq("submitted_privately", false),
    ]);

  if (error || countError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-medium text-destructive" role="alert">
            Could not load reviews: {(error ?? countError)?.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  const reviews = (data ?? []) as unknown as ReviewRow[];
  const totalReviews = totalCount ?? reviews.length;
  // Show upgrade only when Starter has reached/exceeded the 10-review cap.
  const showUpgrade =
    isCapped &&
    reviewsLimit !== null &&
    totalReviews >= reviewsLimit;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Recent reviews</CardTitle>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              Customer review drafts from your QR flow (not private messages).
              {isCapped
                ? ` Starter shows the latest ${entitlements.reviewsLimit}.`
                : " Unlimited on your plan."}
            </p>
          </div>
          <Badge variant="primary">
            {isCapped
              ? `Showing ${reviews.length} of ${totalReviews}`
              : `Showing ${reviews.length}`}
            {isCapped ? ` · limit ${formatLimit(reviewsLimit!)}` : ""}
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
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="primary">Review</Badge>
                  <time
                    className="text-xs font-medium text-muted-foreground"
                    dateTime={row.created_at}
                  >
                    {new Date(row.created_at).toLocaleString()}
                  </time>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-6 text-foreground/90">
                {reviewText(row)}
              </p>
            </article>
          ))
        ) : (
          <EmptyState
            title="No reviews yet"
            description="When customers generate a review draft on your public QR page (and do not submit it as private feedback), it will show up here."
          />
        )}

        {showUpgrade ? (
          <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/5 p-5 text-center">
            <p className="text-sm font-medium leading-6 text-muted-foreground">
              You have <strong>{totalReviews} reviews</strong>, but Starter only
              shows the <strong>{reviewsLimit} most recent</strong>. Upgrade to
              Growth or Pro to unlock the full feed.
            </p>
            <Button asChild className="mt-4">
              <Link href="/billing">Upgrade to see more reviews</Link>
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
