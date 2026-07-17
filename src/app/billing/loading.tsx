import { CardSkeleton } from "@/components/ui/loading-states";

export default function Loading() {
  return <main className="mx-auto max-w-5xl px-4 py-10"><div className="h-9 w-72 animate-pulse rounded bg-muted motion-reduce:animate-none" /><div className="mt-8 grid gap-5 md:grid-cols-3"><CardSkeleton className="min-h-64 md:col-span-2" /><CardSkeleton className="min-h-64" /></div><CardSkeleton className="mt-5 min-h-40" /></main>;
}
