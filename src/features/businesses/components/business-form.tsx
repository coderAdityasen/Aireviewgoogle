"use client";

import { useTransition } from "react";
import type { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { businessSchema } from "@/lib/validation/business";
import {
  createBusinessAction,
  updateBusinessAction,
} from "@/features/businesses/server/actions";
import type { Business } from "@/types/database";
import { cn } from "@/lib/utils";

function servicesText(services: Business["services"] | undefined) {
  return Array.isArray(services) ? services.join("\n") : "";
}

export function BusinessForm({ business }: { business?: Business }) {
  const [pending, startTransition] = useTransition();
  const form = useForm<z.input<typeof businessSchema>>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      name: business?.name ?? "",
      category: business?.category ?? "",
      description: business?.description ?? "",
      services: servicesText(business?.services),
      phone: business?.phone ?? "",
      email: business?.email ?? "",
      website: business?.website ?? "",
      addressLine: business?.address_line ?? "",
      city: business?.city ?? "",
      state: business?.state ?? "",
      country: business?.country ?? "",
      logoUrl: business?.logo_url ?? "",
      brandColor: business?.brand_color ?? "#0f766e",
      googleReviewUrl: business?.google_review_url ?? "",
      defaultLanguage: business?.default_language ?? "en",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      try {
        if (business) {
          await updateBusinessAction(business.id, values);
          toast.success("Business saved.");
          return;
        }
        // createBusinessAction ends with redirect() to the new location.
        await createBusinessAction(values);
      } catch (error) {
        // Next.js redirect() throws a special error — must rethrow.
        if (isRedirectError(error)) throw error;
        toast.error(
          error instanceof Error ? error.message : "Unable to save business.",
        );
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <SettingsCard
        title="Business identity"
        description="Name and category customers will recognize."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Business name"
            error={form.formState.errors.name?.message}
            required
          >
            <Input {...form.register("name")} autoComplete="organization" />
          </Field>
          <Field
            label="Category"
            error={form.formState.errors.category?.message}
            required
          >
            <Input
              {...form.register("category")}
              placeholder="Dental clinic, restaurant, home services"
            />
          </Field>
          <Field
            label="Default language"
            error={form.formState.errors.defaultLanguage?.message}
            hint="BCP-47 code, e.g. en or hi"
          >
            <Input {...form.register("defaultLanguage")} placeholder="en" />
          </Field>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Contact"
        description="How customers and your team can reach this location."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone" error={form.formState.errors.phone?.message}>
            <Input {...form.register("phone")} type="tel" autoComplete="tel" />
          </Field>
          <Field
            label="Business email"
            error={form.formState.errors.email?.message}
          >
            <Input
              {...form.register("email")}
              type="email"
              autoComplete="email"
            />
          </Field>
          <Field
            className="sm:col-span-2"
            label="Website"
            error={form.formState.errors.website?.message}
          >
            <Input
              {...form.register("website")}
              type="url"
              placeholder="https://…"
            />
          </Field>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Location"
        description="Address details for this store or branch."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            className="sm:col-span-2"
            label="Street address"
            error={form.formState.errors.addressLine?.message}
          >
            <Input
              {...form.register("addressLine")}
              autoComplete="street-address"
            />
          </Field>
          <Field label="City" error={form.formState.errors.city?.message}>
            <Input {...form.register("city")} autoComplete="address-level2" />
          </Field>
          <Field label="State" error={form.formState.errors.state?.message}>
            <Input {...form.register("state")} autoComplete="address-level1" />
          </Field>
          <Field label="Country" error={form.formState.errors.country?.message}>
            <Input {...form.register("country")} autoComplete="country-name" />
          </Field>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Google review destination"
        description="Official link customers open after a positive rating. Use Google Business Profile → Ask for reviews."
      >
        <Field
          label="Google review URL"
          error={form.formState.errors.googleReviewUrl?.message}
          required
        >
          <Input
            {...form.register("googleReviewUrl")}
            type="url"
            placeholder="https://g.page/…/review"
          />
        </Field>
      </SettingsCard>

      <SettingsCard
        title="About this location"
        description="Optional context that can improve AI drafts."
      >
        <div className="space-y-4">
          <Field
            label="Short description"
            error={form.formState.errors.description?.message}
          >
            <Textarea
              {...form.register("description")}
              placeholder="A short overview of what makes this location unique"
              className="min-h-24"
            />
          </Field>
          <Field
            label="Services or products"
            error={form.formState.errors.services?.message}
            hint="One item per line"
          >
            <Textarea
              {...form.register("services")}
              placeholder={"Haircut\nColor treatment\nConsultation"}
              className="min-h-28"
            />
          </Field>
        </div>
      </SettingsCard>

      {/* Sticky-feeling action bar */}
      <div className="sticky bottom-4 z-10 flex flex-col-reverse gap-3 rounded-2xl border border-border/80 bg-white/95 p-4 shadow-[0_8px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-medium text-muted-foreground">
          Changes apply only to this location.
        </p>
        <Button
          type="submit"
          loading={pending}
          loadingLabel={business ? "Saving…" : "Creating…"}
          className="w-full sm:w-auto sm:min-w-[9rem]"
        >
          {business ? "Save changes" : "Create business"}
        </Button>
      </div>
    </form>
  );
}

function SettingsCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_20px_rgba(15,23,42,0.04)]",
        className,
      )}
    >
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

function Field({
  label,
  error,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="text-[13px] font-semibold text-foreground/85">
        {label}
        {required ? (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>
      <div className="mt-2">{children}</div>
      {hint && !error ? (
        <p className="mt-1.5 text-xs font-medium text-muted-foreground">{hint}</p>
      ) : null}
      {error ? (
        <p className="mt-1.5 text-xs font-semibold text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
