import { CLIENTS, type Industry } from "./clients-data";

export type Frequency =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export interface RecurringSchedule {
  id: string;
  client_id: string;
  frequency: Frequency;
  /** For weekly: 0-6 (Mon=0). For monthly+: day-of-month 1-28. */
  generation_day: number;
  start_date: string;
  end_date: string | null;
  auto_send: boolean;
  next_generation_date: string;
  is_active: boolean;
  amount: number; // sum of template line items
  currency: string;
}

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

function isoDay(daysAhead: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

export const RECURRING_SCHEDULES: RecurringSchedule[] = [
  {
    id: "rs_acme",
    client_id: CLIENTS[0].id,
    frequency: "monthly",
    generation_day: 1,
    start_date: "2026-01-01",
    end_date: null,
    auto_send: true,
    next_generation_date: isoDay(3),
    is_active: true,
    amount: 1500,
    currency: "USD",
  },
  {
    id: "rs_luvelie",
    client_id: CLIENTS[2].id,
    frequency: "monthly",
    generation_day: 5,
    start_date: "2026-02-05",
    end_date: null,
    auto_send: true,
    next_generation_date: isoDay(7),
    is_active: true,
    amount: 1800,
    currency: "USD",
  },
  {
    id: "rs_benny",
    client_id: CLIENTS[3].id,
    frequency: "biweekly",
    generation_day: 1,
    start_date: "2026-03-01",
    end_date: "2026-12-31",
    auto_send: false,
    next_generation_date: isoDay(10),
    is_active: true,
    amount: 550,
    currency: "USD",
  },
];

export function describeSchedule(s: RecurringSchedule): string {
  switch (s.frequency) {
    case "weekly":
      return `Weekly on ${
        ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][s.generation_day]
      }`;
    case "biweekly":
      return "Every 2 weeks";
    case "monthly":
      return `Monthly on day ${s.generation_day}`;
    case "quarterly":
      return `Quarterly on day ${s.generation_day}`;
    case "yearly":
      return `Yearly on day ${s.generation_day}`;
  }
}

// Used by the cron simulator. Not exported through index.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _IndustryReserved = Industry;
