import { Check } from "lucide-react";

import {
  fundingSourceColors,
  fundingSourceLabels,
  fundingSourceOrder,
  PAID_COLOR,
  type FundingSource,
} from "@/domain/vendors";

export function SourceDot({ source }: { source: FundingSource }) {
  return (
    <span
      aria-hidden
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: fundingSourceColors[source] }}
    />
  );
}

export function SourceChip({
  source,
  children,
}: {
  source: FundingSource;
  children?: React.ReactNode;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium text-foreground"
      style={{
        backgroundColor: `${fundingSourceColors[source]}33`,
        borderColor: `${fundingSourceColors[source]}aa`,
      }}
    >
      <SourceDot source={source} />
      {children ?? fundingSourceLabels[source]}
    </span>
  );
}

export function FundingLegend() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {fundingSourceOrder.map((source) => (
        <SourceChip key={source} source={source} />
      ))}
      <span
        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium text-foreground"
        style={{ backgroundColor: `${PAID_COLOR}33`, borderColor: `${PAID_COLOR}aa` }}
      >
        <Check className="h-3 w-3" />
        Paid
      </span>
    </div>
  );
}
