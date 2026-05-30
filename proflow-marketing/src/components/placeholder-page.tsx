import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PlaceholderPage({
  title,
  description,
  day,
}: {
  title: string;
  description: string;
  day: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This screen lands in <strong>{day}</strong> of the build sequence.
        </CardContent>
      </Card>
    </div>
  );
}
