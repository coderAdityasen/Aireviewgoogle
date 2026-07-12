import { BusinessForm } from "@/features/businesses/components/business-form";
import { deleteBusinessAction } from "@/features/businesses/server/actions";
import { getOwnerBusiness } from "@/features/businesses/server/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function EditBusinessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const business = await getOwnerBusiness(id);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Edit business</CardTitle>
          <CardDescription>Only validated Google review destinations can be saved.</CardDescription>
        </CardHeader>
        <CardContent>
          <BusinessForm business={business} />
        </CardContent>
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
            <Button variant="destructive">Delete business</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
