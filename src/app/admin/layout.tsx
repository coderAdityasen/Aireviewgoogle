import { AppShell } from "@/components/layout/app-shell";
import { getCurrentProfile, getCurrentUser, requireAdmin } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const [user, profile] = await Promise.all([getCurrentUser(), getCurrentProfile()]);
  return (
    <AppShell mode="admin" title="Super admin" account={{ name: profile?.full_name, email: user?.email }}>
      {children}
    </AppShell>
  );
}
