"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type Status = "checking" | "ready" | "no-session";

export function SetPasswordForm() {
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // The invite / reset link lands here with the recovery session in the URL
  // hash. The Supabase browser client picks it up automatically; we just wait
  // for a session to exist before letting the user set a password.
  useEffect(() => {
    const supabase = createClient();
    let done = false;

    async function check() {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        done = true;
        setStatus("ready");
      }
    }

    // Re-check when the client finishes parsing the URL hash.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        done = true;
        setStatus("ready");
      }
    });

    check();
    // Fallback: if no session shows up shortly, the link is invalid/expired.
    const t = setTimeout(() => {
      if (!done) setStatus("no-session");
    }, 2500);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8 || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      setError("Must be at least 8 characters with one number and one symbol.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error: updErr } = await supabase.auth.updateUser({ password });
    if (updErr) {
      setSaving(false);
      setError(updErr.message);
      return;
    }
    // Session is now active — go to the app (role-based routing handles the rest).
    window.location.href = "/dashboard";
  }

  if (status === "no-session") {
    return (
      <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-3">
        This link is invalid or has expired. Please request a new invitation or
        use “Forgot password” on the sign-in page.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="password">New Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPwd(e.target.value)}
          disabled={status !== "ready"}
        />
        <p className="text-xs text-muted-foreground">
          Must be at least 8 characters with one number and one symbol.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirm Password</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={status !== "ready"}
        />
      </div>
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
          {error}
        </div>
      )}
      <Button type="submit" className="w-full" disabled={status !== "ready" || saving}>
        {status === "checking"
          ? "Verifying link…"
          : saving
            ? "Saving…"
            : "Save Password"}
      </Button>
    </form>
  );
}
