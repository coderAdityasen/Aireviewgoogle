import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { createClient } from "@/lib/supabase/server";

const ownerNav = [
  ["Overview", "/dashboard"],
  ["Businesses", "/dashboard/businesses"],
  ["QR campaigns", "/dashboard/businesses"],
  ["Analytics", "/dashboard/businesses"],
  ["Feedback", "/dashboard/businesses"],
  ["Settings", "/dashboard/settings"]
];

const adminNav = [
  ["Overview", "/admin"],
  ["Owners", "/admin/owners"],
  ["Businesses", "/admin/businesses"],
  ["Analytics", "/admin/analytics"],
  ["Feedback", "/admin/feedback"],
  ["AI usage", "/admin/ai-usage"],
  ["Audit logs", "/admin/audit-logs"],
  ["Settings", "/admin/settings"]
];

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export function AppShell({
  children,
  mode,
  title
}: {
  children: React.ReactNode;
  mode: "owner" | "admin";
  title: string;
}) {
  const nav = mode === "owner" ? ownerNav : adminNav;

  return (
    <div className="min-h-screen">
      <aside className="border-b bg-card lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center justify-between px-4 lg:h-20">
          <Link href={mode === "owner" ? "/dashboard" : "/admin"} className="text-lg font-semibold">
            ReviewFlow
          </Link>
          <form action={signOut}>
            <Button variant="ghost" size="icon" aria-label="Log out">
              <Icon name="logout" className="h-4 w-4" />
            </Button>
          </form>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1 lg:overflow-visible">
          {nav.map(([label, href]) => (
            <Link
              key={`${mode}-${href}-${label}`}
              href={href}
              className="block whitespace-nowrap rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
