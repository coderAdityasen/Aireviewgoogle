import { BRAND } from "@/config/brand";
import { cn } from "@/lib/utils";

type PoweredByProps = {
  className?: string;
  /** Light text for dark panels (login/signup side panel). */
  light?: boolean;
};

/** Standard attribution line — use on auth screens and marketing footers. */
export function PoweredBy({ className, light = false }: PoweredByProps) {
  return (
    <p
      className={cn(
        "text-center text-[11px] font-semibold tracking-[0.02em]",
        light ? "text-white/45" : "text-muted-foreground",
        className,
      )}
    >
      {BRAND.poweredBy}
    </p>
  );
}
