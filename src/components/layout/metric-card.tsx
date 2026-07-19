import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReactNode } from "react";

export function MetricCard({ label, value, hint, icon, iconClassName }: { label: string; value: string | number; hint?: string; icon?: ReactNode; iconClassName?: string }) {
  return (
    <Card className="min-h-44 border-slate-200/80 shadow-[0_8px_20px_rgba(35,52,84,0.08)]">
      <CardHeader className="p-6 pb-0">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-sm font-bold text-slate-600">{label}</CardTitle>
          {icon ? <span className={iconClassName ?? "text-primary"}>{icon}</span> : null}
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-4">
        <div className="text-4xl font-extrabold tracking-[-0.07em] text-slate-950">{value}</div>
        {hint ? <p className="mt-2 text-xs font-medium text-slate-400">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
