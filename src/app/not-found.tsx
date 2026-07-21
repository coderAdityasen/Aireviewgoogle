import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center p-6 text-center">
      <div className="w-full rounded-[1.5rem] border border-border/70 bg-card px-8 py-12 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <p className="text-5xl font-extrabold tracking-[-0.06em] text-primary/20">404</p>
        <h1 className="mt-3 text-2xl font-extrabold tracking-[-0.04em]">Page not found</h1>
        <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">
          The page may have moved or is unavailable.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </main>
  );
}
