"use client";

import { useState } from "react";
import { MoreHorizontal, Copy, CalendarClock, Check, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PreviewTab } from "./detail-tabs/preview-tab";
import { DetailsTab } from "./detail-tabs/details-tab";
import { ApprovalTab } from "./detail-tabs/approval-tab";
import { HistoryTab } from "./detail-tabs/history-tab";
import {
  CONTENT_STATUS_LABEL,
  CONTENT_STATUS_STYLE,
  type ContentItem,
} from "@/lib/content-data";
import { PLATFORM_COLOR, PLATFORM_LABEL } from "@/lib/clients-data";

interface Props {
  item: ContentItem | null;
  onOpenChange: (open: boolean) => void;
  clientName?: string;
}

export function ContentDetailDrawer({ item, onOpenChange, clientName }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  if (!item) return null;
  const status = CONTENT_STATUS_STYLE[item.status];
  const platformColor = PLATFORM_COLOR[item.platform];

  function notify(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  return (
    <>
      <Sheet open={!!item} onOpenChange={onOpenChange}>
        <SheetContent width="640px" className="p-0">
          <SheetHeader>
            <div className="flex items-start justify-between gap-3 pr-8">
              <div className="min-w-0">
                <SheetTitle className="truncate">
                  {item.caption.split("\n")[0]}
                </SheetTitle>
                <SheetDescription className="flex flex-wrap items-center gap-2 mt-1">
                  {clientName && (
                    <span className="text-foreground font-medium">
                      {clientName}
                    </span>
                  )}
                  <span
                    className="inline-flex items-center gap-1 text-xs"
                    style={{ color: platformColor }}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: platformColor }}
                    />
                    {PLATFORM_LABEL[item.platform]}
                  </span>
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{ backgroundColor: status.bg, color: status.fg }}
                  >
                    {CONTENT_STATUS_LABEL[item.status]}
                  </span>
                </SheetDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Post actions"
                    className="shrink-0"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => notify("Post duplicated.")}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate post
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() =>
                      notify("Pick a new date in the calendar to move it.")
                    }
                  >
                    <CalendarClock className="h-4 w-4 mr-2" />
                    Move to different date
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => notify("Marked as published.")}>
                    <Check className="h-4 w-4 mr-2" />
                    Mark as published
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => setConfirmDelete(true)}
                    className="text-danger"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete post
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SheetHeader>

          <Tabs defaultValue="preview" className="flex-1 flex flex-col">
            <div className="px-6 pt-4 border-b">
              <TabsList>
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="approval">Approval</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <TabsContent value="preview" className="mt-0">
                <PreviewTab item={item} clientName={clientName} />
              </TabsContent>
              <TabsContent value="details" className="mt-0">
                <DetailsTab item={item} clientName={clientName} />
              </TabsContent>
              <TabsContent value="approval" className="mt-0">
                <ApprovalTab item={item} />
              </TabsContent>
              <TabsContent value="history" className="mt-0">
                <HistoryTab item={item} />
              </TabsContent>
            </div>
          </Tabs>
        </SheetContent>
      </Sheet>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this post?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The post and any approval comments
              will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmDelete(false);
                onOpenChange(false);
                notify("Post deleted.");
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-md bg-foreground text-background px-4 py-2 text-sm shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}
