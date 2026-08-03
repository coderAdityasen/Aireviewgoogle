import Link from "next/link";
import { MarketingHeader } from "@/components/layout/marketing-header";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getGrowthBillingOption, PLANS } from "@/config/plans";

const growthYear = getGrowthBillingOption("12m")!;
const growthMonth = getGrowthBillingOption("1m")!;
const growthSix = getGrowthBillingOption("6m")!;

const steps = [
  [
    "01",
    "Create a campaign",
    "Set up a location, validate its official Google destination and create a named QR campaign.",
  ],
  [
    "02",
    "Let customers lead",
    "Customers confirm the experience, select a rating and add the details they want reflected.",
  ],
  [
    "03",
    "Open Google by choice",
    "They can edit, copy, write their own or send private feedback. Google is never auto-posted.",
  ],
] as const;

const features = [
  {
    title: "Grounded AI drafts",
    copy: "Suggestions stay tied to the rating and tags the customer actually selected.",
  },
  {
    title: "Private follow-up inbox",
    copy: "Catch issues early when customers prefer to message you directly.",
  },
  {
    title: "QR and campaign analytics",
    copy: "See scans, draft activity and Google page opens without guessing.",
  },
  {
    title: "Subscription controls",
    copy: "Razorpay-backed plans with clear limits on locations, QR codes and AI usage.",
  },
] as const;

const faqs = [
  [
    "Does ReviewFlow post to Google?",
    "No. It can generate grounded text, copy it and open the official page. The customer chooses the rating and submits directly.",
  ],
  [
    "Can a low rating still reach Google?",
    "Yes. Low ratings can also be shared privately, but the Google option remains available and equally visible.",
  ],
  [
    "What happens if billing stops?",
    "Product features and public QR pages are locked when access expires. Businesses, feedback and analytics are preserved.",
  ],
] as const;

export default function HomePage() {
  return (
    <>
      <MarketingHeader />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-[#0b1428] px-4 py-20 text-white sm:py-28">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 20% 20%, rgba(36,99,243,0.35), transparent), radial-gradient(ellipse 50% 40% at 85% 60%, rgba(91,145,255,0.18), transparent)",
            }}
          />
          <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="animate-fade-up">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#9ec0ff]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                ReviewFlow for growing local businesses
              </p>
              <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
                Make it easier for customers to share what really happened.
              </h1>
              <p className="mt-6 max-w-2xl text-base font-medium leading-8 text-white/65 sm:text-lg">
                A branded QR experience that captures feedback, helps customers shape their own words
                and opens your official Google review page when they choose to continue.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/pricing">
                    See paid plans <Icon name="arrowRight" className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-white/20 bg-white/5 text-white hover:border-white/30 hover:bg-white/10 hover:text-white"
                >
                  <Link href="#how-it-works">How it works</Link>
                </Button>
              </div>
              <dl className="mt-12 grid max-w-lg grid-cols-3 gap-4 border-t border-white/10 pt-8">
                {[
                  ["3 steps", "Customer flow"],
                  ["0 auto-posts", "Customer control"],
                  ["QR first", "In-store ready"],
                ].map(([value, label]) => (
                  <div key={label}>
                    <dt className="text-xs font-semibold text-white/45">{label}</dt>
                    <dd className="mt-1 text-sm font-extrabold sm:text-base">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Product preview card */}
            <div className="animate-fade-up relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
              <div className="absolute -inset-4 rounded-[2.5rem] bg-primary/20 blur-2xl" aria-hidden="true" />
              <div className="relative rounded-[2rem] border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur-sm sm:p-5">
                <div className="rounded-[1.5rem] bg-white p-5 text-slate-950 shadow-2xl sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-extrabold">Customer flow preview</span>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                      Mobile first
                    </span>
                  </div>
                  <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/80 p-5">
                    <p className="text-sm font-bold">How was your experience?</p>
                    <div className="mt-4 flex gap-1.5 text-2xl text-amber-400" aria-hidden="true">
                      ★ ★ ★ ★
                      <span className="text-slate-300">☆</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {["Friendly staff", "Fast service", "Great value"].map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="mt-4 text-sm font-medium leading-6 text-slate-500">
                      Customers describe the experience in their own words before choosing what to do
                      next.
                    </p>
                  </div>
                  <div className="mt-4 rounded-xl bg-primary p-4 text-center text-sm font-bold text-white shadow-[0_8px_20px_rgba(36,99,243,0.25)]">
                    Open Google review page
                  </div>
                  <p className="mt-3 text-center text-[11px] font-semibold text-slate-400">
                    Powered by Adsngrow
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-20 sm:px-7 sm:py-24">
          <p className="section-eyebrow">A clear path</p>
          <h2 className="mt-3 max-w-xl text-3xl font-extrabold tracking-[-0.05em] sm:text-4xl">
            From table tent to thoughtful feedback
          </h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {steps.map(([number, title, copy], index) => (
              <Card
                key={number}
                className="relative overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_16px_40px_rgba(36,99,243,0.1)]"
              >
                <CardHeader>
                  <p className="text-sm font-extrabold text-primary">{number}</p>
                  <CardTitle className="text-xl">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium leading-6 text-muted-foreground">{copy}</p>
                </CardContent>
                {index < steps.length - 1 ? (
                  <div
                    className="pointer-events-none absolute -right-3 top-1/2 hidden h-px w-6 bg-border md:block"
                    aria-hidden="true"
                  />
                ) : null}
              </Card>
            ))}
          </div>
        </section>

        {/* Trust / features */}
        <section className="border-y border-border/70 bg-muted/50 px-4 py-20 sm:px-7 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="section-eyebrow">Built for trust</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.05em] sm:text-4xl">
                Useful signals without pretending to know more than you do
              </h2>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-[1.35rem] border border-border/60 bg-card p-6 shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/15 hover:shadow-[0_14px_36px_rgba(36,99,243,0.08)]"
                >
                  <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon name="checkSmall" className="h-5 w-5" />
                  </div>
                  <p className="font-extrabold tracking-[-0.03em]">{feature.title}</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">
                    {feature.copy}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Plans teaser */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-7 sm:py-24">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="section-eyebrow">Plans</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.05em] sm:text-4xl">
                Start free for 7 days, upgrade when you grow
              </h2>
            </div>
            <Button asChild variant="outline">
              <Link href="/pricing">Compare all plans</Link>
            </Button>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {Object.values(PLANS).map((plan, index) => (
              <Card
                key={plan.key}
                className={
                  index === 1
                    ? "border-2 border-primary/40 shadow-[0_16px_40px_rgba(36,99,243,0.12)]"
                    : "transition-all duration-200 hover:border-primary/20"
                }
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>{plan.name}</CardTitle>
                    {plan.key === "starter" ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700">
                        Free trial
                      </span>
                    ) : index === 1 ? (
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-primary">
                        Popular
                      </span>
                    ) : null}
                  </div>
                  <div className="pt-2">
                    <p className="text-3xl font-extrabold tracking-[-0.05em]">
                      {plan.key === "starter" ? (
                        <>
                          Free
                          <span className="text-sm font-semibold text-muted-foreground"> / 7 days</span>
                        </>
                      ) : plan.contactSales ? (
                        "Custom"
                      ) : (
                        <>
                          ₹{growthYear.priceInr.toLocaleString("en-IN")}
                          <span className="text-sm font-semibold text-muted-foreground">/year</span>
                        </>
                      )}
                    </p>
                    {plan.key !== "starter" && !plan.contactSales ? (
                      <p className="mt-1.5 text-xs font-medium text-muted-foreground">
                        From ₹{growthMonth.priceInr.toLocaleString("en-IN")}/mo · or 6 mo ₹
                        {growthSix.priceInr.toLocaleString("en-IN")}
                      </p>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium text-muted-foreground">
                    {plan.contactSales
                      ? plan.tagline
                      : `${plan.businesses} location${plan.businesses === 1 ? "" : "s"} · ${plan.qrCampaigns} QR · ${plan.aiGenerations < 0 ? "Unlimited" : plan.aiGenerations} AI regenerations`}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-blue-50/70 px-4 py-20 sm:px-7 sm:py-24">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-extrabold tracking-[-0.05em] sm:text-4xl">
              Questions business owners ask
            </h2>
            <div className="mt-9 space-y-3">
              {faqs.map(([question, answer]) => (
                <details
                  key={question}
                  className="group rounded-2xl border border-border/50 bg-card p-5 shadow-sm transition open:shadow-md"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-extrabold tracking-[-0.02em]">
                    <span>{question}</span>
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-sm text-muted-foreground transition group-open:bg-primary/10 group-open:text-primary">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm font-medium leading-6 text-muted-foreground">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-7 sm:py-24">
          <div className="rounded-[2rem] border border-border/60 bg-gradient-to-b from-card to-muted/40 px-6 py-14 shadow-[0_12px_40px_rgba(15,23,42,0.06)] sm:px-12">
            <h2 className="text-3xl font-extrabold tracking-[-0.05em] sm:text-4xl">
              Give your team a reliable next step after every customer interaction
            </h2>
            <p className="mx-auto mt-4 max-w-2xl font-medium text-muted-foreground">
              Choose a plan, build your first flow and test it before sharing a QR code.
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link href="/pricing">
                Choose a paid plan <Icon name="arrowRight" className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <footer className="border-t border-border/70 bg-white px-4 py-10 sm:px-7">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 text-sm font-medium text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-[11px] font-extrabold text-white">
              R
            </span>
            <p>© 2026 ReviewFlow</p>
          </div>
          <div className="flex flex-wrap gap-5">
            <Link className="cursor-pointer transition hover:text-foreground" href="/privacy">
              Privacy
            </Link>
            <Link className="cursor-pointer transition hover:text-foreground" href="/terms">
              Terms
            </Link>
            <Link className="cursor-pointer transition hover:text-foreground" href="/acceptable-use">
              Acceptable use
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
