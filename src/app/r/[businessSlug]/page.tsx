import Image from "next/image";
import { PublicFeedbackForm } from "@/features/feedback/components/public-feedback-form";
import { getPublicBusiness } from "@/features/feedback/server/public";
import { normalizeRatingTags } from "@/lib/feedback/rating-tags";

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
    <main className="min-h-screen bg-[#eef3fb] px-4 py-6 sm:py-10" style={{ "--color-primary": business.brand_color } as React.CSSProperties}>
      <div className="mx-auto max-w-[520px]">
        <div className="mb-4 flex items-center justify-center"><span className="rounded-full border border-[#9bc0ff] bg-white px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#2463f3]">Live customer flow</span></div>
        <header className="rounded-t-[2rem] border-x-8 border-t-8 border-[#15233e] bg-[#f8fafc] px-6 py-6 text-center">
          {business.logo_url ? (
            <Image src={business.logo_url} width={72} height={72} alt={`${business.name} logo`} className="mx-auto rounded-md object-contain" />
          ) : null}
          <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.055em] text-[#101b32]">{business.name}</h1>
          <p className="mt-1 text-sm font-semibold text-[#6c7c95]">{business.category}</p>
          </header>
        <PublicFeedbackForm business={business} campaignToken={campaign} experienceTags={normalizeRatingTags(business.experience_tags)} />
      </div>
    </main>
  );
}
