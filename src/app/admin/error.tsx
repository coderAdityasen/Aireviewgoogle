"use client";

import { InlineError } from "@/components/ui/loading-states";

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return <InlineError message="We could not load the admin workspace. Try again." onRetry={reset} />;
}
