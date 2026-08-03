import Link from "next/link";
import { BRAND } from "@/config/brand";
import { PoweredBy } from "@/components/layout/powered-by";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/70 bg-white px-4 py-10 sm:px-7">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm font-medium text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-[11px] font-extrabold text-white">
              {BRAND.initial}
            </span>
            <p>© {new Date().getFullYear()} {BRAND.name}</p>
          </div>
          <div className="flex flex-wrap gap-5">
            <Link
              className="cursor-pointer transition hover:text-foreground"
              href="/privacy"
            >
              Privacy
            </Link>
            <Link
              className="cursor-pointer transition hover:text-foreground"
              href="/terms"
            >
              Terms
            </Link>
            <Link
              className="cursor-pointer transition hover:text-foreground"
              href="/acceptable-use"
            >
              Acceptable use
            </Link>
            <Link
              className="cursor-pointer transition hover:text-foreground"
              href="/pricing"
            >
              Pricing
            </Link>
          </div>
        </div>
        <PoweredBy />
      </div>
    </footer>
  );
}
