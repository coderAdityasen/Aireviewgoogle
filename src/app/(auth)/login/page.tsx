import { AuthForm } from "@/features/auth/components/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; suspended?: string; checkEmail?: string; plan?: string }> }) {
  const params = await searchParams;
  return <main className="grid min-h-screen bg-[#eef1f6] lg:grid-cols-[0.9fr_1.1fr]">
    <div className="hidden bg-[#0b1428] p-14 text-white lg:flex lg:flex-col lg:justify-between"><div><p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#75a7ff]">ReviewFlow workspace</p><h1 className="mt-24 max-w-md text-5xl font-extrabold leading-[1.06] tracking-[-0.07em]">Know what customers are saying before the next decision.</h1></div><p className="max-w-md text-sm font-medium leading-6 text-white/55">A focused workspace for QR campaigns, grounded review drafts and private follow-up.</p></div>
    <div className="flex items-center justify-center px-4 py-10 sm:px-8"><Card className="w-full max-w-md shadow-[0_24px_65px_rgba(35,52,84,0.1)]"><CardHeader><CardTitle className="text-2xl">Log in to ReviewFlow</CardTitle><CardDescription>{params.suspended ? "This account is suspended. Contact support if this is unexpected." : params.checkEmail ? "Check your email to verify your account, then log in." : "Use your business owner or admin account."}</CardDescription></CardHeader><CardContent><AuthForm mode="login" next={params.next ?? (params.plan ? `/billing/checkout?plan=${encodeURIComponent(params.plan)}` : undefined)} plan={params.plan} /></CardContent></Card></div>
  </main>;
}
