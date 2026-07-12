import { createAdminClient } from "@/lib/supabase/admin";
import { Table, Td, Th, Tr } from "@/components/ui/table";

export default async function AdminFeedbackPage() {
  const { data, error } = await createAdminClient()
    .from("customer_feedback")
    .select("*, businesses(name)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;

  return (
    <Table>
      <thead>
        <Tr>
          <Th>Business</Th>
          <Th>Rating</Th>
          <Th>Private</Th>
          <Th>Notes</Th>
          <Th>Draft</Th>
        </Tr>
      </thead>
      <tbody>
        {(data ?? []).map((row) => (
          <Tr key={row.id}>
            <Td>{Array.isArray(row.businesses) ? row.businesses[0]?.name : row.businesses?.name}</Td>
            <Td>{row.rating}/5</Td>
            <Td>{row.submitted_privately ? "Yes" : "No"}</Td>
            <Td className="max-w-xs">{row.original_notes}</Td>
            <Td className="max-w-xs">{row.final_edited_text ?? row.generated_draft}</Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}
