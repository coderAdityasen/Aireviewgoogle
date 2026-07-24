import { ResponseSettingsForm } from "@/features/businesses/components/response-settings-form";
import { BusinessForm } from "@/features/businesses/components/business-form";
import { deleteBusinessAction } from "@/features/businesses/server/actions";
import { getOwnerBusiness } from "@/features/businesses/server/queries";
import { responseSettingsForForm } from "@/lib/feedback/response-settings";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { SettingsTabs } from "./settings-tabs";

export default async function EditBusinessPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const business = await getOwnerBusiness(id);
  const showingResponseSettings = tab === "responses";

  return (
    <div className="w-full space-y-8">
      {/* Page header */}
      <header className="space-y-5">
        <div className="space-y-1.5">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">
            Campaign settings
          </p>
          <h1 className="text-2xl font-extrabold tracking-[-0.05em] text-foreground sm:text-3xl">
            {business.name}
          </h1>
          <p className="max-w-2xl text-sm font-medium leading-6 text-muted-foreground">
            {showingResponseSettings
              ? "Control how customers rate their visit and how AI drafts reviews for this location."
              : "Manage location details and the Google review destination used by your customer flow."}
          </p>
        </div>
        <SettingsTabs
          businessId={business.id}
          activeTab={showingResponseSettings ? "responses" : "configuration"}
        />
      </header>

      {showingResponseSettings ? (
        <ResponseSettingsForm
          businessId={business.id}
          settings={responseSettingsForForm(business.review_settings, {
            experienceTags: business.experience_tags,
            lowRatingSupportMessage: business.low_rating_support_message,
            contactFields: business.contact_fields,
          })}
        />
      ) : (
        <div className="space-y-6">
          <BusinessForm business={business} />

          {/* Danger zone */}
          <section
            aria-labelledby="delete-business-heading"
            className="overflow-hidden rounded-2xl border border-red-200/90 bg-gradient-to-b from-red-50/80 to-white shadow-[0_1px_2px_rgba(220,38,38,0.04),0_8px_24px_rgba(220,38,38,0.04)]"
          >
            <div className="border-b border-red-100 px-5 py-4 sm:px-6">
              <div className="flex items-start gap-3">
                <span
                  className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-red-100 text-red-600"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18" />
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </span>
                <div>
                  <h2
                    id="delete-business-heading"
                    className="text-base font-extrabold tracking-[-0.03em] text-red-950"
                  >
                    Delete business
                  </h2>
                  <p className="mt-1 text-sm font-medium leading-6 text-red-900/70">
                    Permanently removes campaigns, analytics, and feedback for this
                    location. This cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            <div className="px-5 py-5 sm:px-6">
              <p className="text-xs font-semibold text-red-900/60">
                Type <span className="font-extrabold text-red-800">DELETE</span> to
                confirm
              </p>
              <form
                action={async (formData) => {
                  "use server";
                  await deleteBusinessAction(
                    business.id,
                    String(formData.get("confirmation") ?? ""),
                  );
                }}
                className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center"
              >
                <Input
                  name="confirmation"
                  placeholder="DELETE"
                  autoComplete="off"
                  className="border-red-200 bg-white sm:max-w-[14rem] focus-visible:border-red-400 focus-visible:ring-red-200/50"
                  aria-label="Type DELETE to confirm"
                />
                <FormSubmitButton
                  variant="destructive"
                  loadingLabel="Deleting…"
                  className="sm:w-auto"
                >
                  Delete business
                </FormSubmitButton>
              </form>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
