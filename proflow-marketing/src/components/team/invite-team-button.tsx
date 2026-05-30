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
import { inviteTeamMember } from "@/app/(app)/team/actions";
import { cn } from "@/lib/utils";

interface Props {
  clients: { id: string; name: string }[];
}

export function InviteTeamButton({ clients }: Props) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"owner" | "team">("team");
  const [clientIds, setClientIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setFullName("");
    setEmail("");
    setRole("team");
    setClientIds([]);
    setError(null);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await inviteTeamMember({
        full_name: fullName,
        email,
        role,
        client_ids: clientIds,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      setToast(
        res.email_sent
          ? `Account created — invitation emailed to ${email}.`
          : `Account created for ${email}, but the invite email couldn't be sent${
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
        Invite Team Member
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite a team member</DialogTitle>
            <DialogDescription>
              They will receive an email with a link to set their password and
              join your workspace.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Field label="Full name" required>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Sarah Chen"
              />
            </Field>
            <Field label="Email address" required>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah@youragency.com"
              />
            </Field>
            <Field label="Role">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "owner" | "team")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="team">Team Member</option>
                <option value="owner">Owner</option>
              </select>
            </Field>
            <Field label="Assign to clients">
              {clients.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Add clients first to assign this teammate.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto border rounded-md p-2">
                  {clients.map((c) => {
                    const checked = clientIds.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={cn(
                          "flex items-center gap-2 text-sm px-2 py-1 rounded",
                          checked && "bg-accent/10 text-foreground"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setClientIds((arr) =>
                              checked
                                ? arr.filter((x) => x !== c.id)
                                : [...arr, c.id]
                            )
                          }
                        />
                        {c.name}
                      </label>
                    );
                  })}
                </div>
              )}
            </Field>
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? "Sending…" : "Send Invitation"}
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

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label} {required && <span className="text-danger">*</span>}
      </Label>
      {children}
    </div>
  );
}
