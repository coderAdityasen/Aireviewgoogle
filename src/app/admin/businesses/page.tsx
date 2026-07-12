import {
  deleteBusinessAdminAction,
  setBusinessActiveAction,
  updateBusinessAdminAction
} from "@/features/admin/server/actions";
import { getAdminBusinesses } from "@/features/admin/server/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, Td, Th, Tr } from "@/components/ui/table";

export default async function AdminBusinessesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const businesses = await getAdminBusinesses(q);

  return (
    <div className="space-y-4">
      <form className="flex max-w-md gap-2">
        <Input name="q" defaultValue={q ?? ""} placeholder="Search business or category" />
        <Button variant="outline">Search</Button>
      </form>
      <Table>
        <thead>
          <Tr>
            <Th>Business</Th>
            <Th>Category</Th>
            <Th>Owner</Th>
            <Th>Status</Th>
            <Th>Google URL</Th>
            <Th>Actions</Th>
          </Tr>
        </thead>
        <tbody>
          {businesses.map((business) => (
            <Tr key={business.id}>
              <Td>
                <details>
                  <summary className="cursor-pointer font-medium">{business.name}</summary>
                  <form action={updateBusinessAdminAction} className="mt-3 grid gap-2">
                    <input type="hidden" name="id" value={business.id} />
                    <Input name="name" defaultValue={business.name} />
                    <Input name="category" defaultValue={business.category} />
                    <Input name="phone" defaultValue={business.phone ?? ""} />
                    <Input name="website" defaultValue={business.website ?? ""} />
                    <Input name="googleReviewUrl" defaultValue={business.google_review_url} />
                    <Button size="sm">Save admin edits</Button>
                  </form>
                </details>
              </Td>
              <Td>{business.category}</Td>
              <Td>{Array.isArray(business.profiles) ? business.profiles[0]?.full_name : business.profiles?.full_name}</Td>
              <Td>
                <Badge>{business.is_active ? "Active" : "Disabled"}</Badge>
              </Td>
              <Td className="max-w-xs truncate">{business.google_review_url}</Td>
              <Td>
                <div className="flex flex-col gap-2">
                  <form action={setBusinessActiveAction}>
                    <input type="hidden" name="id" value={business.id} />
                    <input type="hidden" name="isActive" value={business.is_active ? "false" : "true"} />
                    <Button size="sm" variant="outline">
                      {business.is_active ? "Disable" : "Enable"}
                    </Button>
                  </form>
                  <form action={deleteBusinessAdminAction} className="flex gap-2">
                    <input type="hidden" name="id" value={business.id} />
                    <Input name="confirmation" placeholder="DELETE" className="h-8 w-24" />
                    <Button size="sm" variant="destructive">
                      Delete
                    </Button>
                  </form>
                </div>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
