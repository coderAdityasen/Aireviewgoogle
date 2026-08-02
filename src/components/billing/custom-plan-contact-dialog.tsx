"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { submitCustomPlanInquiryAction } from "@/features/billing/server/custom-plan-actions";
import { cn } from "@/lib/utils";

/**
 * Sales CTA for Custom plan — dark full-width button (Stripe/Vercel “Contact sales” pattern).
 * Separate from blue self-serve CTAs so it reads as sales-assisted, not checkout.
 */
export function CustomPlanContactDialog({
  className,
}: {
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    // Don't close while the request is in flight
    if (isPending && !next) return;
    setOpen(next);
  }

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await submitCustomPlanInquiryAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Thanks — our team will contact you shortly.");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-sm transition-all duration-200",
            "hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_10px_24px_rgba(15,23,42,0.18)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2",
            "active:scale-[0.98] motion-reduce:active:scale-100",
            className,
          )}
        >
          Contact sales
        </button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-md"
        onPointerDownOutside={(e) => {
          if (isPending) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isPending) e.preventDefault();
        }}
      >
        <DialogHeader>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">
            Custom plan
          </p>
          <DialogTitle className="text-xl font-extrabold tracking-[-0.04em]">
            Contact sales
          </DialogTitle>
          <DialogDescription className="text-sm font-medium leading-6 text-muted-foreground">
            Tell us about your locations and goals. We&apos;ll reply with a plan
            that fits — usually within one business day.
          </DialogDescription>
        </DialogHeader>

        <form
          key={open ? "open" : "closed"}
          action={onSubmit}
          className="relative mt-1 space-y-3.5"
          aria-busy={isPending}
        >
          {isPending ? (
            <div
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl bg-white/75 backdrop-blur-[1px]"
              aria-live="polite"
            >
              <LoadingSpinner label="Sending request" className="text-slate-900" />
              <p className="text-sm font-bold text-slate-900">Sending…</p>
            </div>
          ) : null}

          <Field label="Full name" htmlFor="fullName" required>
            <Input
              id="fullName"
              name="fullName"
              required
              autoComplete="name"
              placeholder="Your name"
              disabled={isPending}
            />
          </Field>
          <Field label="Work email" htmlFor="email" required>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@company.com"
              disabled={isPending}
            />
          </Field>
          <Field label="Phone" htmlFor="phone">
            <Input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+91 …"
              disabled={isPending}
            />
          </Field>
          <Field label="Company" htmlFor="companyName">
            <Input
              id="companyName"
              name="companyName"
              autoComplete="organization"
              placeholder="Business name"
              disabled={isPending}
            />
          </Field>
          <Field label="Number of locations" htmlFor="locationsNeeded">
            <Input
              id="locationsNeeded"
              name="locationsNeeded"
              placeholder="e.g. 12"
              disabled={isPending}
            />
          </Field>
          <Field label="Message" htmlFor="message" required>
            <Textarea
              id="message"
              name="message"
              required
              rows={4}
              placeholder="What do you need help with?"
              disabled={isPending}
            />
          </Field>
          <Button
            type="submit"
            className="h-11 w-full bg-slate-900 font-bold hover:bg-slate-800"
            loading={isPending}
            loadingLabel="Sending…"
            disabled={isPending}
          >
            Send message
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}
