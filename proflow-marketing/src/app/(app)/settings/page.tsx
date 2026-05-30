import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentUser } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage() {
  const user = await getCurrentUser();
  const initials = user.full_name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();

  return (
    <div className="grid gap-6 lg:grid-cols-2 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <span
              className="h-16 w-16 rounded-full grid place-items-center text-white text-xl font-semibold"
              style={{ backgroundColor: "#0F172A" }}
            >
              {initials}
            </span>
            <div>
              <Button variant="outline" size="sm">
                Upload photo
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                PNG or JPG, square crop recommended.
              </p>
            </div>
          </div>
          <Field label="Full name">
            <Input defaultValue={user.full_name} />
          </Field>
          <Field label="Email">
            <Input type="email" defaultValue={user.email} />
          </Field>
          <div className="flex justify-end">
            <Button>Save changes</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Current password">
            <Input type="password" />
          </Field>
          <Field label="New password">
            <Input type="password" />
          </Field>
          <Field label="Confirm new password">
            <Input type="password" />
          </Field>
          <p className="text-xs text-muted-foreground">
            Must be at least 8 characters with one number and one symbol.
          </p>
          <div className="flex justify-end">
            <Button>Update password</Button>
          </div>
        </CardContent>
      </Card>
    </div>
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
