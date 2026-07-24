import { deleteBusinessAdminAction, setBusinessActiveAction, updateBusinessAdminAction } from "@/features/admin/server/actions";
import { getAdminBusinesses } from "@/features/admin/server/queries";
import { Button } from "@/components/ui/button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { ratingTagText } from "@/lib/feedback/rating-tags";

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
        <thead><Tr><Th>Business</Th><Th>Category</Th><Th>Owner</Th><Th>Status</Th><Th>Google URL</Th><Th>Actions</Th></Tr></thead>
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
                    <div className="rounded-xl border border-primary/15 bg-primary/[0.03] p-3"><p className="text-xs font-extrabold text-foreground">Customer options by rating</p><p className="mt-1 text-[11px] font-medium leading-4 text-muted-foreground">One option per line. These appear after the customer chooses a rating.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{([1, 2, 3, 4, 5] as const).map((rating) => <label key={rating} className="cursor-pointer text-xs font-medium text-muted-foreground">{rating}-star options<textarea name={`ratingTags${rating}`} defaultValue={ratingTagText(business.experience_tags, rating)} placeholder={rating >= 4 ? "Friendly service\nClear communication" : "What could be improved"} className="mt-1 min-h-16 w-full cursor-text rounded-md border bg-card p-2 text-sm text-foreground" /></label>)}</div></div>
                    <label className="cursor-pointer text-xs font-medium text-muted-foreground">Low-rating support message<textarea name="lowRatingSupportMessage" defaultValue={business.low_rating_support_message ?? ""} className="mt-1 min-h-16 w-full cursor-text rounded-md border bg-card p-2 text-sm text-foreground" /></label>
                    <label className="cursor-pointer text-xs font-medium text-muted-foreground">Private follow-up fields<input name="contactFields" defaultValue={Array.isArray(business.contact_fields) ? business.contact_fields.join(",") : "name,email"} placeholder="name,email" className="mt-1 h-9 w-full cursor-text rounded-md border bg-card px-2 text-sm text-foreground" /></label>
                    <FormSubmitButton size="sm" loadingLabel="Saving...">Save admin edits</FormSubmitButton>
                  </form>
                </details>
              </Td>
              <Td>{business.category}</Td>
              <Td>{Array.isArray(business.profiles) ? business.profiles[0]?.full_name : business.profiles?.full_name}</Td>
              <Td><Badge>{business.is_active ? "Active" : "Disabled"}</Badge></Td>
              <Td className="max-w-xs truncate">{business.google_review_url}</Td>
              <Td><div className="flex flex-col gap-2"><form action={setBusinessActiveAction}><input type="hidden" name="id" value={business.id} /><input type="hidden" name="isActive" value={business.is_active ? "false" : "true"} /><FormSubmitButton size="sm" variant="outline" loadingLabel={business.is_active ? "Disabling..." : "Enabling..."}>{business.is_active ? "Disable" : "Enable"}</FormSubmitButton></form><form action={deleteBusinessAdminAction} className="flex gap-2"><input type="hidden" name="id" value={business.id} /><Input name="confirmation" placeholder="DELETE" className="h-8 w-24" /><FormSubmitButton size="sm" variant="destructive" loadingLabel="Deleting...">Delete</FormSubmitButton></form></div></Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
