import { AppShell } from "@/components/layout/app-shell";
import { requireAdmin } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <AppShell mode="admin" title="Super admin">
      {children}
    </AppShell>
  );
}
