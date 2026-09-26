import { Timestamp, type DocumentSnapshot } from "firebase-admin/firestore";

import {
  FundingSource,
  getVendorTotals,
  type Savings,
  type JointSplit,
  type Vendor,
  type VendorEntry,
  type VendorLineItem,
} from "@/domain/vendors";

export type VendorDoc = {
  name: string;
  category: string;
  totalCost: number;
  entries: VendorEntry[];
  lineItems: VendorLineItem[];
  paymentDetails: string | null;
  finalPaymentDeadline: string | null;
  notes: string | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};

function toNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function toSource(value: unknown): FundingSource {
  return typeof value === "string" && value in FundingSource
    ? (value as FundingSource)
    : FundingSource.UNASSIGNED;
}

export function toEntries(value: unknown): VendorEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
    .map((entry, index) => ({
      id: typeof entry.id === "string" && entry.id ? entry.id : `entry-${index}`,
      month: typeof entry.month === "string" ? entry.month : "",
      amount: toNumber(entry.amount),
      source: toSource(entry.source),
      paid: entry.paid === true,
      split: toSplit(entry.split),
      note: toStringOrNull(entry.note),
    }))
    .filter((entry) => entry.month)
    .sort((a, b) => a.month.localeCompare(b.month));
}

function toSplit(value: unknown): JointSplit | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Partial<JointSplit>;

  if (typeof raw.lisa !== "number" || typeof raw.james !== "number") {
    return null;
  }

  return { lisa: raw.lisa, james: raw.james };
}

function toLineItems(value: unknown): VendorLineItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
    .map((entry) => ({
      description: typeof entry.description === "string" ? entry.description : "",
      category: typeof entry.category === "string" ? entry.category : "",
      unitPrice: typeof entry.unitPrice === "number" ? entry.unitPrice : null,
      quantity: typeof entry.quantity === "number" ? entry.quantity : null,
      price: toNumber(entry.price),
    }));
}

export function toVendor(snapshot: DocumentSnapshot): Vendor | null {
  const data = snapshot.data() as Partial<VendorDoc> | undefined;

  if (!data) {
    return null;
  }

  const entries = toEntries(data.entries);
  const totalCost = toNumber(data.totalCost);

  return {
    id: snapshot.id,
    name: data.name ?? "",
    category: data.category ?? "Other",
    totalCost,
    ...getVendorTotals(totalCost, entries),
    entries,
    lineItems: toLineItems(data.lineItems),
    paymentDetails: toStringOrNull(data.paymentDetails),
    finalPaymentDeadline: toStringOrNull(data.finalPaymentDeadline),
    notes: toStringOrNull(data.notes),
  };
}

export function toSavings(snapshot: DocumentSnapshot): Savings {
  const data = snapshot.data() ?? {};

  return {
    lisa: toNumber(data.lisa),
    james: toNumber(data.james),
  };
}
