import { grantEntitlementOverrideAction, setOwnerStatusAction } from "@/features/admin/server/actions";
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
          <Th>Subscription</Th>
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
            <Td><div className="text-xs"><p className="font-medium">{owner.subscription?.plan_key ?? "None"} · {owner.subscription?.status ?? "unpaid"}</p><p className="text-muted-foreground">Access until {owner.subscription?.access_until ? new Date(owner.subscription.access_until).toLocaleDateString() : "—"}</p></div><form action={grantEntitlementOverrideAction} className="mt-2 flex flex-wrap gap-1"><input type="hidden" name="ownerId" value={owner.id} /><select name="planKey" className="h-8 rounded border bg-card px-1 text-xs" defaultValue="starter"><option value="starter">Starter</option><option value="growth">Growth</option><option value="pro">Pro</option></select><input name="reason" required placeholder="Reason" className="h-8 w-24 rounded border px-2 text-xs" /><input name="expiresAt" type="date" className="h-8 rounded border px-1 text-xs" /><Button size="sm" variant="outline">Grant override</Button></form></Td>
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
