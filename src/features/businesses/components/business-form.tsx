"use client";

import { useTransition } from "react";
import type { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { businessSchema } from "@/lib/validation/business";
import { ratingTagText } from "@/lib/feedback/rating-tags";
import { createBusinessAction, updateBusinessAction } from "@/features/businesses/server/actions";
import type { Business } from "@/types/database";

function servicesText(services: Business["services"] | undefined) {
  return Array.isArray(services) ? services.join("\n") : "";
}

const ratingFieldNames = { 1: "ratingTags1", 2: "ratingTags2", 3: "ratingTags3", 4: "ratingTags4", 5: "ratingTags5" } as const;

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
      ratingTags1: ratingTagText(business?.experience_tags, 1),
      ratingTags2: ratingTagText(business?.experience_tags, 2),
      ratingTags3: ratingTagText(business?.experience_tags, 3),
      ratingTags4: ratingTagText(business?.experience_tags, 4),
      ratingTags5: ratingTagText(business?.experience_tags, 5),
      lowRatingSupportMessage: business?.low_rating_support_message ?? "",
      contactFields: servicesText(business?.contact_fields) || "name,email"
    }
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      try {
        if (business) await updateBusinessAction(business.id, values);
        else await createBusinessAction(values);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to save business.");
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-5 lg:grid-cols-2">
      <Field label="Business name" error={form.formState.errors.name?.message}>
        <Input {...form.register("name")} />
      </Field>
      <Field label="Category" error={form.formState.errors.category?.message}>
        <Input {...form.register("category")} placeholder="Dental clinic, restaurant, home services" />
      </Field>
      <Field label="Phone" error={form.formState.errors.phone?.message}>
        <Input {...form.register("phone")} />
      </Field>
      <Field label="Business email" error={form.formState.errors.email?.message}>
        <Input {...form.register("email")} type="email" />
      </Field>
      <Field label="Website" error={form.formState.errors.website?.message}>
        <Input {...form.register("website")} type="url" />
      </Field>
      <Field label="Default language" error={form.formState.errors.defaultLanguage?.message}>
        <Input {...form.register("defaultLanguage")} placeholder="en" />
      </Field>
      <Field label="Brand colour" error={form.formState.errors.brandColor?.message}>
        <Input {...form.register("brandColor")} type="color" className="h-10 p-1" />
      </Field>
      <Field label="Logo URL" error={form.formState.errors.logoUrl?.message}>
        <Input {...form.register("logoUrl")} type="url" />
      </Field>
      <Field label="Address" error={form.formState.errors.addressLine?.message}>
        <Input {...form.register("addressLine")} />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="City" error={form.formState.errors.city?.message}>
          <Input {...form.register("city")} />
        </Field>
        <Field label="State" error={form.formState.errors.state?.message}>
          <Input {...form.register("state")} />
        </Field>
        <Field label="Country" error={form.formState.errors.country?.message}>
          <Input {...form.register("country")} />
        </Field>
      </div>
      <Field label="Google review URL" error={form.formState.errors.googleReviewUrl?.message}>
        <Input {...form.register("googleReviewUrl")} type="url" />
      </Field>
      <Field className="lg:col-span-2" label="Short business description" error={form.formState.errors.description?.message}>
        <Textarea {...form.register("description")} />
      </Field>
      <Field className="lg:col-span-2" label="Services or products" error={form.formState.errors.services?.message}>
        <Textarea {...form.register("services")} placeholder="One per line" />
      </Field>
      <div className="lg:col-span-2 rounded-2xl border border-primary/15 bg-primary/[0.03] p-4 sm:p-5"><div><p className="text-sm font-extrabold">Customer options by rating</p><p className="mt-1 text-xs font-medium leading-5 text-muted-foreground">Set the optional tags customers see after choosing each rating. One option per line. Use neutral or constructive wording for lower ratings.</p></div><div className="mt-4 grid gap-4 md:grid-cols-2">{([1, 2, 3, 4, 5] as const).map((rating) => { const fieldName = ratingFieldNames[rating]; return <Field key={rating} label={`${rating}-star options`} error={form.formState.errors[fieldName]?.message}><Textarea {...form.register(fieldName)} placeholder={rating >= 4 ? "Friendly service\nClear communication" : "What could be improved\nValue for money"} /></Field>; })}</div></div>
      <Field className="lg:col-span-2" label="Low-rating support message (optional)" error={form.formState.errors.lowRatingSupportMessage?.message}>
        <Textarea {...form.register("lowRatingSupportMessage")} placeholder="Tell us what we can improve and we will follow up privately." />
      </Field>
      <Field className="lg:col-span-2" label="Private follow-up fields" error={form.formState.errors.contactFields?.message}>
        <Input {...form.register("contactFields")} placeholder="name,email" />
        <p className="mt-1 text-xs text-muted-foreground">Comma-separated fields shown only when a customer chooses private follow-up: name, email, phone.</p>
      </Field>
      <div className="lg:col-span-2">
        <Button loading={pending} loadingLabel={business ? "Saving…" : "Creating…"}>{business ? "Save changes" : "Create business"}</Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  className,
  children
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <div className="mt-2">{children}</div>
      {error ? <p className="mt-1 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
