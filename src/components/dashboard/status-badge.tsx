import { Badge } from "@/components/ui/badge";
export function StatusBadge({ status }: { status: string }) { return <Badge className={status === "active" || status === "resolved" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : status === "halted" || status === "paused" || status === "suspended" ? "border-amber-200 bg-amber-50 text-amber-800" : ""}>{status.replaceAll("_", " ")}</Badge>; }
