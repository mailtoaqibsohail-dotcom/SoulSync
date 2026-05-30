"use client";

import type { ContentItem } from "@/lib/content-data";
import { TEAM_DIRECTORY } from "@/lib/clients-data";
import { relativeTime } from "@/lib/relative-time";

interface Props {
  item: ContentItem;
}

interface HistoryEvent {
  id: string;
  who: string;
  initials: string;
  color: string;
  what: string;
  when: string;
}

export function HistoryTab({ item }: Props) {
  // Sample history; replace with activity_log query once Supabase is wired.
  const assignee = TEAM_DIRECTORY.find((t) => t.id === item.assigned_to);
  const sarah = TEAM_DIRECTORY.find((t) => t.initials === "SC")!;
  const owner = TEAM_DIRECTORY.find((t) => t.role === "owner")!;
  const created = new Date(item.scheduled_at);
  const draftIso = new Date(created.getTime() - 86400 * 1000 * 4).toISOString();
  const editIso = new Date(created.getTime() - 86400 * 1000 * 3).toISOString();
  const sendIso = new Date(created.getTime() - 86400 * 1000 * 2).toISOString();

  const events: HistoryEvent[] = [
    {
      id: "h1",
      who: assignee?.name ?? "Team",
      initials: assignee?.initials ?? "T",
      color: assignee?.color ?? "#64748B",
      what: "Created draft",
      when: draftIso,
    },
    {
      id: "h2",
      who: sarah.name,
      initials: sarah.initials,
      color: sarah.color,
      what: "Edited caption and added 2 hashtags",
      when: editIso,
    },
    {
      id: "h3",
      who: owner.name,
      initials: owner.initials,
      color: owner.color,
      what: "Sent for approval",
      when: sendIso,
    },
  ];

  return (
    <ol className="relative border-l border-border ml-2 space-y-4 pl-5">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span
            className="absolute -left-[26px] top-0 h-5 w-5 rounded-full grid place-items-center text-white text-[10px] font-semibold"
            style={{ backgroundColor: e.color }}
          >
            {e.initials}
          </span>
          <div className="text-sm">
            <span className="font-medium">{e.who}</span>{" "}
            <span className="text-muted-foreground">{e.what}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {relativeTime(e.when)}
          </div>
        </li>
      ))}
      <p className="text-xs text-muted-foreground pt-2">
        Full version history with diffs lands with the activity_log Supabase
        query.
      </p>
    </ol>
  );
}
