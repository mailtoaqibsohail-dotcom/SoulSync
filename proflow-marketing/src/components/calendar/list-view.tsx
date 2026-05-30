"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  CONTENT_STATUS_LABEL,
  CONTENT_STATUS_STYLE,
  type ContentItem,
} from "@/lib/content-data";
import { PLATFORM_COLOR, PLATFORM_LABEL } from "@/lib/clients-data";
import type { CalendarClient, CalendarTeam } from "./calendar-shell";

interface Props {
  items: ContentItem[];
  clients: Record<string, CalendarClient>;
  team: Record<string, CalendarTeam>;
  onSelect?: (item: ContentItem) => void;
}

export function ListView({ items, clients, team, onSelect }: Props) {
  const sorted = [...items].sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  );

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Platform</th>
                <th className="px-4 py-3 font-medium">Caption</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Assigned</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sorted.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    No posts match your filters.
                  </td>
                </tr>
              )}
              {sorted.map((it) => {
                const d = new Date(it.scheduled_at);
                const client = clients[it.client_id];
                const member = team[it.assigned_to];
                const s = CONTENT_STATUS_STYLE[it.status];
                const platformColor = PLATFORM_COLOR[it.platform];
                return (
                  <tr
                    key={it.id}
                    className="hover:bg-muted/40 cursor-pointer"
                    onClick={() => onSelect?.(it)}
                  >
                    <td className="px-4 py-3 text-muted-foreground">
                      {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {d.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      {client && (
                        <div className="flex items-center gap-2">
                          <span
                            className="h-6 w-6 rounded grid place-items-center text-white text-[9px] font-semibold"
                            style={{ backgroundColor: client.brand_color }}
                          >
                            {client.initials}
                          </span>
                          {client.name}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 text-xs"
                        style={{ color: platformColor }}
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: platformColor }}
                        />
                        {PLATFORM_LABEL[it.platform]}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 max-w-[320px] truncate"
                      title={it.caption}
                    >
                      {it.caption}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{ backgroundColor: s.bg, color: s.fg }}
                      >
                        {CONTENT_STATUS_LABEL[it.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {member && (
                        <div className="flex items-center gap-2 text-xs">
                          <span
                            className="h-6 w-6 rounded-full grid place-items-center text-white font-semibold"
                            style={{ backgroundColor: member.color }}
                          >
                            {member.initials}
                          </span>
                          {member.name}
                        </div>
                      )}
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
