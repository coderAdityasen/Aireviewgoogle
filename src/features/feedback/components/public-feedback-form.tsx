"use client";

import { useEffect, useState } from "react";
import { Copy, ExternalLink, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { Business } from "@/types/database";

const defaultTags = ["Service", "Product quality", "Communication", "Value", "Atmosphere", "Convenience"];

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  start(): void;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export function PublicFeedbackForm({
  business,
  campaignToken,
  experienceTags = [],
  contactFields = [],
  lowRatingSupportMessage
}: {
  business: Pick<Business, "name" | "slug" | "brand_color" | "default_language">;
  campaignToken?: string | null;
  experienceTags?: string[];
  contactFields?: string[];
  lowRatingSupportMessage?: string | null;
}) {
  const [visitorSessionId, setVisitorSessionId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [experience, setExperience] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [language, setLanguage] = useState(business.default_language ?? "en");
  const [length, setLength] = useState<"short" | "standard" | "detailed">("standard");
  const [drafts, setDrafts] = useState<string[]>([]);
  const [feedbackId, setFeedbackId] = useState("");
  const [selectedDraft, setSelectedDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [listening, setListening] = useState(false);
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [contactConsent, setContactConsent] = useState(false);

  const availableTags = experienceTags.length ? experienceTags : defaultTags;
  const canGenerate = confirmed && rating !== null && experience.trim().length >= 15;
  const isLowRating = rating !== null && rating <= 3;

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

  function toggleTag(tag: string) {
    setSelectedTags((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]));
  }

  async function generateDrafts() {
    if (!canGenerate || rating === null) return;
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
          rating,
          consentConfirmed: true,
          genuineInteractionConfirmed: true,
          answers: { "Experience tags": selectedTags.join(", ") },
          originalNotes: experience,
          preferredLanguage: language,
          reviewLength: length
        })
      });
      const json = await response.json();
      if (!response.ok) {
        toast.error(json.error ?? "Unable to generate grounded review options.");
        return;
      }
      setDrafts(Array.isArray(json.drafts) ? json.drafts : []);
      setFeedbackId(json.feedbackId ?? "");
    } catch {
      toast.error("The review assistant is temporarily unavailable.");
    } finally {
      setGenerating(false);
    }
  }

  function startVoiceInput() {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      toast.info("Voice input is not available in this browser. You can type below.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = language || "en-IN";
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      toast.error("Voice input could not be started.");
    };
    recognition.onresult = (event) => setExperience((current) => `${current} ${event.results[0][0].transcript}`.trim());
    recognition.start();
  }

  async function copyReview(draft: string) {
    await navigator.clipboard.writeText(draft);
    const response = await fetch("/api/events/copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedbackId, finalEditedText: draft })
    });
    if (!response.ok) {
      toast.error("We could not record that copy action.");
      return;
    }
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
      toast.error(json.error ?? "Unable to open the Google review page.");
      return;
    }
    window.open(json.url, "_blank", "noopener,noreferrer");
    window.location.href = `/r/${business.slug}/success`;
  }

  async function submitPrivate() {
    if (!feedbackId) {
      toast.error("Generate or write your review before sending private feedback.");
      return;
    }
    if (contactFields.length && !contactConsent) {
      toast.error("Confirm that you want the business to contact you.");
      return;
    }
    const response = await fetch("/api/feedback/private", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        feedbackId,
        finalEditedText: selectedDraft || experience,
        customerName: contact.name || undefined,
        customerEmail: contact.email || undefined,
        customerPhone: contact.phone || undefined
      })
    });
    toast[response.ok ? "success" : "error"](response.ok ? "Private feedback sent to the business." : "Unable to send private feedback.");
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border bg-card p-5">
        <p className="text-sm font-medium text-muted-foreground">Step 1</p>
        <h2 className="mt-1 text-lg font-semibold">Was this a genuine customer experience?</h2>
        <label className="mt-4 flex cursor-pointer gap-3 text-sm">
          <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 h-4 w-4" />
          Yes, I am sharing what actually happened and understand I can edit or write my own review.
        </label>
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <p className="text-sm font-medium text-muted-foreground">Step 2</p>
        <Label>How would you rate the experience?</Label>
        <div className="mt-3 flex gap-2" role="radiogroup" aria-label="Experience rating">
          {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" role="radio" aria-label={`${value} ${value === 1 ? "star" : "stars"}`} aria-checked={rating === value} className="rounded-xl border p-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setRating(value)} style={rating !== null && value <= rating ? { color: business.brand_color } : undefined}><Star className={rating !== null && value <= rating ? "h-7 w-7 fill-current" : "h-7 w-7"} /></button>)}
        </div>
      </section>

      {rating !== null ? <section className="space-y-4 rounded-2xl border bg-card p-5">
        <div><p className="text-sm font-medium text-muted-foreground">Step 3</p><h2 className="mt-1 text-lg font-semibold">Describe your experience in your own words</h2><p className="mt-1 text-sm text-muted-foreground">Only details you provide or select are used. A {rating}-star rating stays a {rating}-star rating.</p></div>
        <div><Label htmlFor="experience">What happened?</Label><div className="mt-2 flex items-start gap-2"><Textarea id="experience" value={experience} onChange={(event) => setExperience(event.target.value)} placeholder="Share what really happened — good, bad or somewhere in between." className="min-h-32" /><Button type="button" variant="outline" size="icon" onClick={startVoiceInput} aria-label="Use voice input">{listening ? "…" : "Mic"}</Button></div><p className="mt-2 text-xs text-muted-foreground">At least 15 characters. Voice input stays in your browser until you submit the form.</p></div>
        <div><Label>What was relevant? (optional)</Label><div className="mt-2 flex flex-wrap gap-2">{availableTags.map((tag) => <button key={tag} type="button" onClick={() => toggleTag(tag)} className={`rounded-full border px-3 py-1.5 text-sm ${selectedTags.includes(tag) ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`}>{tag}</button>)}</div></div>
        <div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="language">Language</Label><select id="language" value={language} onChange={(event) => setLanguage(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-card px-3 text-sm"><option value="en">English</option><option value="hi">Hindi</option><option value="hinglish">Hinglish</option></select></div><div><Label htmlFor="length">Review length</Label><select id="length" value={length} onChange={(event) => setLength(event.target.value as typeof length)} className="mt-2 h-10 w-full rounded-md border bg-card px-3 text-sm"><option value="short">Short</option><option value="standard">Standard</option><option value="detailed">Detailed</option></select></div></div>
        <Button type="button" disabled={!canGenerate || generating} onClick={generateDrafts}>{generating ? "Generating grounded options…" : drafts.length ? "Regenerate options" : "Generate 3 grounded options"}</Button>
      </section> : null}

      {generating ? <section className="rounded-2xl border bg-card p-5" aria-label="Generating review options"><Skeleton className="h-5 w-48" /><div className="mt-4 space-y-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-24 w-full" />)}</div></section> : null}

      {drafts.length ? <section className="space-y-4 rounded-2xl border bg-card p-5">
        <div><p className="text-sm font-medium text-muted-foreground">Step 4</p><h2 className="mt-1 text-lg font-semibold">Choose, edit or write your own</h2><p className="mt-1 text-sm text-muted-foreground">ReviewFlow never posts for you. Copy your words, then decide whether to open Google.</p></div>
        <div className="space-y-3">{drafts.map((draft, index) => <button key={`${draft}-${index}`} type="button" onClick={() => setSelectedDraft(draft)} className={`w-full rounded-xl border p-4 text-left text-sm leading-6 ${selectedDraft === draft ? "border-primary bg-primary/5" : "hover:bg-muted"}`}><span className="mb-2 flex justify-between text-xs font-medium uppercase text-muted-foreground">Option {index + 1}<Copy className="h-4 w-4" /></span>{draft}</button>)}</div>
        <div><Label htmlFor="edit-review">Edit before copying or write your own</Label><Textarea id="edit-review" value={selectedDraft} onChange={(event) => setSelectedDraft(event.target.value)} className="mt-2 min-h-28" placeholder="Select an option or write your own words." /></div>
        {isLowRating && (contactFields.length || lowRatingSupportMessage) ? <div className="rounded-xl bg-muted p-4"><p className="text-sm font-medium">Want the business to follow up privately?</p><p className="mt-1 text-xs text-muted-foreground">{lowRatingSupportMessage ?? "Share contact details only if you want a response. This information is not sent to the AI assistant."}</p>{contactFields.length ? <div className="mt-3 grid gap-3 sm:grid-cols-3">{contactFields.includes("name") ? <ContactInput label="Name" value={contact.name} onChange={(value) => setContact((current) => ({ ...current, name: value }))} /> : null}{contactFields.includes("email") ? <ContactInput label="Email" value={contact.email} onChange={(value) => setContact((current) => ({ ...current, email: value }))} /> : null}{contactFields.includes("phone") ? <ContactInput label="Phone" value={contact.phone} onChange={(value) => setContact((current) => ({ ...current, phone: value }))} /> : null}<label className="flex items-start gap-2 text-xs sm:col-span-3"><input type="checkbox" checked={contactConsent} onChange={(event) => setContactConsent(event.target.checked)} className="mt-0.5 h-4 w-4" />I consent to sharing these contact details with the business for a private follow-up.</label></div> : null}</div> : null}
        <div className="flex flex-wrap gap-2"><Button type="button" disabled={selectedDraft.trim().length < 10} onClick={() => copyReview(selectedDraft)}><Copy className="h-4 w-4" />Copy selected text</Button><Button type="button" variant="outline" disabled={!copied} onClick={continueToGoogle}><ExternalLink className="h-4 w-4" />Open Google review page</Button>{isLowRating ? <Button type="button" variant="ghost" disabled={!feedbackId} onClick={submitPrivate}>Send private feedback too</Button> : null}</div>
        {copied ? <p className="rounded-xl bg-muted p-3 text-sm">Your text is copied. The next page is Google’s official review page; you choose the rating and submit it there.</p> : null}
      </section> : null}
    </div>
  );
}

function ContactInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block text-xs"><span className="text-muted-foreground">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-9 w-full rounded-md border bg-card px-2 text-sm" /></label>; }
