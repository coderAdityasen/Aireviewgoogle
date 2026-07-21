import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { ButtonSpinner } from "@/components/ui/loading-states";

const buttonVariants = cva(
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] motion-reduce:active:scale-100",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_8px_18px_rgba(36,99,243,0.22)] hover:-translate-y-0.5 hover:bg-[#1f56d9] hover:shadow-[0_12px_28px_rgba(36,99,243,0.28)]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/90",
        outline:
          "border border-border bg-card text-foreground shadow-sm hover:border-primary/35 hover:bg-primary/5 hover:text-primary",
        ghost:
          "text-muted-foreground hover:bg-muted hover:text-foreground",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        soft:
          "bg-primary/10 text-primary hover:bg-primary/15",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-10 px-4 text-xs",
        lg: "h-12 px-6 text-[15px]",
        icon: "h-11 w-11 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingLabel?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      loadingLabel = "Working…",
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Comp>
      );
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
        disabled={loading || disabled}
        aria-busy={loading || undefined}
      >
        {loading ? (
          <span className="inline-flex items-center justify-center gap-2">
            <ButtonSpinner label={loadingLabel} />
            <span>{loadingLabel}</span>
          </span>
        ) : (
          <span className="inline-flex items-center justify-center gap-2">
            {children}
          </span>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
