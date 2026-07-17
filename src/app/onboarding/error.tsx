"use client";

import { InlineError } from "@/components/ui/loading-states";

export default function OnboardingError({ reset }: { error: Error; reset: () => void }) {
  return <main className="mx-auto flex min-h-screen max-w-xl items-center p-6"><InlineError message="We could not load your saved onboarding progress. Try again." onRetry={reset} /></main>;
}
