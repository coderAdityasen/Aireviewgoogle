import { AppShell } from "@/components/layout/app-shell";
import { requireActiveOwner } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireActiveOwner();
  return (
    <AppShell mode="owner" title="Business dashboard">
      {children}
    </AppShell>
  );
}
