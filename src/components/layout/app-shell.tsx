import { AppSidebar } from "@/components/layout/app-sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import type { Business } from "@/types/database";

export function AppShell({
  children,
  mode,
  title,
  businesses
}: {
  children: React.ReactNode;
  mode: "owner" | "admin";
  title: string;
  businesses?: Array<Pick<Business, "id" | "name" | "is_active">>;
}) {
  return (
    <div className="min-h-screen">
      <AppSidebar mode={mode} />
      <div className="lg:pl-[270px]"><main className="mx-auto max-w-[1440px] px-4 py-0 sm:px-6 lg:px-8"><DashboardHeader title={title} mode={mode} businesses={businesses} />{children}</main></div>
    </div>
  );
}
