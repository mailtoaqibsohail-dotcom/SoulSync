"use client";

import { useState, useTransition } from "react";
import { MessageSquare } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PreviewTab } from "@/components/calendar/detail-tabs/preview-tab";
import { ContentDetailDrawer } from "@/components/calendar/content-detail-drawer";
import {
  CONTENT_STATUS_LABEL,
  CONTENT_STATUS_STYLE,
  POST_TYPE_LABEL,
  type ContentItem,
} from "@/lib/content-data";
import { PLATFORM_COLOR, PLATFORM_LABEL } from "@/lib/clients-data";
import {
  approvePost,
  requestChanges,
} from "@/app/(app)/approvals/actions";

interface ClientRef {
  id: string;
  name: string;
  brand_color: string;
  initials: string;
}

interface Props {
  item: ContentItem;
  client?: ClientRef;
  onApproved: (scheduled_at: string) => void;
  onChangesRequested: () => void;
}

export function ApprovalCard({
  item,
  client,
  onApproved,
  onChangesRequested,
}: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const status = CONTENT_STATUS_STYLE[item.status];
  const platformColor = PLATFORM_COLOR[item.platform];
  const scheduled = new Date(item.scheduled_at);

  function doApprove() {
    startTransition(async () => {
      const res = await approvePost({
        content_item_id: item.id,
        scheduled_at: item.scheduled_at,
      });
      if (res.ok) onApproved(item.scheduled_at);
    });
  }

  function doRequestChanges() {
    setFeedbackError(null);
    startTransition(async () => {
      const res = await requestChanges({
        content_item_id: item.id,
        feedback,
      });
      if (!res.ok) {
        setFeedbackError(res.error);
        return;
      }
      setFeedbackOpen(false);
      setFeedback("");
      onChangesRequested();
    });
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid md:grid-cols-5 gap-0">
          {/* Left: platform preview, ~40% */}
          <div className="md:col-span-2 bg-[#F8FAFC] p-4 border-b md:border-b-0 md:border-r">
            <PreviewTab item={item} clientName={client?.name} />
          </div>

          {/* Right: details, ~60% */}
          <div className="md:col-span-3 p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  {client && (
                    <span
                      className="h-7 w-7 rounded grid place-items-center text-white text-[10px] font-semibold"
                      style={{ backgroundColor: client.brand_color }}
                    >
                      {client.initials}
                    </span>
                  )}
                  <span className="font-semibold">{client?.name}</span>
                  <span
                    className="inline-flex items-center gap-1 text-xs"
                    style={{ color: platformColor }}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: platformColor }}
                    />
                    {PLATFORM_LABEL[item.platform]} ·{" "}
                    {POST_TYPE_LABEL[item.post_type]}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Scheduled{" "}
                  {scheduled.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  at{" "}
                  {scheduled.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
              </div>
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                style={{ backgroundColor: status.bg, color: status.fg }}
              >
                {CONTENT_STATUS_LABEL[item.status]}
              </span>
            </div>

            <p className="whitespace-pre-wrap text-sm">{item.caption}</p>
            {item.hashtags && (
              <p className="text-xs text-accent break-words">{item.hashtags}</p>
            )}

            {item.status === "pending_approval" && (
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t">
                <Button
                  variant="outline"
                  onClick={() => setFeedbackOpen(true)}
                  disabled={pending}
                >
                  Request Changes
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setDrawerOpen(true)}
                >
                  <MessageSquare className="h-4 w-4" />
                  Comment
                </Button>
                <div className="ml-auto" />
                <Button
                  className="bg-success hover:bg-success/90 text-white"
                  onClick={doApprove}
                  disabled={pending}
                >
                  Approve
                </Button>
              </div>
            )}

            {item.status === "needs_changes" && (
              <div className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
                Waiting on revisions from the team.
              </div>
            )}
          </div>
        </div>
      </CardContent>

      <ContentDetailDrawer
        item={drawerOpen ? item : null}
        onOpenChange={(o) => setDrawerOpen(o)}
        clientName={client?.name}
      />

      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>What needs to change?</DialogTitle>
            <DialogDescription>
              Your feedback goes straight to the team assigned to this post.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="feedback">
              Tell your team what you would like changed
            </Label>
            <Textarea
              id="feedback"
              rows={5}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Be specific so the team can make the change quickly. Example: Please change the CTA to 'Shop now' and add #SmallBusiness hashtag."
            />
            {feedbackError && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                {feedbackError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFeedbackOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button onClick={doRequestChanges} disabled={pending}>
              {pending ? "Sending…" : "Send Feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
