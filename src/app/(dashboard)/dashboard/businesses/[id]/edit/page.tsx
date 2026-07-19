import { ResponseSettingsForm } from "@/features/businesses/components/response-settings-form";
import { BusinessForm } from "@/features/businesses/components/business-form";
import { deleteBusinessAction } from "@/features/businesses/server/actions";
import { getOwnerBusiness } from "@/features/businesses/server/queries";
import { responseSettingsForForm } from "@/lib/feedback/response-settings";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SettingsTabs } from "./settings-tabs";

export default async function EditBusinessPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab } = await searchParams;
  const business = await getOwnerBusiness(id);
  const showingResponseSettings = tab === "responses";

  return (
    <div className="space-y-0">
      <SettingsTabs businessId={business.id} activeTab={showingResponseSettings ? "responses" : "configuration"} />

      {showingResponseSettings ? (
        <Card className="rounded-t-none border-slate-200 shadow-[0_10px_28px_rgba(35,52,84,0.05)]">
          <CardHeader className="px-6 pb-5 pt-7 sm:px-10 sm:pt-9">
            <CardTitle className="text-2xl tracking-[-0.05em]">{business.name} response settings</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-6">Control the grounded draft style, rating guidance and customer-selectable options for this location.</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-8 sm:px-10 sm:pb-10"><ResponseSettingsForm businessId={business.id} settings={responseSettingsForForm(business.review_settings, { experienceTags: business.experience_tags, lowRatingSupportMessage: business.low_rating_support_message, contactFields: business.contact_fields })} /></CardContent>
        </Card>
      ) : (
        <Card className="rounded-t-none border-slate-200 shadow-[0_10px_28px_rgba(35,52,84,0.05)]">
          <CardHeader className="px-6 pb-5 pt-7 sm:px-10 sm:pt-9">
            <CardTitle className="text-2xl tracking-[-0.05em]">Review destination configuration</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-6">Manage the location details and validated destination used by your customer review flow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-9 px-6 pb-8 sm:px-10 sm:pb-10">
            <BusinessForm business={business} />
            <section className="border-t border-slate-200 pt-7" aria-labelledby="delete-business-heading">
              <h2 id="delete-business-heading" className="text-base font-extrabold text-slate-900">Delete business</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">This permanently removes campaigns, analytics and feedback for this business.</p>
              <form
                action={async (formData) => {
                  "use server";
                  await deleteBusinessAction(business.id, String(formData.get("confirmation") ?? ""));
                }}
                className="mt-4 flex flex-col gap-4 sm:flex-row"
              >
                <Input name="confirmation" placeholder="DELETE" className="sm:max-w-xs" />
                <FormSubmitButton variant="destructive" loadingLabel="Deleting...">Delete business</FormSubmitButton>
              </form>
            </section>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
