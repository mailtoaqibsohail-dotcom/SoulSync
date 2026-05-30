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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  INDUSTRIES,
  PLATFORM_LABEL,
  type Industry,
  type PlatformKey,
  type TeamPerson,
} from "@/lib/clients-data";
import { addClient } from "@/app/(app)/clients/actions";
import { cn } from "@/lib/utils";

const ALL_PLATFORMS: PlatformKey[] = [
  "instagram",
  "tiktok",
  "youtube",
  "facebook",
  "linkedin",
  "x",
];

export function AddClientButton({ team }: { team: TeamPerson[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [industry, setIndustry] = useState<Industry>("Other");
  const [platforms, setPlatforms] = useState<PlatformKey[]>(["instagram"]);
  const [quotas, setQuotas] = useState<Record<PlatformKey, number>>({
    instagram: 12,
    tiktok: 12,
    youtube: 12,
    facebook: 12,
    linkedin: 12,
    x: 12,
  });
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [brandPrimary, setBrandPrimary] = useState("#0F172A");
  const [brandAccent, setBrandAccent] = useState("#2563EB");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setName("");
    setContactName("");
    setContactEmail("");
    setIndustry("Other");
    setPlatforms(["instagram"]);
    setTeamIds([]);
    setBrandPrimary("#0F172A");
    setBrandAccent("#2563EB");
    setNotes("");
    setError(null);
  }

  function togglePlatform(p: PlatformKey) {
    setPlatforms((arr) =>
      arr.includes(p) ? arr.filter((x) => x !== p) : [...arr, p]
    );
  }

  function toggleTeam(id: string) {
    setTeamIds((arr) =>
      arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]
    );
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await addClient({
        name,
        primary_contact_name: contactName,
        primary_contact_email: contactEmail,
        industry,
        platforms,
        monthly_quotas: quotas,
        team_ids: teamIds,
        brand_primary: brandPrimary,
        brand_accent: brandAccent,
        notes,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      setToast(
        res.email_sent
          ? `Client added — portal invitation emailed to ${contactEmail}.`
          : `Client added. Portal login created, but the invite email couldn't be sent${
              res.email_error ? ` (${res.email_error})` : ""
            }.`
      );
      reset();
      setTimeout(() => setToast(null), 5000);
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add Client
      </Button>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-md border bg-card px-4 py-3 shadow-md text-sm">
          {toast}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add a new client</DialogTitle>
            <DialogDescription>
              The client will receive an invitation to set up their portal
              account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Field label="Client name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Primary contact name" required>
                <Input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </Field>
              <Field label="Primary contact email" required>
                <Input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </Field>
            </div>

            <Field label="Industry" required>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value as Industry)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Active platforms"
              required
              hint="Pick the platforms you will post on for this client."
            >
              <div className="flex flex-wrap gap-2">
                {ALL_PLATFORMS.map((p) => {
                  const checked = platforms.includes(p);
                  return (
                    <label
                      key={p}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 border rounded-md cursor-pointer text-sm",
                        checked ? "border-accent bg-accent/5" : "hover:bg-accent/5"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePlatform(p)}
                        className="h-4 w-4 rounded border-input"
                      />
                      {PLATFORM_LABEL[p]}
                    </label>
                  );
                })}
              </div>
            </Field>

            {platforms.length > 0 && (
              <Field
                label="Monthly content quota"
                hint="Posts per platform per month."
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {platforms.map((p) => (
                    <div key={p} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-20">
                        {PLATFORM_LABEL[p]}
                      </span>
                      <Input
                        type="number"
                        min={0}
                        value={quotas[p]}
                        onChange={(e) =>
                          setQuotas((q) => ({
                            ...q,
                            [p]: Number(e.target.value) || 0,
                          }))
                        }
                        className="h-9"
                      />
                    </div>
                  ))}
                </div>
              </Field>
            )}

            <Field label="Assign team members">
              <div className="flex flex-wrap gap-2">
                {team
                  .filter((t) => t.role !== "owner")
                  .map((t) => {
                    const checked = teamIds.includes(t.id);
                    return (
                      <label
                        key={t.id}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 border rounded-md cursor-pointer text-sm",
                          checked
                            ? "border-accent bg-accent/5"
                            : "hover:bg-accent/5"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTeam(t.id)}
                          className="h-4 w-4 rounded border-input"
                        />
                        <span
                          className="h-5 w-5 rounded-full grid place-items-center text-white text-[9px] font-semibold"
                          style={{ backgroundColor: t.color }}
                        >
                          {t.initials}
                        </span>
                        {t.name}
                      </label>
                    );
                  })}
              </div>
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Brand primary">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brandPrimary}
                    onChange={(e) => setBrandPrimary(e.target.value)}
                    className="h-10 w-12 rounded border cursor-pointer"
                  />
                  <Input
                    value={brandPrimary}
                    onChange={(e) => setBrandPrimary(e.target.value)}
                  />
                </div>
              </Field>
              <Field label="Brand accent">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brandAccent}
                    onChange={(e) => setBrandAccent(e.target.value)}
                    className="h-10 w-12 rounded border cursor-pointer"
                  />
                  <Input
                    value={brandAccent}
                    onChange={(e) => setBrandAccent(e.target.value)}
                  />
                </div>
              </Field>
            </div>

            <Field label="Notes">
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything the team should know."
              />
            </Field>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? "Adding…" : "Add Client & Send Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
