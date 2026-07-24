import { AppShell } from "@/components/layout/app-shell";
import { getOwnerBusinesses } from "@/features/businesses/server/queries";
import { getDashboardNavCounts } from "@/features/businesses/server/gmb-actions";
import { getCurrentProfile } from "@/lib/auth/roles";
import { requirePaidOwner } from "@/lib/billing/entitlements";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, entitlements } = await requirePaidOwner();
  const [businesses, profile, navCounts] = await Promise.all([
    getOwnerBusinesses(),
    getCurrentProfile(),
    getDashboardNavCounts(user.id),
  ]);

  // GMB suggestions stay empty until the user clicks Generate on the GMB page.

  return (
    <AppShell
      mode="owner"
      title="Analytics Overview"
      businesses={businesses}
      account={{ name: profile?.full_name, email: user?.email }}
      planKey={entitlements.plan.key}
      privateFeedback={entitlements.privateFeedback}
      navCounts={navCounts}
    >
      {children}
    </AppShell>
  );
}
