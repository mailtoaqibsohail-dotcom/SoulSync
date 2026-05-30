"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PLATFORM_COLOR,
  PLATFORM_LABEL,
  type PlatformKey,
} from "@/lib/clients-data";

interface Props {
  clientId: string;
  platforms: PlatformKey[];
}

interface Entry {
  date: string;
  followers: string;
  following: string;
  reach: string;
  profile_visits: string;
  website_clicks: string;
}

const EMPTY: Entry = {
  date: new Date().toISOString().slice(0, 10),
  followers: "",
  following: "",
  reach: "",
  profile_visits: "",
  website_clicks: "",
};

export function ManualMetricsButton({ clientId, platforms }: Props) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<Record<PlatformKey, Entry>>(
    () =>
      Object.fromEntries(platforms.map((p) => [p, { ...EMPTY }])) as Record<
        PlatformKey,
        Entry
      >
  );
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  function update(p: PlatformKey, patch: Partial<Entry>) {
    setEntries((map) => ({ ...map, [p]: { ...map[p], ...patch } }));
  }

  function save() {
    startTransition(async () => {
      // TODO: persist via Supabase
      //   const supabase = createClient();
      //   await supabase.from('metrics_snapshots').upsert(...);
      await new Promise((r) => setTimeout(r, 400));
      setOpen(false);
      setToast("Metrics saved.");
      setTimeout(() => setToast(null), 4000);
    });
  }

  if (platforms.length === 0) return null;

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} disabled={!clientId}>
        <Plus className="h-4 w-4" />
        Update metrics
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update metrics for this client</DialogTitle>
            <DialogDescription>
              Enter weekly snapshot values from Meta Business Suite, Creator
              Studio, or TikTok Insights. Use the matching date for the
              snapshot.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue={platforms[0]} className="space-y-4">
            <TabsList>
              {platforms.map((p) => (
                <TabsTrigger key={p} value={p}>
                  <span
                    className="h-2 w-2 rounded-full mr-2 inline-block"
                    style={{ backgroundColor: PLATFORM_COLOR[p] }}
                  />
                  {PLATFORM_LABEL[p]}
                </TabsTrigger>
              ))}
            </TabsList>
            {platforms.map((p) => (
              <TabsContent key={p} value={p} className="mt-0 space-y-3">
                <Grid>
                  <Field label="Date">
                    <Input
                      type="date"
                      value={entries[p].date}
                      onChange={(e) => update(p, { date: e.target.value })}
                    />
                  </Field>
                  <Field label="Followers">
                    <Input
                      type="number"
                      value={entries[p].followers}
                      onChange={(e) => update(p, { followers: e.target.value })}
                    />
                  </Field>
                  <Field label="Following (optional)">
                    <Input
                      type="number"
                      value={entries[p].following}
                      onChange={(e) => update(p, { following: e.target.value })}
                    />
                  </Field>
                  <Field label="Reach (last 7 days)">
                    <Input
                      type="number"
                      value={entries[p].reach}
                      onChange={(e) => update(p, { reach: e.target.value })}
                    />
                  </Field>
                  <Field label="Profile visits (last 7 days)">
                    <Input
                      type="number"
                      value={entries[p].profile_visits}
                      onChange={(e) =>
                        update(p, { profile_visits: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Website clicks (last 7 days)">
                    <Input
                      type="number"
                      value={entries[p].website_clicks}
                      onChange={(e) =>
                        update(p, { website_clicks: e.target.value })
                      }
                    />
                  </Field>
                </Grid>
              </TabsContent>
            ))}
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save Metrics"}
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

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
