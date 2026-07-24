"use client";

import type { ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import type { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type UseFormRegisterReturn } from "react-hook-form";
import { ChevronDown, Plus, X } from "lucide-react";
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
  ["pt", "Portuguese"],
] as const;

const tagFields = [
  { name: "ratingTags5" as const, label: "5 stars" },
  { name: "ratingTags4" as const, label: "4 stars" },
  { name: "ratingTags3" as const, label: "3 stars" },
  { name: "ratingTags2" as const, label: "2 stars" },
  { name: "ratingTags1" as const, label: "1 star" },
] as const;

const SUGGESTED: Record<string, string[]> = {
  ratingTags5: ["Helpful staff", "Clean place", "Great service", "Fair prices", "Friendly team"],
  ratingTags4: ["Helpful staff", "Good service", "Clear communication", "Fair prices"],
  ratingTags3: ["What stood out", "Could be better", "Average wait"],
  ratingTags2: ["Communication", "Value for money", "Wait time"],
  ratingTags1: ["Needs improvement", "Follow-up", "Value for money"],
};

function parseList(value: string | undefined) {
  return (value ?? "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinTags(tags: string[]) {
  return [...new Set(tags.map((t) => t.trim()).filter(Boolean))].join("\n");
}

export function ResponseSettingsForm({
  businessId,
  settings,
}: {
  businessId: string;
  settings: ReviewResponseSettings;
}) {
  const [pending, startTransition] = useTransition();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [star, setStar] = useState<(typeof tagFields)[number]["name"]>("ratingTags5");
  const [tagInput, setTagInput] = useState("");
  const [blockInput, setBlockInput] = useState("");

  const form = useForm<z.input<typeof reviewResponseSettingsSchema>>({
    resolver: zodResolver(reviewResponseSettingsSchema),
    defaultValues: settings,
  });

  const watched = useWatch({ control: form.control });
  const allowedLanguages = useWatch({ control: form.control, name: "allowedLanguages" }) ?? [];
  const tagFieldValue = useWatch({ control: form.control, name: star }) ?? "";
  const tags = useMemo(() => parseList(String(tagFieldValue)), [tagFieldValue]);
  const blocked = useMemo(
    () => parseList(String(watched.blockedWords ?? "")),
    [watched.blockedWords],
  );

  const submit = form.handleSubmit((values) => {
    startTransition(async () => {
      try {
        await updateBusinessResponseSettingsAction(businessId, values);
        toast.success("Saved.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save.");
      }
    });
  });

  function setTags(next: string[]) {
    form.setValue(star, joinTags(next), { shouldDirty: true });
  }

  function addTag(raw: string) {
    const value = raw.trim().replace(/\s+/g, " ");
    if (!value || value.length > 60) return;
    if (tags.some((t) => t.toLowerCase() === value.toLowerCase())) {
      setTagInput("");
      return;
    }
    setTags([...tags, value]);
    setTagInput("");
  }

  function toggleLanguage(code: string) {
    const current = form.getValues("allowedLanguages") ?? [];
    if (current.includes(code) && current.length === 1) return;
    form.setValue(
      "allowedLanguages",
      current.includes(code) ? current.filter((c) => c !== code) : [...current, code],
      { shouldDirty: true },
    );
  }

  const suggestions = SUGGESTED[star] ?? [];

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-8">
      {/* 1. Style — only essentials */}
      <Section title="Review style" hint="How AI drafts sound by default.">
        <div className="grid gap-4 sm:grid-cols-3">
          <SimpleSelect label="Tone" {...form.register("tone")}>
            <option value="friendly">Friendly</option>
            <option value="professional">Professional</option>
            <option value="warm">Warm</option>
            <option value="concise">Concise</option>
          </SimpleSelect>
          <SimpleSelect label="Length" {...form.register("reviewLength")}>
            <option value="short">Short</option>
            <option value="standard">Medium</option>
            <option value="detailed">Long</option>
          </SimpleSelect>
          <SimpleSelect label="Voice" {...form.register("writingPerspective")}>
            <option value="first_person">I visited…</option>
            <option value="third_person">They visited…</option>
          </SimpleSelect>
        </div>
      </Section>

      {/* 2. Tags — primary owner task */}
      <Section
        title="Customer tags"
        hint="Chips customers can tap after they rate. Keep them short and clear."
      >
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {tagFields.map((field) => {
            const count = parseList(String(form.watch(field.name) ?? "")).length;
            const active = star === field.name;
            return (
              <button
                key={field.name}
                type="button"
                onClick={() => {
                  setStar(field.name);
                  setTagInput("");
                }}
                className={`flex-1 rounded-lg px-2 py-2.5 text-center text-xs font-bold transition sm:text-sm ${
                  active
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {field.label}
                {count > 0 ? (
                  <span className="ml-1 text-[10px] font-semibold text-slate-400">
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag(tagInput);
              }
            }}
            placeholder="Type a tag and press Add"
            maxLength={60}
            className="h-11 rounded-xl border-slate-200"
          />
          <Button
            type="button"
            onClick={() => addTag(tagInput)}
            disabled={!tagInput.trim()}
            className="h-11 shrink-0 rounded-xl px-5"
          >
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>

        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => setTags(tags.filter((t) => t !== tag))}
                  className="rounded-full p-0.5 opacity-70 hover:bg-white/15 hover:opacity-100"
                  aria-label={`Remove ${tag}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No tags for this rating yet.</p>
        )}

        <div className="flex flex-wrap gap-2">
          {suggestions.map((tag) => {
            const on = tags.some((t) => t.toLowerCase() === tag.toLowerCase());
            return (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  on
                    ? setTags(tags.filter((t) => t.toLowerCase() !== tag.toLowerCase()))
                    : setTags([...tags, tag])
                }
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  on
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-dashed border-slate-300 bg-white text-slate-500 hover:border-slate-400 hover:text-slate-800"
                }`}
              >
                {on ? "✓ " : "+ "}
                {tag}
              </button>
            );
          })}
        </div>

        {tagFields.map((f) => (
          <input key={f.name} type="hidden" {...form.register(f.name)} />
        ))}
      </Section>

      {/* 3. Language — compact */}
      <Section title="Language" hint="Default language for AI drafts.">
        <div className="flex flex-wrap gap-2">
          {languageOptions.map(([code, label]) => {
            const selected = allowedLanguages.includes(code);
            return (
              <button
                key={code}
                type="button"
                onClick={() => toggleLanguage(code)}
                className={`rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                  selected
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <input type="hidden" {...form.register("defaultLanguage")} />
        {/* Keep first selected as default language for simplicity */}
        <p className="text-xs text-slate-400">
          Tap to allow languages. Default:{" "}
          <span className="font-semibold text-slate-600">
            {languageOptions.find(([c]) => c === (watched.defaultLanguage ?? "en"))?.[1] ??
              "English"}
          </span>
          {" · "}
          <button
            type="button"
            className="font-semibold text-primary underline-offset-2 hover:underline"
            onClick={() => {
              const first = allowedLanguages[0] ?? "en";
              form.setValue("defaultLanguage", first, { shouldDirty: true });
            }}
          >
            Use first selected as default
          </button>
        </p>
      </Section>

      {/* Advanced — collapsed by default */}
      <div className="border-t border-slate-100 pt-2">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl px-1 py-3 text-left text-sm font-bold text-slate-700 hover:text-slate-900"
        >
          <span>Advanced options</span>
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition ${showAdvanced ? "rotate-180" : ""}`}
          />
        </button>

        {showAdvanced ? (
          <div className="mt-2 space-y-8 border-t border-slate-100 pt-6">
            <Section title="Guidance by rating" hint="Optional notes for the AI per star level.">
              {(
                [
                  ["ratingRule5", "5 stars"],
                  ["ratingRule4", "4 stars"],
                  ["ratingRule3", "3 stars"],
                  ["ratingRule12", "1–2 stars"],
                ] as const
              ).map(([name, label]) => (
                <div key={name}>
                  <Label className="text-xs font-semibold text-slate-500">{label}</Label>
                  <Input
                    {...form.register(name)}
                    className="mt-1.5 h-10 rounded-xl border-slate-200"
                  />
                </div>
              ))}
            </Section>

            <Section title="Extra AI instructions" hint="Optional. Leave blank if unsure.">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-semibold text-slate-500">
                    Positive reviews
                  </Label>
                  <Textarea
                    {...form.register("positiveInstructions")}
                    className="mt-1.5 min-h-24 rounded-xl border-slate-200"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-500">
                    Lower ratings
                  </Label>
                  <Textarea
                    {...form.register("negativeInstructions")}
                    className="mt-1.5 min-h-24 rounded-xl border-slate-200"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </Section>

            <Section title="Quick toggles">
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-150">
                {(
                  [
                    ["mentionSelectedTags", "Use selected tags in draft"],
                    ["generateUniqueReviews", "Avoid duplicate drafts"],
                    ["humanLikeLanguage", "Natural language"],
                    ["profanityFilter", "Filter bad words"],
                    ["avoidGenericPhrases", "Avoid generic praise"],
                    ["includeBusinessName", "Include business name"],
                    ["mentionLocation", "Mention location"],
                    ["seoFriendlyReviews", "Search-friendly wording"],
                    ["autoDetectLanguage", "Auto-detect language"],
                  ] as const
                ).map(([name, label]) => (
                  <Toggle
                    key={name}
                    label={label}
                    checked={Boolean(watched[name])}
                    onChange={(v) => form.setValue(name, v, { shouldDirty: true })}
                  />
                ))}
              </div>
            </Section>

            <Section title="Blocked words" hint="Words AI should avoid.">
              <div className="flex gap-2">
                <Input
                  value={blockInput}
                  onChange={(e) => setBlockInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const w = blockInput.trim();
                      if (!w) return;
                      form.setValue(
                        "blockedWords",
                        [...blocked, w].join(", "),
                        { shouldDirty: true },
                      );
                      setBlockInput("");
                    }
                  }}
                  placeholder="Add a word"
                  className="h-10 rounded-xl"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl"
                  onClick={() => {
                    const w = blockInput.trim();
                    if (!w) return;
                    form.setValue("blockedWords", [...blocked, w].join(", "), {
                      shouldDirty: true,
                    });
                    setBlockInput("");
                  }}
                >
                  Block
                </Button>
              </div>
              {blocked.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {blocked.map((w) => (
                    <span
                      key={w}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
                    >
                      {w}
                      <button
                        type="button"
                        onClick={() =>
                          form.setValue(
                            "blockedWords",
                            blocked.filter((x) => x !== w).join(", "),
                            { shouldDirty: true },
                          )
                        }
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
              <input type="hidden" {...form.register("blockedWords")} />
            </Section>

            <Section title="Fine-tuning">
              <div className="grid gap-6 sm:grid-cols-2">
                <Range
                  label="Creativity"
                  value={watched.creativity ?? 35}
                  register={form.register("creativity", { valueAsNumber: true })}
                />
                <Range
                  label="Formality"
                  value={watched.formality ?? 50}
                  register={form.register("formality", { valueAsNumber: true })}
                />
                <div className="sm:col-span-2">
                  <Range
                    label={`Min. words (${watched.minimumReviewLength ?? 20})`}
                    value={watched.minimumReviewLength ?? 20}
                    min={10}
                    max={100}
                    register={form.register("minimumReviewLength", {
                      valueAsNumber: true,
                    })}
                    showPercent={false}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-semibold text-slate-500">
                    Private follow-up message
                  </Label>
                  <Textarea
                    {...form.register("lowRatingSupportMessage")}
                    className="mt-1.5 min-h-20 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-500">
                    Contact fields
                  </Label>
                  <Input
                    {...form.register("contactFields")}
                    className="mt-1.5 h-10 rounded-xl"
                    placeholder="name,email"
                  />
                </div>
              </div>
            </Section>
          </div>
        ) : null}
      </div>

      {/* Save */}
      <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-6">
        <p className="text-xs text-slate-400">Only this location is updated.</p>
        <Button type="submit" loading={pending} loadingLabel="Saving…" className="rounded-xl px-6">
          Save
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-base font-extrabold tracking-[-0.03em] text-slate-900">
          {title}
        </h3>
        {hint ? <p className="mt-0.5 text-sm text-slate-500">{hint}</p> : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function SimpleSelect({
  label,
  children,
  ...props
}: { label: string; children: ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <Label className="text-xs font-semibold text-slate-500">{label}</Label>
      <select
        {...props}
        className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-400"
      >
        {children}
      </select>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-slate-900" : "bg-slate-200"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? "left-[1.35rem]" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}

function Range({
  label,
  value,
  register,
  min = 0,
  max = 100,
  showPercent = true,
}: {
  label: string;
  value: number;
  register: UseFormRegisterReturn;
  min?: number;
  max?: number;
  showPercent?: boolean;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="font-bold text-slate-900">
          {value}
          {showPercent ? "%" : ""}
        </span>
      </div>
      <input
        {...register}
        type="range"
        min={min}
        max={max}
        step={5}
        className="mt-2 w-full accent-slate-900"
      />
    </div>
  );
}
