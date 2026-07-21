import Link from "next/link";
import { AuthForm } from "@/features/auth/components/auth-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#eef1f6] px-4 py-10">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 text-lg font-extrabold tracking-[-0.05em]"
      >
        <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-primary text-sm text-white">
          R
        </span>
        Review<span className="text-primary">Flow</span>
      </Link>
      <Card className="w-full max-w-md border-border/70 shadow-[0_24px_65px_rgba(35,52,84,0.1)]">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl tracking-[-0.04em]">Reset password</CardTitle>
          <CardDescription>
            We will send reset instructions to your account email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm mode="forgot" />
        </CardContent>
      </Card>
    </main>
  );
}
