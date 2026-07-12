import { AuthForm } from "@/features/auth/components/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string; suspended?: string; checkEmail?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
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
          <AuthForm mode="login" next={params.next} />
        </CardContent>
      </Card>
    </main>
  );
}
