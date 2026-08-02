"use client";

import type { ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import type { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type UseFormRegisterReturn } from "react-hook-form";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateBusinessResponseSettingsAction } from "@/features/businesses/server/actions";
import { reviewResponseSettingsSchema } from "@/lib/validation/review-settings";
import type { ReviewResponseSettings } from "@/lib/validation/review-settings";
import { cn } from "@/lib/utils";

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
  ratingTags5: [
    "Helpful staff",
    "Clean place",
    "Great service",
    "Fair prices",
    "Friendly team",
  ],
  ratingTags4: [
    "Helpful staff",
    "Good service",
    "Clear communication",
    "Fair prices",
  ],
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
  const [star, setStar] = useState<(typeof tagFields)[number]["name"]>(
    "ratingTags5",
  );
  const [tagInput, setTagInput] = useState("");
  const [blockInput, setBlockInput] = useState("");

  const form = useForm<z.input<typeof reviewResponseSettingsSchema>>({
    resolver: zodResolver(reviewResponseSettingsSchema),
    defaultValues: settings,
  });

  const watched = useWatch({ control: form.control });
  const allowedLanguages =
    useWatch({ control: form.control, name: "allowedLanguages" }) ?? [];
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
      current.includes(code)
        ? current.filter((c) => c !== code)
        : [...current, code],
      { shouldDirty: true },
    );
  }

  const suggestions = SUGGESTED[star] ?? [];
  const defaultLangLabel =
    languageOptions.find(([c]) => c === (watched.defaultLanguage ?? "en"))?.[1] ??
    "English";

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Review style */}
      <SettingsCard
        title="Review style"
        description="How AI drafts sound by default for this location."
      >
        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>
      </SettingsCard>

      {/* Customer tags */}
      <SettingsCard
        title="Customer tags"
        description="Chips customers can tap after they rate. Keep them short and clear."
      >
        <div
          className="flex gap-1 overflow-x-auto rounded-xl border border-border/70 bg-muted/40 p-1"
          role="tablist"
          aria-label="Rating for tags"
        >
          {tagFields.map((field) => {
            const count = parseList(String(form.watch(field.name) ?? "")).length;
            const active = star === field.name;
            return (
              <button
                key={field.name}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setStar(field.name);
                  setTagInput("");
                }}
                className={cn(
                  "min-h-10 min-w-[4.25rem] flex-1 cursor-pointer rounded-lg px-2.5 py-2 text-center text-xs font-bold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:text-sm",
                  active
                    ? "bg-white text-foreground shadow-sm ring-1 ring-border/60"
                    : "text-muted-foreground hover:bg-white/70 hover:text-foreground",
                )}
              >
                <span className="whitespace-nowrap">{field.label}</span>
                {count > 0 ? (
                  <span
                    className={cn(
                      "ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-extrabold",
                      active
                        ? "bg-primary/10 text-primary"
                        : "bg-slate-200/80 text-slate-500",
                    )}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
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
            aria-label="New customer tag"
            className="h-11"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => addTag(tagInput)}
            disabled={!tagInput.trim()}
            className="h-11 shrink-0 sm:px-5"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>

        <div className="mt-4">
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-secondary px-3.5 py-1.5 text-sm font-semibold text-secondary-foreground shadow-sm transition"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => setTags(tags.filter((t) => t !== tag))}
                    className="ml-0.5 grid h-5 w-5 cursor-pointer place-items-center rounded-full text-white/70 transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                    aria-label={`Remove ${tag}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-5 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                No tags for this rating yet. Add one or pick a suggestion below.
              </p>
            </div>
          )}
        </div>

        <div className="mt-5">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
            Suggestions
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {suggestions.map((tag) => {
              const on = tags.some(
                (t) => t.toLowerCase() === tag.toLowerCase(),
              );
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    on
                      ? setTags(
                          tags.filter(
                            (t) => t.toLowerCase() !== tag.toLowerCase(),
                          ),
                        )
                      : setTags([...tags, tag])
                  }
                  className={cn(
                    "inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    on
                      ? "border-primary/30 bg-primary/10 text-primary shadow-sm"
                      : "border-dashed border-border bg-white text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-foreground",
                  )}
                >
                  {on ? (
                    <Check className="h-3 w-3" aria-hidden="true" />
                  ) : (
                    <Plus className="h-3 w-3" aria-hidden="true" />
                  )}
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {tagFields.map((f) => (
          <input key={f.name} type="hidden" {...form.register(f.name)} />
        ))}
      </SettingsCard>

      {/* Language */}
      <SettingsCard
        title="Language"
        description="Languages customers can use for AI-generated drafts."
      >
        <div className="flex flex-wrap gap-2">
          {languageOptions.map(([code, label]) => {
            const selected = allowedLanguages.includes(code);
            return (
              <button
                key={code}
                type="button"
                onClick={() => toggleLanguage(code)}
                aria-pressed={selected}
                className={cn(
                  "inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  selected
                    ? "border-primary/25 bg-primary text-primary-foreground shadow-[0_4px_12px_rgba(36,99,243,0.25)]"
                    : "border-border/80 bg-white text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground",
                )}
              >
                {selected ? (
                  <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                ) : null}
                {label}
              </button>
            );
          })}
        </div>
        <input type="hidden" {...form.register("defaultLanguage")} />
        <div className="mt-4 flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/25 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-medium text-muted-foreground">
            Default language:{" "}
            <span className="font-bold text-foreground">{defaultLangLabel}</span>
          </p>
          <button
            type="button"
            className="cursor-pointer text-left text-xs font-bold text-primary underline-offset-2 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={() => {
              const first = allowedLanguages[0] ?? "en";
              form.setValue("defaultLanguage", first, { shouldDirty: true });
            }}
          >
            Use first selected as default
          </button>
        </div>
      </SettingsCard>

      {/* Advanced accordion */}
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_20px_rgba(15,23,42,0.04)]">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          aria-expanded={showAdvanced}
          className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:px-6"
        >
          <div>
            <p className="text-base font-extrabold tracking-[-0.03em] text-foreground">
              Advanced options
            </p>
            <p className="mt-0.5 text-sm font-medium text-muted-foreground">
              Guidance, filters, and fine-tuning for AI drafts
            </p>
          </div>
          <span
            className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border/70 bg-muted/40 text-muted-foreground transition-transform duration-200",
              showAdvanced && "rotate-180 bg-primary/10 text-primary",
            )}
          >
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </span>
        </button>

        {showAdvanced ? (
          <div className="space-y-6 border-t border-border/60 px-5 py-6 sm:px-6">
            <SubSection
              title="Guidance by rating"
              hint="Optional notes for the AI per star level."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["ratingRule5", "5 stars"],
                    ["ratingRule4", "4 stars"],
                    ["ratingRule3", "3 stars"],
                    ["ratingRule12", "1–2 stars"],
                  ] as const
                ).map(([name, label]) => (
                  <div key={name}>
                    <Label className="text-[12px] font-semibold text-muted-foreground">
                      {label}
                    </Label>
                    <Input
                      {...form.register(name)}
                      className="mt-1.5 h-10"
                    />
                  </div>
                ))}
              </div>
            </SubSection>

            <SubSection
              title="Extra AI instructions"
              hint="Optional. Leave blank if unsure."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-[12px] font-semibold text-muted-foreground">
                    Positive reviews
                  </Label>
                  <Textarea
                    {...form.register("positiveInstructions")}
                    className="mt-1.5 min-h-24"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label className="text-[12px] font-semibold text-muted-foreground">
                    Lower ratings
                  </Label>
                  <Textarea
                    {...form.register("negativeInstructions")}
                    className="mt-1.5 min-h-24"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </SubSection>

            <SubSection title="Quick toggles">
              <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70 bg-white">
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
                    onChange={(v) =>
                      form.setValue(name, v, { shouldDirty: true })
                    }
                  />
                ))}
              </div>
            </SubSection>

            <SubSection title="Blocked words" hint="Words AI should avoid.">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={blockInput}
                  onChange={(e) => setBlockInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const w = blockInput.trim();
                      if (!w) return;
                      form.setValue("blockedWords", [...blocked, w].join(", "), {
                        shouldDirty: true,
                      });
                      setBlockInput("");
                    }
                  }}
                  placeholder="Add a word"
                  className="h-10"
                  aria-label="Blocked word"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 shrink-0"
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
                <div className="mt-3 flex flex-wrap gap-2">
                  {blocked.map((w) => (
                    <span
                      key={w}
                      className="inline-flex min-h-8 items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-xs font-semibold text-foreground/80"
                    >
                      {w}
                      <button
                        type="button"
                        className="grid h-4 w-4 cursor-pointer place-items-center rounded-full text-muted-foreground transition hover:bg-slate-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        aria-label={`Remove blocked word ${w}`}
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
            </SubSection>

            <SubSection title="Fine-tuning">
              <div className="grid gap-6 sm:grid-cols-2">
                <Range
                  label="Creativity"
                  value={watched.creativity ?? 70}
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
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-[12px] font-semibold text-muted-foreground">
                    Private follow-up message
                  </Label>
                  <Textarea
                    {...form.register("lowRatingSupportMessage")}
                    className="mt-1.5 min-h-20"
                  />
                </div>
                <div>
                  <Label className="text-[12px] font-semibold text-muted-foreground">
                    Contact fields
                  </Label>
                  <Input
                    {...form.register("contactFields")}
                    className="mt-1.5 h-10"
                    placeholder="name,email"
                  />
                </div>
              </div>
            </SubSection>
          </div>
        ) : null}
      </div>

      {/* Save bar */}
      <div className="sticky bottom-4 z-10 flex flex-col-reverse gap-3 rounded-2xl border border-border/80 bg-white/95 p-4 shadow-[0_8px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-medium text-muted-foreground">
          Only this location is updated.
        </p>
        <Button
          type="submit"
          loading={pending}
          loadingLabel="Saving…"
          className="w-full sm:w-auto sm:min-w-[9rem]"
        >
          Save changes
        </Button>
      </div>
    </form>
  );
}

function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_20px_rgba(15,23,42,0.04)]">
      <header className="border-b border-border/60 bg-muted/20 px-5 py-4 sm:px-6">
        <h2 className="text-base font-extrabold tracking-[-0.03em] text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </header>
      <div className="px-5 py-5 sm:px-6 sm:py-6">{children}</div>
    </section>
  );
}

function SubSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-extrabold tracking-[-0.02em] text-foreground">
          {title}
        </h3>
        {hint ? (
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function SimpleSelect({
  label,
  children,
  ...props
}: { label: string; children: ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <Label className="text-[13px] font-semibold text-foreground/85">{label}</Label>
      <select
        {...props}
        className="mt-2 h-11 w-full cursor-pointer rounded-xl border border-input bg-card px-3 text-sm font-semibold text-foreground shadow-sm outline-none transition hover:border-primary/30 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/12"
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
    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 px-4 py-3 transition hover:bg-muted/30">
      <span className="text-sm font-medium text-foreground/90">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          checked ? "bg-primary" : "bg-slate-200",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200",
            checked ? "left-[1.35rem]" : "left-0.5",
          )}
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
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-foreground/90">{label}</span>
        <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-extrabold tabular-nums text-foreground">
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
        className="mt-2.5 w-full cursor-pointer accent-primary"
      />
    </div>
  );
}
