import { AiAssistantView } from "@/components/ai/ai-assistant-view";
import { CLIENTS } from "@/lib/clients-data";

export const dynamic = "force-dynamic";

export default function AiPage() {
  return (
    <AiAssistantView
      clients={CLIENTS.filter((c) => c.status !== "archived").map((c) => ({
        id: c.id,
        name: c.name,
        brand_color: c.brand_color,
        initials: c.initials,
        platforms: c.platforms,
      }))}
    />
  );
}
