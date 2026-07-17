import * as React from "react";
import { cn } from "@/lib/utils";

export function LoadingSpinner({ className, label = "Loading" }: { className?: string; label?: string }) {
  return (
    <span className={cn("inline-flex items-center justify-center", className)} role="status" aria-label={label}>
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function ButtonSpinner({ label = "Loading" }: { label?: string }) {
  return <LoadingSpinner label={label} className="shrink-0" />;
}

export function LoadingButton({
  children,
  loading,
  loadingLabel = "Working…",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; loadingLabel?: string }) {
  return (
    <button
      {...props}
      className={cn("min-w-[9rem]", className)}
      disabled={loading || props.disabled}
      aria-busy={loading || undefined}
    >
      {loading ? <ButtonSpinner label={loadingLabel} /> : null}
      <span>{loading ? loadingLabel : children}</span>
    </button>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border bg-card p-5", className)} aria-hidden="true">
      <div className="h-4 w-28 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      <div className="mt-4 h-7 w-40 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-muted motion-reduce:animate-none" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading dashboard" aria-busy="true">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <CardSkeleton key={index} />)}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <CardSkeleton className="min-h-80" />
        <CardSkeleton className="min-h-80" />
      </div>
      <CardSkeleton className="min-h-48" />
    </div>
  );
}

export function OnboardingSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6" aria-label="Loading onboarding" aria-busy="true">
      <div className="h-5 w-32 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      <div className="h-10 w-72 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      <div className="rounded-3xl border bg-card p-6 sm:p-8">
        <div className="h-5 w-28 animate-pulse rounded bg-muted motion-reduce:animate-none" />
        <div className="mt-4 h-9 w-2/3 animate-pulse rounded bg-muted motion-reduce:animate-none" />
        <div className="mt-8 h-12 w-full animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
        <div className="mt-8 flex justify-end">
          <div className="h-10 w-36 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return <DashboardSkeleton />;
}

export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
      <p>{message}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="mt-3 font-medium underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700">
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function SuccessState({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950" role="status">
      <p className="font-semibold">{title}</p>
      {description ? <p className="mt-1 text-sm text-emerald-900/75">{description}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
