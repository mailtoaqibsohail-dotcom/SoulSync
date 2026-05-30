"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserCog,
  Calendar,
  CheckSquare,
  BarChart3,
  FolderOpen,
  Sparkles,
  Activity,
  Settings,
  MessageSquare,
  Clock,
  Home,
  FileText,
  BookOpen,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/lib/auth/current-user";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

// Section 4.1 - Agency Owner sidebar
const OWNER_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/team", label: "Team", icon: UserCog },
  { href: "/calendar", label: "Content Calendar", icon: Calendar },
  { href: "/approvals", label: "Approvals", icon: CheckSquare },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/assets", label: "Asset Library", icon: FolderOpen },
  { href: "/ai", label: "AI Assistant", icon: Sparkles },
  { href: "/activity", label: "Activity Log", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

// Section 4.2 - Team Member sidebar
const TEAM_NAV: NavItem[] = [
  { href: "/work", label: "My Work", icon: LayoutDashboard },
  { href: "/clients", label: "My Clients", icon: Users },
  { href: "/calendar", label: "Content Calendar", icon: Calendar },
  { href: "/feedback", label: "Client Feedback", icon: MessageSquare },
  { href: "/assets", label: "Asset Library", icon: FolderOpen },
  { href: "/ai", label: "AI Assistant", icon: Sparkles },
  { href: "/time", label: "Time Tracking", icon: Clock },
  { href: "/settings", label: "Settings", icon: Settings },
];

// Section 4.3 - Client sidebar
const CLIENT_NAV: NavItem[] = [
  { href: "/home", label: "Overview", icon: Home },
  { href: "/calendar", label: "Content Calendar", icon: Calendar },
  { href: "/approvals", label: "Pending Approvals", icon: CheckSquare },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/brand", label: "Brand Guidelines", icon: BookOpen },
  { href: "/assets", label: "My Assets", icon: FolderOpen },
  { href: "/billing", label: "Billing", icon: Receipt },
  { href: "/settings", label: "Settings", icon: Settings },
];

const NAV_BY_ROLE: Record<AppRole, NavItem[]> = {
  owner: OWNER_NAV,
  team: TEAM_NAV,
  client: CLIENT_NAV,
};

export function Sidebar({ role }: { role: AppRole }) {
  const pathname = usePathname();
  const nav = NAV_BY_ROLE[role];

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col border-r bg-[#F8FAFC]">
      <div className="h-16 flex items-center px-6 border-b">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold">
            P
          </div>
          <span className="font-semibold text-lg">ProFlow</span>
        </Link>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname?.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent/10 text-accent"
                  : "text-muted-foreground hover:bg-accent/5 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-3 border-t text-[11px] text-muted-foreground">
        {role === "owner"
          ? "Owner workspace"
          : role === "team"
          ? "Team workspace"
          : "Client portal"}
      </div>
    </aside>
  );
}
