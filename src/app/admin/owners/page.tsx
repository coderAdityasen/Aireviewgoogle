import { setOwnerStatusAction } from "@/features/admin/server/actions";
import { getAdminOwners } from "@/features/admin/server/queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, Td, Th, Tr } from "@/components/ui/table";

export default async function AdminOwnersPage() {
  const owners = await getAdminOwners();

  return (
    <Table>
      <thead>
        <Tr>
          <Th>Name</Th>
          <Th>Email</Th>
          <Th>Role</Th>
          <Th>Status</Th>
          <Th>Signup date</Th>
          <Th>Last activity</Th>
          <Th>Action</Th>
        </Tr>
      </thead>
      <tbody>
        {owners.map((owner) => (
          <Tr key={owner.id}>
            <Td>{owner.full_name}</Td>
            <Td>{owner.email}</Td>
            <Td>{owner.role}</Td>
            <Td>
              <Badge>{owner.account_status}</Badge>
            </Td>
            <Td>{new Date(owner.created_at).toLocaleDateString()}</Td>
            <Td>{owner.last_activity_at ? new Date(owner.last_activity_at).toLocaleDateString() : "N/A"}</Td>
            <Td>
              <form action={setOwnerStatusAction}>
                <input type="hidden" name="id" value={owner.id} />
                <input type="hidden" name="status" value={owner.account_status === "active" ? "suspended" : "active"} />
                <Button size="sm" variant={owner.account_status === "active" ? "destructive" : "outline"}>
                  {owner.account_status === "active" ? "Suspend" : "Reactivate"}
                </Button>
              </form>
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}
