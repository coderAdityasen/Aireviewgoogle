import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { getOnboardingProgress } from "@/features/onboarding/server/actions";
import { requirePaidOwner } from "@/lib/billing/entitlements";

export default async function OnboardingPage() {
  const { user, entitlements } = await requirePaidOwner();
  const progress = await getOnboardingProgress(user.id);
  return <main className="mx-auto max-w-6xl px-4 py-8"><div className="mb-8"><p className="text-sm font-medium text-primary">Workspace setup</p><h1 className="mt-2 text-3xl font-semibold">Build your first customer review flow</h1><p className="mt-2 max-w-2xl text-muted-foreground">Your progress is saved after each step. You can leave and return whenever you need.</p></div><OnboardingWizard ownerId={user.id} planKey={entitlements.plan.key} initial={progress} /></main>;
}
