import { AuthForm } from "@/features/auth/components/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ plan?: string; next?: string }> }) {
  const { plan, next } = await searchParams;
  return <main className="grid min-h-screen bg-[#eef1f6] lg:grid-cols-[0.9fr_1.1fr]">
    <div className="hidden bg-[#0b1428] p-14 text-white lg:flex lg:flex-col lg:justify-between"><div><p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#75a7ff]">ReviewFlow workspace</p><h1 className="mt-24 max-w-md text-5xl font-extrabold leading-[1.06] tracking-[-0.07em]">Turn honest feedback into a repeatable habit.</h1></div><p className="max-w-md text-sm font-medium leading-6 text-white/55">Your customer writes what really happened. Your team gets a clear signal. Google stays in the customer’s hands.</p></div>
    <div className="flex items-center justify-center px-4 py-10 sm:px-8"><Card className="w-full max-w-md shadow-[0_24px_65px_rgba(35,52,84,0.1)]"><CardHeader><CardTitle className="text-2xl">Create your account</CardTitle><CardDescription>Email verification is required before using protected dashboard features.</CardDescription></CardHeader><CardContent><AuthForm mode="signup" plan={plan} next={next} /></CardContent></Card></div>
  </main>;
}
