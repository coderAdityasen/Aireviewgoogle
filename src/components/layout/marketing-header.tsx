import Link from "next/link";
import { Button } from "@/components/ui/button";

export function MarketingHeader() {
  return (
    <header className="border-b border-border/70 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-7">
        <Link href="/" className="flex items-center gap-2 text-xl font-extrabold tracking-[-0.06em]">
          <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-primary text-sm text-white shadow-[0_6px_16px_rgba(36,99,243,0.25)]">R</span>
          Review<span className="text-primary">Flow</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm font-bold">
          <Link className="hidden rounded-lg px-3 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground sm:inline" href="/pricing">
            Pricing
          </Link>
          <Link className="hidden rounded-lg px-3 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground sm:inline" href="/privacy">
            Privacy
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Sign up</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
