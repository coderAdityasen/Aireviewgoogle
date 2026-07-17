"use client";

/* eslint-disable @next/next/no-img-element -- the success QR is a generated data URL. */

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Upload } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";
import { normalizeGoogleReviewUrl } from "@/lib/security/google-url";
import { saveOnboardingProgressAction, completeOnboardingAction } from "@/features/onboarding/server/actions";
import { OnboardingStepper } from "@/components/onboarding/onboarding-stepper";
import { BusinessSearch, type GoogleBusinessResult } from "@/components/onboarding/business-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner, SuccessState } from "@/components/ui/loading-states";
import type { PlanKey } from "@/config/plans";

type Data = {
  name: string;
  category: string;
  description: string;
  services: string;
  phone: string;
  email: string;
  website: string;
  addressLine: string;
  city: string;
  state: string;
  country: string;
  googleReviewUrl: string;
  googlePlaceId: string;
  googleMapsUrl: string;
  latitude: number | null;
  longitude: number | null;
  defaultLanguage: string;
  brandColor: string;
  logoUrl: string;
  posterHeadline: string;
  lowRatingSupportMessage: string;
  experienceTags: string;
  contactFields: string;
  posterTemplate: "light" | "dark";
  campaignName: string;
};

const defaults: Data = {
  name: "",
  category: "",
  description: "",
  services: "",
  phone: "",
  email: "",
  website: "",
  addressLine: "",
  city: "",
  state: "",
  country: "",
  googleReviewUrl: "",
  googlePlaceId: "",
  googleMapsUrl: "",
  latitude: null,
  longitude: null,
  defaultLanguage: "en",
  brandColor: "#2563eb",
  logoUrl: "",
  posterHeadline: "Share what your visit was really like",
  lowRatingSupportMessage: "We welcome honest feedback and will follow up when you choose to share contact details.",
  experienceTags: "Service\nProduct quality\nCommunication",
  contactFields: "name,email",
  posterTemplate: "light",
  campaignName: ""
};

type PublishedBusiness = { businessId: string; slug: string; campaignToken: string };

export function OnboardingWizard({ ownerId, planKey, initial }: { ownerId: string; planKey: PlanKey; initial?: { current_step: number; completed_steps: number[]; draft_data: unknown } | null }) {
  const router = useRouter();
  const initialDraft = typeof initial?.draft_data === "object" && initial.draft_data ? initial.draft_data as Partial<Data> & { headline?: string } : {};
  const [data, setData] = useState<Data>({ ...defaults, ...initialDraft, posterHeadline: initialDraft.posterHeadline ?? initialDraft.headline ?? defaults.posterHeadline });
  const [step, setStep] = useState(Math.min(3, Math.max(1, initial?.current_step ?? 1)));
  const [completed, setCompleted] = useState<number[]>(initial?.completed_steps?.filter((item) => item <= 3) ?? []);
  const [manualEntry, setManualEntry] = useState(Boolean(initialDraft.name && !initialDraft.googlePlaceId));
  const [pending, startTransition] = useTransition();
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [published, setPublished] = useState<PublishedBusiness | null>(null);

  const selectedPlace = useMemo<GoogleBusinessResult | null>(() => data.googlePlaceId ? {
    placeId: data.googlePlaceId,
    name: data.name,
    address: data.addressLine,
    category: data.category,
    latitude: data.latitude,
    longitude: data.longitude,
    mapsUrl: data.googleMapsUrl || null,
    phone: data.phone,
    website: data.website,
    reviewUrl: data.googleReviewUrl
  } : null, [data]);

  const update = <Key extends keyof Data>(key: Key, value: Data[Key]) => setData((current) => ({ ...current, [key]: value }));

  function persist(nextStep: number, nextCompleted: number[] = completed, snapshot = data) {
    startTransition(async () => {
      try {
        await saveOnboardingProgressAction({ currentStep: nextStep, completedSteps: nextCompleted, draftData: snapshot });
        setStep(nextStep);
        setCompleted(nextCompleted);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to save your progress.");
      }
    });
  }

  function next() {
    if (step === 1 && (!data.name.trim() || !data.category.trim())) {
      toast.error("Add your business name and category to continue.");
      return;
    }
    if (step === 2) {
      try {
        const normalizedGoogleReviewUrl = normalizeGoogleReviewUrl(data.googleReviewUrl);
        update("googleReviewUrl", normalizedGoogleReviewUrl);
        const nextCompleted = [...new Set([...completed, step])];
        persist(Math.min(3, step + 1), nextCompleted, { ...data, googleReviewUrl: normalizedGoogleReviewUrl });
        return;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Add a valid Google review link.");
        return;
      }
    }
    const nextCompleted = [...new Set([...completed, step])];
    persist(Math.min(3, step + 1), nextCompleted);
  }

  function back() {
    persist(Math.max(1, step - 1));
  }

  function selectPlace(place: GoogleBusinessResult) {
    setData((current) => ({
      ...current,
      name: place.name,
      category: place.category || current.category,
      addressLine: place.address || current.addressLine,
      phone: place.phone || current.phone,
      website: place.website || current.website,
      googleReviewUrl: place.reviewUrl,
      googlePlaceId: place.placeId,
      googleMapsUrl: place.mapsUrl || "",
      latitude: place.latitude,
      longitude: place.longitude
    }));
    setManualEntry(false);
    toast.success("Business connected.");
  }

  function clearPlace() {
    setData((current) => ({ ...current, googlePlaceId: "", googleMapsUrl: "", latitude: null, longitude: null, googleReviewUrl: "" }));
    setManualEntry(true);
  }

  function testGoogleLink() {
    try {
      const url = normalizeGoogleReviewUrl(data.googleReviewUrl);
      window.open(url, "_blank", "noopener,noreferrer");
      toast.success("Google review page opened in a new tab.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Add a valid Google review link first.");
    }
  }

  async function uploadLogo(file: File) {
    if (!file.type.startsWith("image/") || file.size > 2_000_000) {
      toast.error("Choose a PNG, JPEG, WebP or SVG image smaller than 2 MB.");
      return;
    }
    setUploadingLogo(true);
    try {
      const supabase = createClient();
      const path = `${ownerId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
      const { error } = await supabase.storage.from("business-logos").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data: url } = supabase.storage.from("business-logos").getPublicUrl(path);
      update("logoUrl", url.publicUrl);
      toast.success("Logo uploaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Logo upload failed.");
    } finally {
      setUploadingLogo(false);
    }
  }

  function publish() {
    startTransition(async () => {
      try {
        const result = await completeOnboardingAction(data);
        setPublished(result);
        setCompleted([1, 2, 3]);
        toast.success("Campaign created.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "We could not create the campaign.");
      }
    });
  }

  if (published) return <OnboardingSuccess data={data} published={published} onDashboard={() => router.replace("/dashboard")} />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <OnboardingStepper currentStep={step} completedSteps={completed} />
      <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-sm font-medium text-primary">Step {step} of 3</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">{step === 1 ? "Find your business on Google" : step === 2 ? "Confirm your campaign" : "Test and launch"}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{step === 1 ? "Search for your business to automatically configure your review campaign." : step === 2 ? "Review the destination customers will open and adjust the essentials. You can customize the poster later." : "Make sure the customer path feels right, then publish your first campaign."}</p></div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium capitalize">{planKey} plan</span>
        </div>

        {step === 1 ? (
          <div className="mt-8 space-y-6">
            <BusinessSearch query={data.name} selected={selectedPlace} onQueryChange={(value) => { update("name", value); if (selectedPlace) clearPlace(); }} onSelect={selectPlace} onClear={clearPlace} />
            <button type="button" className="text-sm font-medium text-primary underline underline-offset-4" onClick={() => setManualEntry((current) => !current)}>{manualEntry ? "Use Google search instead" : "Can’t find your business? Enter it manually"}</button>
            {manualEntry ? <div className="grid gap-4 rounded-2xl border bg-muted/40 p-4 sm:grid-cols-2"><Field label="Business name" value={data.name} onChange={(value) => update("name", value)} required autoFocus /><Field label="Category" value={data.category} onChange={(value) => update("category", value)} required /><Field className="sm:col-span-2" label="Address" value={data.addressLine} onChange={(value) => update("addressLine", value)} /><Field label="City" value={data.city} onChange={(value) => update("city", value)} /><Field label="State" value={data.state} onChange={(value) => update("state", value)} /><Field label="Country" value={data.country} onChange={(value) => update("country", value)} /><Field label="Phone" value={data.phone} onChange={(value) => update("phone", value)} /><Field label="Website" value={data.website} onChange={(value) => update("website", value)} type="url" /></div> : null}
            <details className="rounded-2xl border p-4"><summary className="cursor-pointer text-sm font-medium">Add optional business details</summary><div className="mt-4 grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Label htmlFor="description">Description</Label><Textarea id="description" value={data.description} onChange={(event) => update("description", event.target.value)} className="mt-2" placeholder="A short description customers can understand" /></div><div className="sm:col-span-2"><Label htmlFor="services">Products or services</Label><Textarea id="services" value={data.services} onChange={(event) => update("services", event.target.value)} className="mt-2" placeholder="One per line" /></div><Field label="Business email" value={data.email} onChange={(value) => update("email", value)} type="email" /></div></details>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mt-8 space-y-6">
            <div className="rounded-2xl bg-muted/50 p-4"><p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Connected business</p><div className="mt-2 flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">{data.name}</p><p className="text-sm text-muted-foreground">{data.addressLine || "Manual entry"}</p></div><button type="button" onClick={() => { setStep(1); setManualEntry(false); }} className="text-sm font-medium text-primary underline underline-offset-4">Change business</button></div></div>
            <div><Label htmlFor="googleReviewUrl">Official Google review destination</Label><Input id="googleReviewUrl" type="url" value={data.googleReviewUrl} onChange={(event) => update("googleReviewUrl", event.target.value)} placeholder="https://g.page/.../review" className="mt-2" aria-describedby="google-link-help" /><p id="google-link-help" className="mt-2 text-xs leading-5 text-muted-foreground">Use Google Business Profile → Ask for reviews → Copy link. ReviewFlow only opens this official destination; it never submits a review for a customer.</p><div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={testGoogleLink}>Test link</Button><Button type="button" variant="ghost" onClick={() => window.open("https://support.google.com/business/answer/7035772", "_blank", "noopener,noreferrer")}>How to find it <ExternalLink className="h-4 w-4" /></Button></div></div>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Campaign name" value={data.campaignName} onChange={(value) => update("campaignName", value)} placeholder={`${data.name || "Business"} QR`} /><Field label="Default language" value={data.defaultLanguage} onChange={(value) => update("defaultLanguage", value)} placeholder="en" /></div>
            <details className="rounded-2xl border p-4"><summary className="cursor-pointer text-sm font-medium">Customize the experience now <span className="font-normal text-muted-foreground">(optional)</span></summary><div className="mt-4 grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Label htmlFor="tags">Customer-selectable experience tags</Label><Textarea id="tags" value={data.experienceTags} onChange={(event) => update("experienceTags", event.target.value)} className="mt-2" placeholder="One per line" /></div><div className="sm:col-span-2"><Label htmlFor="lowRatingMessage">Low-rating support message</Label><Textarea id="lowRatingMessage" value={data.lowRatingSupportMessage} onChange={(event) => update("lowRatingSupportMessage", event.target.value)} className="mt-2" /></div><Field label="Contact fields" value={data.contactFields} onChange={(value) => update("contactFields", value)} placeholder="name,email" /><Field label="Brand colour" value={data.brandColor} onChange={(value) => update("brandColor", value)} type="color" /><div><Label htmlFor="logo">Logo</Label><div className="mt-2 flex items-center gap-2"><Input id="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" disabled={uploadingLogo} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadLogo(file); }} />{uploadingLogo ? <LoadingSpinner label="Uploading logo" /> : <Upload className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}</div></div><Field className="sm:col-span-2" label="Poster headline" value={data.posterHeadline} onChange={(value) => update("posterHeadline", value)} /></div></details>
          </div>
        ) : null}

        {step === 3 ? <div className="mt-8 space-y-5"><div className="grid gap-3 sm:grid-cols-3"><CheckItem label="Paid access confirmed" /><CheckItem label="Google destination ready" /><CheckItem label="Customer flow stays manual" /></div><div className="rounded-2xl border bg-muted/40 p-5"><p className="font-medium">Ready to launch {data.name || "your campaign"}?</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Publishing creates one active QR campaign. You can add more campaigns, change the poster, and update the experience from the dashboard.</p></div></div> : null}

        <div className="mt-8 flex flex-wrap justify-between gap-3 border-t pt-5">{step > 1 ? <Button type="button" variant="outline" onClick={back} disabled={pending}>Back</Button> : <span />}{step < 3 ? <Button type="button" onClick={next} disabled={pending} loading={pending} loadingLabel="Saving…">Continue</Button> : <Button type="button" onClick={publish} disabled={pending} loading={pending} loadingLabel="Creating campaign…">Publish campaign</Button>}</div>
      </section>
    </div>
  );
}

function OnboardingSuccess({ data, published, onDashboard }: { data: Data; published: PublishedBusiness; onDashboard: () => void }) {
  const [qr, setQr] = useState("");
  const reviewPath = `/r/${published.slug}?campaign=${published.campaignToken}`;
  const reviewUrl = typeof window === "undefined" ? reviewPath : new URL(reviewPath, window.location.origin).toString();

  useEffect(() => {
    void QRCode.toDataURL(reviewUrl, { width: 420, margin: 2, errorCorrectionLevel: "H", color: { dark: data.brandColor, light: "#ffffff" } }).then(setQr);
  }, [data.brandColor, reviewUrl]);

  function downloadQr() {
    if (!qr) return;
    const link = document.createElement("a");
    link.href = qr;
    link.download = `${data.name || "reviewflow"}-qr.png`;
    link.click();
    toast.success("QR code downloaded.");
  }

  return <div className="mx-auto max-w-3xl"><SuccessState title="Your campaign is live" description="The customer flow is ready. Customers will choose what to write and open Google manually."><div className="grid gap-6 md:grid-cols-[220px_1fr] md:items-center"><div className="rounded-2xl bg-white p-3 shadow-sm">{qr ? <img src={qr} alt={`${data.name} QR code`} className="h-full w-full" /> : <div className="grid aspect-square place-items-center"><LoadingSpinner label="Generating QR" /></div>}</div><div><p className="font-semibold">{data.name}</p><p className="mt-2 break-all text-xs text-emerald-950/70">{reviewUrl}</p><div className="mt-5 flex flex-wrap gap-2"><Button type="button" onClick={downloadQr} disabled={!qr}>Download QR</Button><Button type="button" variant="outline" onClick={() => window.open(reviewUrl, "_blank", "noopener,noreferrer")}>Test customer flow</Button><Button type="button" variant="outline" onClick={onDashboard}>Go to dashboard</Button></div></div></div></SuccessState></div>;
}

function CheckItem({ label }: { label: string }) { return <div className="flex items-center gap-2 rounded-xl border bg-card p-3 text-sm"><Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />{label}</div>; }

function Field({ label, value, onChange, type = "text", required, className, placeholder, autoFocus }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; className?: string; placeholder?: string; autoFocus?: boolean }) { return <div className={className}><Label htmlFor={`onboarding-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>{label}{required ? " *" : ""}</Label><Input id={`onboarding-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} type={type} required={required} autoFocus={autoFocus} className="mt-2" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></div>; }
