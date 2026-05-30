"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CONTENT_STATUS_LABEL,
  CONTENT_STATUS_STYLE,
  type ContentItem,
} from "@/lib/content-data";
import { CommentThread } from "@/components/approvals/comment-thread";
import { getComments } from "@/app/(app)/approvals/comments-actions";
import { TEAM_DIRECTORY } from "@/lib/clients-data";
import type { CommentRecord } from "@/lib/demo-store";

interface Props {
  item: ContentItem;
}

const MENTIONABLES = TEAM_DIRECTORY.map((t) => ({
  id: t.id,
  name: t.name,
  initials: t.initials,
}));

export function ApprovalTab({ item }: Props) {
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await getComments(item.id);
      if (cancelled) return;
      setComments(data.comments);
      setCurrentUserId(data.current_user_id);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [item.id]);

  const style = CONTENT_STATUS_STYLE[item.status];
  const showActions =
    item.status === "pending_approval" || item.status === "needs_changes";

  return (
    <div className="space-y-5">
      <div
        className="rounded-md p-3 text-sm"
        style={{ backgroundColor: style.bg, color: style.fg }}
      >
        Current status: <strong>{CONTENT_STATUS_LABEL[item.status]}</strong>
      </div>

      {showActions && (
        <div className="flex gap-2">
          <Button variant="outline" className="border-danger/40 text-danger">
            Request Changes
          </Button>
          <Button className="bg-success hover:bg-success/90 text-white">
            Approve
          </Button>
        </div>
      )}

      {loaded && (
        <CommentThread
          contentId={item.id}
          currentUserId={currentUserId}
          comments={comments}
          mentionables={MENTIONABLES}
        />
      )}
    </div>
  );
}
