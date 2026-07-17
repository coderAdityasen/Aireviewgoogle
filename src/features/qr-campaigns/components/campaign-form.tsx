"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createQrCampaignAction } from "@/features/qr-campaigns/server/actions";

export function CampaignForm({ businessId }: { businessId: string }) {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          try {
            await createQrCampaignAction({ businessId, name });
            setName("");
            toast.success("QR campaign created.");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to create campaign.");
          }
        });
      }}
    >
      <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Reception desk" required />
      <Button loading={pending} loadingLabel="Creating…" className="sm:w-fit">
        <Plus className="h-4 w-4" />
        Add
      </Button>
    </form>
  );
}
