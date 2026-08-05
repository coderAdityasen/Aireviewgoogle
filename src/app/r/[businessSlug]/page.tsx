import Image from "next/image";
import { PublicFeedbackForm } from "@/features/feedback/components/public-feedback-form";
import { getPublicBusiness } from "@/features/feedback/server/public";
import { normalizeRatingTags } from "@/lib/feedback/rating-tags";
import { parseReviewResponseSettings } from "@/lib/feedback/response-settings";
import { isSafeStoredGoogleUrl, normalizeGoogleReviewUrl } from "@/lib/security/google-url";

export default async function PublicReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessSlug: string }>;
  searchParams: Promise<{ campaign?: string }>;
}) {
  const { businessSlug } = await params;
  const { campaign } = await searchParams;
  const { business, unavailableCampaign } = await getPublicBusiness(
    businessSlug,
    campaign,
  );

  if (!business || unavailableCampaign) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center p-6 text-center">
        <div className="rounded-[1.5rem] border border-border/70 bg-card px-8 py-12 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-2xl" aria-hidden="true">
            🔒
          </div>
          <h1 className="mt-5 text-2xl font-extrabold tracking-[-0.04em]">
            Feedback page unavailable
          </h1>
          <p className="mt-3 text-sm font-medium leading-6 text-muted-foreground">
            This business or QR campaign is currently not accepting feedback.
          </p>
        </div>
      </main>
    );
  }

  const responseSettings = parseReviewResponseSettings(business.review_settings);
  // Pre-normalize so the client can open Google without waiting on a redirect API.
  const googleReviewUrl = isSafeStoredGoogleUrl(business.google_review_url)
    ? normalizeGoogleReviewUrl(business.google_review_url)
    : null;

  return (
    <main
      className="min-h-screen bg-[#eef3fb] px-4 py-6 sm:py-10"
      style={{ "--color-primary": business.brand_color } as React.CSSProperties}
    >
      <div className="mx-auto max-w-[520px] animate-fade-up">
        <div className="mb-4 flex items-center justify-center">
          <span className="rounded-full border border-blue-300/70 bg-white/90 px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#2463f3] shadow-sm">
            Live customer flow
          </span>
        </div>
        <header className="rounded-t-[2rem] border-x-8 border-t-8 border-[#15233e] bg-gradient-to-b from-white to-[#f8fafc] px-6 py-7 text-center">
          {business.logo_url ? (
            <Image
              src={business.logo_url}
              width={72}
              height={72}
              alt={`${business.name} logo`}
              className="mx-auto rounded-xl object-contain shadow-sm ring-1 ring-black/5"
              priority
            />
          ) : (
            <div
              className="mx-auto grid h-14 w-14 place-items-center rounded-xl text-lg font-extrabold text-white shadow-md"
              style={{ backgroundColor: business.brand_color || "#2463f3" }}
              aria-hidden="true"
            >
              {business.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <h1 className="mt-4 text-2xl font-extrabold tracking-[-0.05em] text-[#101b32]">
            {business.name}
          </h1>
          {business.category ? (
            <p className="mt-1 text-sm font-semibold text-[#6c7c95]">
              {business.category}
            </p>
          ) : null}
        </header>
        <PublicFeedbackForm
          business={business}
          campaignToken={campaign}
          googleReviewUrl={googleReviewUrl}
          experienceTags={normalizeRatingTags(business.experience_tags)}
          defaultTone={responseSettings.tone}
          defaultReviewLength={responseSettings.reviewLength}
        />
      </div>
    </main>
  );
}
