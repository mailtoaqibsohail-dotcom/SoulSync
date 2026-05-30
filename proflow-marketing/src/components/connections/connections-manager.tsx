"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Link2, Pencil, Trash2, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PLATFORM_LABEL, PLATFORM_COLOR, type PlatformKey } from "@/lib/clients-data";
import type { ConnectionView } from "@/lib/data/connections";
import {
  saveConnection,
  deleteConnection,
  revealConnectionSecret,
  startOAuth,
} from "@/app/(client)/connections/actions";

const PLATFORMS: PlatformKey[] = ["instagram", "facebook", "tiktok", "youtube", "linkedin", "x"];

interface Props {
  clientId: string;
  connections: ConnectionView[];
  canEdit: boolean;
  showHeader?: boolean;
}

export function ConnectionsManager({ clientId, connections, canEdit, showHeader = true }: Props) {
  const router = useRouter();
  const byPlatform = new Map(connections.map((c) => [c.platform, c]));
  const [toast, setToast] = useState<string | null>(null);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  return (
    <div className="space-y-4">
      {showHeader && (
        <div>
          <h1 className="text-2xl font-semibold">Connections</h1>
          <p className="text-sm text-muted-foreground">
            Grant the team access to your social accounts. Logins are encrypted and only visible to
            you and your agency team. You can also connect via the platform directly.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {PLATFORMS.map((p) => (
          <PlatformCard
            key={p}
            platform={p}
            clientId={clientId}
            connection={byPlatform.get(p) ?? null}
            canEdit={canEdit}
            onChange={() => router.refresh()}
            flash={flash}
          />
        ))}
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-md bg-foreground px-4 py-2 text-sm text-background shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function PlatformCard({
  platform,
  clientId,
  connection,
  canEdit,
  onChange,
  flash,
}: {
  platform: PlatformKey;
  clientId: string;
  connection: ConnectionView | null;
  canEdit: boolean;
  onChange: () => void;
  flash: (m: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<{ username: string; password: string; notes: string } | null>(null);

  const [handle, setHandle] = useState(connection?.handle ?? "");
  const [username, setUsername] = useState(connection?.username ?? "");
  const [password, setPassword] = useState("");
  const [notes, setNotes] = useState("");

  const connected = !!connection;

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveConnection({ clientId, platform, handle, username, password, notes });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      setPassword("");
      setNotes("");
      setRevealed(null);
      flash(`${PLATFORM_LABEL[platform]} saved.`);
      onChange();
    });
  }

  function remove() {
    startTransition(async () => {
      const res = await deleteConnection(clientId, platform);
      if (!res.ok) flash(res.error);
      else {
        flash(`${PLATFORM_LABEL[platform]} removed.`);
        onChange();
      }
    });
  }

  function reveal() {
    startTransition(async () => {
      const res = await revealConnectionSecret(clientId, platform);
      if (!res.ok) flash(res.error);
      else setRevealed({ username: res.username, password: res.password, notes: res.notes });
    });
  }

  function connectOAuth() {
    startTransition(async () => {
      const res = await startOAuth(clientId, platform);
      if (!res.ok) flash(res.error);
      else window.location.href = res.url;
    });
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <span
            className="h-8 w-8 rounded grid place-items-center text-white text-xs font-bold"
            style={{ backgroundColor: PLATFORM_COLOR[platform] }}
            aria-hidden
          >
            {PLATFORM_LABEL[platform][0]}
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">{PLATFORM_LABEL[platform]}</div>
            <div className="text-xs text-muted-foreground truncate">
              {connection?.handle || connection?.username || "Not connected"}
            </div>
          </div>
          {connected ? (
            <Badge className="bg-success/10 text-success">
              {connection?.auth_type === "oauth" ? "Connected" : "Saved"}
            </Badge>
          ) : (
            <Badge>Not set</Badge>
          )}
        </div>

        {revealed && (
          <div className="rounded-md border bg-muted/40 p-2 text-xs space-y-1 font-mono break-all">
            <div>user: {revealed.username || "—"}</div>
            <div>pass: {revealed.password || "—"}</div>
            {revealed.notes && <div className="font-sans">notes: {revealed.notes}</div>}
            <button
              className="text-muted-foreground inline-flex items-center gap-1 font-sans"
              onClick={() => setRevealed(null)}
            >
              <EyeOff className="h-3 w-3" /> hide
            </button>
          </div>
        )}

        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
              {connected ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {connected ? "Edit login" : "Add login"}
            </Button>
            {connected && connection?.auth_type === "vault" && (
              <Button size="sm" variant="ghost" onClick={reveal} disabled={pending}>
                <Eye className="h-3.5 w-3.5" /> Reveal
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={connectOAuth} disabled={pending}>
              <Link2 className="h-3.5 w-3.5" /> Connect
            </Button>
            {connected && (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={remove}
                disabled={pending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{PLATFORM_LABEL[platform]} login</DialogTitle>
            <DialogDescription>
              Stored encrypted. Leave the password blank to keep the existing one.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                {error}
              </div>
            )}
            <Field label="Handle / profile">
              <Input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@yourbrand" />
            </Field>
            <Field label="Username / email">
              <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder={connected ? "•••••••• (unchanged)" : ""}
              />
            </Field>
            <Field label="Notes (2FA, backup codes, etc.)">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
