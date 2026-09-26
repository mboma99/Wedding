import { CalendarClock, Landmark, ReceiptText } from "lucide-react";

import {
  formatCurrency,
  formatDeadline,
  getDaysUntil,
  type Vendor,
} from "@/domain/vendors";
import { AddEntryForm, EntryTimeline } from "@/features/vendors/components/entry-editor";
import { VendorHeader } from "@/features/vendors/components/vendor-form";
import { FundingBar } from "@/features/vendors/components/funding-bar";
import { LineItems } from "@/features/vendors/components/line-items";

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-primary">{value}</p>
    </div>
  );
}

export function VendorCard({ vendor }: { vendor: Vendor }) {
  const deadline = formatDeadline(vendor.finalPaymentDeadline);
  const days = getDaysUntil(vendor.finalPaymentDeadline);
  const overAllocated = vendor.paid + vendor.setAside - vendor.totalCost;

  return (
    <div className="rounded-[1.5rem] border border-border/80 bg-white/85 p-4 sm:p-5">
      <VendorHeader cost={formatCurrency(vendor.totalCost)} vendor={vendor} />

      <div className="mt-3">
        <FundingBar entries={vendor.entries} totalCost={vendor.totalCost} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Figure label="Paid" value={formatCurrency(vendor.paid)} />
        <Figure label="Set aside" value={formatCurrency(vendor.setAside)} />
        <Figure label="To find" value={formatCurrency(vendor.stillToFind)} />
      </div>

      {overAllocated > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {formatCurrency(overAllocated)} more committed than the cost.
        </p>
      ) : null}

      {deadline ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarClock className="h-4 w-4 shrink-0" />
          {deadline}
          {days === null ? "" : days < 0 ? ` · ${Math.abs(days)} days ago` : ` · ${days} days`}
        </p>
      ) : null}

      {vendor.entries.length ? (
        <div className="mt-3">
          <EntryTimeline entries={vendor.entries} vendorId={vendor.id} />
        </div>
      ) : null}

      <div className="mt-3">
        <AddEntryForm vendorId={vendor.id} />
      </div>

      <details className="mt-3 rounded-[1.25rem] border border-border/70 bg-muted/20 p-3">
        <summary className="cursor-pointer text-sm font-medium text-primary">
          <ReceiptText className="mr-2 inline h-4 w-4" />
          Covers ({vendor.lineItems.length})
        </summary>
        <div className="mt-3">
          <LineItems items={vendor.lineItems} vendorId={vendor.id} />
        </div>
      </details>

      {vendor.paymentDetails ? (
        <details className="mt-2 rounded-[1.25rem] border border-border/70 bg-muted/20 p-3">
          <summary className="cursor-pointer text-sm font-medium text-primary">
            <Landmark className="mr-2 inline h-4 w-4" />
            Bank details
          </summary>
          <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm text-muted-foreground">
            {vendor.paymentDetails}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
