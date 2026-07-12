import Link from "next/link";
import { Button } from "@/components/ui/button";

export function MarketingHeader() {
  return (
    <header className="border-b bg-background/90">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-semibold">
          ReviewFlow
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link className="hidden px-2 py-1 text-muted-foreground hover:text-foreground sm:inline" href="/pricing">
            Pricing
          </Link>
          <Link className="hidden px-2 py-1 text-muted-foreground hover:text-foreground sm:inline" href="/privacy">
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
