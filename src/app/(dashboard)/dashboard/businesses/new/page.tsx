import Link from "next/link";
import { redirect } from "next/navigation";
import { BusinessForm } from "@/features/businesses/components/business-form";
import { hasCompletedOnboarding } from "@/features/onboarding/server/actions";
import { requirePaidOwner } from "@/lib/billing/entitlements";
import { isUnlimited } from "@/config/plans";
import { Button } from "@/components/ui/button";

export default async function NewBusinessPage() {
  const { user, entitlements } = await requirePaidOwner();

  // First location always uses the full onboarding wizard.
  if (!(await hasCompletedOnboarding(user.id))) {
    redirect("/onboarding");
  }

  const { plan, usage } = entitlements;
  const atLimit =
    !isUnlimited(plan.businesses) && usage.businesses >= plan.businesses;
  // Starter (and any plan without multi-location room) must upgrade to add more.
  const multiLocationAllowed = plan.key === "growth" || plan.key === "custom";
  const needsUpgrade = !multiLocationAllowed || atLimit;

  if (needsUpgrade) {
    const isStarter = plan.key === "starter";
    return (
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <header className="space-y-1.5">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">
            Locations
          </p>
          <h1 className="text-2xl font-extrabold tracking-[-0.05em] text-foreground sm:text-3xl">
            Add a location
          </h1>
          <p className="max-w-xl text-sm font-medium leading-6 text-muted-foreground">
            Extra stores and multi-location management are available on Growth
            and Custom.
          </p>
        </header>

        <section className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/[0.06] to-card p-6 shadow-[0_8px_28px_rgba(36,99,243,0.08)] sm:p-8">
          <div className="mx-auto max-w-md text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-primary shadow-sm ring-1 ring-border/70">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <h2 className="mt-4 text-lg font-extrabold tracking-[-0.03em] text-foreground">
              {isStarter
                ? "Upgrade to add more locations"
                : "Location limit reached"}
            </h2>
            <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">
              {isStarter ? (
                <>
                  Your <strong className="text-foreground">{plan.name}</strong>{" "}
                  plan includes{" "}
                  <strong className="text-foreground">
                    {plan.businesses} location
                  </strong>
                  . Upgrade to Growth (3) or contact us for Custom to add more stores.
                </>
              ) : (
                <>
                  Your <strong className="text-foreground">{plan.name}</strong>{" "}
                  plan supports up to{" "}
                  <strong className="text-foreground">{plan.businesses}</strong>{" "}
                  locations. You are using {usage.businesses}. Contact us for a
                  Custom plan with more capacity.
                </>
              )}
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button asChild>
                <Link href="/dashboard/billing">View plans &amp; upgrade</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard/stores">Back to stores</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <header className="space-y-1.5">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">
          Locations
        </p>
        <h1 className="text-2xl font-extrabold tracking-[-0.05em] text-foreground sm:text-3xl">
          Add a location
        </h1>
        <p className="max-w-2xl text-sm font-medium leading-6 text-muted-foreground">
          Create another store or branch. This does not reopen first-time
          onboarding.
        </p>
      </header>
      <BusinessForm />
    </div>
  );
}
