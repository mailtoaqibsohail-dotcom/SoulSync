"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { AppRole, CurrentUser } from "@/lib/auth/current-user";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/work": "My Work",
  "/clients": "Clients",
  "/team": "Team",
  "/calendar": "Content Calendar",
  "/approvals": "Approvals",
  "/analytics": "Analytics",
  "/invoices": "Invoices",
  "/assets": "Asset Library",
  "/ai": "AI Assistant",
  "/activity": "Activity Log",
  "/settings": "Settings",
  "/feedback": "Client Feedback",
  "/time": "Time Tracking",
  "/reports": "Reports",
  "/brand": "Brand Guidelines",
  "/billing": "Billing",
  "/home": "Overview",
  "/": "Overview",
};

function titleFor(path: string): string {
  if (TITLES[path]) return TITLES[path];
  for (const key of Object.keys(TITLES)) {
    if (key !== "/" && path.startsWith(key)) return TITLES[key];
  }
  return "ProFlow";
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
}

interface TopBarProps {
  user: CurrentUser;
  unreadCount?: number;
}

export function TopBar({ user, unreadCount = 0 }: TopBarProps) {
  const pathname = usePathname() ?? "/";
  const title = titleFor(pathname);
  const showRoleSwitcher = user.isDemo;

  return (
    <header className="h-16 border-b bg-card flex items-center px-6 gap-4">
      <h1 className="text-base font-semibold">{title}</h1>
      <div className="flex-1" />

      <button
        type="button"
        className="hidden sm:inline-flex items-center gap-2 h-9 px-3 rounded-md border bg-background text-sm text-muted-foreground hover:bg-accent/5"
        aria-label="Search"
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">Search</span>
        <kbd className="hidden md:inline ml-2 text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">
          ⌘K
        </kbd>
      </button>

      <button
        type="button"
        className="relative h-9 w-9 grid place-items-center rounded-md border bg-background hover:bg-accent/5"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-danger text-white text-[10px] font-medium grid place-items-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {showRoleSwitcher && <RoleSwitcher current={user.role} />}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="h-9 w-9 rounded-full bg-primary text-primary-foreground text-sm font-medium grid place-items-center"
            aria-label="Account menu"
          >
            {initials(user.full_name)}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            <div className="font-medium text-foreground">{user.full_name}</div>
            <div className="text-xs text-muted-foreground">{user.email}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings">My Profile</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings">Account Settings</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="mailto:support@proflow.example">Help &amp; Support</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/sign-out">Sign Out</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

function RoleSwitcher({ current }: { current: AppRole }) {
  // Demo-only convenience while we don't have real accounts yet. Lets you
  // jump between the three role experiences from the top bar.
  async function switchTo(role: AppRole) {
    document.cookie = `proflow_demo_role=${role}; Path=/; Max-Age=86400; SameSite=Lax`;
    const home =
      role === "owner" ? "/dashboard" : role === "team" ? "/work" : "/";
    window.location.href = home;
  }
  const label =
    current === "owner" ? "Owner" : current === "team" ? "Team" : "Client";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="hidden sm:inline-flex items-center gap-1 h-9 px-3 rounded-md border bg-background text-xs text-muted-foreground hover:bg-accent/5"
        >
          Demo: {label}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Switch demo role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => switchTo("owner")}>
          Agency Owner
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => switchTo("team")}>
          Team Member
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => switchTo("client")}>
          Client
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
