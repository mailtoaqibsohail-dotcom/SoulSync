"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApprovalCard } from "./approval-card";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/lib/auth/current-user";
import type { ContentItem } from "@/lib/content-data";

type Tab = "pending" | "approved" | "needs_changes" | "all";
type Sort = "oldest" | "newest" | "scheduled";

const TABS: Array<{ value: Tab; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "needs_changes", label: "Needs Changes" },
  { value: "all", label: "All" },
];

interface ClientRef {
  id: string;
  name: string;
  brand_color: string;
  initials: string;
}

interface Props {
  role: AppRole;
  items: ContentItem[];
  clients: ClientRef[];
}

export function ApprovalsBoard({ role, items, clients }: Props) {
  const [tab, setTab] = useState<Tab>("pending");
  const [clientId, setClientId] = useState<string>("all");
  const [sort, setSort] = useState<Sort>("oldest");
  const [toast, setToast] = useState<string | null>(null);
  const router = useRouter();

  const clientLookup = useMemo(
    () => Object.fromEntries(clients.map((c) => [c.id, c])),
    [clients]
  );

  const filtered = useMemo(() => {
    const rows = items.filter((it) => {
      if (tab === "pending" && it.status !== "pending_approval") return false;
      if (tab === "approved" && it.status !== "approved" && it.status !== "scheduled")
        return false;
      if (tab === "needs_changes" && it.status !== "needs_changes") return false;
      if (clientId !== "all" && it.client_id !== clientId) return false;
      return true;
    });
    rows.sort((a, b) => {
      const at = new Date(a.scheduled_at).getTime();
      const bt = new Date(b.scheduled_at).getTime();
      if (sort === "newest") return bt - at;
      return at - bt;
    });
    return rows;
  }, [items, tab, clientId, sort]);

  const isClient = role === "client";

  function fireToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4500);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          {isClient ? "Posts waiting for your approval" : "Pending Approvals"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isClient
            ? "Review and approve the posts your team has prepared for you."
            : "Posts currently waiting for client approval."}
        </p>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-md border bg-background">
            {TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTab(t.value)}
                className={cn(
                  "px-3 py-1.5 text-sm",
                  tab === t.value
                    ? "bg-accent/10 text-accent"
                    : "text-muted-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {!isClient && (
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="all">All clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm ml-auto"
          >
            <option value="oldest">Oldest first</option>
            <option value="newest">Newest first</option>
            <option value="scheduled">Scheduled date</option>
          </select>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-sm text-muted-foreground">
            {tab === "pending"
              ? "Nothing waiting for approval right now."
              : "No posts match these filters."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((it) => (
            <ApprovalCard
              key={it.id}
              item={it}
              client={clientLookup[it.client_id]}
              onApproved={(when) => {
                fireToast(
                  `Post approved. It will go live on ${new Date(when).toLocaleString(
                    "en-US",
                    { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
                  )}.`
                );
                router.refresh();
              }}
              onChangesRequested={() => {
                fireToast("Feedback sent. The team has been notified.");
                router.refresh();
              }}
            />
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-md bg-foreground text-background px-4 py-2 text-sm shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
