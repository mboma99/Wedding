export const FundingSource = {
  LISA: "LISA",
  JAMES: "JAMES",
  JOINT: "JOINT",
  UNASSIGNED: "UNASSIGNED",
} as const;

export type FundingSource = (typeof FundingSource)[keyof typeof FundingSource];

export const fundingSourceOrder = [
  FundingSource.LISA,
  FundingSource.JAMES,
  FundingSource.JOINT,
  FundingSource.UNASSIGNED,
] as const;

export const fundingSourceLabels: Record<FundingSource, string> = {
  [FundingSource.LISA]: "Lisa",
  [FundingSource.JAMES]: "James",
  [FundingSource.JOINT]: "Joint",
  [FundingSource.UNASSIGNED]: "Unassigned",
};

/** The spreadsheet's own fill colours, so the app reads like the sheet. */
export const fundingSourceColors: Record<FundingSource, string> = {
  [FundingSource.LISA]: "#F4C2D7",
  [FundingSource.JAMES]: "#8DB3E2",
  [FundingSource.JOINT]: "#8E7CC3",
  [FundingSource.UNASSIGNED]: "#CCCCCC",
};

/**
 * Deeper steps of the same hues for chart marks. The pastel sheet colours are
 * too light and too close together to sit side by side in a chart: validated at
 * CVD delta-E 9.1 and normal-vision 21.2, against 8.6 and 14.3 for the pastels.
 * Unassigned stays neutral on purpose — it is a missing owner, not a series.
 */
export const fundingChartColors: Record<FundingSource, string> = {
  [FundingSource.LISA]: "#C2367F",
  [FundingSource.JAMES]: "#2E86C1",
  [FundingSource.JOINT]: "#7B2FBF",
  [FundingSource.UNASSIGNED]: "#767C85",
};

export type JointSplit = {
  lisa: number;
  james: number;
};

export type VendorEntry = {
  id: string;
  month: string;
  amount: number;
  /** Whose money it is. Stays set once the money is handed over. */
  source: FundingSource;
  /** True once the money has reached the vendor. */
  paid: boolean;
  /** Who put in what, for joint money only. */
  split: JointSplit | null;
  note: string | null;
};

export type VendorLineItem = {
  description: string;
  category: string;
  unitPrice: number | null;
  quantity: number | null;
  price: number;
};

export type Vendor = {
  id: string;
  name: string;
  category: string;
  totalCost: number;
  /** Money that has actually reached the vendor. */
  paid: number;
  /** Money earmarked for the vendor but not handed over. */
  setAside: number;
  /** Cost not yet covered by either. */
  stillToFind: number;
  entries: VendorEntry[];
  lineItems: VendorLineItem[];
  paymentDetails: string | null;
  finalPaymentDeadline: string | null;
  notes: string | null;
};

export type Savings = {
  lisa: number;
  james: number;
};

export const PAID_COLOR = "#93C47D";
export const PAID_CHART_COLOR = "#4E9A51";

export function round(value: number) {
  return Math.round(value * 100) / 100;
}

export function sumEntries(
  entries: readonly VendorEntry[],
  predicate: (entry: VendorEntry) => boolean,
) {
  return round(
    entries.reduce((total, entry) => (predicate(entry) ? total + entry.amount : total), 0),
  );
}

/** An even split is assumed until the couple record the real one. */
export function evenSplit(amount: number): JointSplit {
  const lisa = round(amount / 2);

  return { lisa, james: round(amount - lisa) };
}

export function getEntrySplit(entry: VendorEntry): JointSplit | null {
  if (entry.source !== FundingSource.JOINT) {
    return null;
  }

  return entry.split ?? evenSplit(entry.amount);
}

/** What one person put toward an entry, counting their half of joint money. */
export function getPersonShare(entry: VendorEntry, person: "lisa" | "james") {
  if (entry.source === FundingSource.JOINT) {
    return getEntrySplit(entry)?.[person] ?? 0;
  }

  const owner = person === "lisa" ? FundingSource.LISA : FundingSource.JAMES;

  return entry.source === owner ? entry.amount : 0;
}

export function sumShares(
  entries: readonly VendorEntry[],
  person: "lisa" | "james",
) {
  return round(
    entries.reduce((total, entry) => total + getPersonShare(entry, person), 0),
  );
}

export function getVendorTotals(totalCost: number, entries: readonly VendorEntry[]) {
  const paid = sumEntries(entries, (entry) => entry.paid);
  const setAside = sumEntries(entries, (entry) => !entry.paid);

  return {
    paid,
    setAside,
    stillToFind: Math.max(0, round(totalCost - paid - setAside)),
  };
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatMonth(month: string, style: "long" | "short" = "long") {
  const [year, monthIndex] = month.split("-");
  const date = new Date(Number(year), Number(monthIndex) - 1, 1);

  if (Number.isNaN(date.getTime())) {
    return month;
  }

  return date.toLocaleDateString("en-GB", {
    month: style === "long" ? "long" : "short",
    year: "numeric",
  });
}

export function formatDeadline(deadline: string | null) {
  if (!deadline) {
    return null;
  }

  const date = new Date(`${deadline}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? deadline
    : date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
}

export function getDaysUntil(deadline: string | null, today = new Date()) {
  if (!deadline) {
    return null;
  }

  const date = new Date(`${deadline}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return Math.round((date.getTime() - start.getTime()) / 86_400_000);
}

export function currentMonthKey(today = new Date()) {
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}
