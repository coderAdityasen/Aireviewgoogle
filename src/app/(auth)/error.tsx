"use client";

import { InlineError } from "@/components/ui/loading-states";

export default function AuthError({ reset }: { error: Error; reset: () => void }) {
  return <main className="mx-auto flex min-h-screen max-w-md items-center p-6"><InlineError message="The authentication page could not be loaded. Try again." onRetry={reset} /></main>;
}
