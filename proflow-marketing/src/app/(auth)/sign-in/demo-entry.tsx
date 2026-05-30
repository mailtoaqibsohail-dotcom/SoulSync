"use client";

import { Button } from "@/components/ui/button";

type Role = "owner" | "team" | "client";

const HOME: Record<Role, string> = {
  owner: "/dashboard",
  team: "/work",
  client: "/home",
};

function enter(role: Role) {
  document.cookie = `proflow_demo_role=${role}; Path=/; Max-Age=86400; SameSite=Lax`;
  window.location.assign(HOME[role]);
}

export function DemoEntry() {
  return (
    <div className="border-t pt-4 space-y-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground text-center">
        Or explore the demo
      </p>
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => enter("owner")}
        >
          As Owner
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => enter("team")}
        >
          As Team
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => enter("client")}
        >
          As Client
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground text-center">
        Sample data. No real account is created.
      </p>
    </div>
  );
}
