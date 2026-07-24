import { PlanCard } from "@/components/billing/plan-card";
import { PLANS, type PlanKey } from "@/config/plans";

export function PlanSelection({
  currentPlanKey,
  selectedPlanKey,
}: {
  currentPlanKey?: PlanKey;
  selectedPlanKey?: PlanKey;
}) {
  return (
    <section id="plans" className="mx-auto max-w-6xl scroll-mt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary">
            Plans
          </p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.055em] sm:text-3xl">
            Start free, upgrade when you grow
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted-foreground">
            Starter is a 7-day free trial. Growth and Pro unlock unlimited AI
            regenerations, private feedback, and the full reviews feed.
          </p>
        </div>
        <span className="text-xs font-bold text-muted-foreground">
          Upgrade anytime · cancel paid plans anytime
        </span>
      </div>
      <div className="mt-7 grid items-stretch gap-4 lg:grid-cols-3">
        {Object.values(PLANS).map((plan) => (
          <PlanCard
            key={plan.key}
            plan={plan}
            highlighted={plan.key === "growth"}
            current={currentPlanKey === plan.key}
            selected={selectedPlanKey === plan.key}
          />
        ))}
      </div>
    </section>
  );
}
