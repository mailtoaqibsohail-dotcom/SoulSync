"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MonthView } from "./month-view";
import { ListView } from "./list-view";
import { NewPostDrawer } from "./new-post-drawer";
import { ContentDetailDrawer } from "./content-detail-drawer";
import {
  CONTENT_STATUS_LABEL,
  type ContentItem,
  type ContentStatus,
} from "@/lib/content-data";
import { PLATFORM_COLOR, PLATFORM_LABEL, type PlatformKey } from "@/lib/clients-data";
import { cn } from "@/lib/utils";

const PLATFORMS: ("all" | PlatformKey)[] = [
  "all",
  "instagram",
  "tiktok",
  "youtube",
  "facebook",
  "linkedin",
  "x",
];

const STATUSES: ("all" | ContentStatus)[] = [
  "all",
  "draft",
  "pending_approval",
  "approved",
  "scheduled",
  "published",
  "needs_changes",
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export interface CalendarClient {
  id: string;
  name: string;
  brand_color: string;
  initials: string;
}

export interface CalendarTeam {
  id: string;
  initials: string;
  color: string;
  name: string;
}

interface Props {
  items: ContentItem[];
  clients: CalendarClient[];
  team: CalendarTeam[];
}

export function CalendarShell({ items, clients, team }: Props) {
  const today = new Date();
  const [cursor, setCursor] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [view, setView] = useState<"month" | "list">("month");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<ContentItem | null>(null);
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [platform, setPlatform] = useState<"all" | PlatformKey>("all");
  const [status, setStatus] = useState<"all" | ContentStatus>("all");

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (clientFilter !== "all" && i.client_id !== clientFilter) return false;
      if (platform !== "all" && i.platform !== platform) return false;
      if (status !== "all" && i.status !== status) return false;
      return true;
    });
  }, [items, clientFilter, platform, status]);

  const clientLookup = useMemo(
    () => Object.fromEntries(clients.map((c) => [c.id, c])),
    [clients]
  );
  const teamLookup = useMemo(
    () => Object.fromEntries(team.map((t) => [t.id, t])),
    [team]
  );

  function prev() {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
  }
  function next() {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
  }
  function jumpToday() {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Content Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Plan, schedule, and publish content across every client.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          <Button onClick={() => setDrawerOpen(true)}>
            <Plus className="h-4 w-4" />
            New Post
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Client */}
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="all">All clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Platforms */}
            <div className="flex flex-wrap gap-1">
              {PLATFORMS.map((p) => {
                const active = platform === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlatform(p)}
                    className={cn(
                      "px-2.5 py-1 rounded-full border text-xs",
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-accent/5"
                    )}
                    style={
                      active && p !== "all"
                        ? {
                            backgroundColor: PLATFORM_COLOR[p as PlatformKey],
                            borderColor: PLATFORM_COLOR[p as PlatformKey],
                          }
                        : undefined
                    }
                  >
                    {p === "all" ? "All" : PLATFORM_LABEL[p as PlatformKey]}
                  </button>
                );
              })}
            </div>

            {/* Status */}
            <div className="flex flex-wrap gap-1">
              {STATUSES.map((s) => {
                const active = status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={cn(
                      "px-2.5 py-1 rounded-full border text-xs",
                      active
                        ? "bg-foreground text-background border-foreground"
                        : "bg-background hover:bg-accent/5"
                    )}
                  >
                    {s === "all" ? "All" : CONTENT_STATUS_LABEL[s as ContentStatus]}
                  </button>
                );
              })}
            </div>

            {/* View toggle */}
            <div className="ml-auto inline-flex rounded-md border bg-background">
              {(["month", "list"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={cn(
                    "px-3 py-1.5 text-xs capitalize",
                    view === v
                      ? "bg-accent/10 text-accent"
                      : "text-muted-foreground"
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Date navigator */}
          {view === "month" && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={prev}>
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <Button variant="outline" size="sm" onClick={jumpToday}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={next}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="text-sm font-medium ml-2">
                {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
              </div>
              <div className="ml-auto text-xs text-muted-foreground">
                {filtered.length} post{filtered.length === 1 ? "" : "s"} in
                view
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {view === "month" ? (
        <MonthView
          cursor={cursor}
          items={filtered}
          clients={clientLookup}
          onSelect={setSelected}
        />
      ) : (
        <ListView
          items={filtered}
          clients={clientLookup}
          team={teamLookup}
          onSelect={setSelected}
        />
      )}

      <NewPostDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
      <ContentDetailDrawer
        item={selected}
        onOpenChange={(o) => !o && setSelected(null)}
        clientName={
          selected ? clientLookup[selected.client_id]?.name : undefined
        }
      />
    </div>
  );
}
