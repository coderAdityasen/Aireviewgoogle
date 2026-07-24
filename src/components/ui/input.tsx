import * as React from "react";
import { cn } from "@/lib/utils";

const POINTER_INPUT_TYPES = new Set([
  "button",
  "submit",
  "reset",
  "checkbox",
  "radio",
  "file",
  "color",
  "range",
  "image",
]);

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    const cursorClass = POINTER_INPUT_TYPES.has(type ?? "")
      ? "cursor-pointer"
      : "cursor-text";

    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm text-foreground shadow-sm transition-all duration-150 file:cursor-pointer file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/65 hover:border-primary/30 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/12 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-input",
          cursorClass,
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
