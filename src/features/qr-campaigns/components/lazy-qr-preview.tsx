"use client";

import dynamic from "next/dynamic";
import { CardSkeleton } from "@/components/ui/loading-states";

const QrPreview = dynamic(() => import("@/features/qr-campaigns/components/qr-preview").then((module) => module.QrPreview), {
  ssr: false,
  loading: () => <CardSkeleton className="min-h-80" />
});

export function LazyQrPreview(props: { slug: string; campaignToken: string; businessName: string; logoUrl?: string | null }) {
  return <QrPreview {...props} />;
}
