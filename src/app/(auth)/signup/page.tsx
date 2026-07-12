import { AuthForm } from "@/features/auth/components/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>Email verification is required before using protected dashboard features.</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm mode="signup" />
        </CardContent>
      </Card>
    </main>
  );
}
