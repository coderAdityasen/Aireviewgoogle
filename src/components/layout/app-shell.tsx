import { AppSidebar } from "@/components/layout/app-sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import type { Business } from "@/types/database";
import type { PlanKey } from "@/config/plans";

export function AppShell({
  children,
  mode,
  title,
  businesses,
  account,
  planKey,
  privateFeedback = true,
}: {
  children: React.ReactNode;
  mode: "owner" | "admin";
  title: string;
  businesses?: Array<Pick<Business, "id" | "name" | "is_active">>;
  account?: { name?: string | null; email?: string | null };
  planKey?: PlanKey | null;
  privateFeedback?: boolean;
}) {
  return (
    <div className="min-h-screen overflow-x-clip">
      <AppSidebar
        mode={mode}
        planKey={planKey}
        privateFeedback={privateFeedback}
      />
      <div className="min-w-0 lg:pl-[252px]">
        <main className="mx-auto min-w-0 max-w-[1500px] px-4 pb-12 pt-0 sm:px-7 lg:px-10">
          <DashboardHeader
            title={title}
            mode={mode}
            businesses={businesses}
            account={account}
          />
          <div className="animate-fade-up">{children}</div>
        </main>
      </div>
    </div>
  );
}
