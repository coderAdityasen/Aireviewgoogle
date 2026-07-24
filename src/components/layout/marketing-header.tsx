import Link from "next/link";
import { BrandMark } from "@/components/layout/brand-mark";
import { Button } from "@/components/ui/button";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-white/85 backdrop-blur-xl supports-[backdrop-filter]:bg-white/75">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3.5 sm:px-7 sm:py-4">
        <BrandMark />
        <nav className="flex items-center gap-1.5 text-sm font-bold sm:gap-2" aria-label="Marketing">
          <Link
            className="hidden cursor-pointer rounded-xl px-3 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground sm:inline"
            href="/#how-it-works"
          >
            How it works
          </Link>
          <Link
            className="hidden cursor-pointer rounded-xl px-3 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground sm:inline"
            href="/pricing"
          >
            Pricing
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Get started</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
