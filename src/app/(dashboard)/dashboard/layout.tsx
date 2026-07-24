import { AppShell } from "@/components/layout/app-shell";
import { getOwnerBusinesses } from "@/features/businesses/server/queries";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/roles";
import { requirePaidOwner } from "@/lib/billing/entitlements";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Gate the entire dashboard: expired starter trial → /billing
  const { entitlements } = await requirePaidOwner();
  const [businesses, user, profile] = await Promise.all([
    getOwnerBusinesses(),
    getCurrentUser(),
    getCurrentProfile(),
  ]);

  return (
    <AppShell
      mode="owner"
      title="Analytics Overview"
      businesses={businesses}
      account={{ name: profile?.full_name, email: user?.email }}
      planKey={entitlements.plan.key}
      privateFeedback={entitlements.privateFeedback}
    >
      {children}
    </AppShell>
  );
}
