import {
  fundingSourceColors,
  fundingSourceLabels,
  fundingSourceOrder,
  sumEntries,
  type VendorEntry,
} from "@/domain/vendors";

/** One segment per funding source, in the same colours as the spreadsheet. */
export function FundingBar({
  totalCost,
  entries,
}: {
  totalCost: number;
  entries: readonly VendorEntry[];
}) {
  const committed = sumEntries(entries, () => true);
  const base = Math.max(totalCost, committed);

  if (base <= 0) {
    return <div className="h-2.5 rounded-full bg-muted" />;
  }

  return (
    <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
      {fundingSourceOrder.map((source) => {
        const amount = sumEntries(entries, (entry) => entry.source === source);

        if (amount <= 0) {
          return null;
        }

        return (
          <div
            key={source}
            style={{
              width: `${(amount / base) * 100}%`,
              backgroundColor: fundingSourceColors[source],
            }}
            title={`${fundingSourceLabels[source]}: £${amount.toFixed(2)}`}
          />
        );
      })}
    </div>
  );
}
