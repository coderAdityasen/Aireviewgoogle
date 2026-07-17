import { AppShell } from "@/components/layout/app-shell";
import { getOwnerBusinesses } from "@/features/businesses/server/queries";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const businesses = await getOwnerBusinesses();
  return (
    <AppShell mode="owner" title="Business dashboard" businesses={businesses}>
      {children}
    </AppShell>
  );
}
