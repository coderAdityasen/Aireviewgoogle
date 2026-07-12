import { createClient } from "@/lib/supabase/server";
import { getOwnerBusiness } from "@/features/businesses/server/queries";
import { deleteFeedbackAction } from "@/features/feedback/server/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function BusinessFeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await getOwnerBusiness(id);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customer_feedback")
    .select("*")
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
            <Td>
              <form action={deleteFeedbackAction} className="flex gap-2">
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="businessId" value={id} />
                <Input name="confirmation" placeholder="DELETE" className="h-8 w-24" />
                <Button size="sm" variant="destructive">
                  Delete
                </Button>
              </form>
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}
