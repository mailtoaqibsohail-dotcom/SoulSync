"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

interface Trigger {
  id: string;
  label: string;
}

interface Pref {
  email: boolean;
  in_app: boolean;
}

export function NotificationsForm({ triggers }: { triggers: Trigger[] }) {
  const [prefs, setPrefs] = useState<Record<string, Pref>>(() =>
    Object.fromEntries(
      triggers.map((t) => [t.id, { email: true, in_app: true }])
    )
  );
  const [toast, setToast] = useState<string | null>(null);

  function update(id: string, patch: Partial<Pref>) {
    setPrefs((p) => ({ ...p, [id]: { ...p[id], ...patch } }));
  }

  function save() {
    // TODO: persist to Supabase
    setToast("Notification preferences updated.");
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground text-left">
            <tr className="border-b">
              <th className="py-2 font-medium">Notify me when…</th>
              <th className="py-2 font-medium text-center w-24">Email</th>
              <th className="py-2 font-medium text-center w-24">In-app</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {triggers.map((t) => {
              const p = prefs[t.id];
              return (
                <tr key={t.id}>
                  <td className="py-3 pr-4">{t.label}</td>
                  <td className="py-3 text-center">
                    <div className="inline-flex">
                      <Switch
                        checked={p.email}
                        onCheckedChange={(v) => update(t.id, { email: v })}
                      />
                    </div>
                  </td>
                  <td className="py-3 text-center">
                    <div className="inline-flex">
                      <Switch
                        checked={p.in_app}
                        onCheckedChange={(v) => update(t.id, { in_app: v })}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
