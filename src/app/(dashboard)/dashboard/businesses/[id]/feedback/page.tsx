import { createClient } from "@/lib/supabase/server";
import { getOwnerBusiness } from "@/features/businesses/server/queries";
import { deleteFeedbackAction, updateFeedbackResolutionAction } from "@/features/feedback/server/actions";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function BusinessFeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await getOwnerBusiness(id);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customer_feedback")
    .select("id, rating, submitted_privately, original_notes, generated_draft, final_edited_text, resolution_status, internal_notes, created_at")
    .eq("business_id", id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;

  return (
    <Table>
      <thead>
        <Tr>
          <Th>Rating</Th>
          <Th>Private</Th>
          <Th>Customer notes</Th>
          <Th>Generated draft</Th>
          <Th>Workflow</Th>
          <Th>Delete</Th>
        </Tr>
      </thead>
      <tbody>
        {(data ?? []).map((row) => (
          <Tr key={row.id}>
            <Td>{row.rating}/5</Td>
            <Td>
              <Badge>{row.submitted_privately ? "Private feedback" : "Public review flow"}</Badge>
            </Td>
            <Td className="max-w-xs">{row.original_notes}</Td>
            <Td className="max-w-xs">{row.final_edited_text ?? row.generated_draft}</Td>
            <Td><form action={updateFeedbackResolutionAction} className="space-y-2"><input type="hidden" name="id" value={row.id} /><input type="hidden" name="businessId" value={id} /><select name="status" defaultValue={row.resolution_status} className="h-8 rounded border bg-card px-2 text-xs"><option value="new">New</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select><Input name="internalNotes" defaultValue={row.internal_notes ?? ""} placeholder="Internal note" className="h-8 w-32 text-xs" /><FormSubmitButton size="sm" variant="outline" loadingLabel="Saving…">Save</FormSubmitButton></form></Td>
            <Td>
              <form action={deleteFeedbackAction} className="flex gap-2">
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="businessId" value={id} />
                <Input name="confirmation" placeholder="DELETE" className="h-8 w-24" />
                <FormSubmitButton size="sm" variant="destructive" loadingLabel="Deleting…">
                  Delete
                </FormSubmitButton>
              </form>
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}
