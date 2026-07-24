import { AuthForm } from "@/features/auth/components/auth-form";
import { BrandMark } from "@/components/layout/brand-mark";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; next?: string }>;
}) {
  const { plan, next } = await searchParams;

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
            Turn honest feedback into a repeatable habit.
          </h1>
          <ul className="mt-10 space-y-3 text-sm font-medium text-white/60">
            {[
              "Branded QR customer experience",
              "Grounded AI draft assistance",
              "Private feedback when needed",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-primary/20 text-[10px] font-extrabold text-[#9ec0ff]">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative max-w-md text-sm font-medium leading-6 text-white/55">
          Your customer writes what really happened. Your team gets a clear signal. Google stays in
          the customer&apos;s hands.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <BrandMark className="mb-8 lg:hidden" compact />
        <Card className="w-full max-w-md border-border/70 shadow-[0_24px_65px_rgba(35,52,84,0.1)]">
          <CardHeader className="space-y-2 pb-4">
            <CardTitle className="text-2xl tracking-[-0.04em]">Create your account</CardTitle>
            <CardDescription>
              Email verification is required before using protected dashboard features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuthForm mode="signup" plan={plan} next={next} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
