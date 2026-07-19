import Link from "next/link";
import { MarketingHeader } from "@/components/layout/marketing-header";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLANS } from "@/config/plans";

const steps = [
  ["01", "Create a campaign", "Set up a location, validate its official Google destination and create a named QR campaign."],
  ["02", "Let customers lead", "Customers confirm the experience, select a rating and add the details they want reflected."],
  ["03", "Open Google by choice", "They can edit, copy, write their own or send private feedback. Google is never auto-posted."]
];

const faqs = [
  ["Does ReviewFlow post to Google?", "No. It can generate grounded text, copy it and open the official page. The customer chooses the rating and submits directly."],
  ["Can a low rating still reach Google?", "Yes. Low ratings can also be shared privately, but the Google option remains available and equally visible."],
  ["What happens if billing stops?", "Product features and public QR pages are locked when access expires. Businesses, feedback and analytics are preserved."]
];

export default function HomePage() {
  return <>
    <MarketingHeader />
    <main>
      <section className="bg-[#0b1428] px-4 py-24 text-white sm:py-32">
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.08fr_0.92fr]">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#75a7ff]">ReviewFlow for growing local businesses</p>
            <h1 className="mt-6 max-w-3xl text-5xl font-extrabold leading-[1.04] tracking-[-0.07em] sm:text-7xl">Make it easier for customers to share what really happened.</h1>
            <p className="mt-7 max-w-2xl text-lg font-medium leading-8 text-white/65">A branded QR experience that captures feedback, helps customers shape their own words and opens your official Google review page when they choose to continue.</p>
            <div className="mt-9 flex flex-wrap gap-3"><Button asChild size="lg"><Link href="/pricing">See paid plans <Icon name="arrowRight" className="h-4 w-4" /></Link></Button><Button asChild variant="outline" size="lg" className="border-white/20 bg-white/5 text-white hover:bg-white/10"><Link href="#how-it-works">How it works</Link></Button></div>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-white/10 p-5 shadow-2xl"><div className="rounded-[1.5rem] bg-white p-6 text-slate-950 shadow-2xl"><div className="flex items-center justify-between"><span className="text-sm font-extrabold">Customer flow preview</span><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Mobile first</span></div><div className="mt-7 rounded-2xl border p-5"><p className="text-sm font-bold">How was your experience?</p><div className="mt-5 flex gap-2 text-2xl text-amber-500">★ ★ ★ ★ ☆</div><p className="mt-5 text-sm font-medium leading-6 text-slate-500">Customers describe the experience in their own words before choosing what to do next.</p></div><div className="mt-4 rounded-xl bg-blue-600 p-4 text-sm font-bold text-white">Open Google review page</div></div></div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-24 sm:px-7"><p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary">A clear path</p><h2 className="mt-3 text-4xl font-extrabold tracking-[-0.06em]">From table tent to thoughtful feedback</h2><div className="mt-12 grid gap-5 md:grid-cols-3">{steps.map(([number, title, copy]) => <Card key={number}><CardHeader><p className="text-sm font-extrabold text-primary">{number}</p><CardTitle className="text-xl">{title}</CardTitle></CardHeader><CardContent><p className="text-sm font-medium leading-6 text-muted-foreground">{copy}</p></CardContent></Card>)}</div></section>

      <section className="border-y bg-[#eef1f6] px-4 py-24 sm:px-7"><div className="mx-auto max-w-7xl"><div className="max-w-2xl"><p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary">Built for trust</p><h2 className="mt-3 text-4xl font-extrabold tracking-[-0.06em]">Useful signals without pretending to know more than you do</h2></div><div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">{["Grounded AI drafts", "Private follow-up inbox", "QR and campaign analytics", "Razorpay subscription controls"].map((feature) => <div key={feature} className="rounded-[1.5rem] border border-transparent bg-card p-6 shadow-[0_12px_35px_rgba(35,52,84,0.05)]"><p className="font-extrabold">{feature}</p><p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">Designed around explicit customer input and server-verified owner access.</p></div>)}</div></div></section>

      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-7"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary">Paid plans</p><h2 className="mt-3 text-4xl font-extrabold tracking-[-0.06em]">Start with the locations you have</h2></div><Button asChild variant="outline"><Link href="/pricing">Compare all plans</Link></Button></div><div className="mt-10 grid gap-5 md:grid-cols-3">{Object.values(PLANS).map((plan) => <Card key={plan.key}><CardHeader><CardTitle>{plan.name}</CardTitle><p className="pt-2 text-3xl font-extrabold">₹{plan.priceInr.toLocaleString("en-IN")}<span className="text-sm font-semibold text-muted-foreground">/month</span></p></CardHeader><CardContent><p className="text-sm font-medium text-muted-foreground">{plan.businesses} location{plan.businesses === 1 ? "" : "s"} and {plan.qrCampaigns} QR campaigns.</p></CardContent></Card>)}</div></section>

      <section className="bg-blue-50 px-4 py-24 sm:px-7"><div className="mx-auto max-w-3xl"><h2 className="text-4xl font-extrabold tracking-[-0.06em]">Questions business owners ask</h2><div className="mt-9 space-y-4">{faqs.map(([question, answer]) => <details key={question} className="rounded-2xl border border-transparent bg-card p-5 shadow-sm"><summary className="cursor-pointer font-extrabold">{question}</summary><p className="mt-3 text-sm font-medium leading-6 text-muted-foreground">{answer}</p></details>)}</div></div></section>

      <section className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-7"><h2 className="text-4xl font-extrabold tracking-[-0.06em]">Give your team a reliable next step after every customer interaction</h2><p className="mx-auto mt-4 max-w-2xl font-medium text-muted-foreground">Choose a plan, build your first flow and test it before sharing a QR code.</p><Button asChild size="lg" className="mt-8"><Link href="/pricing">Choose a paid plan</Link></Button></section>
    </main>
    <footer className="border-t bg-white px-4 py-9 sm:px-7"><div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-4 text-sm font-medium text-muted-foreground"><p>© 2026 ReviewFlow</p><div className="flex gap-4"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/acceptable-use">Acceptable use</Link></div></div></footer>
  </>;
}
