import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AgencyBillingSettingsPage() {
  return (
    <div className="grid gap-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">ProFlow Founders Plan</div>
              <div className="text-xs text-muted-foreground">
                Up to 25 active clients · Unlimited team seats
              </div>
            </div>
            <Button variant="outline" size="sm">
              Change plan
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          The Founders Plan is invoiced annually via Stripe. Your past
          platform-billing invoices will appear here once the agency-side
          subscription wiring lands.
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Looking for the invoices you send to <em>your</em> clients? Those live
        on the <a href="/invoices" className="text-accent hover:underline">Invoices</a> page.
      </p>
    </div>
  );
}
