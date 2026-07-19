"use client";

import { ArrowRight, Check, CheckCircle2, ExternalLink, LogOut, QrCode, Settings, ShieldCheck, Store, type LucideIcon } from "lucide-react";

const icons = {
  check: CheckCircle2,
  arrowRight: ArrowRight,
  checkSmall: Check,
  externalLink: ExternalLink,
  logout: LogOut,
  qr: QrCode,
  settings: Settings,
  shield: ShieldCheck,
  store: Store
} satisfies Record<string, LucideIcon>;

export function Icon({ name, className }: { name: keyof typeof icons; className?: string }) {
  const Component = icons[name];
  return <Component aria-hidden="true" className={className} />;
}
