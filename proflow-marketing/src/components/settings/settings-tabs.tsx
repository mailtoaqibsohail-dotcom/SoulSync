"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/lib/auth/current-user";

const OWNER_TABS = [
  { href: "/settings", label: "Profile" },
  { href: "/settings/agency", label: "Agency" },
  { href: "/settings/payment-methods", label: "Payment Methods" },
  { href: "/settings/notifications", label: "Notifications" },
  { href: "/settings/integrations", label: "Integrations" },
  { href: "/settings/billing", label: "Billing" },
  { href: "/settings/security", label: "Security" },
];

const TEAM_TABS = [
  { href: "/settings", label: "Profile" },
  { href: "/settings/notifications", label: "Notifications" },
  { href: "/settings/security", label: "Security" },
];

const CLIENT_TABS = [
  { href: "/settings", label: "Profile" },
  { href: "/settings/team-access", label: "Team Access" },
  { href: "/settings/approval-preferences", label: "Approval Preferences" },
  { href: "/settings/notifications", label: "Notifications" },
  { href: "/settings/security", label: "Security" },
];

const TABS_BY_ROLE: Record<AppRole, typeof OWNER_TABS> = {
  owner: OWNER_TABS,
  team: TEAM_TABS,
  client: CLIENT_TABS,
};

export function SettingsTabs({ role }: { role: AppRole }) {
  const pathname = usePathname() ?? "";
  const tabs = TABS_BY_ROLE[role];
  return (
    <nav className="border-b overflow-x-auto">
      <ul className="flex gap-6 min-w-max">
        {tabs.map((t) => {
          const active = pathname === t.href;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={cn(
                  "inline-block py-3 text-sm font-medium border-b-2 -mb-px",
                  active
                    ? "text-foreground border-accent"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
