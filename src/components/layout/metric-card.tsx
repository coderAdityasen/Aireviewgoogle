import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReactNode } from "react";

export function MetricCard({
  label,
  value,
  hint,
  icon,
  iconClassName,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  iconClassName?: string;
}) {
  return (
    <Card className="group min-h-40 overflow-hidden border-border/80 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_12px_32px_rgba(36,99,243,0.1)]">
      <CardHeader className="p-5 pb-0 sm:p-6 sm:pb-0">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-sm font-bold text-muted-foreground">{label}</CardTitle>
          {icon ? (
            <span
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted/80 transition-colors group-hover:bg-primary/10 ${iconClassName ?? "text-primary"}`}
            >
              {icon}
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="p-5 pt-3 sm:p-6 sm:pt-4">
        <div className="text-3xl font-extrabold tracking-[-0.06em] text-foreground sm:text-4xl">
          {value}
        </div>
        {hint ? (
          <p className="mt-2 text-xs font-medium leading-5 text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
