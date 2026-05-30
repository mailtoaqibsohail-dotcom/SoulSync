import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import {
  getCurrentUserOrNull,
  homePathForRole,
} from "@/lib/auth/current-user";

export default async function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUserOrNull();
  if (!user) redirect("/sign-in");
  // Owner/team belong in the (app) shell.
  if (user.role !== "client") {
    redirect(homePathForRole(user.role));
  }
  return <AppShell user={user}>{children}</AppShell>;
}
