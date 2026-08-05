import Link from "next/link";
import { getOwnerBusinesses } from "@/features/businesses/server/queries";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/layout/empty-state";
import { DeleteStoreButton } from "@/components/dashboard/delete-store-button";
import { Button } from "@/components/ui/button";

/** Inline icon — lucide-react needs createContext (client-only) in RSC. */
function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export default async function BusinessesPage() {
  const businesses = await getOwnerBusinesses();

  if (!businesses.length) {
    return (
      <EmptyState
        title="No locations yet"
        description="Create a profile before generating public QR feedback pages."
        action={{ href: "/dashboard/businesses/new", label: "Create location" }}
      />
    );
  }

  const supabase = await createClient();

  // Exact head counts per location — avoids loading every analytics row (and
  // PostgREST row caps that silently undercount at scale).
  const [scanCounts, reviewCounts] = await Promise.all([
    Promise.all(
      businesses.map(async (business) => {
        const { count, error } = await supabase
          .from("analytics_events")
          .select("id", { count: "exact", head: true })
          .eq("event_type", "qr_scan")
          .eq("business_id", business.id);
        if (error) throw error;
        return [business.id, count ?? 0] as const;
      }),
    ),
    Promise.all(
      businesses.map(async (business) => {
        const { count, error } = await supabase
          .from("customer_feedback")
          .select("id", { count: "exact", head: true })
          .eq("submitted_privately", false)
          .eq("continued_to_google", true)
          .eq("business_id", business.id);
        if (error) throw error;
        return [business.id, count ?? 0] as const;
      }),
    ),
  ]);

  const scansByBusiness = new Map(scanCounts);
  const reviewsByBusiness = new Map(reviewCounts);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h2 className="text-3xl font-extrabold tracking-[-0.06em] text-slate-900">
            Store Management
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Manage your active store locations and configurations.
          </p>
        </div>
        <Button asChild className="rounded-xl">
          <Link href="/dashboard/businesses/new">
            <PlusIcon />
            Add New Store
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {businesses.map((business) => {
          const reviews = reviewsByBusiness.get(business.id) ?? 0;
          const scans = scansByBusiness.get(business.id) ?? 0;

          return (
            <article
              key={business.id}
              className="rounded-[1.35rem] border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="truncate text-[1.35rem] font-extrabold leading-tight tracking-[-0.04em] text-slate-900">
                    {business.name}
                  </h3>
                  <p className="mt-2.5 inline-flex max-w-full truncate rounded-full bg-[#eef2f8] px-3 py-1 text-sm font-semibold text-[#64748b]">
                    {business.category || "Uncategorized"}
                  </p>
                </div>
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e8f0ff] text-[#2463f3]"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z" />
                  </svg>
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 overflow-hidden rounded-2xl bg-[#f4f7fc]">
                <div className="px-5 py-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                    Reviews
                  </p>
                  <p className="mt-1 text-3xl font-extrabold tracking-[-0.06em] text-slate-900">
                    {reviews}
                  </p>
                </div>
                <div className="border-l border-slate-200/80 px-5 py-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                    Scans
                  </p>
                  <p className="mt-1 text-3xl font-extrabold tracking-[-0.06em] text-slate-900">
                    {scans}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2.5">
                <Link
                  href={`/dashboard/businesses/${business.id}/edit`}
                  className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  Settings
                </Link>
                <Link
                  href={`/dashboard/businesses/${business.id}/qr-campaigns`}
                  className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center rounded-xl border border-[#9bbcff] bg-white px-3 text-sm font-bold text-[#2463f3] transition hover:bg-[#eff5ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  Customize QR
                </Link>
                <DeleteStoreButton
                  businessId={business.id}
                  businessName={business.name}
                />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
