import { AuthForm } from "@/features/auth/components/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <CardDescription>We will send reset instructions to your account email.</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm mode="forgot" />
        </CardContent>
      </Card>
    </main>
  );
}
