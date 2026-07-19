import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border bg-muted/70 px-3 py-1 text-xs font-bold text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}
