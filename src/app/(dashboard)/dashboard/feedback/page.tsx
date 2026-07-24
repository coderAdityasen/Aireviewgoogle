import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePaidOwner } from "@/lib/billing/entitlements";
import { getOwnerBusinesses } from "@/features/businesses/server/queries";
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

function businessName(row: PrivateFeedbackRow) {
  if (!row.businesses) return "Location";
  if (Array.isArray(row.businesses)) return row.businesses[0]?.name ?? "Location";
  return row.businesses.name ?? "Location";
}

function feedbackBody(row: PrivateFeedbackRow) {
  const text = (
    row.final_edited_text ||
    row.original_notes ||
    row.generated_draft ||
    ""
  ).trim();
  if (!text) return "No written details provided.";
  return text
    .replace(/^\s*\d+\.\s*/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stars(rating: number) {
  return "★".repeat(rating) + "☆".repeat(Math.max(0, 5 - rating));
}

export default async function FeedbackInboxPage() {
  const { entitlements } = await requirePaidOwner();

  if (!entitlements.privateFeedback) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Private feedback</CardTitle>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            Private feedback is not included on the Starter trial.
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-6 text-center">
            <p className="text-sm font-medium leading-6 text-muted-foreground">
              Upgrade to <strong>Growth</strong> or <strong>Pro</strong> to
              unlock the private feedback inbox for 1–3 star messages.
            </p>
            <Button asChild className="mt-5">
              <Link href="/billing">Upgrade plan</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
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
