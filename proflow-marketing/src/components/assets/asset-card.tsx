"use client";

import {
  MoreHorizontal,
  ImageIcon,
  Video,
  FileText,
  PenTool,
  Plus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import { formatBytes, type AssetRecord } from "@/lib/assets-data";

const ICON: Record<AssetRecord["file_type"], React.ComponentType<{ className?: string }>> = {
  image: ImageIcon,
  video: Video,
  vector: PenTool,
  pdf: FileText,
};

export function AssetCard({ asset }: { asset: AssetRecord }) {
  const Icon = ICON[asset.file_type];
  return (
    <Card className="group relative overflow-hidden">
      <div
        className="aspect-square w-full grid place-items-center text-white"
        style={{
          backgroundImage: `linear-gradient(135deg, ${asset.thumb_color}, ${asset.thumb_color}aa)`,
        }}
      >
        <Icon className="h-10 w-10 opacity-90" />
      </div>

      <div className="p-3 space-y-1">
        <div className="text-sm font-medium truncate" title={asset.filename}>
          {asset.filename}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="uppercase">{asset.file_type}</span>
          <span>{formatBytes(asset.size_bytes)}</span>
        </div>
        {asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {asset.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md bg-white text-foreground text-xs font-medium px-2.5 py-1.5 shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          Use in Post
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Asset actions"
              className="h-8 w-8 grid place-items-center rounded-md bg-white text-foreground shadow-sm"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Rename</DropdownMenuItem>
            <DropdownMenuItem>Move to folder</DropdownMenuItem>
            <DropdownMenuItem>Add tags</DropdownMenuItem>
            <DropdownMenuItem>Download</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-danger">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
