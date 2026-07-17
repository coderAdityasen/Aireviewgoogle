"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

export function FormSubmitButton({ children, loadingLabel = "Saving…", ...props }: ButtonProps & { loadingLabel?: string }) {
  const { pending } = useFormStatus();
  return <Button {...props} type="submit" loading={pending} loadingLabel={loadingLabel}>{children}</Button>;
}
