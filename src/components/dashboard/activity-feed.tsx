export function ActivityFeed({
  items,
}: {
  items: Array<{ label: string; detail?: string; createdAt: string }>;
}) {
  if (!items.length) {
    return (
      <p className="rounded-xl bg-muted/60 p-4 text-sm font-medium text-muted-foreground">
        No activity yet.
      </p>
    );
  }

  return (
    <div className="space-y-0.5">
      {items.map((item, index) => (
        <div
          key={`${item.createdAt}-${index}`}
          className="relative flex gap-4 rounded-xl px-2 py-3 transition-colors hover:bg-muted/60"
        >
          <span
            className="relative mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary ring-4 ring-primary/10 after:absolute after:left-1/2 after:top-3 after:h-10 after:w-px after:-translate-x-1/2 after:bg-border last:after:hidden"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-sm font-extrabold tracking-[-0.02em]">{item.label}</p>
            <p className="mt-1 truncate text-xs font-medium text-muted-foreground">
              {item.detail ?? new Date(item.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
