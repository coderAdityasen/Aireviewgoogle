"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center p-6 text-center">
      <div className="w-full rounded-[1.5rem] border border-border/70 bg-card px-8 py-12 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-2xl" aria-hidden="true">
          ⚠
        </div>
        <h1 className="mt-5 text-2xl font-extrabold tracking-[-0.04em]">Something went wrong</h1>
        <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">
          The request could not be completed. Try again or contact support.
        </p>
        <Button className="mt-6" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
