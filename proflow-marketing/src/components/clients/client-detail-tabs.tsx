"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { slug: "", label: "Overview" },
  { slug: "content", label: "Content" },
  { slug: "analytics", label: "Analytics" },
  { slug: "brand", label: "Brand" },
  { slug: "team", label: "Team" },
  { slug: "settings", label: "Settings" },
];

export function ClientDetailTabs({ clientId }: { clientId: string }) {
  const pathname = usePathname() ?? "";
  return (
    <nav className="border-b">
      <ul className="flex gap-6 overflow-x-auto">
        {TABS.map((t) => {
          const href = t.slug
            ? `/clients/${clientId}/${t.slug}`
            : `/clients/${clientId}`;
          const active =
            pathname === href ||
            (t.slug && pathname.startsWith(href + "/"));
          return (
            <li key={t.slug || "overview"}>
              <Link
                href={href}
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
