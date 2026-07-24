import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { PlanConfig } from "@/config/plans";

/** Inline icons — avoid lucide-react in RSC (createContext only works in client components). */
function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
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
  const target =
    href ?? (isTrial ? "/signup" : `/billing/checkout?plan=${plan.key}`);

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

      <p className="mt-6 text-4xl font-extrabold tracking-[-0.07em] text-foreground">
        {isTrial ? (
          <>
            Free
            <span className="ml-1 text-sm font-bold tracking-normal text-muted-foreground">
              / {plan.trialDays} days
            </span>
          </>
        ) : (
          <>
            ₹{plan.priceInr.toLocaleString("en-IN")}
            <span className="ml-1 text-sm font-bold tracking-normal text-muted-foreground">
              /month
            </span>
          </>
        )}
      </p>

      {/* Tick / cross feature list only */}
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
            <span className={feature.included ? "" : "line-through decoration-slate-300"}>
              {feature.label}
            </span>
          </li>
        ))}
      </ul>

      <Button
        asChild
        variant={
          current ? "outline" : highlighted || isTrial ? "default" : "outline"
        }
        className="mt-7 w-full"
      >
        <Link href={current ? "/dashboard/billing" : target}>
          {current
            ? "Manage plan"
            : isTrial
              ? "Start free trial"
              : `Choose ${plan.name}`}
        </Link>
      </Button>
    </article>
  );
}
