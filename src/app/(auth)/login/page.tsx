import { AuthForm } from "@/features/auth/components/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string; suspended?: string; checkEmail?: string; plan?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]">
      <div className="hidden bg-[#0b1730] p-12 text-white lg:flex lg:flex-col lg:justify-between"><div><p className="text-lg font-semibold">ReviewFlow</p><h1 className="mt-24 max-w-md text-5xl font-semibold leading-tight">Know what customers are saying before the next decision.</h1></div><p className="max-w-md text-sm text-white/70">A focused workspace for QR campaigns, grounded review drafts and private follow-up.</p></div>
      <div className="flex items-center justify-center px-4 py-10"><Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Log in to ReviewFlow</CardTitle>
          <CardDescription>
            {params.suspended
              ? "This account is suspended. Contact support if this is unexpected."
              : params.checkEmail
                ? "Check your email to verify your account, then log in."
                : "Use your business owner or admin account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm mode="login" next={params.next ?? (params.plan ? `/billing/checkout?plan=${encodeURIComponent(params.plan)}` : undefined)} plan={params.plan} />
        </CardContent>
      </Card></div>
    </main>
  );
}
