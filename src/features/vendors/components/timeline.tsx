import {
  currentMonthKey,
  formatCurrency,
  type TimelineMonthView,
} from "@/features/vendors/timeline-types";
import { FundingSource, PAID_COLOR } from "@/domain/vendors";
import { SourceChip, SourceDot } from "@/features/vendors/components/source-chip";

export function Timeline({ months }: { months: TimelineMonthView[] }) {
  const thisMonth = currentMonthKey();

  if (!months.length) {
    return null;
  }

  return (
    <ol className="space-y-3">
      {months.map((month) => (
        <li
          className={
            month.month === thisMonth
              ? "rounded-xl border-2 border-primary/30 bg-white/85 p-4"
              : "rounded-xl border border-border/80 bg-white/85 p-4"
          }
          key={month.month}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-semibold text-primary">
              {month.label}
              {month.month === thisMonth ? (
                <span className="ml-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  this month
                </span>
              ) : null}
            </p>
            <p className="text-sm font-semibold text-primary">
              {formatCurrency(month.total)}
              {month.paid > 0 ? (
                <span className="ml-2 text-xs font-medium text-muted-foreground">
                  {formatCurrency(month.paid)} paid
                </span>
              ) : null}
            </p>
          </div>
          {month.jointSplit ? (
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <SourceDot source={FundingSource.JOINT} />
                Joint
              </span>
              <span>
                Lisa {formatCurrency(month.jointSplit.lisa)}
              </span>
              <span>
                James {formatCurrency(month.jointSplit.james)}
              </span>
            </p>
          ) : null}
          <ul className="mt-3 space-y-2">
            {month.entries.map((entry) => (
              <li
                className="flex flex-wrap items-center justify-between gap-2"
                key={entry.id}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <SourceChip source={entry.source} />
                  <span className="truncate text-sm text-muted-foreground">
                    {entry.vendorName}
                  </span>
                  {entry.paid ? (
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: `${PAID_COLOR}33` }}
                    >
                      paid
                    </span>
                  ) : null}
                </div>
                <span className="text-sm font-medium text-primary">
                  {formatCurrency(entry.amount)}
                </span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
