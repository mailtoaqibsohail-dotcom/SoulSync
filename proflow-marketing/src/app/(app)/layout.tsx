import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getCurrentUserOrNull } from "@/lib/auth/current-user";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUserOrNull();
  if (!user) redirect("/sign-in");
  // NOTE: this (app) group hosts both owner/team-only pages AND pages shared
  // with clients (calendar, approvals, analytics, assets). Access is therefore
  // enforced per-page via requireRole(), not at the layout level.
  return <AppShell user={user}>{children}</AppShell>;
}
