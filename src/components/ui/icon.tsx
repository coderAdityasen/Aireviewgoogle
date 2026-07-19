"use client";

import { ArrowRight, Check, CheckCircle2, ExternalLink, LogOut, MessageSquare, QrCode, Settings, ShieldCheck, Star, Store, type LucideIcon } from "lucide-react";

const icons = {
  check: CheckCircle2,
  arrowRight: ArrowRight,
  checkSmall: Check,
  externalLink: ExternalLink,
  logout: LogOut,
  message: MessageSquare,
  qr: QrCode,
  settings: Settings,
  shield: ShieldCheck,
  star: Star,
  store: Store
} satisfies Record<string, LucideIcon>;

export function Icon({ name, className }: { name: keyof typeof icons; className?: string }) {
  const Component = icons[name];
  return <Component aria-hidden="true" className={className} />;
}
