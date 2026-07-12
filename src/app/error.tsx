"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center p-6">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-muted-foreground">The request could not be completed. Try again or contact support.</p>
      <Button className="mt-6 w-fit" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
