import { createClient } from "@/lib/supabase/server";
import { requireActiveOwner } from "@/lib/auth/roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/layout/empty-state";

type ReviewRow = {
  id: string;
  rating: number;
  original_notes: string | null;
  generated_draft: string | null;
  final_edited_text: string | null;
  submitted_privately: boolean;
  created_at: string;
  businesses: { name: string; owner_id: string } | null;
};

function reviewText(row: ReviewRow) {
  const text = (row.final_edited_text ?? row.generated_draft ?? row.original_notes ?? "").trim();
  if (!text) return "No review text captured.";
  // Drafts may be stored as numbered options — show a readable single block.
  return text
    .replace(/^\s*\d+\.\s*/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stars(rating: number) {
  return "★".repeat(rating) + "☆".repeat(Math.max(0, 5 - rating));
}

export default async function ReviewActivityPage() {
  const { user } = await requireActiveOwner();
  const supabase = await createClient();

  const { data } = await supabase
    .from("customer_feedback")
    .select(
      "id, rating, original_notes, generated_draft, final_edited_text, submitted_privately, created_at, businesses!inner(name, owner_id)",
    )
    .eq("businesses.owner_id", user.id)
    .eq("submitted_privately", false)
    .order("created_at", { ascending: false })
    .limit(50);

  const reviews = (data ?? []) as unknown as ReviewRow[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent reviews</CardTitle>
        <p className="text-sm font-medium text-muted-foreground">
          Customer review drafts from your QR flow. Private messages appear in Private feedback.
        </p>
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
                    {row.businesses?.name ?? "Location"}
                  </p>
                  <p
                    className="mt-1 text-sm font-bold text-amber-500"
                    aria-label={`${row.rating} out of 5 stars`}
                  >
                    {stars(row.rating)}{" "}
                    <span className="font-semibold text-muted-foreground">{row.rating}/5</span>
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
            description="When customers complete your QR review flow, their recent reviews will show up here."
          />
        )}
      </CardContent>
    </Card>
  );
}
