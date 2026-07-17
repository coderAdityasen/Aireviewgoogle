import { CardSkeleton } from "@/components/ui/loading-states";

export default function Loading() {
  return <main className="mx-auto max-w-2xl space-y-5 px-4 py-8"><CardSkeleton className="min-h-36" /><CardSkeleton className="min-h-96" /></main>;
}
