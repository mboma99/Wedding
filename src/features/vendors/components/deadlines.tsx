import { CalendarClock } from "lucide-react";

import {
  formatCurrency,
  formatDeadline,
  getDaysUntil,
  type Vendor,
} from "@/domain/vendors";

export function Deadlines({ vendors }: { vendors: Vendor[] }) {
  const dated = vendors
    .filter((vendor) => vendor.finalPaymentDeadline)
    .sort((a, b) =>
      (a.finalPaymentDeadline ?? "").localeCompare(b.finalPaymentDeadline ?? ""),
    );

  if (!dated.length) {
    return null;
  }

  return (
    <ul className="space-y-2">
      {dated.map((vendor) => {
        const days = getDaysUntil(vendor.finalPaymentDeadline);
        const overdue = days !== null && days < 0;
        const settled = vendor.stillToFind <= 0;

        return (
          <li
            className="flex flex-wrap items-center justify-between gap-2 rounded-[1.25rem] border border-border/70 bg-muted/20 px-3.5 py-2.5"
            key={vendor.id}
          >
            <div className="flex min-w-0 items-center gap-2">
              <CalendarClock
                className={
                  overdue && !settled
                    ? "h-4 w-4 shrink-0 text-destructive"
                    : "h-4 w-4 shrink-0 text-muted-foreground"
                }
              />
              <span className="font-medium text-primary">{vendor.name}</span>
              <span className="text-sm text-muted-foreground">
                {formatDeadline(vendor.finalPaymentDeadline)}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span
                className={
                  overdue && !settled ? "text-destructive" : "text-muted-foreground"
                }
              >
                {days === null
                  ? ""
                  : overdue
                    ? `${Math.abs(days)} days ago`
                    : `${days} days`}
              </span>
              <span
                className={
                  settled ? "font-medium text-emerald-700" : "font-medium text-primary"
                }
              >
                {settled ? "covered" : `${formatCurrency(vendor.stillToFind)} to find`}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
