import { NextResponse, type NextRequest } from "next/server";
import { getOwnerBusiness } from "@/features/businesses/server/queries";
import { createClient } from "@/lib/supabase/server";
import { assertCsvExportAccess, recordUsage } from "@/lib/billing/entitlements";
import { getCurrentUser } from "@/lib/auth/roles";
import { formatReviewDisplayText } from "@/features/ai/server/prompt";

function csvEscape(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const businessId = request.nextUrl.searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "businessId is required." }, { status: 400 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try { await assertCsvExportAccess(user.id); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "CSV export is unavailable." }, { status: 402 }); }

  const business = await getOwnerBusiness(businessId);
  const supabase = await createClient();
  const [{ data: events, error: eventsError }, { data: feedback, error: feedbackError }] = await Promise.all([
    supabase.from("analytics_events").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
    supabase.from("customer_feedback").select("*").eq("business_id", businessId).order("created_at", { ascending: false })
  ]);
  if (eventsError) throw eventsError;
  if (feedbackError) throw feedbackError;

  const rows = [
    ["type", "created_at", "event_type", "rating", "notes", "draft"],
    ...(events ?? []).map((event) => ["event", event.created_at, event.event_type, "", "", ""]),
    ...(feedback ?? []).map((row) => [
      "feedback",
      row.created_at,
      "",
      row.rating,
      row.original_notes,
      formatReviewDisplayText({
        finalEditedText: row.final_edited_text,
        generatedDraft: row.generated_draft,
        originalNotes: row.original_notes,
        firstOnly: true,
      })
    ])
  ];
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  await recordUsage(user.id, "csv_export");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${business.slug}-reviewflow-export.csv"`
    }
  });
}
