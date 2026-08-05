import { AppShell } from "@/components/layout/app-shell";
import { getOwnerBusinesses } from "@/features/businesses/server/queries";
import { requirePaidOwner } from "@/lib/billing/entitlements";

/**
 * Dashboard chrome. Kept lean on purpose:
 * - paid gate + profile + businesses only
 * - nav badge counts load client-side after paint (see AppSidebar)
 */
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Single paid gate — React cache() shares this with page-level requirePaidOwner.
  const { profile, entitlements, user } = await requirePaidOwner();
  const businesses = await getOwnerBusinesses();

  return (
    <AppShell
      mode="owner"
      title="Analytics Overview"
      businesses={businesses}
      account={{ name: profile?.full_name, email: user?.email }}
      planKey={entitlements.plan.key}
      privateFeedback={entitlements.privateFeedback}
      // Badges deferred → faster first paint / navigation
      deferNavCounts
    >
      {children}
    </AppShell>
  );
}
