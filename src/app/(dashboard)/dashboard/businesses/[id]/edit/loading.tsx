import { CardSkeleton } from "@/components/ui/loading-states";

export default function EditBusinessLoading() {
  return (
    <div className="space-y-0" aria-busy="true" aria-label="Loading campaign settings">
      <div className="flex items-end gap-1 border-b border-slate-200">
        <div className="h-12 w-32 animate-pulse rounded-t-xl bg-slate-200 motion-reduce:animate-none" />
        <div className="h-12 w-28 animate-pulse rounded-t-xl bg-slate-100 motion-reduce:animate-none" />
      </div>
      <CardSkeleton className="min-h-[520px] rounded-t-none" />
    </div>
  );
}
