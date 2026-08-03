"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_GROWTH_BILLING_PERIOD,
  GROWTH_BILLING_OPTIONS,
  getGrowthBillingOption,
  type GrowthBillingPeriod,
  type PlanConfig,
} from "@/config/plans";
import { CustomPlanContactDialog } from "@/components/billing/custom-plan-contact-dialog";

/** Inline icons — avoid lucide-react in RSC (createContext only works in client components). */
function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="pointer-events-none h-4 w-4 text-muted-foreground"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 7.5 10 12.5 15 7.5" />
    </svg>
  );
}

function growthSuffix(months: number) {
  if (months === 1) return "/month";
  if (months === 6) return "/6 months";
  if (months === 12) return "/year";
  return `/${months} months`;
}

export function PlanCard({
  plan,
  highlighted = false,
  current = false,
  selected = false,
  href,
}: {
  plan: PlanConfig;
  highlighted?: boolean;
  current?: boolean;
  selected?: boolean;
  href?: string;
}) {
  const isTrial = plan.key === "starter";
  const isCustom = plan.contactSales || plan.key === "custom";
  const isGrowth = plan.key === "growth";

  const [billingPeriod, setBillingPeriod] = useState<GrowthBillingPeriod>(
    DEFAULT_GROWTH_BILLING_PERIOD,
  );

  const growthOption =
    getGrowthBillingOption(billingPeriod) ??
    getGrowthBillingOption(DEFAULT_GROWTH_BILLING_PERIOD)!;

  const growthPrice = isGrowth ? growthOption.priceInr : plan.priceInr;
  const growthMonths = isGrowth ? growthOption.months : 1;
  const perDay = Math.max(
    1,
    Math.round(growthPrice / (growthMonths * 30)),
  );

  const target =
    href ??
    (isTrial
      ? "/signup"
      : isGrowth
        ? `/billing/checkout?plan=${plan.key}&period=${billingPeriod}`
        : `/billing/checkout?plan=${plan.key}`);

  return (
    <article
      className={`relative flex h-full flex-col rounded-[1.35rem] border bg-white p-5 transition duration-200 ${
        highlighted
          ? "border-primary shadow-[0_16px_40px_rgba(36,99,243,0.13)] lg:-translate-y-1"
          : "border-border/80 shadow-[0_8px_24px_rgba(35,52,84,0.04)] hover:border-primary/30 hover:shadow-[0_12px_30px_rgba(35,52,84,0.08)]"
      } ${selected ? "ring-2 ring-primary ring-offset-2" : ""}`}
    >
      {highlighted ? (
        <span className="absolute -top-3 left-5 rounded-full bg-primary px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white">
          Popular
        </span>
      ) : null}
      {isTrial ? (
        <span className="absolute -top-3 left-5 rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white">
          Free 7 days
        </span>
      ) : null}

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">
            {plan.name}
          </p>
          <h3 className="mt-2 text-xl font-extrabold tracking-[-0.04em] text-foreground">
            {plan.tagline}
          </h3>
        </div>
        {current ? (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-emerald-700">
            Current
          </span>
        ) : null}
      </div>

      {/* Duration select — Growth only, between tagline and price (country-select style) */}
      {isGrowth ? (
        <div className="mt-4">
          <label
            htmlFor={`growth-period-${plan.key}`}
            className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground"
          >
            Billing period
          </label>
          <div className="relative">
            <select
              id={`growth-period-${plan.key}`}
              value={billingPeriod}
              onChange={(event) =>
                setBillingPeriod(event.target.value as GrowthBillingPeriod)
              }
              className="h-11 w-full appearance-none rounded-xl border border-border/90 bg-white py-2 pl-3.5 pr-10 text-sm font-bold text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {GROWTH_BILLING_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.key === "1m"
                    ? "1 month"
                    : option.key === "6m"
                      ? "6 months"
                      : "1 year"}
                  {option.badge ? ` · ${option.badge}` : ""}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              <ChevronDownIcon />
            </span>
          </div>
        </div>
      ) : null}

      {/* Price row */}
      <div className={isGrowth ? "mt-4" : "mt-6"}>
        {isTrial ? (
          <p className="text-4xl font-extrabold tracking-[-0.07em] text-foreground">
            Free
            <span className="ml-1 text-sm font-bold tracking-normal text-muted-foreground">
              / {plan.trialDays} days
            </span>
          </p>
        ) : isCustom ? (
          <p className="text-4xl font-extrabold tracking-[-0.07em] text-foreground">
            Custom
          </p>
        ) : (
          <>
            <p className="text-4xl font-extrabold tracking-[-0.07em] text-foreground">
              ₹{growthPrice.toLocaleString("en-IN")}
              <span className="ml-1 text-sm font-bold tracking-normal text-muted-foreground">
                {growthSuffix(growthMonths)}
              </span>
            </p>
            <p className="mt-1.5 text-xs font-medium text-muted-foreground">
              ≈ ₹{perDay.toLocaleString("en-IN")}/day
            </p>
          </>
        )}
      </div>

      <ul className="mt-6 flex-1 space-y-2.5 text-sm font-medium leading-5">
        {plan.features.map((feature) => (
          <li
            key={feature.label}
            className={`flex gap-2.5 ${
              feature.included ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {feature.included ? (
              <span
                className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700"
                aria-label="Included"
              >
                <CheckIcon />
              </span>
            ) : (
              <span
                className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-red-50 text-red-500"
                aria-label="Not included"
              >
                <CrossIcon />
              </span>
            )}
            <span
              className={
                feature.included ? "" : "line-through decoration-slate-300"
              }
            >
              {feature.label}
            </span>
          </li>
        ))}
      </ul>

      {current ? (
        <Button asChild variant="outline" className="mt-7 w-full">
          <Link href="/dashboard/billing">Manage plan</Link>
        </Button>
      ) : isCustom ? (
        <div className="mt-7">
          <CustomPlanContactDialog />
        </div>
      ) : (
        <Button
          asChild
          variant={highlighted || isTrial ? "default" : "outline"}
          className="mt-7 w-full"
        >
          <Link href={target}>
            {isTrial ? "Start free trial" : `Choose ${plan.name}`}
          </Link>
        </Button>
      )}
    </article>
  );
}
