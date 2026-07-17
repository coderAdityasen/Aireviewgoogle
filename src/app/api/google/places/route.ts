import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requirePaidOwner } from "@/lib/billing/entitlements";
import { getGoogleMapsApiKey } from "@/lib/env";

const searchSchema = z.object({
  query: z.string().trim().min(3).max(160),
  sessionToken: z.string().trim().min(8).max(200).optional()
});

type GooglePlaceSearchResponse = {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    primaryType?: string;
    location?: { latitude?: number; longitude?: number };
    googleMapsUri?: string;
    nationalPhoneNumber?: string;
    websiteUri?: string;
  }>;
};

export async function POST(request: NextRequest) {
  await requirePaidOwner();
  const parsed = searchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter at least 3 characters to search." }, { status: 400 });

  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) return NextResponse.json({ configured: false, places: [] });

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.primaryType,places.location,places.googleMapsUri,places.nationalPhoneNumber,places.websiteUri"
    },
    body: JSON.stringify({
      textQuery: parsed.data.query,
      pageSize: 5,
      languageCode: "en",
      ...(parsed.data.sessionToken ? { sessionToken: parsed.data.sessionToken } : {})
    }),
    signal: AbortSignal.timeout(8000)
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("[google-places] search failed", response.status, body.slice(0, 300));
    return NextResponse.json({ error: "Google business search is temporarily unavailable." }, { status: 502 });
  }

  const json = (await response.json()) as GooglePlaceSearchResponse;
  const places = (json.places ?? []).filter((place) => place.id && place.displayName?.text).map((place) => ({
    placeId: place.id!,
    name: place.displayName!.text!,
    address: place.formattedAddress ?? "",
    category: place.primaryType?.replace(/_/g, " ") ?? "",
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,
    mapsUrl: place.googleMapsUri ?? null,
    phone: place.nationalPhoneNumber ?? "",
    website: place.websiteUri ?? "",
    reviewUrl: `https://search.google.com/local/writereview?placeid=${encodeURIComponent(place.id!)}`
  }));

  return NextResponse.json({ configured: true, places }, { headers: { "Cache-Control": "private, max-age=30" } });
}
