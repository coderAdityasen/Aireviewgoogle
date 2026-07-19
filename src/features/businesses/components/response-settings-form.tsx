"use client";

import type { ReactNode } from "react";
import type { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type UseFormRegisterReturn } from "react-hook-form";
import { useTransition } from "react";
import { Check, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateBusinessResponseSettingsAction } from "@/features/businesses/server/actions";
import { reviewResponseSettingsSchema } from "@/lib/validation/review-settings";
import type { ReviewResponseSettings } from "@/lib/validation/review-settings";

const languageOptions = [
  ["en", "English"],
  ["hi", "Hindi"],
  ["es", "Spanish"],
  ["fr", "French"],
  ["de", "German"],
  ["pt", "Portuguese"]
] as const;

const ratingRules = [
  ["ratingRule5", "5-star guidance", "Keep positive wording grounded in the customer's selected details."],
  ["ratingRule4", "4-star guidance", "Keep the tone positive but natural and specific."],
  ["ratingRule3", "3-star guidance", "Preserve balanced or mixed sentiment."],
  ["ratingRule12", "1–2-star guidance", "Keep concerns constructive. Never rewrite a low rating as praise."]
] as const;

const ratingTags = [
  ["ratingTags5", "5-star options", "Friendly service\nClear communication"],
  ["ratingTags4", "4-star options", "Helpful staff\nEasy experience"],
  ["ratingTags3", "3-star options", "What stood out\nWhat could be better"],
  ["ratingTags2", "2-star options", "Communication\nValue for money"],
  ["ratingTags1", "1-star options", "What could be improved\nFollow-up support"]
] as const;

export function ResponseSettingsForm({ businessId, settings }: { businessId: string; settings: ReviewResponseSettings }) {
  const [pending, startTransition] = useTransition();
  const form = useForm<z.input<typeof reviewResponseSettingsSchema>>({
    resolver: zodResolver(reviewResponseSettingsSchema),
    defaultValues: settings
  });
  const watched = useWatch({ control: form.control });
  const allowedLanguages = useWatch({ control: form.control, name: "allowedLanguages" }) ?? [];

  const submit = form.handleSubmit((values) => {
    startTransition(async () => {
      try {
        await updateBusinessResponseSettingsAction(businessId, values);
        toast.success("Response settings saved.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to save response settings.");
      }
    });
  });

  function toggleLanguage(code: string) {
    const current = form.getValues("allowedLanguages") ?? [];
    if (current.includes(code) && current.length === 1) return;
    form.setValue(
      "allowedLanguages",
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
      { shouldDirty: true }
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="hidden rounded-2xl border border-primary/15 bg-primary/[0.035] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-2 text-primary"><Sparkles className="h-5 w-5" /></div>
          <div>
            <p className="text-sm font-extrabold">Customer response experience</p>
            <p className="mt-1 max-w-2xl text-xs font-medium leading-5 text-muted-foreground">These controls shape the optional tags and grounded draft shown after a customer chooses a rating. They do not publish or send reviews on a customer’s behalf.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <SettingsSection title="AI review style" description="Set the default voice used by the review assistant.">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Tone" {...form.register("tone")}>
              <option value="friendly">Friendly</option>
              <option value="professional">Professional</option>
              <option value="warm">Warm</option>
              <option value="concise">Concise</option>
            </SelectField>
            <SelectField label="Review length" {...form.register("reviewLength")}>
              <option value="short">Short</option>
              <option value="standard">Standard</option>
              <option value="detailed">Detailed</option>
            </SelectField>
          </div>
          <SelectField label="Writing perspective" {...form.register("writingPerspective")}>
            <option value="first_person">First person — “I visited…”</option>
            <option value="third_person">Third person — “The customer…”</option>
          </SelectField>
        </SettingsSection>

        <SettingsSection title="Language settings" description="Choose the default language available to the assistant. The customer-facing flow keeps language selection out of the way.">
          <Field label="Default language">
            <Input {...form.register("defaultLanguage")} placeholder="en" />
          </Field>
          <ToggleRow label="Auto-detect customer language" description="Use detected language only when it is clear from the customer input." checked={watched.autoDetectLanguage ?? false} onChange={(value) => form.setValue("autoDetectLanguage", value, { shouldDirty: true })} />
          <div>
            <Label>Allowed languages</Label>
            <div className="mt-3 flex flex-wrap gap-2">
              {languageOptions.map(([code, label]) => {
                const selected = allowedLanguages.includes(code);
                return <button key={code} type="button" aria-pressed={selected} onClick={() => toggleLanguage(code)} className={`rounded-full border px-3 py-2 text-xs font-extrabold transition ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}>{label}</button>;
              })}
            </div>
          </div>
        </SettingsSection>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <SettingsSection title="Rating guidance" description="Give the assistant a sentiment guardrail for each rating. These instructions never override the customer’s selected rating or facts.">
          {ratingRules.map(([name, label, placeholder]) => <Field key={name} label={label}><Textarea {...form.register(name)} placeholder={placeholder} className="min-h-20" /></Field>)}
        </SettingsSection>

        <SettingsSection title="Prompt guidance" description="Add your brand’s writing preferences without adding facts about a customer’s experience.">
          <Field label="Positive-rating instructions"><Textarea {...form.register("positiveInstructions")} placeholder="Keep positive wording clear and specific to the selected tags." className="min-h-28" /></Field>
          <Field label="Lower-rating instructions"><Textarea {...form.register("negativeInstructions")} placeholder="Preserve concerns and avoid forced praise." className="min-h-28" /></Field>
        </SettingsSection>
      </div>

      <SettingsSection title="Customer-selectable tags" description="These are the optional chips shown after the customer selects a rating. Keep them factual and easy to recognize.">
        <div className="grid gap-4 md:grid-cols-2">
          {ratingTags.map(([name, label, placeholder]) => <Field key={name} label={label}><Textarea {...form.register(name)} placeholder={placeholder} className="min-h-24" /></Field>)}
        </div>
        <Field label="Low-rating private follow-up message"><Textarea {...form.register("lowRatingSupportMessage")} placeholder="Tell us what we can improve and our team can follow up privately." /></Field>
        <Field label="Optional contact fields"><Input {...form.register("contactFields")} placeholder="name,email" /><p className="mt-1 text-xs font-medium text-muted-foreground">Comma-separated: name, email, phone. These are only shown when a customer chooses private follow-up.</p></Field>
      </SettingsSection>

      <div className="grid gap-5 xl:grid-cols-2">
        <SettingsSection title="Smart generation rules" description="Keep the assistant predictable and grounded.">
          <ToggleRow label="Mention selected tags" description="Use a chosen tag only when it fits the customer’s draft." checked={watched.mentionSelectedTags ?? false} onChange={(value) => form.setValue("mentionSelectedTags", value, { shouldDirty: true })} />
          <ToggleRow label="Generate distinct options" description="Avoid returning duplicate drafts in one generation." checked={watched.generateUniqueReviews ?? false} onChange={(value) => form.setValue("generateUniqueReviews", value, { shouldDirty: true })} />
          <ToggleRow label="Natural customer voice" description="Prefer clear language over marketing copy." checked={watched.humanLikeLanguage ?? false} onChange={(value) => form.setValue("humanLikeLanguage", value, { shouldDirty: true })} />
          <ToggleRow label="Include business name" description="Use it only when it is already present in the customer’s own input." checked={watched.includeBusinessName ?? false} onChange={(value) => form.setValue("includeBusinessName", value, { shouldDirty: true })} />
          <ToggleRow label="Mention location" description="Never invent or infer a location." checked={watched.mentionLocation ?? false} onChange={(value) => form.setValue("mentionLocation", value, { shouldDirty: true })} />
        </SettingsSection>

        <SettingsSection title="Review safeguards" description="Controls that protect customers and keep generated copy compliant.">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-900"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><p className="text-xs font-semibold leading-5">ReviewFlow always grounds drafts in customer-provided details and never posts to Google automatically.</p></div>
          <ToggleRow label="Profanity filter" description="Remove unsafe language from generated wording." checked={watched.profanityFilter ?? false} onChange={(value) => form.setValue("profanityFilter", value, { shouldDirty: true })} />
          <ToggleRow label="Avoid generic phrases" description="Prefer wording connected to the selected rating and tags." checked={watched.avoidGenericPhrases ?? false} onChange={(value) => form.setValue("avoidGenericPhrases", value, { shouldDirty: true })} />
          <ToggleRow label="Search-friendly wording" description="Keep it natural; this never adds keywords or claims." checked={watched.seoFriendlyReviews ?? false} onChange={(value) => form.setValue("seoFriendlyReviews", value, { shouldDirty: true })} />
          <Field label="Words to avoid"><Input {...form.register("blockedWords")} placeholder="Optional comma-separated words" /></Field>
          <Field label={`Minimum draft length (${watched.minimumReviewLength ?? 20} words)`}><input {...form.register("minimumReviewLength", { valueAsNumber: true })} type="range" min="10" max="100" step="5" className="mt-3 w-full accent-primary" /></Field>
        </SettingsSection>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <SettingsSection title="Assistant creativity" description="A modest range keeps outputs varied without drifting away from customer input.">
          <RangeField label="Creativity" value={watched.creativity ?? 35} left="Conservative" right="Expressive" register={form.register("creativity", { valueAsNumber: true })} />
          <RangeField label="Formality" value={watched.formality ?? 50} left="Casual" right="Formal" register={form.register("formality", { valueAsNumber: true })} />
        </SettingsSection>
      </div>

      <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-medium text-muted-foreground">Settings are saved for this business location only.</p>
        <Button type="submit" loading={pending} loadingLabel="Saving settings..."><Check className="mr-2 h-4 w-4" />Save response settings</Button>
      </div>
    </form>
  );
}

function SettingsSection({ title, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-none sm:p-5"><div className="mb-5"><h3 className="text-base font-extrabold tracking-[-0.03em]">{title}</h3></div><div className="space-y-4">{children}</div></section>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><Label>{label}</Label><div className="mt-2">{children}</div></div>;
}

function SelectField({ label, children, ...props }: { label: string; children: ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <Field label={label}><select {...props} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15">{children}</select></Field>;
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex cursor-pointer items-center justify-between gap-4 border-b border-border/70 py-3 last:border-b-0"><span><span className="block text-sm font-bold">{label}</span><span className="mt-1 block text-xs font-medium leading-5 text-muted-foreground">{description}</span></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 shrink-0 accent-primary" /></label>;
}

function RangeField({ label, value, left, right, register }: { label: string; value: number; left: string; right: string; register: UseFormRegisterReturn }) {
  return <div><div className="flex items-center justify-between gap-3"><Label>{label}</Label><span className="text-sm font-extrabold text-primary">{value}%</span></div><input {...register} type="range" min="0" max="100" step="5" className="mt-3 w-full accent-primary" /><div className="mt-1 flex justify-between text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground"><span>{left}</span><span>{right}</span></div></div>;
}
