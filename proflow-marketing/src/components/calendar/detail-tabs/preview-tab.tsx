"use client";

import { Heart, MessageCircle, Send, Bookmark, ThumbsUp } from "lucide-react";
import type { ContentItem } from "@/lib/content-data";
import { PLATFORM_COLOR, PLATFORM_LABEL } from "@/lib/clients-data";
import { cn } from "@/lib/utils";

interface Props {
  item: ContentItem;
  clientName?: string;
}

export function PreviewTab({ item, clientName }: Props) {
  switch (item.platform) {
    case "instagram":
    case "tiktok":
      return <SquareOrReelPreview item={item} clientName={clientName} />;
    case "linkedin":
    case "facebook":
      return <FeedCardPreview item={item} clientName={clientName} />;
    case "x":
      return <XPreview item={item} clientName={clientName} />;
    case "youtube":
      return <YouTubePreview item={item} clientName={clientName} />;
    default:
      return <SquareOrReelPreview item={item} clientName={clientName} />;
  }
}

function MediaBox({
  aspect,
  color,
  label,
}: {
  aspect: string;
  color: string;
  label: string;
}) {
  return (
    <div
      className={cn(
        "rounded-md grid place-items-center text-white text-xs font-medium",
        aspect
      )}
      style={{
        backgroundImage: `linear-gradient(135deg, ${color}, ${color}aa)`,
      }}
    >
      {label}
    </div>
  );
}

function SquareOrReelPreview({ item, clientName }: Props) {
  const color = PLATFORM_COLOR[item.platform];
  const isReel = item.post_type === "reel" || item.platform === "tiktok";
  return (
    <div className="max-w-[360px] mx-auto rounded-lg border bg-background overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b text-sm">
        <span
          className="h-7 w-7 rounded-full grid place-items-center text-white text-[10px] font-semibold"
          style={{ backgroundColor: color }}
        >
          {(clientName ?? "C")[0]}
        </span>
        <span className="font-semibold truncate">{clientName ?? "Your brand"}</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {PLATFORM_LABEL[item.platform]}
        </span>
      </div>
      <MediaBox
        aspect={isReel ? "aspect-[9/16] w-full" : "aspect-square w-full"}
        color={color}
        label={`${item.post_type.toUpperCase()} media`}
      />
      <div className="flex items-center gap-4 px-3 py-2 text-foreground/70">
        <Heart className="h-5 w-5" />
        <MessageCircle className="h-5 w-5" />
        <Send className="h-5 w-5" />
        <Bookmark className="h-5 w-5 ml-auto" />
      </div>
      <div className="px-3 pb-3 text-sm">
        <p className="font-semibold mb-1">{clientName ?? "Your brand"}</p>
        <p className="whitespace-pre-wrap">{item.caption}</p>
        {item.hashtags && (
          <p className="text-muted-foreground mt-1 break-words">
            {item.hashtags}
          </p>
        )}
      </div>
    </div>
  );
}

function FeedCardPreview({ item, clientName }: Props) {
  const color = PLATFORM_COLOR[item.platform];
  return (
    <div className="max-w-[460px] mx-auto rounded-lg border bg-background overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 text-sm">
        <span
          className="h-9 w-9 rounded-full grid place-items-center text-white text-[12px] font-semibold"
          style={{ backgroundColor: color }}
        >
          {(clientName ?? "C")[0]}
        </span>
        <div className="min-w-0">
          <div className="font-semibold truncate">{clientName ?? "Your brand"}</div>
          <div className="text-xs text-muted-foreground">
            Sponsored · {PLATFORM_LABEL[item.platform]}
          </div>
        </div>
      </div>
      <div className="px-3 pb-2 text-sm whitespace-pre-wrap">
        {item.caption}
        {item.hashtags && (
          <p className="text-accent mt-1">{item.hashtags}</p>
        )}
      </div>
      <MediaBox
        aspect="aspect-[16/9] w-full"
        color={color}
        label={`${item.post_type.toUpperCase()} media`}
      />
      <div className="flex items-center gap-4 px-3 py-2 text-foreground/70 border-t mt-2 text-xs">
        <span className="inline-flex items-center gap-1">
          <ThumbsUp className="h-4 w-4" /> Like
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageCircle className="h-4 w-4" /> Comment
        </span>
        <span className="inline-flex items-center gap-1">
          <Send className="h-4 w-4" /> Share
        </span>
      </div>
    </div>
  );
}

function XPreview({ item, clientName }: Props) {
  return (
    <div className="max-w-[460px] mx-auto rounded-lg border bg-background p-4">
      <div className="flex items-start gap-3">
        <span
          className="h-10 w-10 rounded-full grid place-items-center text-white text-[12px] font-semibold"
          style={{ backgroundColor: "#000000" }}
        >
          {(clientName ?? "C")[0]}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm">
            <span className="font-semibold">{clientName ?? "Your brand"}</span>
            <span className="text-muted-foreground"> · just now</span>
          </div>
          <p className="text-sm mt-1 whitespace-pre-wrap">{item.caption}</p>
          {item.hashtags && (
            <p className="text-accent text-sm mt-1">{item.hashtags}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function YouTubePreview({ item, clientName }: Props) {
  return (
    <div className="max-w-[460px] mx-auto rounded-lg border bg-background overflow-hidden">
      <MediaBox
        aspect="aspect-video w-full"
        color="#FF0000"
        label="VIDEO thumbnail"
      />
      <div className="p-3 space-y-1">
        <p className="font-semibold text-sm">
          {item.caption.split("\n")[0]}
        </p>
        <p className="text-xs text-muted-foreground">
          {clientName ?? "Your brand"} · Now
        </p>
        {item.caption.includes("\n") && (
          <p className="text-xs text-muted-foreground whitespace-pre-wrap">
            {item.caption.split("\n").slice(1).join("\n")}
          </p>
        )}
      </div>
    </div>
  );
}
