import { BRAND } from "@/config/brand";
import { cn } from "@/lib/utils";

type PoweredByProps = {
  className?: string;
  /** Light text for dark panels (login/signup side panel). */
  light?: boolean;
};

/** Standard attribution line — clickable link to adsngrow.in */
export function PoweredBy({ className, light = false }: PoweredByProps) {
  return (
    <p
      className={cn(
        "text-center text-[11px] font-semibold tracking-[0.02em]",
        light ? "text-white/45" : "text-muted-foreground",
        className,
      )}
    >
      <span className={light ? "text-white/40" : "text-muted-foreground"}>
        Powered by{" "}
      </span>
      <a
        href={BRAND.poweredByUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "font-extrabold underline-offset-2 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm",
          light
            ? "text-white/75 hover:text-white"
            : "text-foreground/80 hover:text-primary",
        )}
      >
        {BRAND.poweredByCompany}
      </a>
    </p>
  );
}
