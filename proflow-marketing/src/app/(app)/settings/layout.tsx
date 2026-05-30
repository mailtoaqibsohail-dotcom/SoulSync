import { SettingsTabs } from "@/components/settings/settings-tabs";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          {user.role === "owner"
            ? "Manage your agency, payment methods, and notification preferences."
            : user.role === "team"
            ? "Manage your profile, notifications, and security."
            : "Manage your account, approval preferences, and notifications."}
        </p>
      </div>
      <SettingsTabs role={user.role} />
      <div>{children}</div>
    </div>
  );
}
