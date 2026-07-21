import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const variant =
    normalized === "active" || normalized === "resolved" || normalized === "paid"
      ? "success"
      : normalized === "halted" ||
          normalized === "paused" ||
          normalized === "suspended" ||
          normalized === "pending"
        ? "warning"
        : normalized === "failed" || normalized === "cancelled" || normalized === "canceled"
          ? "danger"
          : "default";

  return <Badge variant={variant}>{status.replaceAll("_", " ")}</Badge>;
}
