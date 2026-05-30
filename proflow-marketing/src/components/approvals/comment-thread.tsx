"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { relativeTime } from "@/lib/relative-time";
import {
  postComment,
  removeComment,
} from "@/app/(app)/approvals/comments-actions";
import { cn } from "@/lib/utils";
import type { CommentRecord } from "@/lib/demo-store";

interface Props {
  contentId: string;
  currentUserId: string;
  comments: CommentRecord[];
  mentionables: Array<{ id: string; name: string; initials: string }>;
}

const ROLE_LABEL: Record<"owner" | "team" | "client", string> = {
  owner: "Owner",
  team: "Team",
  client: "Client",
};

const ROLE_BADGE_STYLE: Record<
  "owner" | "team" | "client",
  { bg: string; fg: string }
> = {
  owner: { bg: "#F1F5F9", fg: "#0F172A" },
  team: { bg: "#EEF2FF", fg: "#4338CA" },
  client: { bg: "#FCE7F3", fg: "#9D174D" },
};

export function CommentThread({
  contentId,
  currentUserId,
  comments,
  mentionables,
}: Props) {
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [showMentions, setShowMentions] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function submit() {
    setError(null);
    if (!body.trim()) return;
    startTransition(async () => {
      const res = await postComment({
        content_item_id: contentId,
        body,
        attachments,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setBody("");
      setAttachments([]);
      router.refresh();
    });
  }

  function onAttach(picked: FileList | null) {
    if (!picked) return;
    const names = Array.from(picked).map((f) => f.name);
    setAttachments((arr) => [...arr, ...names].slice(0, 3));
  }

  function insertMention(name: string) {
    const ta = taRef.current;
    if (!ta) return;
    const pos = ta.selectionStart ?? body.length;
    const before = body.slice(0, pos);
    // strip trailing partial "@xxx" then insert "@Name "
    const cleaned = before.replace(/@[\w]*$/, "");
    const after = body.slice(pos);
    const next = `${cleaned}@${name} ${after}`;
    setBody(next);
    setShowMentions(false);
    setTimeout(() => ta.focus(), 0);
  }

  function handleBodyChange(v: string) {
    setBody(v);
    // crude detection: show menu when last "@" has no space after it
    const m = v.match(/@(\w*)$/);
    setShowMentions(!!m);
  }

  function remove(id: string) {
    startTransition(async () => {
      await removeComment(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        Comments
      </div>

      <div className="space-y-4">
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No comments yet. Start the conversation.
          </p>
        )}
        {comments.map((c) => (
          <Comment
            key={c.id}
            c={c}
            mine={c.user_id === currentUserId}
            onDelete={remove}
            mentionables={mentionables}
          />
        ))}
      </div>

      <div className="space-y-2 border-t pt-4">
        <div className="relative">
          <Textarea
            ref={taRef}
            rows={3}
            value={body}
            onChange={(e) => handleBodyChange(e.target.value)}
            placeholder="Add a comment..."
          />
          {showMentions && mentionables.length > 0 && (
            <div className="absolute bottom-full left-0 mb-1 z-10 w-full max-w-xs rounded-md border bg-card shadow-md p-1">
              {mentionables.slice(0, 5).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => insertMention(m.name)}
                  className="w-full text-left flex items-center gap-2 rounded-sm px-2 py-1 text-sm hover:bg-accent/10"
                >
                  <span className="h-6 w-6 rounded-full bg-muted grid place-items-center text-[10px] font-semibold">
                    {m.initials}
                  </span>
                  {m.name}
                </button>
              ))}
            </div>
          )}
        </div>
        {attachments.length > 0 && (
          <ul className="flex flex-wrap gap-2 text-xs">
            {attachments.map((name) => (
              <li
                key={name}
                className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-0.5"
              >
                <Paperclip className="h-3 w-3" />
                {name}
              </li>
            ))}
          </ul>
        )}
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
            {error}
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            multiple
            hidden
            onChange={(e) => onAttach(e.target.files)}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileRef.current?.click()}
            aria-label="Attach files"
            disabled={attachments.length >= 3}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            Tip: type <kbd className="font-mono">@</kbd> to mention.
          </span>
          <div className="ml-auto" />
          <Button onClick={submit} disabled={pending || !body.trim()}>
            {pending ? "Posting…" : "Post Comment"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Comment({
  c,
  mine,
  onDelete,
  mentionables,
}: {
  c: CommentRecord;
  mine: boolean;
  onDelete: (id: string) => void;
  mentionables: Array<{ id: string; name: string }>;
}) {
  const roleBadge = ROLE_BADGE_STYLE[c.user_role];
  return (
    <div className="flex items-start gap-3">
      <span
        className="h-8 w-8 rounded-full grid place-items-center text-white text-xs font-semibold shrink-0"
        style={{ backgroundColor: c.user_color }}
      >
        {c.user_initials}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{c.user_name}</span>
          <span
            className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded"
            style={{ backgroundColor: roleBadge.bg, color: roleBadge.fg }}
          >
            {ROLE_LABEL[c.user_role]}
          </span>
          <span className="text-xs text-muted-foreground">
            {relativeTime(c.created_at)}
          </span>
          {mine && (
            <div className="ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Comment actions"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-danger"
                    onSelect={() => onDelete(c.id)}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
        <p className="text-sm whitespace-pre-wrap mt-0.5">
          {renderBody(c.body, mentionables)}
        </p>
        {c.attachments.length > 0 && (
          <ul className="flex flex-wrap gap-2 text-xs mt-1">
            {c.attachments.map((name) => (
              <li
                key={name}
                className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-0.5"
              >
                <Paperclip className="h-3 w-3" />
                {name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function renderBody(
  body: string,
  mentionables: Array<{ id: string; name: string }>
): React.ReactNode[] {
  const names = mentionables.map((m) => m.name);
  const parts = body.split(/(@[A-Za-z][\w]*(?:\s+[A-Za-z][\w]*)?)/g);
  return parts.map((p, i) => {
    if (!p.startsWith("@")) return p;
    const candidate = p.slice(1);
    if (names.some((n) => candidate.startsWith(n.split(/\s+/)[0]))) {
      return (
        <span
          key={i}
          className={cn("text-accent font-medium rounded px-0.5 bg-accent/10")}
        >
          {p}
        </span>
      );
    }
    return p;
  });
}
