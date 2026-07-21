import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

function DefaultEmptyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: { href: string; label: string };
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-primary/20 bg-gradient-to-b from-card to-muted/30 p-10 text-center shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary shadow-inner">
        {icon ?? <DefaultEmptyIcon />}
      </div>
      <h2 className="mt-5 text-xl font-extrabold tracking-[-0.04em]">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-muted-foreground">
        {description}
      </p>
      {action ? (
        <Button asChild className="mt-6">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      ) : null}
    </div>
  );
}
