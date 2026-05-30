import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CLIENTS, INDUSTRIES, PLATFORM_LABEL } from "@/lib/clients-data";

export default function ClientSettingsTab({
  params,
}: {
  params: { id: string };
}) {
  const client = CLIENTS.find((c) => c.id === params.id);
  if (!client) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Edit client</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Client name">
            <Input defaultValue={client.name} />
          </Field>
          <Field label="Industry">
            <select
              defaultValue={client.industry}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Plan">
            <Input defaultValue={client.plan_name} />
          </Field>
          <Field label="Monthly fee (USD)">
            <Input type="number" defaultValue={client.monthly_fee} />
          </Field>
          <Field label="Brand color" className="sm:col-span-2">
            <div className="flex items-center gap-2">
              <input
                type="color"
                defaultValue={client.brand_color}
                className="h-10 w-12 rounded-md border border-input p-1"
              />
              <Input defaultValue={client.brand_color} className="max-w-[160px]" />
            </div>
          </Field>
          <Field label="Active platforms" className="sm:col-span-2">
            <div className="flex flex-wrap gap-2">
              {(["instagram", "tiktok", "youtube", "facebook", "linkedin", "x"] as const).map(
                (p) => {
                  const active = client.platforms.includes(p);
                  return (
                    <label
                      key={p}
                      className={
                        active
                          ? "px-2.5 py-1 text-xs rounded-full border bg-primary/5 border-primary text-foreground"
                          : "px-2.5 py-1 text-xs rounded-full border text-muted-foreground"
                      }
                    >
                      <input
                        type="checkbox"
                        defaultChecked={active}
                        className="mr-1"
                      />
                      {PLATFORM_LABEL[p]}
                    </label>
                  );
                }
              )}
            </div>
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea rows={3} placeholder="Anything the team should know" />
          </Field>
        </CardContent>
        <div className="px-6 pb-6 flex justify-end">
          <Button>Save changes</Button>
        </div>
      </Card>

      <Card className="border-danger/30">
        <CardHeader>
          <CardTitle className="text-danger">Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Archiving hides this client from your active list and pauses
            scheduled content. You can restore them any time.
          </p>
          <Button variant="outline" className="border-danger/40 text-danger">
            Archive client
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={"space-y-1.5 " + (className ?? "")}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
