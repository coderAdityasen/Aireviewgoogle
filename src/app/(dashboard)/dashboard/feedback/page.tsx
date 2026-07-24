import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePaidOwner } from "@/lib/billing/entitlements";
import { getOwnerBusinesses } from "@/features/businesses/server/queries";
import { formatReviewDisplayText } from "@/features/ai/server/prompt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/layout/empty-state";

type PrivateFeedbackRow = {
  id: string;
  rating: number;
  original_notes: string | null;
  generated_draft: string | null;
  final_edited_text: string | null;
  customer_name: string | null;
  customer_email: string | null;
  topic: string | null;
  resolution_status: string | null;
  created_at: string;
  businesses: { name: string } | { name: string }[] | null;
};

const DEMO_PRIVATE_FEEDBACK = [
  {
    id: "demo-1",
    location: "Downtown branch",
    rating: 2,
    name: "Priya S.",
    email: "priya.s@example.com",
    status: "new",
    body: "Wait time was longer than expected and no one updated us. Would appreciate a clearer queue system next time.",
    when: "2 hours ago",
  },
  {
    id: "demo-2",
    location: "Mall kiosk",
    rating: 1,
    name: "Rahul M.",
    email: "rahul.m@example.com",
    status: "in progress",
    body: "Staff seemed rushed. Product was fine but the experience felt impersonal after I asked for help twice.",
    when: "Yesterday",
  },
  {
    id: "demo-3",
    location: "Main store",
    rating: 3,
    name: "Anonymous customer",
    email: null,
    status: "new",
    body: "Average visit overall. Parking was hard and the counter process took a while, though the team was polite.",
    when: "2 days ago",
  },
  {
    id: "demo-4",
    location: "Airport outlet",
    rating: 2,
    name: "Ananya K.",
    email: "ananya.k@example.com",
    status: "resolved",
    body: "Order mixed up on first try. They fixed it, but I had to wait again. Sharing privately so you can improve ops.",
    when: "3 days ago",
  },
  {
    id: "demo-5",
    location: "Downtown branch",
    rating: 1,
    name: "Vikram P.",
    email: "vikram.p@example.com",
    status: "new",
    body: "Felt ignored during peak hours. A manager callback would help rebuild trust.",
    when: "5 days ago",
  },
] as const;

function businessName(row: PrivateFeedbackRow) {
  if (!row.businesses) return "Location";
  if (Array.isArray(row.businesses)) return row.businesses[0]?.name ?? "Location";
  return row.businesses.name ?? "Location";
}

function feedbackBody(row: PrivateFeedbackRow) {
  // Prefer private notes; never show raw {"reviews":[...]} JSON.
  const notes = row.original_notes?.trim();
  if (notes) return notes;

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

function PrivateFeedbackLockedPreview() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">
            Inbox
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.05em] text-foreground sm:text-3xl">
            Private feedback
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted-foreground">
            Low-star messages customers send privately (not posted to Google).
            Available on Growth and Pro.
          </p>
        </div>
        <Badge variant="primary">Growth &amp; Pro</Badge>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
        {/* Blurred fake list */}
        <div
          className="pointer-events-none select-none space-y-3 p-4 blur-[5px] sm:p-6"
          aria-hidden="true"
        >
          {DEMO_PRIVATE_FEEDBACK.map((row) => (
            <article
              key={row.id}
              className="rounded-2xl border border-border/70 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-extrabold tracking-[-0.02em]">{row.location}</p>
                  <p className="mt-1 text-sm font-bold text-amber-500">
                    {stars(row.rating)}{" "}
                    <span className="font-semibold text-muted-foreground">
                      {row.rating}/5
                    </span>
                  </p>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">
                    {row.name}
                    {row.email ? ` · ${row.email}` : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
                    {row.status}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {row.when}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-sm font-medium leading-6 text-foreground/90">
                {row.body}
              </p>
            </article>
          ))}
        </div>

        {/* Lock overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-white/40 via-white/75 to-white/90 p-6 backdrop-blur-[1px]">
          <div className="w-full max-w-md rounded-2xl border border-border/80 bg-white/95 p-6 text-center shadow-[0_16px_40px_rgba(15,23,42,0.12)] sm:p-8">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <h2 className="mt-4 text-lg font-extrabold tracking-[-0.03em] text-foreground">
              Unlock private reviews
            </h2>
            <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">
              Starter keeps 1–3★ messages private from Google, but the inbox is
              on <strong className="text-foreground">Growth</strong> and{" "}
              <strong className="text-foreground">Pro</strong>. Upgrade to read
              and resolve private feedback.
            </p>
            <Button asChild className="mt-5 w-full sm:w-auto">
              <Link href="/dashboard/billing">Upgrade to view private reviews</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function FeedbackInboxPage() {
  const { entitlements } = await requirePaidOwner();

  if (!entitlements.privateFeedback) {
    return <PrivateFeedbackLockedPreview />;
  }

  const businesses = await getOwnerBusinesses();

  if (!businesses.length) {
    return (
      <EmptyState
        title="No locations yet"
        description="Private feedback appears here after customers rate a location 1–3 stars and submit privately."
      />
    );
  }

  const supabase = await createClient();
  const businessIds = businesses.map((business) => business.id);

  const { data, error } = await supabase
    .from("customer_feedback")
    .select(
      "id, rating, original_notes, generated_draft, final_edited_text, customer_name, customer_email, topic, resolution_status, created_at, businesses(name)",
    )
    .in("business_id", businessIds)
    .eq("submitted_privately", true)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Private feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-medium text-destructive" role="alert">
            Could not load private feedback: {error.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  const rows = (data ?? []) as unknown as PrivateFeedbackRow[];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Private feedback</CardTitle>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              Messages from customers who rated 1–3 stars and submitted
              privately (not sent to Google).
            </p>
          </div>
          <Badge variant="primary">{rows.length} total</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length ? (
          rows.map((row) => (
            <article
              key={row.id}
              className="rounded-2xl border border-border/70 bg-card p-4 shadow-[0_4px_14px_rgba(15,23,42,0.03)]"
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
                  <p className="mt-1 text-sm font-medium text-muted-foreground">
                    {row.customer_name || "Anonymous customer"}
                    {row.customer_email ? ` · ${row.customer_email}` : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge
                    variant={
                      row.resolution_status === "resolved"
                        ? "success"
                        : row.resolution_status === "in_progress"
                          ? "warning"
                          : "default"
                    }
                  >
                    {(row.resolution_status ?? "new").replaceAll("_", " ")}
                  </Badge>
                  <time
                    className="text-xs font-medium text-muted-foreground"
                    dateTime={row.created_at}
                  >
                    {new Date(row.created_at).toLocaleString()}
                  </time>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-6 text-foreground/90">
                {feedbackBody(row)}
              </p>
            </article>
          ))
        ) : (
          <EmptyState
            title="No private feedback yet"
            description="When customers rate 1–3 stars and press Submit, their message appears here."
          />
        )}
      </CardContent>
    </Card>
  );
}
