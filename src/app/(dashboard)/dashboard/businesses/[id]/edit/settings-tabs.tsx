"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function SettingsTabs({
  businessId,
  activeTab,
}: {
  businessId: string;
  activeTab: "configuration" | "responses";
}) {
  const [pendingTab, setPendingTab] = useState<"configuration" | "responses" | null>(
    null,
  );
  const tabs = [
    {
      key: "configuration" as const,
      label: "Configuration",
      href: `/dashboard/businesses/${businessId}/edit`,
      description: "Location & destination",
    },
    {
      key: "responses" as const,
      label: "Responses",
      href: `/dashboard/businesses/${businessId}/edit?tab=responses`,
      description: "Customer review flow",
    },
  ];

  return (
    <nav
      className="inline-flex w-full max-w-md rounded-xl border border-border/80 bg-muted/50 p-1 shadow-sm sm:w-auto"
      aria-label="Campaign settings sections"
      role="tablist"
    >
      {tabs.map((tab) => {
        const active = tab.key === activeTab;
        const pending = pendingTab === tab.key;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            role="tab"
            aria-selected={active}
            aria-busy={pending || undefined}
            onClick={() => {
              if (!active) setPendingTab(tab.key);
            }}
            className={cn(
              "flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:min-w-[9.5rem]",
              active
                ? "bg-white text-foreground shadow-sm ring-1 ring-border/60"
                : "text-muted-foreground hover:bg-white/60 hover:text-foreground",
            )}
          >
            <span className="leading-none">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
