import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { getOnboardingProgress } from "@/features/onboarding/server/actions";
import { requirePaidOwner } from "@/lib/billing/entitlements";

export default async function OnboardingPage() {
  const { user, entitlements } = await requirePaidOwner();
  const progress = await getOnboardingProgress(user.id);
  return <main className="min-h-screen bg-[#eef1f6] px-4 py-10 sm:px-8 sm:py-14"><div className="mx-auto mb-9 max-w-5xl text-center"><p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary">ReviewFlow setup</p><h1 className="mt-2 text-3xl font-extrabold tracking-[-0.06em] text-[#111a32] sm:text-4xl">Build your first customer flow</h1><p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-6 text-muted-foreground">Your progress is saved after each step so you can return whenever you need.</p></div><OnboardingWizard ownerId={user.id} planKey={entitlements.plan.key} initial={progress} /></main>;
}
