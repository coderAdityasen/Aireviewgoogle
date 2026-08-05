import { NextResponse } from "next/server";
import { requirePaidOwner } from "@/lib/billing/entitlements";
import { getDashboardNavCounts } from "@/features/businesses/server/gmb-actions";

/**
 * Lightweight badge counts for the sidebar — loaded after first paint
 * so dashboard navigations are not blocked on feedback count queries.
 */
export async function GET() {
  try {
    const { user } = await requirePaidOwner();
    const counts = await getDashboardNavCounts(user.id);
    return NextResponse.json(counts, {
      headers: {
        // Allow brief browser caching on the client
        "Cache-Control": "private, max-age=30",
      },
    });
  } catch {
    return NextResponse.json(
      { reviews: 0, privateFeedback: 0, gmbSuggestions: 0 },
      { status: 200 },
    );
  }
}
