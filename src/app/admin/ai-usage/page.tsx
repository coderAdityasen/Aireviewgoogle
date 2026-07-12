import { createAdminClient } from "@/lib/supabase/admin";
import { Table, Td, Th, Tr } from "@/components/ui/table";

export default async function AdminAiUsagePage() {
  const { data, error } = await createAdminClient()
    .from("ai_usage_logs")
    .select("*, businesses(name)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;

  return (
    <Table>
      <thead>
        <Tr>
          <Th>Business</Th>
          <Th>Provider</Th>
          <Th>Model</Th>
          <Th>Tokens</Th>
          <Th>Cost</Th>
          <Th>Status</Th>
        </Tr>
      </thead>
      <tbody>
        {(data ?? []).map((row) => (
          <Tr key={row.id}>
            <Td>{Array.isArray(row.businesses) ? row.businesses[0]?.name : row.businesses?.name}</Td>
            <Td>{row.provider}</Td>
            <Td>{row.model}</Td>
            <Td>{row.input_tokens + row.output_tokens}</Td>
            <Td>${Number(row.estimated_cost).toFixed(6)}</Td>
            <Td>{row.status}</Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}
