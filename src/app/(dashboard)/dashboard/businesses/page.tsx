import Link from "next/link";
import { getOwnerBusinesses } from "@/features/businesses/server/queries";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, Td, Th, Tr } from "@/components/ui/table";

export default async function BusinessesPage() {
  const businesses = await getOwnerBusinesses();

  if (!businesses.length) {
    return (
      <EmptyState
        title="No businesses yet"
        description="Create a profile before generating public QR feedback pages."
        action={{ href: "/dashboard/businesses/new", label: "Create business" }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button asChild>
          <Link href="/dashboard/businesses/new">New business</Link>
        </Button>
      </div>
      <Table>
        <thead>
          <Tr>
            <Th>Name</Th>
            <Th>Category</Th>
            <Th>Status</Th>
            <Th>Public page</Th>
          </Tr>
        </thead>
        <tbody>
          {businesses.map((business) => (
            <Tr key={business.id}>
              <Td>
                <Link href={`/dashboard/businesses/${business.id}`} className="font-medium underline-offset-4 hover:underline">
                  {business.name}
                </Link>
              </Td>
              <Td>{business.category}</Td>
              <Td>
                <Badge>{business.is_active ? "Active" : "Disabled"}</Badge>
              </Td>
              <Td>
                <Link href={`/r/${business.slug}`} className="text-primary underline">
                  /r/{business.slug}
                </Link>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
