import { StatusBadge } from "@/components/dashboard/status-badge";

export function PrivateFeedbackCard({
  rating,
  notes,
  status,
  customer,
}: {
  rating: number;
  notes: string | null;
  status: string;
  customer?: string | null;
}) {
  return (
    <article className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)] transition-all duration-200 hover:border-primary/15 hover:shadow-[0_8px_24px_rgba(36,99,243,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <p className="font-bold tracking-[-0.02em]">
          {rating}/5 {customer ? `· ${customer}` : ""}
        </p>
        <StatusBadge status={status} />
      </div>
      <p className="mt-3 text-sm font-medium leading-6 text-muted-foreground">
        {notes || "No issue details provided."}
      </p>
    </article>
  );
}
