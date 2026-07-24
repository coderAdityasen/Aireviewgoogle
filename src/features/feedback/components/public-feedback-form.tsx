"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Copy, ExternalLink, RefreshCw, Send, Sparkles, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Business } from "@/types/database";
import type { RatingTagMap } from "@/lib/feedback/rating-tags";

type Tone = "friendly" | "professional" | "warm" | "concise";

export function PublicFeedbackForm({
  business,
  campaignToken,
  experienceTags = {},
  defaultTone = "friendly",
  defaultReviewLength = "standard",
}: {
  business: Pick<
    Business,
    "name" | "slug" | "brand_color" | "default_language"
  >;
  campaignToken?: string | null;
  experienceTags?: RatingTagMap;
  defaultTone?: Tone;
  defaultReviewLength?: "short" | "standard" | "detailed";
}) {
  const [visitorSessionId, setVisitorSessionId] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [tone, setTone] = useState<Tone>(defaultTone);
  const [drafts, setDrafts] = useState<string[]>([]);
  const [feedbackId, setFeedbackId] = useState("");
  const [selectedDraft, setSelectedDraft] = useState("");
  const [streamingSource, setStreamingSource] = useState("");
  const [displayedDraft, setDisplayedDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copying, setCopying] = useState(false);
  const [openingGoogle, setOpeningGoogle] = useState(false);
  const [submittingPrivate, setSubmittingPrivate] = useState(false);
  const [privateSubmitted, setPrivateSubmitted] = useState(false);
  /** null = unlimited (Growth/Pro). Number = remaining on Starter after last action. */
  const [regenerationsRemaining, setRegenerationsRemaining] = useState<
    number | null
  >(null);
  const [reviewRequestsRemaining, setReviewRequestsRemaining] = useState<
    number | null
  >(null);
  const canGenerate = rating !== null;
  /** 1–3 stars → private feedback only. 4–5 stars → Google review path. */
  const isLowRating = rating !== null && rating <= 3;
  const isGoogleEligible = rating !== null && rating >= 4;
  const canRegenerate =
    regenerationsRemaining === null || regenerationsRemaining > 0;
  const canRequestReview =
    reviewRequestsRemaining === null || reviewRequestsRemaining > 0;
  const ratingTags =
    rating === null ? [] : (experienceTags[rating as keyof RatingTagMap] ?? []);
  const tagOptions = [...new Set([...ratingTags, ...selectedTags])];
  const draftText = streaming ? displayedDraft : selectedDraft;

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

  useEffect(() => {
    if (!streaming || !streamingSource) return;
    let position = 0;
    const timer = window.setInterval(() => {
      position = Math.min(
        streamingSource.length,
        position + Math.max(2, Math.ceil(streamingSource.length / 80)),
      );
      setDisplayedDraft(streamingSource.slice(0, position));
      if (position >= streamingSource.length) {
        window.clearInterval(timer);
        setStreaming(false);
      }
    }, 22);
    return () => window.clearInterval(timer);
  }, [streaming, streamingSource]);

  function resetDraft() {
    setDrafts([]);
    setSelectedDraft("");
    setFeedbackId("");
    setStreaming(false);
    setStreamingSource("");
    setDisplayedDraft("");
    setPrivateSubmitted(false);
    // Keep regenerationsRemaining — it is owner-level, not per draft session.
  }

  function chooseRating(value: number) {
    setRating(value);
    setHoveredRating(null);
    setSelectedTags([]);
    setCustomTag("");
    resetDraft();
  }

  function toggleTag(tag: string) {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag],
    );
    resetDraft();
  }

  function addCustomTag() {
    const value = customTag.trim().replace(/\s+/g, " ");
    if (!value || value.length > 120 || selectedTags.includes(value)) return;
    setSelectedTags((current) => [...current, value]);
    setCustomTag("");
    resetDraft();
  }

  async function generateDraft(options?: { regenerate?: boolean }) {
    if (!canGenerate || rating === null) return;
    const isRegenerate = Boolean(options?.regenerate);
    if (isRegenerate && !canRegenerate) {
      toast.error("Regeneration limit reached on this plan.");
      return;
    }
    if (!isRegenerate && !canRequestReview) {
      toast.error("Review request limit reached on this plan.");
      return;
    }
    resetDraft();
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
      });
      const json = await response.json();
      if (!response.ok)
        throw new Error(json.error ?? "Unable to generate a grounded review.");
      const nextDrafts = Array.isArray(json.drafts)
        ? json.drafts.filter(
            (draft: unknown): draft is string =>
              typeof draft === "string" && draft.trim().length >= 10,
          )
        : [];
      if (!nextDrafts.length)
        throw new Error("No review draft was returned. Please try again.");
      const firstDraft = nextDrafts[0];
      setDrafts(nextDrafts);
      setSelectedDraft(firstDraft);
      setFeedbackId(json.feedbackId ?? "");
      setStreamingSource(firstDraft);
      setDisplayedDraft("");
      setStreaming(true);
      if (typeof json.regenerationsRemaining === "number") {
        setRegenerationsRemaining(json.regenerationsRemaining);
      } else if (json.regenerationsRemaining === null) {
        setRegenerationsRemaining(null);
      }
      if (typeof json.reviewRequestsRemaining === "number") {
        setReviewRequestsRemaining(json.reviewRequestsRemaining);
      } else if (json.reviewRequestsRemaining === null) {
        setReviewRequestsRemaining(null);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The review assistant is temporarily unavailable.",
      );
    } finally {
      setGenerating(false);
    }
  }

  async function recordCopy() {
    let copiedToClipboard = false;
    try {
      if (!navigator.clipboard) throw new Error("Clipboard API unavailable.");
      await navigator.clipboard.writeText(selectedDraft);
      copiedToClipboard = true;
    } catch {
      // Clipboard permissions can be unavailable in some browsers or contexts.
      // The copy event is still recorded and the customer can copy from the
      // editable draft before continuing to Google.
    }

    const response = await fetch("/api/events/copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedbackId, finalEditedText: selectedDraft }),
    });
    if (!response.ok) throw new Error("We could not record that copy action.");
    return copiedToClipboard;
  }

  async function copyOnly() {
    if (selectedDraft.trim().length < 10 || streaming) return;
    setCopying(true);
    try {
      const copiedToClipboard = await recordCopy();
      toast.success(
        copiedToClipboard
          ? "Answer copied."
          : "Answer saved. Copy it from the draft before continuing.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Answer could not be copied.",
      );
    } finally {
      setCopying(false);
    }
  }

  async function copyAndContinueToGoogle() {
    if (
      !isGoogleEligible ||
      selectedDraft.trim().length < 10 ||
      !feedbackId ||
      streaming
    )
      return;
    setOpeningGoogle(true);

    // Reserve the tab while this function is still running directly from the
    // user's click. Opening it after fetch/clipboard awaits is commonly blocked
    // by browser popup protection.
    const googleWindow = window.open("about:blank", "_blank");
    if (googleWindow) googleWindow.opener = null;

    try {
      const copiedToClipboard = await recordCopy();
      const response = await fetch("/api/events/redirect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackId }),
      });
      const json = await response.json();
      if (!response.ok)
        throw new Error(json.error ?? "Unable to open the Google review page.");

      if (googleWindow && !googleWindow.closed) {
        googleWindow.location.assign(json.url);
        window.location.assign(`/r/${business.slug}/success`);
      } else {
        // If the browser blocked the new tab, keep the customer moving in the
        // current tab instead of silently doing nothing.
        window.location.assign(json.url);
      }

      if (!copiedToClipboard) {
        toast.info(
          "Google is opening. Copy the draft from the previous page if needed.",
        );
      }
    } catch (error) {
      googleWindow?.close();
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to open the Google review page.",
      );
      setOpeningGoogle(false);
    }
  }

  async function submitPrivateFeedback() {
    if (
      !isLowRating ||
      selectedDraft.trim().length < 10 ||
      !feedbackId ||
      streaming
    )
      return;
    setSubmittingPrivate(true);
    try {
      const response = await fetch("/api/feedback/private", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedbackId,
          finalEditedText: selectedDraft.trim(),
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          typeof json.error === "string"
            ? json.error
            : "Unable to submit private feedback.",
        );
      setPrivateSubmitted(true);
      toast.success("Thank you — your feedback was sent privately.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to submit private feedback.",
      );
    } finally {
      setSubmittingPrivate(false);
    }
  }

  const generated = drafts.length > 0;

  return (
    <section className="mx-auto max-w-[520px] overflow-hidden rounded-b-[2rem] border-x-8 border-b-8 border-[#15233e] bg-white shadow-[0_22px_70px_rgba(24,44,78,0.12)]">
      <div className="px-5 py-8 sm:px-8 sm:py-10">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold leading-tight tracking-[-0.07em] text-[#101b32]">
            How was your experience?
          </h2>
          <p className="mt-2 text-sm font-medium text-[#6c7c95]">
            Tap a star to rate your visit.
          </p>
        </div>
        <div
          className="mt-7 flex justify-center gap-1.5"
          role="radiogroup"
          aria-label="Experience rating"
        >
          {[1, 2, 3, 4, 5].map((value) => {
            const filled = value <= (hoveredRating ?? rating ?? 0);
            const highlighted = value <= (hoveredRating ?? rating ?? 0);
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-label={`${value} ${value === 1 ? "star" : "stars"}`}
                aria-checked={rating === value}
                onMouseEnter={() => setHoveredRating(value)}
                onMouseLeave={() => setHoveredRating(null)}
                onFocus={() => setHoveredRating(value)}
                onBlur={() => setHoveredRating(null)}
                onClick={() => chooseRating(value)}
                className="rounded-full p-1 transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5b400] focus-visible:ring-offset-2"
                style={{ color: highlighted ? "#f5b400" : "#cbd5e1" }}
              >
                <Star
                  className={`h-11 w-11 sm:h-12 sm:w-12 ${filled ? "fill-current" : ""}`}
                  strokeWidth={highlighted ? 1.5 : 2}
                />
              </button>
            );
          })}
        </div>

        {rating !== null ? (
          <div className="mt-8 border-t border-[#e7ecf3] pt-8">
            <div>
              <h3 className="text-xl font-extrabold tracking-[-0.05em] text-[#101b32]">
                {isLowRating ? "What could be better" : "Select what you loved"}{" "}
                <span className="text-[#71819a]">(Optional)</span>
              </h3>
              <p className="mt-1 text-sm font-medium text-[#6c7c95]">
                Choose anything that feels true about your {rating}-star
                experience.
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {tagOptions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  aria-pressed={selectedTags.includes(tag)}
                  className={`rounded-full border px-3.5 py-2 text-xs font-extrabold transition ${selectedTags.includes(tag) ? "border-[#f5b400] bg-[#fff6d9] text-[#8a6500]" : "border-[#dce5f0] bg-[#f5f8fc] text-[#51627b] hover:border-[#b9c9dd]"}`}
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
                className="h-11 min-w-0 flex-1 rounded-xl border border-[#dbe4ef] bg-white px-3 text-sm font-medium text-[#20304c] outline-none placeholder:text-[#a2afc1] focus:border-[#9bbcff] focus:ring-2 focus:ring-[#dce8ff]"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={addCustomTag}
                disabled={!customTag.trim()}
                className="h-11 shrink-0 px-4"
              >
                Add
              </Button>
            </div>

            <div className="mt-5 rounded-2xl border border-[#dfe7f0] bg-[#f8fafc] p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-extrabold text-[#101b32]">
                  Optional AI settings
                </h3>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#8a9ab1]">
                  Customer voice
                </span>
              </div>
              <label className="mt-4 block text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#71819a]">
                Tone
                <select
                  value={tone}
                  onChange={(event) => {
                    setTone(event.target.value as Tone);
                    resetDraft();
                  }}
                  className="mt-2 h-11 w-full rounded-xl border border-[#dbe4ef] bg-white px-3 text-sm font-bold normal-case tracking-normal text-[#20304c]"
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
                <h3 className="mt-4 text-xl font-extrabold tracking-[-0.04em] text-[#101b32]">
                  Feedback submitted
                </h3>
                <p className="mt-2 text-sm font-medium leading-6 text-[#6c7c95]">
                  Thanks for sharing privately. The team at {business.name} will
                  review your message — nothing was posted to Google.
                </p>
              </div>
            ) : (
              <>
                <div className="mt-7">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl font-extrabold tracking-[-0.05em] text-[#101b32]">
                      AI generated draft
                    </h3>
                    {generated && canRegenerate ? (
                      <button
                        type="button"
                        onClick={() => void generateDraft({ regenerate: true })}
                        disabled={
                          generating ||
                          streaming ||
                          openingGoogle ||
                          submittingPrivate ||
                          !canRequestReview
                        }
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#b7d0ff] bg-[#eff5ff] px-3 py-1.5 text-xs font-bold text-[#2463f3] transition hover:bg-[#e0ecff] disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2463f3]/40"
                        aria-label="Regenerate review draft"
                      >
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`}
                          aria-hidden="true"
                        />
                        {generating ? "Regenerating…" : "Regenerate"}
                        {typeof regenerationsRemaining === "number" ? (
                          <span className="text-[10px] font-semibold opacity-70">
                            ({regenerationsRemaining} left)
                          </span>
                        ) : null}
                      </button>
                    ) : null}
                    {generated && !canRegenerate ? (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-400">
                        Regeneration limit reached
                      </span>
                    ) : null}
                  </div>
                  <Textarea
                    value={draftText}
                    onChange={(event) => setSelectedDraft(event.target.value)}
                    readOnly={generating || streaming}
                    placeholder="Your grounded review draft will appear here..."
                    className="mt-4 min-h-40 rounded-2xl border-[#dbe4ef] bg-[#fbfcfe] text-sm leading-6 shadow-none placeholder:text-[#c1cad6] focus-visible:ring-2"
                    aria-label="AI generated draft"
                  />
                  <p className="mt-2 text-xs font-medium text-[#8998ad]">
                    {isLowRating
                      ? "This stays private with the business. It will not open Google."
                      : "Generated only from your rating, selected tags and tone."}
                  </p>
                </div>

                {/* Before generate: Generate review. After: Submit (1–3) or Google (4–5). */}
                <Button
                  type="button"
                  aria-label={
                    !generated
                      ? "Generate review"
                      : isLowRating
                        ? "Submit private feedback"
                        : "Open Google review page after copying"
                  }
                  loading={generating || openingGoogle || submittingPrivate}
                  loadingLabel={
                    generating
                      ? "Generating..."
                      : submittingPrivate
                        ? "Submitting..."
                        : "Opening Google..."
                  }
                  disabled={
                    !canGenerate ||
                    (!generated && !canRequestReview) ||
                    (generated &&
                      (selectedDraft.trim().length < 10 ||
                        streaming ||
                        !feedbackId))
                  }
                  onClick={() => {
                    if (!generated) {
                      void generateDraft({ regenerate: false });
                      return;
                    }
                    if (isLowRating) {
                      void submitPrivateFeedback();
                      return;
                    }
                    void copyAndContinueToGoogle();
                  }}
                  className="mt-5 h-12 w-full rounded-2xl text-sm font-semibold hover:cursor-pointer"
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
                      {!generated
                        ? "Generate review"
                        : isLowRating
                          ? "Submit"
                          : "Copy & continue on Google Maps"}
                    </span>
                  </span>
                </Button>

                {/* Copy only for 4–5 star Google path */}
                {generated && isGoogleEligible ? (
                  <Button
                    type="button"
                    variant="ghost"
                    loading={copying}
                    loadingLabel="Copying..."
                    disabled={
                      selectedDraft.trim().length < 10 || copying || streaming
                    }
                    onClick={() => void copyOnly()}
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
                    Your {rating}-star feedback is sent privately to the business —
                    not to Google.
                  </p>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>
      <footer className="border-t border-[#e7ecf3] bg-[#f8fafc] px-6 py-4 text-center text-[11px] font-semibold text-[#7a8ba3]">
        Powered by Adsngrow
      </footer>
    </section>
  );
}
