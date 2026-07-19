import { AppShell } from "@/components/layout/app-shell";
import { getOwnerBusinesses } from "@/features/businesses/server/queries";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [businesses, user, profile] = await Promise.all([getOwnerBusinesses(), getCurrentUser(), getCurrentProfile()]);
  return (
    <AppShell mode="owner" title="Business dashboard" businesses={businesses} account={{ name: profile?.full_name, email: user?.email }}>
      {children}
    </AppShell>
  );
}
