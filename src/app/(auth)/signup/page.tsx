import { AuthForm } from "@/features/auth/components/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan } = await searchParams;
  return (
    <main className="grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]">
      <div className="hidden bg-[#0b1730] p-12 text-white lg:flex lg:flex-col lg:justify-between"><div><p className="text-lg font-semibold">ReviewFlow</p><h1 className="mt-24 max-w-md text-5xl font-semibold leading-tight">Turn honest feedback into a repeatable habit.</h1></div><p className="max-w-md text-sm text-white/70">Your customer writes what really happened. Your team gets a clear signal. Google stays in the customer’s hands.</p></div>
      <div className="flex items-center justify-center px-4 py-10"><Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>Email verification is required before using protected dashboard features.</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm mode="signup" plan={plan} />
        </CardContent>
      </Card></div>
    </main>
  );
}
