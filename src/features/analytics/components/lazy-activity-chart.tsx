"use client";

import dynamic from "next/dynamic";
import { CardSkeleton } from "@/components/ui/loading-states";

const ActivityChart = dynamic(() => import("@/features/analytics/components/activity-chart").then((module) => module.ActivityChart), {
  ssr: false,
  loading: () => <CardSkeleton className="h-72" />
});

export function LazyActivityChart({ data }: { data: Array<{ day: string; scans: number; redirects: number }> }) {
  return <ActivityChart data={data} />;
}
