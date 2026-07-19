"use client";

import Link from "next/link";
import { useState } from "react";

export function SettingsTabs({ businessId, activeTab }: { businessId: string; activeTab: "configuration" | "responses" }) {
  const [pendingTab, setPendingTab] = useState<"configuration" | "responses" | null>(null);
  const tabs = [
    { key: "configuration" as const, label: "Configuration", href: `/dashboard/businesses/${businessId}/edit` },
    { key: "responses" as const, label: "Responses", href: `/dashboard/businesses/${businessId}/edit?tab=responses` }
  ];

  return (
    <nav className="flex items-end gap-1 border-b border-slate-200" aria-label="Campaign settings sections" role="tablist">
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
            onClick={() => { if (!active) setPendingTab(tab.key); }}
            className={`flex min-h-12 items-center gap-2 rounded-t-xl px-6 text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${active ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
