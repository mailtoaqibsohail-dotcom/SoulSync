import { RecurringList } from "@/components/invoices/recurring-list";
import { RECURRING_SCHEDULES } from "@/lib/recurring-data";
import { CLIENTS } from "@/lib/clients-data";

export const dynamic = "force-dynamic";

export default function RecurringInvoicesPage() {
  return (
    <RecurringList
      schedules={RECURRING_SCHEDULES}
      clients={CLIENTS.filter((c) => c.status !== "archived").map((c) => ({
        id: c.id,
        name: c.name,
        brand_color: c.brand_color,
        initials: c.initials,
        monthly_fee: c.monthly_fee,
      }))}
    />
  );
}
