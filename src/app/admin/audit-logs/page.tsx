import { createAdminClient } from "@/lib/supabase/admin";
import { Table, Td, Th, Tr } from "@/components/ui/table";

export default async function AdminAuditLogsPage() {
  const { data, error } = await createAdminClient().from("audit_logs").select("id, action, entity_type, actor_id, created_at").order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return (
    <Table>
      <thead>
        <Tr>
          <Th>Action</Th>
          <Th>Entity</Th>
          <Th>Actor</Th>
          <Th>Created</Th>
        </Tr>
      </thead>
      <tbody>
        {(data ?? []).map((row) => (
          <Tr key={row.id}>
            <Td>{row.action}</Td>
            <Td>{row.entity_type}</Td>
            <Td>{row.actor_id}</Td>
            <Td>{new Date(row.created_at).toLocaleString()}</Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}
