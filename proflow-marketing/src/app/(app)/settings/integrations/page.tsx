import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const INTEGRATIONS = [
  {
    name: "Instagram + Facebook (Meta Graph API)",
    description:
      "Auto-publish posts and pull analytics. Requires Meta business verification.",
  },
  {
    name: "LinkedIn (Marketing API)",
    description: "Schedule posts and read company-page analytics.",
  },
  {
    name: "TikTok for Business",
    description: "Publish drafts and pull engagement on creator accounts.",
  },
  {
    name: "YouTube Data API",
    description: "Schedule Shorts and pull video stats.",
  },
];

export default function IntegrationsSettingsPage() {
  return (
    <div className="grid gap-4 max-w-3xl">
      <p className="text-sm text-muted-foreground">
        Direct publishing arrives in Phase 2. Connect a platform now to be
        first in the rollout queue.
      </p>
      {INTEGRATIONS.map((i) => (
        <Card key={i.name}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="font-medium">{i.name}</div>
              <div className="text-xs text-muted-foreground">
                {i.description}
              </div>
            </div>
            <span className="text-[11px] uppercase tracking-wide bg-muted text-muted-foreground px-2 py-0.5 rounded">
              Coming soon
            </span>
            <Button variant="outline" size="sm" disabled>
              Notify me
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
