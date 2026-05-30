"use client";

import { useMemo, useState } from "react";
import { Search, LayoutGrid, List as ListIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { UploadAssetsButton } from "./upload-assets-button";
import { AssetCard } from "./asset-card";
import {
  ASSET_FOLDERS,
  formatBytes,
  type AssetFolder,
  type AssetRecord,
} from "@/lib/assets-data";
import { cn } from "@/lib/utils";

interface ClientRef {
  id: string;
  name: string;
  brand_color: string;
  initials: string;
}

type SortKey = "newest" | "oldest" | "name" | "size";

interface Props {
  assets: AssetRecord[];
  clients: ClientRef[];
}

export function AssetLibrary({ assets, clients }: Props) {
  const [clientId, setClientId] = useState<string>(clients[0]?.id ?? "");
  const [folder, setFolder] = useState<AssetFolder>("All Assets");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState<SortKey>("newest");

  const clientAssets = useMemo(
    () => assets.filter((a) => a.client_id === clientId),
    [assets, clientId]
  );

  // Tag cloud unique to current client
  const tagCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of clientAssets) {
      for (const t of a.tags) map.set(t, (map.get(t) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [clientAssets]);

  // Folder counts unique to current client (so the sidebar always
  // reflects what's available for this client).
  const folderCounts = useMemo(() => {
    const map = new Map<AssetFolder, number>();
    map.set("All Assets", clientAssets.length);
    for (const a of clientAssets) {
      map.set(a.folder, (map.get(a.folder) ?? 0) + 1);
    }
    return map;
  }, [clientAssets]);

  const filtered = useMemo(() => {
    let rows = clientAssets;
    if (folder !== "All Assets") rows = rows.filter((a) => a.folder === folder);
    if (activeTag) rows = rows.filter((a) => a.tags.includes(activeTag));
    if (search.trim()) {
      const s = search.toLowerCase();
      rows = rows.filter(
        (a) =>
          a.filename.toLowerCase().includes(s) ||
          a.tags.some((t) => t.toLowerCase().includes(s))
      );
    }
    const sorted = [...rows];
    sorted.sort((a, b) => {
      switch (sort) {
        case "oldest":
          return (
            new Date(a.uploaded_at).getTime() -
            new Date(b.uploaded_at).getTime()
          );
        case "name":
          return a.filename.localeCompare(b.filename);
        case "size":
          return b.size_bytes - a.size_bytes;
        default:
          return (
            new Date(b.uploaded_at).getTime() -
            new Date(a.uploaded_at).getTime()
          );
      }
    });
    return sorted;
  }, [clientAssets, folder, activeTag, search, sort]);

  const totalBytes = filtered.reduce((s, a) => s + a.size_bytes, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Asset Library</h1>
          <p className="text-sm text-muted-foreground">
            Brand assets, photos, and media for your content.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value);
              setFolder("All Assets");
              setActiveTag(null);
            }}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <UploadAssetsButton clientId={clientId} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* Sidebar */}
        <aside className="space-y-4">
          <Card>
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground px-2 pb-2">
                Folders
              </div>
              <ul className="space-y-0.5">
                {ASSET_FOLDERS.map((f) => {
                  const count = folderCounts.get(f) ?? 0;
                  const active = folder === f;
                  return (
                    <li key={f}>
                      <button
                        type="button"
                        onClick={() => {
                          setFolder(f);
                          setActiveTag(null);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between rounded-md px-2 py-1.5 text-sm",
                          active
                            ? "bg-accent/10 text-accent font-medium"
                            : "text-muted-foreground hover:bg-accent/5 hover:text-foreground"
                        )}
                      >
                        <span>{f}</span>
                        <span className="text-xs">{count}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground px-2 pb-2">
                Tags
              </div>
              <div className="flex flex-wrap gap-1.5 px-1">
                {tagCounts.length === 0 && (
                  <span className="text-xs text-muted-foreground">
                    No tags yet.
                  </span>
                )}
                {tagCounts.map(([tag, count]) => {
                  const on = activeTag === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        setActiveTag((cur) => (cur === tag ? null : tag))
                      }
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px]",
                        on
                          ? "bg-accent text-accent-foreground border-accent"
                          : "text-muted-foreground hover:bg-accent/5"
                      )}
                    >
                      {tag} <span className="opacity-60">{count}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* Main */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-3 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assets by name or tag..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="h-10 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="name">Name A-Z</option>
                <option value="size">Size</option>
              </select>
              <div className="inline-flex rounded-md border bg-background">
                <button
                  type="button"
                  aria-label="Grid view"
                  onClick={() => setView("grid")}
                  className={cn(
                    "h-10 w-10 grid place-items-center",
                    view === "grid"
                      ? "bg-accent/10 text-accent"
                      : "text-muted-foreground"
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="List view"
                  onClick={() => setView("list")}
                  className={cn(
                    "h-10 w-10 grid place-items-center border-l",
                    view === "list"
                      ? "bg-accent/10 text-accent"
                      : "text-muted-foreground"
                  )}
                >
                  <ListIcon className="h-4 w-4" />
                </button>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {filtered.length} asset{filtered.length === 1 ? "" : "s"}
              {activeTag && ` tagged "${activeTag}"`}
              {folder !== "All Assets" && ` in ${folder}`}
            </span>
            <span>{formatBytes(totalBytes)} total</span>
          </div>

          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No assets match these filters.
              </CardContent>
            </Card>
          ) : view === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((a) => (
                <AssetCard key={a.id} asset={a} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-muted-foreground text-left">
                      <tr>
                        <th className="px-4 py-3 font-medium">Name</th>
                        <th className="px-4 py-3 font-medium">Folder</th>
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 font-medium">Tags</th>
                        <th className="px-4 py-3 font-medium text-right">
                          Size
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filtered.map((a) => (
                        <tr key={a.id} className="hover:bg-muted/40">
                          <td className="px-4 py-3 font-medium">{a.filename}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {a.folder}
                          </td>
                          <td className="px-4 py-3 uppercase text-xs">
                            {a.file_type}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {a.tags.map((t) => (
                                <span
                                  key={t}
                                  className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {formatBytes(a.size_bytes)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
