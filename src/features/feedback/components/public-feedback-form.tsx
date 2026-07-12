"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { Business } from "@/types/database";

export function PublicFeedbackForm({
  business,
  campaignToken
}: {
  business: Pick<Business, "name" | "slug" | "brand_color" | "default_language">;
  campaignToken?: string | null;
}) {
  const [visitorSessionId, setVisitorSessionId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [experience, setExperience] = useState("its one of the besty website");
  const [drafts, setDrafts] = useState<string[]>([]);
  const [feedbackId, setFeedbackId] = useState("");
  const [selectedDraft, setSelectedDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const canGenerate = useMemo(() => {
    return confirmed && rating !== null && experience.trim().length >= 15;
  }, [confirmed, experience, rating]);

  useEffect(() => {
    fetch("/api/events/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessSlug: business.slug, campaignToken })
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((json) => setVisitorSessionId(json?.visitorSessionId ?? null))
      .catch(() => undefined);
  }, [business.slug, campaignToken]);

 useEffect(()=>{
  if(rating == null) return;

  const selectedRating = rating;
   const generateDrafts = ()=>{
    const run = async () => {
      setCopied(false);
      setSelectedDraft("");
      setDrafts([]);
      setGenerating(true);

      try {
        const response = await fetch("/api/ai/review-draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessSlug: business.slug,
            campaignToken,
            visitorSessionId,
            rating: selectedRating,
            consentConfirmed: true,
            genuineInteractionConfirmed: true,
            answers: {},
            originalNotes: experience,
            preferredLanguage: business.default_language ?? "en",
            reviewLength: "standard"
          })
        });
        const json = await response.json();
        if (!response.ok) {
          toast.error(json.error ?? "Unable to generate safe review options.");
          return;
        }

        const generatedDrafts = Array.isArray(json.drafts) ? json.drafts : json.draft ? [json.draft] : [];
        setDrafts(generatedDrafts);
        setFeedbackId(json.feedbackId);
      } finally {
        setGenerating(false);
      }
    };

    void run();
  }

  generateDrafts();
 },[rating])

  async function copyReview(draft: string) {
    await navigator.clipboard.writeText(draft);
    await fetch("/api/events/copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedbackId, finalEditedText: draft })
    });
    setSelectedDraft(draft);
    setCopied(true);
    toast.success("Review text copied.");
  }

  async function continueToGoogle() {
    const response = await fetch("/api/events/redirect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedbackId })
    });
    const json = await response.json();
    if (!response.ok) {
      toast.error(json.error ?? "Unable to open Google Reviews.");
      return;
    }
    window.open(json.url, "_blank", "noopener,noreferrer");
    window.location.href = `/r/${business.slug}/success`;
  }

  async function submitPrivate() {
    if (!feedbackId || !selectedDraft) {
      toast.error("Choose a generated review option first.");
      return;
    }
    const response = await fetch("/api/feedback/private", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedbackId, finalEditedText: selectedDraft })
    });
    toast[response.ok ? "success" : "error"](response.ok ? "Private feedback submitted." : "Unable to submit private feedback.");
  }

  return (
    <div className="space-y-5">
      <section className="rounded-md border bg-card p-4">
        <Label>Rate your experience</Label>
        <div className="mt-3 flex gap-2" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-label={`${value} ${value === 1 ? "star" : "stars"}`}
              aria-checked={rating === value}
              className="rounded-md border p-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setRating(value)}
              style={rating !== null && value <= rating ? { color: business.brand_color } : undefined}
            >
              <Star className={rating !== null && value <= rating ? "h-7 w-7 fill-current" : "h-7 w-7"} />
            </button>
          ))}
        </div>
      </section>

      {rating !== null ? (
      <section className="space-y-4 rounded-md border bg-card p-4">
        <h2 className="text-base font-semibold">AI generated review</h2>
        {/* <div>
          <Label htmlFor="experience">Your experience details</Label>
          <Textarea
            id="experience"
            className="mt-2 min-h-32"
            value={experience}
            onChange={(event) => setExperience(event.target.value)}
            placeholder="Write a few words about your real experience. Only include what actually happened."
          />
          <p className="mt-2 text-xs text-muted-foreground">
            ReviewFlow rewrites only your own input. It cannot verify or submit a Google review for you.
          </p>
        </div> */}

        {/* <label className="flex gap-3 text-sm">
          <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
          I confirm this is my genuine experience and consent to processing it into review options.
        </label> */}

        {/* <Button type="button" disabled={!canGenerate || pending} onClick={generateDrafts}>
          {pending ? "Generating" : "Generate review options"}
        </Button> */}

        {generating ? (
          <div className="space-y-3" aria-label="Generating review options">
            <div className="space-y-2">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
            <div className="grid gap-3">
              {[1, 2, 3].map((option) => (
                <div key={option} className="rounded-md border bg-background p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-4" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-11/12" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : drafts.length ? (
          <div className="space-y-3">
            <div>
              <h2 className="text-base font-semibold">Choose a review to copy</h2>
              <p className="text-sm text-muted-foreground">Tap an option to copy it before opening Google Reviews.</p>
            </div>

            <div className="grid gap-3">
              {drafts.map((draft, index) => {
                const selected = selectedDraft === draft;
                return (
                  <button
                    key={`${draft}-${index}`}
                    type="button"
                    aria-label={`Copy review option ${index + 1}`}
                    className="rounded-md border bg-background p-4 text-left text-sm leading-6 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => copyReview(draft)}
                  >
                    <span className="mb-2 flex items-center justify-between gap-3 text-xs font-medium uppercase text-muted-foreground">
                      Option {index + 1}
                      {selected ? <span className="text-green-700">Copied</span> : <Copy className="h-4 w-4" />}
                    </span>
                    {draft}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2">
              {/* <Button type="button" variant="outline" disabled={!copied} onClick={submitPrivate}>
                Submit privately
              </Button> */}
              <Button type="button" variant="secondary" disabled={!copied} onClick={continueToGoogle}>
                <ExternalLink className="h-4 w-4" />
                submit the review
              </Button>
            </div>

            {copied ? (
              <p className="rounded-md bg-muted p-3 text-sm">
                Your review text has been copied. Google will open in a new tab. Paste the text, select your rating and
                submit it directly on Google.
              </p>
            ) : null}
          </div>
        ) : null}
      </section>
      ) : null}
    </div>
  );
}
