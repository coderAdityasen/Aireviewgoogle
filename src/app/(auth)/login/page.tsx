import { AuthForm } from "@/features/auth/components/auth-form";
import { BrandMark } from "@/components/layout/brand-mark";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    suspended?: string;
    checkEmail?: string;
    plan?: string;
  }>;
}) {
  const params = await searchParams;
  const description = params.suspended
    ? "This account is suspended. Contact support if this is unexpected."
    : params.checkEmail
      ? "Check your email to verify your account, then log in."
      : "Use your business owner or admin account.";

  return (
    <main className="grid min-h-screen bg-[#eef1f6] lg:grid-cols-[0.95fr_1.05fr]">
      <div className="relative hidden overflow-hidden bg-[#0b1428] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 30% 20%, rgba(36,99,243,0.4), transparent), radial-gradient(ellipse 50% 40% at 80% 80%, rgba(91,145,255,0.15), transparent)",
          }}
        />
        <div className="relative">
          <BrandMark light href="/" />
          <p className="mt-16 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#75a7ff]">
            ReviewFlow workspace
          </p>
          <h1 className="mt-5 max-w-md text-4xl font-extrabold leading-[1.08] tracking-[-0.06em] xl:text-5xl">
            Know what customers are saying before the next decision.
          </h1>
        </div>
        <p className="relative max-w-md text-sm font-medium leading-6 text-white/55">
          A focused workspace for QR campaigns, grounded review drafts and private follow-up.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <BrandMark className="mb-8 lg:hidden" compact />
        <Card className="w-full max-w-md border-border/70 shadow-[0_24px_65px_rgba(35,52,84,0.1)]">
          <CardHeader className="space-y-2 pb-4">
            <CardTitle className="text-2xl tracking-[-0.04em]">Log in to ReviewFlow</CardTitle>
            <CardDescription
              className={
                params.suspended
                  ? "rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900"
                  : params.checkEmail
                    ? "rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-primary"
                    : undefined
              }
            >
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuthForm
              mode="login"
              next={
                params.next ??
                (params.plan
                  ? `/billing/checkout?plan=${encodeURIComponent(params.plan)}`
                  : undefined)
              }
              plan={params.plan}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
