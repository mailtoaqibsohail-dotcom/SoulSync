import { createClient } from "@/lib/supabase/server";
import type { CurrentUser } from "@/lib/auth/current-user";
import type { ContentItem } from "@/lib/content-data";
import type { PlatformKey } from "@/lib/clients-data";
import { getVisibleClients } from "@/lib/data/clients";

/** Content items visible to the user (RLS-scoped), shaped like the sample data. */
export async function getContentItems(_user: CurrentUser): Promise<ContentItem[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("content_items")
    .select("id, client_id, post_type, caption, hashtags, status, scheduled_at, assigned_to")
    .order("scheduled_at", { ascending: true });

  const rows = data ?? [];
  // First platform per item (content_items has many via content_item_platforms).
  const ids = rows.map((r) => r.id);
  const platformByItem = new Map<string, PlatformKey>();
  if (ids.length > 0) {
    const { data: plats } = await supabase
      .from("content_item_platforms")
      .select("content_item_id, platform")
      .in("content_item_id", ids);
    for (const p of plats ?? []) {
      if (!platformByItem.has(p.content_item_id)) {
        platformByItem.set(p.content_item_id, p.platform as PlatformKey);
      }
    }
  }

  return rows.map((r) => ({
    id: r.id,
    client_id: r.client_id,
    platform: platformByItem.get(r.id) ?? "instagram",
    post_type: (r.post_type as ContentItem["post_type"]) ?? "feed",
    caption: r.caption ?? "",
    hashtags: r.hashtags ?? undefined,
    status: r.status as ContentItem["status"],
    scheduled_at: r.scheduled_at ?? new Date().toISOString(),
    assigned_to: r.assigned_to ?? "",
  }));
}

/** Client refs (id/name/brand_color/initials) for the calendar & approvals filters. */
export async function getClientRefs(
  user: CurrentUser
): Promise<{ id: string; name: string; brand_color: string; initials: string }[]> {
  const { list } = await getVisibleClients(user);
  return list.map((c) => ({
    id: c.id,
    name: c.name,
    brand_color: c.color,
    initials: c.initials,
  }));
}

/** Team refs (org members) for the calendar's assignee filter. */
export async function getTeamRefs(
  _user: CurrentUser
): Promise<{ id: string; initials: string; color: string; name: string }[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("org_members")
    .select("user_id, full_name")
    .in("role", ["owner", "team"]);
  const { colorFor, initialsOf } = await import("@/lib/data/clients");
  return (data ?? []).map((m) => {
    const name = m.full_name ?? "Member";
    return {
      id: m.user_id,
      initials: initialsOf(name),
      color: colorFor(m.user_id),
      name,
    };
  });
}
