import Link from "next/link";
import { BRAND } from "@/config/brand";
import { cn } from "@/lib/utils";

/** ReviewFlow wordmark used in headers and auth panels. */
export function BrandMark({
  href = "/",
  className,
  light = false,
  compact = false,
}: {
  href?: string;
  className?: string;
  /** For dark backgrounds */
  light?: boolean;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex cursor-pointer items-center gap-2 font-extrabold tracking-[-0.06em]",
        compact ? "text-lg" : "text-xl",
        light ? "text-white" : "text-foreground",
        className,
      )}
    >
      <span
        className={cn(
          "grid place-items-center rounded-[10px] bg-primary font-extrabold text-white shadow-[0_6px_16px_rgba(36,99,243,0.28)]",
          compact ? "h-8 w-8 text-sm" : "h-9 w-9 text-sm",
        )}
      >
        {BRAND.initial}
      </span>
      <span>
        Review<span className={light ? "text-[#5b91ff]" : "text-primary"}>Flow</span>
      </span>
    </Link>
  );
}
