import Image from "next/image";
import { PublicFeedbackForm } from "@/features/feedback/components/public-feedback-form";
import { getPublicBusiness } from "@/features/feedback/server/public";

export default async function PublicReviewPage({
  params,
  searchParams
}: {
  params: Promise<{ businessSlug: string }>;
  searchParams: Promise<{ campaign?: string }>;
}) {
  const { businessSlug } = await params;
  const { campaign } = await searchParams;
  const { business, unavailableCampaign } = await getPublicBusiness(businessSlug, campaign);

  if (!business || unavailableCampaign) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center p-6 text-center">
        <h1 className="text-2xl font-semibold">Feedback page unavailable</h1>
        <p className="mt-3 text-muted-foreground">This business or QR campaign is currently not accepting feedback.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8" style={{ "--color-primary": business.brand_color } as React.CSSProperties}>
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 rounded-md border bg-card p-5 text-center">
          {business.logo_url ? (
            <Image src={business.logo_url} width={72} height={72} alt={`${business.name} logo`} className="mx-auto rounded-md object-contain" />
          ) : null}
          <h1 className="mt-3 text-2xl font-semibold">{business.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{business.category}</p>
          {business.description ? <p className="mt-3 text-sm text-muted-foreground">{business.description}</p> : null}
        </header>
        <PublicFeedbackForm business={business} campaignToken={campaign} experienceTags={Array.isArray(business.experience_tags) ? business.experience_tags.filter((field): field is string => typeof field === "string") : []} contactFields={Array.isArray(business.contact_fields) ? business.contact_fields.filter((field): field is string => typeof field === "string") : []} lowRatingSupportMessage={business.low_rating_support_message} />
      </div>
    </main>
  );
}
