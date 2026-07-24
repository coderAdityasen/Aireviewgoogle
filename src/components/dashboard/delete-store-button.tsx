"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteBusinessAction } from "@/features/businesses/server/actions";

export function DeleteStoreButton({
  businessId,
  businessName,
}: {
  businessId: string;
  businessName: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`Delete ${businessName}`}
      title="Delete store"
      onClick={() => {
        const confirmed = window.confirm(
          `Delete "${businessName}"? This permanently removes campaigns, analytics, and feedback for this location.`,
        );
        if (!confirmed) return;
        startTransition(async () => {
          try {
            await deleteBusinessAction(businessId, "DELETE");
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Unable to delete store.",
            );
          }
        });
      }}
      className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-xl border border-red-100 bg-red-50 text-red-400 transition hover:border-red-200 hover:bg-red-100 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 6h18" />
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
      </svg>
    </button>
  );
}
