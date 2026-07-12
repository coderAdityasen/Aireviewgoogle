"use client";

import { CheckCircle2, LogOut, QrCode, ShieldCheck, type LucideIcon } from "lucide-react";

const icons = {
  check: CheckCircle2,
  logout: LogOut,
  qr: QrCode,
  shield: ShieldCheck
} satisfies Record<string, LucideIcon>;

export function Icon({ name, className }: { name: keyof typeof icons; className?: string }) {
  const Component = icons[name];
  return <Component aria-hidden="true" className={className} />;
}
