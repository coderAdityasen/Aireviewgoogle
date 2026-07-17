import { CardSkeleton } from "@/components/ui/loading-states";

export default function Loading() {
  return <main className="grid min-h-screen place-items-center p-6"><CardSkeleton className="w-full max-w-md" /></main>;
}
