import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/config/brand";

export default function ReviewSuccessPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center p-6 text-center">
      <div className="w-full animate-fade-up rounded-[1.75rem] border border-border/70 bg-card px-8 py-12 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
          <svg
            viewBox="0 0 24 24"
            className="h-8 w-8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h1 className="mt-6 text-2xl font-extrabold tracking-[-0.04em] sm:text-3xl">
          Google review page opened
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm font-medium leading-6 text-muted-foreground">
          Paste your copied text into Google, select your rating and submit it directly on Google.
          {BRAND.poweredBy}
        </p>
        <ol className="mx-auto mt-8 max-w-xs space-y-3 text-left text-sm font-medium text-muted-foreground">
          {[
            "Paste the draft into the review field",
            "Confirm your star rating on Google",
            "Submit when you are ready",
          ].map((step, index) => (
            <li key={step} className="flex items-start gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-extrabold text-primary">
                {index + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
        <Button asChild variant="outline" className="mt-8">
          <Link href="/">Done</Link>
        </Button>
      </div>
    </main>
  );
}
