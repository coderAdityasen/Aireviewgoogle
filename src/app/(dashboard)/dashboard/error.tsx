"use client";

import { InlineError } from "@/components/ui/loading-states";

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return <InlineError message="We could not load this workspace. Your data is safe; try again." onRetry={reset} />;
}
