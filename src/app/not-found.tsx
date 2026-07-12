import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center p-6">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-muted-foreground">The page may have moved or is unavailable.</p>
      <Button asChild className="mt-6 w-fit">
        <Link href="/">Go home</Link>
      </Button>
    </main>
  );
}
