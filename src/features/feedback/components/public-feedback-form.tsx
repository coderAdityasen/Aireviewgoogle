"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { CheckCircle2, Copy, ExternalLink, RefreshCw, Send, Sparkles, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Business } from "@/types/database";
import type { RatingTagMap } from "@/lib/feedback/rating-tags";
import { BRAND } from "@/config/brand";

type Tone = "friendly" | "professional" | "warm" | "concise";

// Synchronous copy function that bypasses async Clipboard API permissions
function copyTextSync(text: string): boolean {
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "-9999px";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const success = document.execCommand("copy");
    document.body.removeChild(textArea);
    return success;
  } catch (err) {
    return false;
  }
}

export function PublicFeedbackForm({
  business,
  campaignToken,
  experienceTags = {},
  defaultTone = "friendly",
  defaultReviewLength = "standard",
}: {
  business: Pick<Business, "name" | "slug" | "brand_color" | "default_language">;
  campaignToken?: string | null;
  experienceTags?: RatingTagMap;
  defaultTone?: Tone;
  defaultReviewLength?: "short" | "standard" | "detailed";
}) {
  const [visitorSessionId, setVisitorSessionId] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [tone, setTone] = useState<Tone>(defaultTone);
  const [drafts, setDrafts] = useState<string[]>([]);
  /** Which option from the current AI batch is shown (0-based). */
  const [draftIndex, setDraftIndex] = useState(0);
  const [feedbackId, setFeedbackId] = useState("");
  const [selectedDraft, setSelectedDraft] = useState("");
  
  const [generating, setGenerating] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [copying, setCopying] = useState(false);
  const [openingGoogle, setOpeningGoogle] = useState(false);
  const [submittingPrivate, setSubmittingPrivate] = useState(false);
  const [privateSubmitted, setPrivateSubmitted] = useState(false);
  
  const [regenerationsRemaining, setRegenerationsRemaining] = useState<number | null>(null);
  const [reviewRequestsRemaining, setReviewRequestsRemaining] = useState<number | null>(null);
  
  const generateAbortController = useRef<AbortController | null>(null);
  const streamAbortController = useRef<AbortController | null>(null);
  const busy = generating || streaming;

  const canGenerate = rating !== null;
  const isLowRating = rating !== null && rating <= 3;
  const isGoogleEligible = rating !== null && rating >= 4;
  const canRegenerate = regenerationsRemaining === null || regenerationsRemaining > 0;
  const canRequestReview = reviewRequestsRemaining === null || reviewRequestsRemaining > 0;
  const generated = drafts.length > 0;
  /** More options already in hand — cycle without calling AI. */
  const hasLocalNextOption = generated && draftIndex < drafts.length - 1;
  /**
   * Regenerate is allowed if we can still cycle the batch, or if plan allows
   * another AI regeneration when the batch is exhausted.
   */
  const canUseRegenerate =
    hasLocalNextOption || (canRegenerate && canRequestReview);
  
  const ratingTags = useMemo(() => {
    if (rating === null) return [];
    return experienceTags[rating as keyof RatingTagMap] ?? [];
  }, [rating, experienceTags]);

  const tagOptions = useMemo(() => {
    return [...new Set([...ratingTags, ...selectedTags])];
  }, [ratingTags, selectedTags]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/events/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessSlug: business.slug, campaignToken }),
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((json) => setVisitorSessionId(json?.visitorSessionId ?? null))
      .catch(() => undefined);
    return () => controller.abort();
  }, [business.slug, campaignToken]);

  const resetDraft = useCallback(() => {
    streamAbortController.current?.abort();
    generateAbortController.current?.abort();
    setDrafts([]);
    setDraftIndex(0);
    setSelectedDraft("");
    setFeedbackId("");
    setPrivateSubmitted(false);
    setGenerating(false);
    setStreaming(false);
  }, []);

  /**
   * Stream review text into the textarea character-by-character so regeneration
   * feels like a real AI write, not an instant swap.
   */
  const streamDraftText = useCallback(async (fullText: string) => {
    streamAbortController.current?.abort();
    const controller = new AbortController();
    streamAbortController.current = controller;

    setStreaming(true);
    setSelectedDraft("");

    // Brief "thinking" pause before characters appear.
    await new Promise<void>((resolve) => {
      const t = window.setTimeout(resolve, 450 + Math.floor(Math.random() * 350));
      controller.signal.addEventListener("abort", () => {
        window.clearTimeout(t);
        resolve();
      });
    });
    if (controller.signal.aborted) {
      setStreaming(false);
      return;
    }

    const text = fullText.trim();
    let i = 0;
    // Faster for long drafts so users are not waiting forever.
    const chunkSize = text.length > 280 ? 3 : text.length > 140 ? 2 : 1;
    const stepMs = 14 + Math.floor(Math.random() * 10);

    await new Promise<void>((resolve) => {
      const tick = () => {
        if (controller.signal.aborted) {
          resolve();
          return;
        }
        i = Math.min(text.length, i + chunkSize);
        setSelectedDraft(text.slice(0, i));
        if (i >= text.length) {
          resolve();
          return;
        }
        window.setTimeout(tick, stepMs);
      };
      tick();
    });

    if (!controller.signal.aborted) {
      setSelectedDraft(text);
    }
    setStreaming(false);
  }, []);

  const chooseRating = useCallback((value: number) => {
    setRating(value);
    setSelectedTags([]);
    setCustomTag("");
    resetDraft();
  }, [resetDraft]);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
    );
    resetDraft();
  }, [resetDraft]);

  const addCustomTag = useCallback(() => {
    setCustomTag((prev) => {
      const value = prev.trim().replace(/\s+/g, " ");
      if (!value || value.length > 120) return prev;
      setSelectedTags((current) => (current.includes(value) ? current : [...current, value]));
      return "";
    });
    resetDraft();
  }, [resetDraft]);

  /** Call AI for a fresh batch of review options, then stream option 1 into the field. */
  const generateDraft = useCallback(async (options?: { regenerate?: boolean }) => {
    if (rating === null) return;
    
    generateAbortController.current?.abort();
    streamAbortController.current?.abort();
    const controller = new AbortController();
    generateAbortController.current = controller;

    const isRegenerate = Boolean(options?.regenerate);
    if (isRegenerate && !canRegenerate) {
      toast.error("Regeneration limit reached on this plan.");
      return;
    }
    if (!canRequestReview) {
      toast.error("Review request limit reached on this plan.");
      return;
    }

    // Clear visible draft immediately so it feels like a fresh generation.
    setSelectedDraft("");
    setStreaming(false);
    if (!isRegenerate) {
      setDrafts([]);
      setDraftIndex(0);
      setFeedbackId("");
      setPrivateSubmitted(false);
    }
    setGenerating(true);
    
    try {
      const response = await fetch("/api/ai/review-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessSlug: business.slug,
          campaignToken,
          visitorSessionId,
          rating,
          tone,
          consentConfirmed: true,
          genuineInteractionConfirmed: true,
          answers: { "Experience tags": selectedTags.join(", "), Tone: tone },
          originalNotes: "",
          preferredLanguage: business.default_language ?? "en",
          reviewLength: defaultReviewLength,
          isRegenerate,
        }),
        signal: controller.signal,
      });
      
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Unable to generate a grounded review.");
      
      const nextDrafts = Array.isArray(json.drafts)
        ? json.drafts.filter((draft: unknown): draft is string => typeof draft === "string" && draft.trim().length >= 10)
        : [];
        
      if (!nextDrafts.length) throw new Error("No review draft was returned. Please try again.");
      
      setDrafts(nextDrafts);
      setDraftIndex(0);
      setFeedbackId(json.feedbackId ?? "");
      
      if (typeof json.regenerationsRemaining === "number" || json.regenerationsRemaining === null) {
        setRegenerationsRemaining(json.regenerationsRemaining);
      }
      if (typeof json.reviewRequestsRemaining === "number" || json.reviewRequestsRemaining === null) {
        setReviewRequestsRemaining(json.reviewRequestsRemaining);
      }

      setGenerating(false);
      // Stream the first option so it looks like live generation.
      await streamDraftText(nextDrafts[0]);
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        toast.error(error instanceof Error ? error.message : "The review assistant is temporarily unavailable.");
      }
      setGenerating(false);
      setStreaming(false);
    }
  }, [rating, canRegenerate, canRequestReview, business.slug, business.default_language, campaignToken, visitorSessionId, tone, selectedTags, defaultReviewLength, streamDraftText]);

  /**
   * Regenerate:
   * 1) Next cached draft with delay + stream (no API) until batch ends.
   * 2) Then call AI for a new batch and stream the first result.
   * UI never exposes option numbers.
   */
  const handleRegenerate = useCallback(() => {
    if (busy || openingGoogle || submittingPrivate) return;

    if (hasLocalNextOption) {
      const nextIndex = draftIndex + 1;
      const nextText = drafts[nextIndex];
      setDraftIndex(nextIndex);
      setSelectedDraft("");
      setGenerating(true);
      streamAbortController.current?.abort();
      const thinkController = new AbortController();
      streamAbortController.current = thinkController;
      // Fake thinking delay, then stream — feels like a real regenerate.
      const delay = 500 + Math.floor(Math.random() * 500);
      window.setTimeout(() => {
        if (thinkController.signal.aborted) return;
        setGenerating(false);
        void streamDraftText(nextText);
      }, delay);
      return;
    }

    if (!canRegenerate) {
      toast.error("Regeneration limit reached on this plan.");
      return;
    }
    if (!canRequestReview) {
      toast.error("Review request limit reached on this plan.");
      return;
    }

    void generateDraft({ regenerate: true });
  }, [
    busy,
    openingGoogle,
    submittingPrivate,
    hasLocalNextOption,
    draftIndex,
    drafts,
    canRegenerate,
    canRequestReview,
    generateDraft,
    streamDraftText,
  ]);

  const copyOnly = useCallback(async () => {
    if (selectedDraft.trim().length < 10) return;
    setCopying(true);
    try {
      const copiedToClipboard = copyTextSync(selectedDraft);
      
      fetch("/api/events/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackId, finalEditedText: selectedDraft }),
      }).catch(() => undefined);

      toast.success(copiedToClipboard ? "Answer copied." : "Copy failed, please copy manually.");
    } catch (error) {
      toast.error("Answer could not be copied.");
    } finally {
      setCopying(false);
    }
  }, [selectedDraft, feedbackId]);

  const copyAndContinueToGoogle = useCallback(async () => {
    if (!isGoogleEligible || selectedDraft.trim().length < 10 || !feedbackId) return;
    
    // 1. Show loading state on the current page immediately
    setOpeningGoogle(true);

    try {
      // 2. Execute synchronous copy instantly
      const copiedToClipboard = copyTextSync(selectedDraft);

      // 3. Await analytics record (Execution waits for this)
      await fetch("/api/events/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackId, finalEditedText: selectedDraft }),
      });

      // 4. Await redirect URL (Execution waits for this)
      const response = await fetch("/api/events/redirect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackId }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Unable to open the Google review page.");

      // 5. Redirect the current tab to Google when ALL execution is done
      // We navigate the current tab because browsers block new tabs 
      // opened after asynchronous network requests (popup blocker).
      window.location.href = json.url;

      if (!copiedToClipboard) {
        toast.info("Copy the draft from this page before pasting in Google.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to open the Google review page.");
      setOpeningGoogle(false);
    }
  }, [isGoogleEligible, selectedDraft, feedbackId]);

  const submitPrivateFeedback = useCallback(async () => {
    if (!isLowRating || selectedDraft.trim().length < 10 || !feedbackId) return;
    setSubmittingPrivate(true);
    try {
      const response = await fetch("/api/feedback/private", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackId, finalEditedText: selectedDraft.trim() }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof json.error === "string" ? json.error : "Unable to submit private feedback.");
      
      setPrivateSubmitted(true);
      toast.success("Thank you — your feedback was sent privately.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to submit private feedback.");
    } finally {
      setSubmittingPrivate(false);
    }
  }, [isLowRating, selectedDraft, feedbackId]);

  return (
    <section className="mx-auto max-w-[520px] overflow-hidden rounded-b-[2rem] border-x-8 border-b-8 border-[#15233e] bg-white shadow-[0_22px_70px_rgba(24,44,78,0.12)]">
      <div className="px-5 py-8 sm:px-8 sm:py-10">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold leading-tight tracking-[-0.07em] text-[#101b32]">
            How was your experience?
          </h2>
          <p className="mt-2 text-sm font-medium text-[#6c7c95]">Tap a star to rate your visit.</p>
        </div>
        
        <div className="group mt-7 flex justify-center gap-1.5" role="radiogroup" aria-label="Experience rating">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-label={`${value} ${value === 1 ? "star" : "stars"}`}
              aria-checked={rating === value}
              onClick={() => chooseRating(value)}
              className="cursor-pointer rounded-full p-1 transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5b400] focus-visible:ring-offset-2"
              style={{ color: value <= (rating ?? 0) ? "#f5b400" : "#cbd5e1" }}
            >
              <Star
                className={`h-11 w-11 sm:h-12 sm:w-12 ${value <= (rating ?? 0) ? "fill-current" : ""}`}
                strokeWidth={value <= (rating ?? 0) ? 1.5 : 2}
              />
            </button>
          ))}
        </div>

        {rating !== null ? (
          <div className="mt-8 border-t border-[#e7ecf3] pt-8">
            <div>
              <h3 className="text-xl font-extrabold tracking-[-0.05em] text-[#101b32]">
                {isLowRating ? "What could be better" : "Select what you loved"}{" "}
                <span className="text-[#71819a]">(Optional)</span>
              </h3>
              <p className="mt-1 text-sm font-medium text-[#6c7c95]">
                Choose anything that feels true about your {rating}-star experience.
              </p>
            </div>
            
            <div className="mt-5 flex flex-wrap gap-2">
              {tagOptions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  aria-pressed={selectedTags.includes(tag)}
                  className={`cursor-pointer rounded-full border px-3.5 py-2 text-xs font-extrabold transition ${
                    selectedTags.includes(tag)
                      ? "border-[#f5b400] bg-[#fff6d9] text-[#8a6500]"
                      : "border-[#dce5f0] bg-[#f5f8fc] text-[#51627b] hover:border-[#b9c9dd]"
                  }`}
                >
                  {tag}
                  <span className="ml-1.5 text-[#9aaac0]">
                    {selectedTags.includes(tag) ? "✓" : "+"}
                  </span>
                </button>
              ))}
            </div>
            
            <div className="mt-4 flex gap-2">
              <input
                value={customTag}
                onChange={(event) => setCustomTag(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addCustomTag();
                  }
                }}
                placeholder="Add your own tag"
                maxLength={120}
                className="h-11 min-w-0 flex-1 cursor-text rounded-xl border border-[#dbe4ef] bg-white px-3 text-sm font-medium text-[#20304c] outline-none placeholder:text-[#a2afc1] focus:border-[#9bbcff] focus:ring-2 focus:ring-[#dce8ff]"
              />
              <Button type="button" variant="secondary" onClick={addCustomTag} disabled={!customTag.trim()} className="h-11 shrink-0 px-4">
                Add
              </Button>
            </div>

            <div className="mt-5 rounded-2xl border border-[#dfe7f0] bg-[#f8fafc] p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-extrabold text-[#101b32]">Optional AI settings</h3>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#8a9ab1]">
                  Customer voice
                </span>
              </div>
              <label className="mt-4 block cursor-pointer text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#71819a]">
                Tone
                <select
                  value={tone}
                  onChange={(event) => {
                    setTone(event.target.value as Tone);
                    resetDraft();
                  }}
                  className="mt-2 h-11 w-full cursor-pointer rounded-xl border border-[#dbe4ef] bg-white px-3 text-sm font-bold normal-case tracking-normal text-[#20304c]"
                >
                  <option value="friendly">Friendly</option>
                  <option value="professional">Professional</option>
                  <option value="warm">Warm</option>
                  <option value="concise">Concise</option>
                </select>
              </label>
            </div>

            {privateSubmitted ? (
              <div className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-8 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-xl font-extrabold tracking-[-0.04em] text-[#101b32]">Feedback submitted</h3>
                <p className="mt-2 text-sm font-medium leading-6 text-[#6c7c95]">
                  Thanks for sharing privately. The team at {business.name} will review your message — nothing was posted to Google.
                </p>
              </div>
            ) : (
              <>
                <div className="mt-7">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl font-extrabold tracking-[-0.05em] text-[#101b32]">
                      AI generated draft
                    </h3>
                    {generated && canUseRegenerate ? (
                      <button
                        type="button"
                        onClick={() => handleRegenerate()}
                        disabled={busy || openingGoogle || submittingPrivate}
                        className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-[#b7d0ff] bg-[#eff5ff] px-3 py-1.5 text-xs font-bold text-[#2463f3] transition hover:bg-[#e0ecff] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2463f3]/40"
                        aria-label="Regenerate review draft"
                      >
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`}
                          aria-hidden="true"
                        />
                        {busy ? "Regenerating…" : "Regenerate"}
                      </button>
                    ) : null}
                    {generated && !canUseRegenerate ? (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-400">
                        Regeneration limit reached
                      </span>
                    ) : null}
                  </div>
                  
                  <div className="relative mt-4">
                    <Textarea
                      value={selectedDraft}
                      onChange={(event) => setSelectedDraft(event.target.value)}
                      readOnly={busy}
                      placeholder={
                        busy
                          ? "Writing your review…"
                          : "Your grounded review draft will appear here..."
                      }
                      className="min-h-40 rounded-2xl border-[#dbe4ef] bg-[#fbfcfe] text-sm leading-6 shadow-none placeholder:text-[#c1cad6] focus-visible:ring-2"
                      aria-label="AI generated draft"
                      aria-busy={busy || undefined}
                    />
                    {busy ? (
                      <span
                        className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#2463f3] shadow-sm ring-1 ring-[#dbe8ff]"
                        aria-hidden="true"
                      >
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#2463f3]" />
                        {streaming ? "Writing" : "Thinking"}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs font-medium text-[#8998ad]">
                    {isLowRating
                      ? "This stays private with the business. It will not open Google."
                      : "Generated only from your rating, selected tags and tone."}
                  </p>
                </div>

                <Button
                  type="button"
                  aria-label={
                    !generated
                      ? "Generate review"
                      : isLowRating
                        ? "Submit private feedback"
                        : "Open Google review page after copying"
                  }
                  loading={busy || openingGoogle || submittingPrivate}
                  loadingLabel={
                    busy
                      ? streaming
                        ? "Writing..."
                        : "Generating..."
                      : submittingPrivate
                        ? "Submitting..."
                        : "Opening Google..."
                  }
                  disabled={
                    !canGenerate ||
                    busy ||
                    (!generated && !canRequestReview) ||
                    (generated && (selectedDraft.trim().length < 10 || !feedbackId))
                  }
                  onClick={() => {
                    if (!generated) {
                      void generateDraft({ regenerate: false });
                      return;
                    }
                    if (isLowRating) {
                      submitPrivateFeedback();
                      return;
                    }
                    copyAndContinueToGoogle();
                  }}
                  className="mt-5 h-12 w-full rounded-2xl text-sm font-semibold"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    {!generated ? (
                      <Sparkles className="h-4 w-4 shrink-0" />
                    ) : isLowRating ? (
                      <Send className="h-4 w-4 shrink-0" />
                    ) : (
                      <ExternalLink className="h-4 w-4 shrink-0" />
                    )}
                    <span className="leading-none">
                      {!generated ? "Generate review" : isLowRating ? "Submit" : "Copy & continue on Google Maps"}
                    </span>
                  </span>
                </Button>

                {generated && isGoogleEligible ? (
                  <Button
                    type="button"
                    variant="ghost"
                    loading={copying}
                    loadingLabel="Copying..."
                    disabled={selectedDraft.trim().length < 10 || copying || busy}
                    onClick={() => copyOnly()}
                    className="mt-2 h-11 w-full rounded-xl text-sm font-medium"
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      <Copy className="h-4 w-4 shrink-0" />
                      <span className="leading-none">Copy answer</span>
                    </span>
                  </Button>
                ) : null}

                {generated && isLowRating ? (
                  <p className="mt-3 text-center text-xs font-semibold text-[#8a6500]">
                    Your {rating}-star feedback is sent privately to the business — not to Google.
                  </p>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>
      <footer className="border-t border-[#e7ecf3] bg-[#f8fafc] px-6 py-4 text-center text-[11px] font-semibold text-[#7a8ba3]">
        {BRAND.poweredBy}
      </footer>
    </section>
  );
}