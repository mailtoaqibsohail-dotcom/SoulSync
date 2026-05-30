import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CLIENTS, PLATFORM_COLOR, PLATFORM_LABEL } from "@/lib/clients-data";
import { Button } from "@/components/ui/button";
import { ClientDetailTabs } from "@/components/clients/client-detail-tabs";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getClientRows } from "@/lib/data/clients";

export default async function ClientDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  // Live, RLS-scoped: a team member who isn't assigned this client gets no row
  // → notFound (they can't view it). Owner sees all. Sample fallback in demo.
  const user = await getCurrentUser();
  const client = user.isDemo
    ? CLIENTS.find((c) => c.id === params.id)
    : (await getClientRows(user)).find((c) => c.id === params.id);
  if (!client) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/clients">
            <ArrowLeft className="h-4 w-4" />
            Back to clients
          </Link>
        </Button>
      </div>

      <header className="flex items-start gap-4 flex-wrap">
        <div
          className="h-16 w-16 rounded-lg grid place-items-center text-white text-lg font-semibold"
          style={{ backgroundColor: client.brand_color }}
        >
          {client.initials}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold truncate">{client.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {client.industry} · {client.plan_name}
          </p>
          <div className="flex flex-wrap items-center gap-1 mt-2">
            {client.platforms.map((p) => (
              <span
                key={p}
                title={PLATFORM_LABEL[p]}
                className="h-5 w-5 rounded grid place-items-center text-white text-[9px] font-bold"
                style={{ backgroundColor: PLATFORM_COLOR[p] }}
              >
                {PLATFORM_LABEL[p][0]}
              </span>
            ))}
          </div>
        </div>
        <span
          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{
            backgroundColor:
              client.status === "active"
                ? "#D1FAE5"
                : client.status === "paused"
                ? "#FEF3C7"
                : "#E5E7EB",
            color:
              client.status === "active"
                ? "#065F46"
                : client.status === "paused"
                ? "#92400E"
                : "#374151",
          }}
        >
          {client.status[0].toUpperCase() + client.status.slice(1)}
        </span>
      </header>

      <ClientDetailTabs clientId={client.id} />
      <div>{children}</div>
    </div>
  );
}
