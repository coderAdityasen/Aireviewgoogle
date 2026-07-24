import Link from "next/link";
import { MarketingHeader } from "@/components/layout/marketing-header";
import { PlanSelection } from "@/components/billing/plan-selection";
import { getCurrentUser } from "@/lib/auth/roles";
import { redirect } from "next/navigation";

export default async function PricingPage() {
  if (await getCurrentUser()) redirect("/billing");

  return (
    <>
      <MarketingHeader />
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-7 sm:py-24">
        <div className="mx-auto max-w-2xl text-center sm:text-left">
          <p className="section-eyebrow">Starter free trial · paid upgrades</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.06em] sm:text-5xl">
            Try free for 7 days, then pick Growth or Pro
          </h1>
          <p className="mt-5 text-base font-medium leading-7 text-muted-foreground">
            Starter includes one location, three AI regenerations total, and the
            last 10 reviews. Upgrade for unlimited regenerations, private
            feedback, and the full reviews feed.
          </p>
        </div>

        <div className="mt-12">
          <PlanSelection />
        </div>

        <p className="mt-10 text-center text-sm font-medium text-muted-foreground">
          After the 7-day Starter trial, the dashboard and public QR flows lock
          until you upgrade. Growth and Pro are billed monthly via Razorpay Test
          Mode in this project.
        </p>
        <p className="mt-4 text-center text-sm font-medium">
          <Link href="/signup" className="cursor-pointer font-extrabold text-primary hover:underline">
            Create an account to start your free trial
          </Link>
        </p>
      </main>
    </>
  );
}
