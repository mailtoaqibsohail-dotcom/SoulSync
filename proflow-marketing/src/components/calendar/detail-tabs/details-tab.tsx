"use client";

import type { ContentItem } from "@/lib/content-data";
import { POST_TYPE_LABEL } from "@/lib/content-data";
import { PLATFORM_LABEL, TEAM_DIRECTORY } from "@/lib/clients-data";

interface Props {
  item: ContentItem;
  clientName?: string;
}

export function DetailsTab({ item, clientName }: Props) {
  const assignee = TEAM_DIRECTORY.find((t) => t.id === item.assigned_to);
  const scheduled = new Date(item.scheduled_at);
  return (
    <div className="space-y-4 text-sm">
      <Row label="Client" value={clientName ?? "—"} />
      <Row label="Platform" value={PLATFORM_LABEL[item.platform]} />
      <Row label="Post type" value={POST_TYPE_LABEL[item.post_type]} />
      <Row
        label="Scheduled"
        value={`${scheduled.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })} at ${scheduled.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })}`}
      />
      <Row label="Assigned to" value={assignee?.name ?? "—"} />
      <div className="space-y-1.5">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Caption
        </div>
        <p className="whitespace-pre-wrap rounded-md border bg-[#F8FAFC] p-3">
          {item.caption}
        </p>
      </div>
      {item.hashtags && (
        <div className="space-y-1.5">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Hashtags
          </div>
          <p className="rounded-md border bg-[#F8FAFC] p-3 break-words">
            {item.hashtags}
          </p>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Inline editing of these fields lands alongside Supabase wiring. Use the
        Calendar to drag and reschedule for now.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
