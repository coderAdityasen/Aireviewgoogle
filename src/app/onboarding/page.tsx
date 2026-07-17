import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { getOnboardingProgress } from "@/features/onboarding/server/actions";
import { requirePaidOwner } from "@/lib/billing/entitlements";

export default async function OnboardingPage() {
  const { user, entitlements } = await requirePaidOwner();
  const progress = await getOnboardingProgress(user.id);
  return <main className="min-h-screen px-4 py-8 sm:px-8"><div className="mb-8 text-center"><p className="text-sm font-medium text-primary">Workspace setup</p><p className="mt-2 text-sm text-muted-foreground">Your progress is saved after each step so you can return whenever you need.</p></div><OnboardingWizard ownerId={user.id} planKey={entitlements.plan.key} initial={progress} /></main>;
}
