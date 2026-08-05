import Link from "next/link";
import { BrandMark } from "@/components/layout/brand-mark";
import { PoweredBy } from "@/components/layout/powered-by";
import { UpdatePasswordForm } from "@/features/auth/components/update-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function UpdatePasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#eef1f6] px-4 py-10">
      <BrandMark className="mb-8" compact />
      <Card className="w-full max-w-md border-border/70 shadow-[0_24px_65px_rgba(35,52,84,0.1)]">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl tracking-[-0.04em]">
            Choose a new password
          </CardTitle>
          <CardDescription>
            {user
              ? "Enter a new password for your ReviewFlow account."
              : "Open the reset link from your email first. If it expired, request a new one."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user ? (
            <UpdatePasswordForm email={user.email ?? undefined} />
          ) : (
            <div className="space-y-4 text-center">
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm font-medium text-amber-900">
                No active reset session. Use the link in your email, or request a
                new reset.
              </p>
              <Link
                href="/forgot-password"
                className="inline-flex font-extrabold text-primary hover:underline"
              >
                Request reset link
              </Link>
              <span className="mx-2 text-muted-foreground">·</span>
              <Link
                href="/login"
                className="inline-flex font-extrabold text-primary hover:underline"
              >
                Back to login
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
      <PoweredBy className="mt-8" />
    </main>
  );
}
