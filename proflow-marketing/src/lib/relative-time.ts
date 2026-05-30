export function relativeTime(iso: string | null, now: Date = new Date()): string {
  if (!iso) return "Never";
  const then = new Date(iso);
  const diff = Math.round((now.getTime() - then.getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} day ago`;
  return then.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
