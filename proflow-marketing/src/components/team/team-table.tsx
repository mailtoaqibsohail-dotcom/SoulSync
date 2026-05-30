"use client";

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { InviteTeamButton } from "./invite-team-button";
import { relativeTime } from "@/lib/relative-time";
import type { TeamMemberStatus, TeamPerson } from "@/lib/clients-data";

const STATUS_BADGE: Record<TeamMemberStatus, { bg: string; fg: string; label: string }> = {
  active: { bg: "#D1FAE5", fg: "#065F46", label: "Active" },
  invited: { bg: "#DBEAFE", fg: "#1E40AF", label: "Invited" },
  suspended: { bg: "#FEE2E2", fg: "#991B1B", label: "Suspended" },
};

const ROLE_LABEL: Record<TeamPerson["role"], string> = {
  owner: "Owner",
  team: "Team Member",
};

export interface TeamClientRef {
  id: string;
  name: string;
  team_ids: string[];
}

interface Props {
  members: TeamPerson[];
  assignmentCounts: Record<string, number>;
  clients: TeamClientRef[];
}

export function TeamTable({ members, assignmentCounts, clients }: Props) {
  const [openAssignments, setOpenAssignments] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Team</h1>
          <p className="text-sm text-muted-foreground">
            Manage your team members and their client assignments.
          </p>
        </div>
        <InviteTeamButton clients={clients} />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Assigned Clients</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Last active</th>
                  <th className="px-4 py-3 font-medium w-10" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {members.map((m) => {
                  const s = STATUS_BADGE[m.status];
                  const count = assignmentCounts[m.id] ?? 0;
                  return (
                    <tr key={m.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="h-8 w-8 rounded-full grid place-items-center text-white text-xs font-semibold"
                            style={{ backgroundColor: m.color }}
                          >
                            {m.initials}
                          </span>
                          <span className="font-medium">{m.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {m.email}
                      </td>
                      <td className="px-4 py-3">{ROLE_LABEL[m.role]}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="text-accent hover:underline"
                          onClick={() =>
                            setOpenAssignments((id) => (id === m.id ? null : m.id))
                          }
                        >
                          {count} client{count === 1 ? "" : "s"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: s.bg, color: s.fg }}
                        >
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {relativeTime(m.last_active_at)}
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Actions">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem>Reassign clients</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-warning">
                              {m.status === "suspended" ? "Reinstate" : "Suspend"}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-danger">
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {openAssignments && (
        <AssignmentDetails
          memberId={openAssignments}
          members={members}
          clients={clients}
          onClose={() => setOpenAssignments(null)}
        />
      )}
    </div>
  );
}

function AssignmentDetails({
  memberId,
  members,
  clients,
  onClose,
}: {
  memberId: string;
  members: TeamPerson[];
  clients: TeamClientRef[];
  onClose: () => void;
}) {
  const m = members.find((x) => x.id === memberId);
  if (!m) return null;
  const list = clients.filter((c) => c.team_ids.includes(memberId));
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            {m.name} — assigned clients
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Not assigned to any active client.
          </p>
        ) : (
          <ul className="text-sm space-y-1">
            {list.map((c) => (
              <li key={c.id} className="text-muted-foreground">
                {c.name}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
