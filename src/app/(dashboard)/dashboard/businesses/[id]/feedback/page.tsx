import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOwnerBusiness } from "@/features/businesses/server/queries";
import { deleteFeedbackAction, updateFeedbackResolutionAction } from "@/features/feedback/server/actions";
import { formatReviewDisplayText } from "@/features/ai/server/prompt";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function BusinessFeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const business = await getOwnerBusiness(id);
  const supabase = await createClient();
  const { data, error } = await supabase.from("customer_feedback").select("id, rating, submitted_privately, original_notes, generated_draft, final_edited_text, resolution_status, internal_notes, created_at").eq("business_id", id).order("created_at", { ascending: false }).limit(100);
  if (error) throw error;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary">Responses</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-0.06em]">Customer responses</h2><p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">Review generated drafts and follow up on feedback from {business.name}.</p></div><Link href={`/dashboard/businesses/${id}/edit`} className="cursor-pointer rounded-xl border bg-white px-4 py-2.5 text-sm font-extrabold text-muted-foreground transition hover:border-primary/30 hover:text-primary">Open configuration</Link></div>
    <div className="flex gap-1 rounded-2xl border bg-white p-1.5 shadow-[0_8px_24px_rgba(35,52,84,0.04)]"><Link href={`/dashboard/businesses/${id}/edit`} className="cursor-pointer rounded-xl px-4 py-2.5 text-sm font-extrabold text-muted-foreground transition hover:bg-muted hover:text-foreground">Configuration</Link><span className="cursor-default rounded-xl bg-primary px-4 py-2.5 text-sm font-extrabold text-white">Responses</span></div>
    <Card><CardHeader className="flex-row items-center justify-between gap-3"><div><CardTitle>Response activity</CardTitle><p className="mt-1 text-sm font-medium text-muted-foreground">Status updates are visible only to your team.</p></div><Badge>{data?.length ?? 0} total</Badge></CardHeader><CardContent>{data?.length ? <Table><thead><Tr><Th>Rating</Th><Th>Type</Th><Th>Customer notes</Th><Th>Generated draft</Th><Th>Workflow</Th><Th>Delete</Th></Tr></thead><tbody>{data.map((row) => <Tr key={row.id}><Td><span className="font-extrabold">{row.rating}/5</span></Td><Td><Badge>{row.submitted_privately ? "Private feedback" : "Review flow"}</Badge></Td><Td className="max-w-xs"><p className="line-clamp-3 text-sm">{row.original_notes || "No written details provided."}</p></Td><Td className="max-w-xs"><p className="line-clamp-3 text-sm">{formatReviewDisplayText({ finalEditedText: row.final_edited_text, generatedDraft: row.generated_draft, firstOnly: true })}</p></Td><Td><form action={updateFeedbackResolutionAction} className="min-w-44 space-y-2"><input type="hidden" name="id" value={row.id} /><input type="hidden" name="businessId" value={id} /><select name="status" defaultValue={row.resolution_status} className="h-9 w-full rounded-lg border bg-card px-2 text-xs font-bold"><option value="new">New</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select><Input name="internalNotes" defaultValue={row.internal_notes ?? ""} placeholder="Internal note" className="h-9 w-full text-xs" /><FormSubmitButton size="sm" variant="outline" loadingLabel="Saving...">Save</FormSubmitButton></form></Td><Td><form action={deleteFeedbackAction} className="min-w-28 space-y-2"><input type="hidden" name="id" value={row.id} /><input type="hidden" name="businessId" value={id} /><Input name="confirmation" placeholder="DELETE" className="h-9 w-full text-xs" /><FormSubmitButton size="sm" variant="destructive" loadingLabel="Deleting...">Delete</FormSubmitButton></form></Td></Tr>)}</tbody></Table> : <div className="rounded-2xl border border-dashed bg-muted/40 p-10 text-center"><p className="font-extrabold">No responses yet</p><p className="mt-2 text-sm font-medium text-muted-foreground">Responses will appear here when customers use this review flow.</p></div>}</CardContent></Card>
  </div>;
}
