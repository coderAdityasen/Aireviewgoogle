import { AppShell } from "@/components/layout/app-shell";
import { requireActiveOwner } from "@/lib/auth/roles";
import { getOwnerBusinesses } from "@/features/businesses/server/queries";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireActiveOwner();
  const businesses = await getOwnerBusinesses();
  return (
    <AppShell mode="owner" title="Business dashboard" businesses={businesses}>
      {children}
    </AppShell>
  );
}
