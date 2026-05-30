"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Sparkles, Upload, Trash2, FolderOpen } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  CAPTION_LIMITS,
  POST_TYPES_BY_PLATFORM,
  POST_TYPE_LABEL,
  type PostType,
} from "@/lib/content-data";
import {
  CLIENTS,
  TEAM_DIRECTORY,
  PLATFORM_COLOR,
  PLATFORM_LABEL,
  type PlatformKey,
} from "@/lib/clients-data";
import { createPost } from "@/app/(app)/calendar/actions";
import { InlineAiPopover } from "@/components/ai/inline-ai-popover";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Optional pre-selected date for the schedule picker. */
  initialDate?: string;
}

function defaultScheduleDate(): string {
  // Next hour, on the hour.
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d.toISOString().slice(0, 16);
}

export function NewPostDrawer({ open, onOpenChange, initialDate }: Props) {
  const [clientId, setClientId] = useState<string>(CLIENTS[0].id);
  const client = useMemo(
    () => CLIENTS.find((c) => c.id === clientId)!,
    [clientId]
  );
  const [platforms, setPlatforms] = useState<PlatformKey[]>(
    () => client.platforms.slice(0, 1)
  );
  const [postType, setPostType] = useState<PostType>("feed");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [firstComment, setFirstComment] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [scheduledAt, setScheduledAt] = useState<string>(
    initialDate ?? defaultScheduleDate()
  );
  const [assignedTo, setAssignedTo] = useState<string>(TEAM_DIRECTORY[1].id);
  const [internalNotes, setInternalNotes] = useState("");
  const [aiHintOpen, setAiHintOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Caption limit = min across selected platforms (most restrictive wins).
  const captionLimit = platforms.length
    ? Math.min(...platforms.map((p) => CAPTION_LIMITS[p]))
    : 2200;
  const overLimit = caption.length > captionLimit;
  const limitingPlatform = platforms.find(
    (p) => CAPTION_LIMITS[p] === captionLimit
  );

  // Post types available on every selected platform.
  const availableTypes: PostType[] = useMemo(() => {
    if (platforms.length === 0) return ["feed"];
    let acc = POST_TYPES_BY_PLATFORM[platforms[0]].slice();
    for (let i = 1; i < platforms.length; i++) {
      const allowed = POST_TYPES_BY_PLATFORM[platforms[i]];
      acc = acc.filter((t) => allowed.includes(t));
    }
    return acc.length ? acc : ["feed"];
  }, [platforms]);

  function togglePlatform(p: PlatformKey) {
    setPlatforms((arr) =>
      arr.includes(p) ? arr.filter((x) => x !== p) : [...arr, p]
    );
  }

  function onClientChange(id: string) {
    setClientId(id);
    const next = CLIENTS.find((c) => c.id === id)!;
    setPlatforms(next.platforms.slice(0, 1));
  }

  function onFilesPicked(picked: FileList | null) {
    if (!picked) return;
    const accepted: File[] = [];
    for (const f of Array.from(picked)) {
      if (f.size > 100 * 1024 * 1024) {
        setError(`${f.name} is over 100MB.`);
        continue;
      }
      accepted.push(f);
    }
    setFiles((arr) => [...arr, ...accepted]);
    if (accepted.length) setError(null);
  }

  function removeFile(idx: number) {
    setFiles((arr) => arr.filter((_, i) => i !== idx));
  }

  function submit(intent: "draft" | "approval" | "schedule") {
    setError(null);
    if (overLimit) {
      setError(`Caption is over the ${captionLimit}-character limit.`);
      return;
    }
    startTransition(async () => {
      const res = await createPost({
        client_id: clientId,
        platforms,
        post_type: postType,
        caption,
        hashtags,
        first_comment: firstComment,
        media_filenames: files.map((f) => f.name),
        scheduled_at: new Date(scheduledAt).toISOString(),
        assigned_to: assignedTo,
        internal_notes: internalNotes,
        intent,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onOpenChange(false);
      setToast(
        `${res.created_count} post${res.created_count === 1 ? "" : "s"} ` +
          (intent === "draft"
            ? "saved as draft."
            : intent === "approval"
            ? "sent for approval."
            : "scheduled.")
      );
      setTimeout(() => setToast(null), 5000);
    });
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent width="640px" className="p-0">
          <SheetHeader>
            <SheetTitle>Create new post</SheetTitle>
            <SheetDescription>
              Compose, attach media, and schedule across one or more platforms.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            <Field label="Client" required>
              <select
                value={clientId}
                onChange={(e) => onClientChange(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {CLIENTS.filter((c) => c.status !== "archived").map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Platforms"
              required
              hint="Selecting multiple creates one linked post per platform."
            >
              <div className="flex flex-wrap gap-2">
                {client.platforms.map((p) => {
                  const active = platforms.includes(p);
                  return (
                    <label
                      key={p}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm cursor-pointer",
                        active
                          ? "border-primary"
                          : "hover:bg-accent/5"
                      )}
                      style={
                        active
                          ? {
                              backgroundColor: `${PLATFORM_COLOR[p]}10`,
                              color: PLATFORM_COLOR[p],
                              borderColor: PLATFORM_COLOR[p],
                            }
                          : undefined
                      }
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => togglePlatform(p)}
                      />
                      {PLATFORM_LABEL[p]}
                    </label>
                  );
                })}
              </div>
            </Field>

            <Field label="Post type" required>
              <select
                value={postType}
                onChange={(e) => setPostType(e.target.value as PostType)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {availableTypes.map((t) => (
                  <option key={t} value={t}>
                    {POST_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </Field>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>
                  Caption <span className="text-danger">*</span>
                </Label>
                <button
                  type="button"
                  onClick={() => setAiHintOpen((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate with AI
                </button>
              </div>
              <Textarea
                rows={5}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write the caption clients will see."
                className={overLimit ? "border-danger" : ""}
              />
              <p
                className={cn(
                  "text-xs",
                  overLimit ? "text-danger" : "text-muted-foreground"
                )}
              >
                {caption.length}/{captionLimit}
                {limitingPlatform &&
                  ` (limit set by ${PLATFORM_LABEL[limitingPlatform]})`}
              </p>
              {aiHintOpen && (
                <InlineAiPopover
                  clientId={clientId}
                  platform={platforms[0] ?? "instagram"}
                  onPick={(text) => {
                    setCaption(text);
                    setAiHintOpen(false);
                  }}
                  onClose={() => setAiHintOpen(false)}
                />
              )}
            </div>

            <Field label="Hashtags" hint="Counted separately from the caption.">
              <Textarea
                rows={2}
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="#brand #campaign #niche"
              />
              <p className="text-xs text-muted-foreground">
                {hashtags.length} chars
              </p>
            </Field>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>
                  Media <span className="text-danger">*</span>
                </Label>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                  title="Coming Day 14"
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  Pull from Asset Library
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,video/mp4,video/quicktime"
                hidden
                onChange={(e) => onFilesPicked(e.target.files)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "w-full border-2 border-dashed rounded-md p-6 text-sm",
                  files.length
                    ? "border-primary/40 bg-primary/5"
                    : "border-input hover:bg-accent/5"
                )}
              >
                <div className="flex flex-col items-center gap-1">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span>Drop files here or click to upload.</span>
                  <span className="text-xs text-muted-foreground">
                    Supports JPG, PNG, MP4, MOV. Max 100MB per file.
                  </span>
                </div>
              </button>
              {files.length > 0 && (
                <ul className="space-y-1 mt-2">
                  {files.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-3 text-sm border rounded-md px-3 py-1.5"
                    >
                      <span className="truncate">{f.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Field label="First comment" hint="Useful for hashtag dumps.">
              <Textarea
                rows={2}
                value={firstComment}
                onChange={(e) => setFirstComment(e.target.value)}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Schedule" required>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </Field>
              <Field label="Assigned to">
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {TEAM_DIRECTORY.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Internal notes" hint="Only visible to your team.">
              <Textarea
                rows={3}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
              />
            </Field>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                {error}
              </div>
            )}
          </div>

          <div className="border-t bg-card px-6 py-3 flex items-center justify-between gap-3">
            <Button
              variant="secondary"
              onClick={() => submit("draft")}
              disabled={pending}
            >
              Save as Draft
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => submit("approval")}
                disabled={pending}
                className="border-accent text-accent hover:bg-accent/5"
              >
                Send for Approval
              </Button>
              <Button onClick={() => submit("schedule")} disabled={pending}>
                Schedule Post
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-md bg-foreground text-background px-4 py-2 text-sm shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label} {required && <span className="text-danger">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
