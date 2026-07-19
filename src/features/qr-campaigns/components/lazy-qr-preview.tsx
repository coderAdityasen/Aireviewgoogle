"use client";

import dynamic from "next/dynamic";
import { CardSkeleton } from "@/components/ui/loading-states";
import type { Json } from "@/types/database";

const QrPreview = dynamic(() => import("@/features/qr-campaigns/components/qr-preview").then((module) => module.QrPreview), {
  ssr: false,
  loading: () => <CardSkeleton className="min-h-80" />
});

export function LazyQrPreview(props: { businessId?: string; ownerId?: string; slug: string; campaignToken: string; businessName: string; campaignName?: string; logoUrl?: string | null; brandColor?: string; posterHeadline?: string | null; posterTemplate?: "light" | "dark"; posterSettings?: Json }) {
  return <QrPreview {...props} />;
}
