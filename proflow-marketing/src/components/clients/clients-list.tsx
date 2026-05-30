"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LayoutGrid, List, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddClientButton } from "./add-client-button";
import {
  PLATFORM_COLOR,
  PLATFORM_LABEL,
  type ClientRow,
  type ClientStatus,
  type TeamPerson,
} from "@/lib/clients-data";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<ClientStatus | "all", string> = {
  all: "All statuses",
  active: "Active",
  paused: "Paused",
  archived: "Archived",
};

const STATUS_BADGE: Record<ClientStatus, { bg: string; fg: string }> = {
  active: { bg: "#D1FAE5", fg: "#065F46" },
  paused: { bg: "#FEF3C7", fg: "#92400E" },
  archived: { bg: "#E5E7EB", fg: "#374151" },
};

export function ClientsList({
  clients,
  team,
}: {
  clients: ClientRow[];
  team: TeamPerson[];
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ClientStatus | "all">("all");
  const [view, setView] = useState<"grid" | "table">("grid");

  const teamById = useMemo(
    () => Object.fromEntries(team.map((t) => [t.id, t])),
    [team]
  );

  const rows = useMemo(() => {
    return clients.filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [clients, search, status]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Clients</h1>
          <p className="text-sm text-muted-foreground">
            Manage your client accounts and team assignments.
          </p>
        </div>
        <AddClientButton team={team} />
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as ClientStatus | "all")
            }
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {(["all", "active", "paused", "archived"] as const).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <div className="inline-flex rounded-md border bg-background">
            <button
              type="button"
              aria-label="Grid view"
              className={cn(
                "h-10 w-10 grid place-items-center",
                view === "grid" ? "bg-accent/10 text-accent" : "text-muted-foreground"
              )}
              onClick={() => setView("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Table view"
              className={cn(
                "h-10 w-10 grid place-items-center border-l",
                view === "table" ? "bg-accent/10 text-accent" : "text-muted-foreground"
              )}
              onClick={() => setView("table")}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </CardContent>
      </Card>

      {view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((c) => (
            <ClientCard key={c.id} client={c} teamById={teamById} />
          ))}
          {rows.length === 0 && (
            <div className="col-span-full text-center py-12 text-sm text-muted-foreground">
              No clients match your filters.
            </div>
          )}
        </div>
      ) : (
        <ClientTable rows={rows} teamById={teamById} />
      )}
    </div>
  );
}

function ClientCard({
  client,
  teamById,
}: {
  client: ClientRow;
  teamById: Record<string, TeamPerson>;
}) {
  const stripe = STATUS_BADGE[client.status];
  return (
    <Link href={`/clients/${client.id}`} className="block">
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div
              className="h-12 w-12 rounded-md grid place-items-center text-white text-sm font-semibold shrink-0"
              style={{ backgroundColor: client.brand_color }}
            >
              {client.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">{client.name}</h3>
              </div>
              <Badge className="mt-1">{client.industry}</Badge>
            </div>
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: stripe.bg, color: stripe.fg }}
            >
              {client.status[0].toUpperCase() + client.status.slice(1)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {client.platforms.map((p) => (
              <span
                key={p}
                title={PLATFORM_LABEL[p]}
                className="h-6 w-6 rounded grid place-items-center text-white text-[10px] font-bold"
                style={{ backgroundColor: PLATFORM_COLOR[p] }}
              >
                {PLATFORM_LABEL[p][0]}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {client.posts_this_week} post{client.posts_this_week === 1 ? "" : "s"} this week
            </span>
            <div className="flex -space-x-2">
              {client.team_ids.slice(0, 3).map((id) => {
                const t = teamById[id];
                if (!t) return null;
                return (
                  <span
                    key={id}
                    title={t.name}
                    className="h-7 w-7 rounded-full ring-2 ring-card text-white text-[10px] font-semibold grid place-items-center"
                    style={{ backgroundColor: t.color }}
                  >
                    {t.initials}
                  </span>
                );
              })}
              {client.team_ids.length > 3 && (
                <span className="h-7 w-7 rounded-full ring-2 ring-card bg-muted text-[10px] font-semibold grid place-items-center text-muted-foreground">
                  +{client.team_ids.length - 3}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function ClientTable({
  rows,
  teamById,
}: {
  rows: ClientRow[];
  teamById: Record<string, TeamPerson>;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Industry</th>
                <th className="px-4 py-3 font-medium">Platforms</th>
                <th className="px-4 py-3 font-medium text-right">Posts / wk</th>
                <th className="px-4 py-3 font-medium">Team</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((c) => {
                const stripe = STATUS_BADGE[c.status];
                return (
                  <tr key={c.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Link
                        href={`/clients/${c.id}`}
                        className="flex items-center gap-2 font-medium"
                      >
                        <span
                          className="h-7 w-7 rounded grid place-items-center text-white text-[10px] font-semibold"
                          style={{ backgroundColor: c.brand_color }}
                        >
                          {c.initials}
                        </span>
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.industry}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {c.platforms.map((p) => (
                          <span
                            key={p}
                            title={PLATFORM_LABEL[p]}
                            className="h-5 w-5 rounded grid place-items-center text-white text-[9px] font-bold"
                            style={{ backgroundColor: PLATFORM_COLOR[p] }}
                          >
                            {PLATFORM_LABEL[p][0]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.posts_this_week}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex -space-x-2">
                        {c.team_ids.slice(0, 3).map((id) => {
                          const t = teamById[id];
                          if (!t) return null;
                          return (
                            <span
                              key={id}
                              title={t.name}
                              className="h-6 w-6 rounded-full ring-2 ring-card text-white text-[9px] font-semibold grid place-items-center"
                              style={{ backgroundColor: t.color }}
                            >
                              {t.initials}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: stripe.bg, color: stripe.fg }}
                      >
                        {c.status[0].toUpperCase() + c.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/clients/${c.id}`}>Open</Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
