import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  createVisitorSessionForRequest,
  getPublicBusiness,
  recordEvents,
} from "@/features/feedback/server/public";

const scanSchema = z.object({
  businessSlug: z.string().min(1),
  campaignToken: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  const parsed = scanSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid scan request." }, { status: 400 });
  }

  const { business, campaign, unavailableCampaign } = await getPublicBusiness(
    parsed.data.businessSlug,
    parsed.data.campaignToken,
  );
  if (!business || unavailableCampaign) {
    return NextResponse.json({ error: "Feedback page unavailable." }, { status: 404 });
  }

  const { session, anonymousId } = await createVisitorSessionForRequest(request, {
    businessId: business.id,
    campaignId: campaign?.id ?? null,
  });

  // One insert for both events — faster first paint path after QR open.
  await recordEvents([
    {
      businessId: business.id,
      campaignId: campaign?.id ?? null,
      visitorSessionId: session.id,
      eventType: "qr_scan",
      metadata: { campaignToken: parsed.data.campaignToken ?? null },
    },
    {
      businessId: business.id,
      campaignId: campaign?.id ?? null,
      visitorSessionId: session.id,
      eventType: "page_view",
    },
  ]);

  const response = NextResponse.json({ visitorSessionId: session.id });
  response.cookies.set("rf_session", anonymousId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 90,
    path: "/",
  });
  return response;
}
