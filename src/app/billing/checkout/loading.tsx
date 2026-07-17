import { CardSkeleton } from "@/components/ui/loading-states";

export default function Loading() {
  return <main className="mx-auto max-w-lg px-4 py-12"><CardSkeleton className="min-h-80" /></main>;
}
