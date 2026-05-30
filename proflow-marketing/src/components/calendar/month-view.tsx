"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  CONTENT_STATUS_STYLE,
  type ContentItem,
} from "@/lib/content-data";
import { PLATFORM_COLOR } from "@/lib/clients-data";
import type { CalendarClient } from "./calendar-shell";
import { cn } from "@/lib/utils";

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Props {
  cursor: Date;
  items: ContentItem[];
  clients: Record<string, CalendarClient>;
  onSelect?: (item: ContentItem) => void;
}

export function MonthView({ cursor, items, clients, onSelect }: Props) {
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);

  // Monday-first weeks. JS: 0 = Sunday, so shift.
  const startOffset = (monthStart.getDay() + 6) % 7;
  const totalDays = monthEnd.getDate();
  const cells: Array<Date | null> = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) {
    cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  // Bucket items by yyyy-mm-dd
  const buckets: Record<string, ContentItem[]> = {};
  for (const it of items) {
    const d = new Date(it.scheduled_at);
    if (d.getFullYear() !== cursor.getFullYear() || d.getMonth() !== cursor.getMonth())
      continue;
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    (buckets[key] ??= []).push(it);
  }

  const today = new Date();
  const isToday = (d: Date) =>
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();

  return (
    <Card>
      <CardContent className="p-3">
        <div className="grid grid-cols-7 gap-px text-xs">
          {DAY_HEADERS.map((d) => (
            <div
              key={d}
              className="px-2 py-1 text-muted-foreground font-medium"
            >
              {d}
            </div>
          ))}
          {cells.map((d, i) => {
            if (!d)
              return (
                <div key={`empty-${i}`} className="min-h-28 bg-[#F8FAFC]/50" />
              );
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            const dayItems = buckets[key] ?? [];
            const visible = dayItems.slice(0, 3);
            const overflow = dayItems.length - visible.length;
            return (
              <div
                key={key}
                className={cn(
                  "min-h-28 rounded-md border bg-background p-1.5 space-y-1 transition-colors hover:bg-[#F8FAFC]",
                  isToday(d) && "border-accent"
                )}
              >
                <div
                  className={cn(
                    "text-[11px] font-medium",
                    isToday(d) ? "text-accent" : "text-muted-foreground"
                  )}
                >
                  {d.getDate()}
                </div>
                {visible.map((it) => (
                  <Chip
                    key={it.id}
                    item={it}
                    client={clients[it.client_id]}
                    onClick={() => onSelect?.(it)}
                  />
                ))}
                {overflow > 0 && (
                  <button
                    type="button"
                    className="text-[10px] text-accent hover:underline"
                  >
                    +{overflow} more
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function Chip({
  item,
  client,
  onClick,
}: {
  item: ContentItem;
  client?: CalendarClient;
  onClick?: () => void;
}) {
  const platformColor = PLATFORM_COLOR[item.platform];
  const dotColor = CONTENT_STATUS_STYLE[item.status].fg;
  const tip = `${client?.name ?? "Client"} — ${new Date(
    item.scheduled_at
  ).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} — ${item.caption}`;
  return (
    <button
      type="button"
      title={tip}
      onClick={onClick}
      className="group relative w-full text-left rounded px-1.5 py-1 text-[10px] truncate cursor-pointer"
      style={{
        backgroundColor: `${platformColor}12`,
        borderLeft: `3px solid ${platformColor}`,
        color: platformColor,
      }}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full mr-1 align-middle"
        style={{ backgroundColor: dotColor }}
      />
      {item.caption}
    </button>
  );
}
