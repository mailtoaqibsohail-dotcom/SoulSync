import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApprovalPreferencesForm } from "@/components/settings/approval-preferences-form";

export default function ApprovalPreferencesPage() {
  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Approval preferences</CardTitle>
      </CardHeader>
      <CardContent>
        <ApprovalPreferencesForm />
      </CardContent>
    </Card>
  );
}
