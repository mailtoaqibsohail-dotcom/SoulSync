"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type Mode = "per_post" | "batch";

export function ApprovalPreferencesForm() {
  const [mode, setMode] = useState<Mode>("per_post");
  const [autoApprove, setAutoApprove] = useState<Record<string, boolean>>({
    "Story reposts": true,
    "Hashtag-only recap posts": false,
    "Pre-approved series": true,
  });
  const [toast, setToast] = useState<string | null>(null);

  function save() {
    setToast("Approval preferences saved.");
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="space-y-6 text-sm">
      <div className="space-y-2">
        <div className="font-medium">Approval mode</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {(["per_post", "batch"] as const).map((m) => (
            <label
              key={m}
              className={cn(
                "flex flex-col gap-1 rounded-md border p-3 cursor-pointer",
                mode === m
                  ? "border-accent bg-accent/5"
                  : "hover:bg-accent/5"
              )}
            >
              <span className="flex items-center gap-2 font-medium">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === m}
                  onChange={() => setMode(m)}
                />
                {m === "per_post" ? "Approve each post" : "Batch approve"}
              </span>
              <span className="text-xs text-muted-foreground">
                {m === "per_post"
                  ? "I review and approve every post one at a time."
                  : "I approve a batch of pending posts in one go."}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="font-medium">Auto-approve repeat content types</div>
        <ul className="divide-y border rounded-md">
          {Object.entries(autoApprove).map(([label, on]) => (
            <li
              key={label}
              className="flex items-center justify-between px-3 py-2"
            >
              <span>{label}</span>
              <Switch
                checked={on}
                onCheckedChange={(v) =>
                  setAutoApprove((p) => ({ ...p, [label]: v }))
                }
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-end">
        <Button onClick={save}>Save preferences</Button>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-md bg-foreground text-background px-4 py-2 text-sm shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
