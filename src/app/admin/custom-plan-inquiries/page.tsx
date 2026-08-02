import { createAdminClient } from "@/lib/supabase/admin";
import { updateCustomPlanInquiryStatusAction } from "@/features/billing/server/custom-plan-actions";
import { Badge } from "@/components/ui/badge";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Table, Td, Th, Tr } from "@/components/ui/table";

export default async function AdminCustomPlanInquiriesPage() {
  const { data, error } = await createAdminClient()
    .from("custom_plan_inquiries")
    .select(
      "id, full_name, email, phone, company_name, locations_needed, message, status, admin_notes, user_id, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  const rows = data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary">
          Sales
        </p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.05em]">
          Custom plan inquiries
        </h2>
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          People who clicked Contact us on the Custom plan. Reach out by email or
          phone, then mark the status.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border bg-card p-6 text-sm font-medium text-muted-foreground">
          No custom plan requests yet.
        </p>
      ) : (
        <Table>
          <thead>
            <Tr>
              <Th>When</Th>
              <Th>Contact</Th>
              <Th>Company</Th>
              <Th>Locations</Th>
              <Th>Message</Th>
              <Th>Status</Th>
              <Th>Update</Th>
            </Tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Tr key={row.id}>
                <Td className="whitespace-nowrap text-xs">
                  {new Date(row.created_at).toLocaleString()}
                </Td>
                <Td>
                  <div className="min-w-[10rem] space-y-0.5 text-sm">
                    <p className="font-semibold">{row.full_name}</p>
                    <a
                      href={`mailto:${row.email}`}
                      className="block text-primary hover:underline"
                    >
                      {row.email}
                    </a>
                    {row.phone ? (
                      <a
                        href={`tel:${row.phone}`}
                        className="block text-xs text-muted-foreground hover:underline"
                      >
                        {row.phone}
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">No phone</span>
                    )}
                  </div>
                </Td>
                <Td className="text-sm">{row.company_name || "—"}</Td>
                <Td className="text-sm">{row.locations_needed || "—"}</Td>
                <Td className="max-w-xs text-sm leading-5">{row.message}</Td>
                <Td>
                  <Badge
                    variant={
                      row.status === "new"
                        ? "primary"
                        : row.status === "contacted"
                          ? "default"
                          : "outline"
                    }
                  >
                    {row.status}
                  </Badge>
                </Td>
                <Td>
                  <form
                    action={updateCustomPlanInquiryStatusAction}
                    className="flex min-w-[12rem] flex-col gap-1.5"
                  >
                    <input type="hidden" name="id" value={row.id} />
                    <select
                      name="status"
                      defaultValue={row.status}
                      className="h-8 cursor-pointer rounded border bg-card px-1 text-xs"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="closed">Closed</option>
                    </select>
                    <input
                      name="adminNotes"
                      defaultValue={row.admin_notes ?? ""}
                      placeholder="Admin notes"
                      className="h-8 cursor-text rounded border px-2 text-xs"
                    />
                    <FormSubmitButton size="sm" variant="outline" loadingLabel="Saving…">
                      Save
                    </FormSubmitButton>
                  </form>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
