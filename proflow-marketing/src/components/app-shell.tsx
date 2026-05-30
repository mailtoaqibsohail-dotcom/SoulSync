import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/top-bar";
import type { CurrentUser } from "@/lib/auth/current-user";

export function AppShell({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar role={user.role} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar user={user} />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
