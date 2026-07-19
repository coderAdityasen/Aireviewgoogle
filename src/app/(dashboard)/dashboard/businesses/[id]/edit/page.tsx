import Link from "next/link";
import { BusinessForm } from "@/features/businesses/components/business-form";
import { deleteBusinessAction } from "@/features/businesses/server/actions";
import { getOwnerBusiness } from "@/features/businesses/server/queries";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function EditBusinessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const business = await getOwnerBusiness(id);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary">Configuration</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-0.06em]">Campaign settings</h2><p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted-foreground">Control the customer options, review destination and brand details used by this location.</p></div>
        <Link href={`/dashboard/businesses/${business.id}/feedback`} className="rounded-xl border bg-white px-4 py-2.5 text-sm font-extrabold text-muted-foreground transition hover:border-primary/30 hover:text-primary">View responses</Link>
      </div>
      <div className="flex gap-1 rounded-2xl border bg-white p-1.5 shadow-[0_8px_24px_rgba(35,52,84,0.04)]"><span className="rounded-xl bg-primary px-4 py-2.5 text-sm font-extrabold text-white">Configuration</span><Link href={`/dashboard/businesses/${business.id}/feedback`} className="rounded-xl px-4 py-2.5 text-sm font-extrabold text-muted-foreground transition hover:bg-muted hover:text-foreground">Responses</Link></div>
      <Card>
        <CardHeader><CardTitle>Review flow configuration</CardTitle><CardDescription>Only validated Google review destinations can be saved. Suggestions become the compact options customers see after rating.</CardDescription></CardHeader>
        <CardContent><BusinessForm business={business} /></CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Delete business</CardTitle>
          <CardDescription>This permanently removes campaigns, analytics and feedback for this business.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={async (formData) => {
              "use server";
              await deleteBusinessAction(business.id, String(formData.get("confirmation") ?? ""));
            }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <Input name="confirmation" placeholder="DELETE" />
            <FormSubmitButton variant="destructive" loadingLabel="Deleting…">Delete business</FormSubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
