import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl p-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="mt-6 h-64 w-full" />
    </main>
  );
}
