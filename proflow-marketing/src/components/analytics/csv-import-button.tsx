"use client";

import { useRef, useState, useTransition } from "react";
import { Upload, Check, ArrowLeft, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  parseCsv,
  autoMap,
  FIELD_LABEL,
  SNAPSHOT_FIELDS,
  type SnapshotField,
} from "@/lib/csv";
import {
  PLATFORM_COLOR,
  PLATFORM_LABEL,
  type PlatformKey,
} from "@/lib/clients-data";
import { cn } from "@/lib/utils";

interface Props {
  clientId: string;
  platforms: PlatformKey[];
}

type Step = "select" | "match" | "preview" | "done";

export function CsvImportButton({ clientId, platforms }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("select");
  const [platform, setPlatform] = useState<PlatformKey | "">(
    platforms[0] ?? ""
  );
  const [filename, setFilename] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Partial<Record<SnapshotField, number>>>(
    {}
  );
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep("select");
    setFilename("");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setError(null);
    setImportedCount(0);
    setPlatform(platforms[0] ?? "");
  }

  async function onPick(picked: FileList | null) {
    if (!picked?.[0]) return;
    const file = picked[0];
    setFilename(file.name);
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (parsed.headers.length === 0) {
        setError("That CSV has no header row.");
        return;
      }
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setMapping(autoMap(parsed.headers));
      setError(null);
      setStep("match");
    } catch {
      setError("Could not read that file as CSV.");
    }
  }

  function confirmImport() {
    if (!mapping.date || mapping.date === undefined) {
      // ...
    }
    if (mapping.date === undefined) {
      setError("Map the Date column before importing.");
      return;
    }
    setError(null);
    startTransition(async () => {
      // TODO: persist to Supabase
      //   for (const r of rows) {
      //     await supabase.from('metrics_snapshots').upsert({
      //       client_id: clientId, platform,
      //       snapshot_date: r[mapping.date],
      //       followers: Number(r[mapping.followers ?? -1] ?? null),
      //       ...
      //     });
      //   }
      await new Promise((r) => setTimeout(r, 600));
      setImportedCount(rows.length);
      setStep("done");
    });
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={!clientId || platforms.length === 0}
      >
        <Upload className="h-4 w-4" />
        Import from CSV
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
            <DialogTitle>Import metrics from CSV</DialogTitle>
            <DialogDescription>
              Bring in a Meta Business Suite, Creator Studio, or TikTok
              Insights export.
            </DialogDescription>
          </DialogHeader>

          <Stepper step={step} />

          {step === "select" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Platform</Label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as PlatformKey)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {platforms.map((p) => (
                    <option key={p} value={p}>
                      {PLATFORM_LABEL[p]}
                    </option>
                  ))}
                </select>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                hidden
                onChange={(e) => onPick(e.target.files)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed rounded-md p-10 text-sm hover:bg-accent/5"
              >
                <div className="flex flex-col items-center gap-1">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span>Select your CSV file</span>
                  <span className="text-xs text-muted-foreground">
                    UTF-8 encoded. First row must contain headers.
                  </span>
                </div>
              </button>
            </div>
          )}

          {step === "match" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                We auto-matched columns we recognized. Override any below.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {SNAPSHOT_FIELDS.map((f) => (
                  <div key={f} className="space-y-1.5">
                    <Label className="text-xs">
                      {FIELD_LABEL[f]}
                      {f === "date" && (
                        <span className="text-danger"> *</span>
                      )}
                    </Label>
                    <select
                      value={mapping[f] ?? ""}
                      onChange={(e) =>
                        setMapping({
                          ...mapping,
                          [f]:
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value),
                        })
                      }
                      className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    >
                      <option value="">— ignore —</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Showing the first 5 rows mapped to ProFlow fields. We will
                import {rows.length} row{rows.length === 1 ? "" : "s"}.
              </p>
              <div className="overflow-x-auto border rounded-md">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      {SNAPSHOT_FIELDS.filter(
                        (f) => mapping[f] !== undefined
                      ).map((f) => (
                        <th
                          key={f}
                          className="px-2.5 py-2 text-left font-medium"
                        >
                          {FIELD_LABEL[f]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 5).map((r, i) => (
                      <tr key={i} className="border-t">
                        {SNAPSHOT_FIELDS.filter(
                          (f) => mapping[f] !== undefined
                        ).map((f) => (
                          <td key={f} className="px-2.5 py-1.5">
                            {r[mapping[f] as number] ?? ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="rounded-md border border-success/30 bg-success/5 p-4 text-sm flex items-start gap-2">
              <Check className="h-4 w-4 mt-0.5 text-success" />
              <div>
                <div className="font-semibold text-success">
                  Imported {importedCount} row{importedCount === 1 ? "" : "s"}{" "}
                  successfully.
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  Charts will pick up the new snapshots on next refresh.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <DialogFooter className="justify-between">
            <div className="text-xs text-muted-foreground self-center">
              {filename && step !== "done" && (
                <>
                  File: <strong>{filename}</strong> · {rows.length} rows ·{" "}
                  {platform && PLATFORM_LABEL[platform as PlatformKey]}
                </>
              )}
            </div>
            <div className="flex gap-2">
              {step === "match" && (
                <Button
                  variant="outline"
                  onClick={() => setStep("select")}
                  size="sm"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              )}
              {step === "preview" && (
                <Button
                  variant="outline"
                  onClick={() => setStep("match")}
                  size="sm"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              )}

              {step === "select" && (
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              )}
              {step === "match" && (
                <Button onClick={() => setStep("preview")}>
                  Preview
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
              {step === "preview" && (
                <Button onClick={confirmImport} disabled={pending}>
                  {pending
                    ? "Importing…"
                    : `Import ${rows.length} row${rows.length === 1 ? "" : "s"}`}
                </Button>
              )}
              {step === "done" && (
                <Button onClick={() => setOpen(false)}>Done</Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Stepper({ step }: { step: Step }) {
  const labels: Array<{ key: Step; label: string }> = [
    { key: "select", label: "1. Select" },
    { key: "match", label: "2. Match columns" },
    { key: "preview", label: "3. Preview" },
    { key: "done", label: "4. Import" },
  ];
  const activeIdx = labels.findIndex((l) => l.key === step);
  return (
    <ol className="flex items-center gap-1 text-xs">
      {labels.map((l, i) => (
        <li
          key={l.key}
          className={cn(
            "flex-1 rounded-md px-2 py-1 text-center",
            i <= activeIdx
              ? "bg-accent/10 text-accent font-medium"
              : "text-muted-foreground"
          )}
          style={{
            backgroundColor:
              i < activeIdx ? `${PLATFORM_COLOR.linkedin}15` : undefined,
          }}
        >
          {l.label}
        </li>
      ))}
    </ol>
  );
}
