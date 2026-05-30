"use client";

import { useRef, useState } from "react";
import { Plus, Upload, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ASSET_FOLDERS,
  formatBytes,
  type AssetFolder,
} from "@/lib/assets-data";
import { cn } from "@/lib/utils";

interface Props {
  clientId: string;
}

interface StagedFile {
  id: string;
  file: File;
  folder: Exclude<AssetFolder, "All Assets">;
  tags: string[];
  description: string;
}

export function UploadAssetsButton({ clientId }: Props) {
  const [open, setOpen] = useState(false);
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStaged([]);
  }

  function addFiles(picked: FileList | null) {
    if (!picked) return;
    setStaged((arr) => [
      ...arr,
      ...Array.from(picked).map((file) => ({
        id: crypto.randomUUID(),
        file,
        folder: "Stock" as Exclude<AssetFolder, "All Assets">,
        tags: [] as string[],
        description: "",
      })),
    ]);
  }

  function updateStaged(id: string, patch: Partial<StagedFile>) {
    setStaged((arr) => arr.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function removeStaged(id: string) {
    setStaged((arr) => arr.filter((f) => f.id !== id));
  }

  function saveAll() {
    if (staged.length === 0) return;
    setSubmitting(true);
    // TODO Day 14+: persist via Supabase Storage upload + insert into `assets`
    // for clientId.
    setTimeout(() => {
      setSubmitting(false);
      setOpen(false);
      setToast(
        `${staged.length} asset${staged.length === 1 ? "" : "s"} queued for upload (Supabase wiring lands later).`
      );
      reset();
      setTimeout(() => setToast(null), 4500);
    }, 500);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={!clientId}>
        <Plus className="h-4 w-4" />
        Upload Assets
      </Button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload assets</DialogTitle>
            <DialogDescription>
              Drag and drop files here, or click to browse.
            </DialogDescription>
          </DialogHeader>

          <input
            ref={fileRef}
            type="file"
            multiple
            hidden
            onChange={(e) => addFiles(e.target.files)}
          />

          {staged.length === 0 ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed rounded-md p-12 text-sm hover:bg-accent/5"
            >
              <div className="flex flex-col items-center gap-1">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span>Drag and drop files here, or click to browse</span>
                <span className="text-xs text-muted-foreground">
                  Add tags and folder after upload.
                </span>
              </div>
            </button>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-3">
              {staged.map((s) => (
                <StagedRow
                  key={s.id}
                  staged={s}
                  onChange={(patch) => updateStaged(s.id, patch)}
                  onRemove={() => removeStaged(s.id)}
                />
              ))}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed rounded-md p-4 text-xs text-muted-foreground hover:bg-accent/5"
              >
                + Add more files
              </button>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveAll} disabled={submitting || staged.length === 0}>
              {submitting ? "Saving…" : "Save All"}
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

function StagedRow({
  staged,
  onChange,
  onRemove,
}: {
  staged: StagedFile;
  onChange: (patch: Partial<StagedFile>) => void;
  onRemove: () => void;
}) {
  const [tagDraft, setTagDraft] = useState("");

  function addTag() {
    const t = tagDraft.trim();
    if (!t || staged.tags.includes(t)) return;
    onChange({ tags: [...staged.tags, t] });
    setTagDraft("");
  }

  function removeTag(t: string) {
    onChange({ tags: staged.tags.filter((x) => x !== t) });
  }

  return (
    <div className="border rounded-md p-3 grid gap-3 md:grid-cols-[160px_1fr] items-start">
      <div>
        <div className="aspect-square w-full rounded-md bg-muted grid place-items-center text-xs text-muted-foreground">
          {staged.file.name.split(".").pop()?.toUpperCase() ?? "FILE"}
        </div>
        <div className="text-xs text-muted-foreground mt-2 truncate" title={staged.file.name}>
          {staged.file.name}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {formatBytes(staged.file.size)}
        </div>
      </div>
      <div className="space-y-2.5">
        <div className="space-y-1">
          <Label className="text-xs">Folder</Label>
          <select
            value={staged.folder}
            onChange={(e) =>
              onChange({
                folder: e.target.value as Exclude<AssetFolder, "All Assets">,
              })
            }
            className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            {ASSET_FOLDERS.filter((f) => f !== "All Assets").map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Tags</Label>
          <div className="flex flex-wrap gap-1">
            {staged.tags.map((t) => (
              <span
                key={t}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px]"
                )}
              >
                {t}
                <button
                  type="button"
                  onClick={() => removeTag(t)}
                  aria-label={`Remove ${t}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <Input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="Type a tag and press Enter"
              className="h-7 flex-1 min-w-[160px] text-xs"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Description</Label>
          <Textarea
            rows={2}
            value={staged.description}
            onChange={(e) => onChange({ description: e.target.value })}
          />
        </div>
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={onRemove}>
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
}
