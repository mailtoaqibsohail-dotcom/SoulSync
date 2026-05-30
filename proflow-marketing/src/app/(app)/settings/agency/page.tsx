import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AGENCY_PROFILE } from "@/lib/sample-data";

export const dynamic = "force-dynamic";

export default function AgencySettingsPage() {
  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Agency profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="Agency name">
          <Input defaultValue={AGENCY_PROFILE.name} />
        </Field>
        <Field label="Address">
          <Input defaultValue={AGENCY_PROFILE.address ?? ""} />
        </Field>
        <Field label="Tagline">
          <Input defaultValue={AGENCY_PROFILE.tagline ?? ""} />
        </Field>
        <Field label="Logo">
          <div className="flex items-center gap-3">
            <span
              className="h-12 w-12 rounded-md grid place-items-center text-white font-semibold"
              style={{ backgroundColor: "#0F172A" }}
            >
              P
            </span>
            <Button variant="outline" size="sm">
              Upload logo
            </Button>
          </div>
        </Field>
        <Field label="Brand colors (used in client-facing reports)">
          <div className="flex flex-wrap gap-3">
            <ColorRow label="Primary" hex="#0F172A" />
            <ColorRow label="Accent" hex="#2563EB" />
          </div>
        </Field>
        <Field label="About">
          <Textarea
            rows={3}
            defaultValue="Independent marketing studio for energy and sustainability brands."
          />
        </Field>
        <div className="flex justify-end">
          <Button>Save changes</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ColorRow({ label, hex }: { label: string; hex: string }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        defaultValue={hex}
        className="h-10 w-12 rounded-md border border-input p-1"
      />
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <Input defaultValue={hex} className="h-8 w-28 text-xs" />
      </div>
    </div>
  );
}
