import { randomUUID } from "node:crypto";

import { FieldValue } from "firebase-admin/firestore";

import {
  evenSplit,
  FundingSource,
  round,
  type JointSplit,
  type Savings,
  type VendorEntry,
  type VendorLineItem,
} from "@/domain/vendors";
import { getDb } from "@/server/db/firestore";
import { toEntries } from "@/server/db/vendor-doc";
import { SAVINGS_DOC, VENDORS_COLLECTION } from "@/server/queries/vendors";

export type MutationResult =
  | { success: true; message: string }
  | { success: false; message: string };

function failure(message: string): MutationResult {
  return { success: false, message };
}

/**
 * Joint money carries who put in what. The two shares must add up to the entry,
 * and a split is dropped as soon as the money stops being joint.
 */
function resolveSplit(
  source: FundingSource,
  amount: number,
  split: JointSplit | null | undefined,
): JointSplit | null | string {
  if (source !== FundingSource.JOINT) {
    return null;
  }

  if (!split) {
    return evenSplit(amount);
  }

  const lisa = round(Number(split.lisa));
  const james = round(Number(split.james));

  if (!Number.isFinite(lisa) || !Number.isFinite(james) || lisa < 0 || james < 0) {
    return "Enter both shares as positive amounts.";
  }

  if (Math.abs(round(lisa + james) - round(amount)) > 0.01) {
    return "The two shares must add up to the amount.";
  }

  return { lisa, james };
}

function validAmount(amount: number) {
  return Number.isFinite(amount) && amount > 0 && amount <= 1_000_000;
}

function validMonth(month: string) {
  return /^\d{4}-\d{2}$/.test(month);
}

function validSource(source: string): source is FundingSource {
  return source in FundingSource;
}

async function withVendor(
  vendorId: string,
  update: (entries: VendorEntry[], name: string) => VendorEntry[] | MutationResult,
): Promise<MutationResult> {
  if (!vendorId) {
    return failure("Choose a vendor first.");
  }

  const db = getDb();
  const vendorRef = db.collection(VENDORS_COLLECTION).doc(vendorId);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(vendorRef);

    if (!snapshot.exists) {
      return failure("That vendor no longer exists.");
    }

    const entries = toEntries(snapshot.get("entries"));
    const result = update(entries, snapshot.get("name") ?? "this vendor");

    if (!Array.isArray(result)) {
      return result;
    }

    transaction.update(vendorRef, {
      entries: result,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { success: true as const, message: "Saved." };
  });
}

export async function addVendorEntry(
  vendorId: string,
  values: {
    amount: number;
    month: string;
    source: string;
    note?: string;
    split?: JointSplit | null;
    paid?: boolean;
  },
): Promise<MutationResult> {
  if (!validAmount(values.amount)) {
    return failure("Enter an amount greater than zero.");
  }

  if (!validMonth(values.month)) {
    return failure("Choose a month.");
  }

  if (!validSource(values.source)) {
    return failure("Choose who this money is from.");
  }

  const source = values.source;
  const split = resolveSplit(source, round(values.amount), values.split);

  if (typeof split === "string") {
    return failure(split);
  }

  return withVendor(vendorId, (entries) => [
    ...entries,
    {
      id: randomUUID(),
      month: values.month,
      amount: round(values.amount),
      source,
      paid: values.paid === true,
      split,
      note: values.note?.trim() ? values.note.trim() : null,
    },
  ]);
}

export async function updateVendorEntry(
  vendorId: string,
  entryId: string,
  values: {
    amount?: number;
    month?: string;
    source?: string;
    split?: JointSplit | null;
    paid?: boolean;
  },
): Promise<MutationResult> {
  if (values.amount !== undefined && !validAmount(values.amount)) {
    return failure("Enter an amount greater than zero.");
  }

  if (values.month !== undefined && !validMonth(values.month)) {
    return failure("Choose a month.");
  }

  if (values.source !== undefined && !validSource(values.source)) {
    return failure("Choose who this money is from.");
  }

  return withVendor(vendorId, (entries) => {
    const existing = entries.find((entry) => entry.id === entryId);

    if (!existing) {
      return failure("That entry no longer exists.");
    }

    const amount =
      values.amount === undefined ? existing.amount : round(values.amount);
    const source = (values.source as FundingSource | undefined) ?? existing.source;
    const split = resolveSplit(
      source,
      amount,
      values.split === undefined ? existing.split : values.split,
    );

    if (typeof split === "string") {
      return failure(split);
    }

    return entries.map((entry) =>
      entry.id === entryId
        ? {
            ...entry,
            amount,
            month: values.month ?? entry.month,
            source,
            paid: values.paid === undefined ? entry.paid : values.paid,
            split,
          }
        : entry,
    );
  });
}

export async function deleteVendorEntry(
  vendorId: string,
  entryId: string,
): Promise<MutationResult> {
  return withVendor(vendorId, (entries) => {
    if (!entries.some((entry) => entry.id === entryId)) {
      return failure("That entry no longer exists.");
    }

    return entries.filter((entry) => entry.id !== entryId);
  });
}

type LineItemInput = { description: string; price: number };

async function withLineItems(
  vendorId: string,
  update: (items: VendorLineItem[]) => VendorLineItem[] | MutationResult,
): Promise<MutationResult> {
  const db = getDb();
  const vendorRef = db.collection(VENDORS_COLLECTION).doc(vendorId);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(vendorRef);

    if (!snapshot.exists) {
      return failure("That vendor no longer exists.");
    }

    const items = (snapshot.get("lineItems") ?? []) as VendorLineItem[];
    const result = update(Array.isArray(items) ? items : []);

    if (!Array.isArray(result)) {
      return result;
    }

    transaction.update(vendorRef, {
      lineItems: result,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { success: true as const, message: "Saved." };
  });
}

function validateLineItem({ description, price }: LineItemInput) {
  if (!description.trim()) {
    return "Enter what this covers.";
  }

  if (!Number.isFinite(price) || price < 0) {
    return "Enter a price of zero or more.";
  }

  return null;
}

export async function addVendorLineItem(
  vendorId: string,
  item: LineItemInput,
): Promise<MutationResult> {
  const problem = validateLineItem(item);

  if (problem) {
    return failure(problem);
  }

  return withLineItems(vendorId, (items) => [
    ...items,
    {
      description: item.description.trim(),
      category: items[0]?.category ?? "",
      unitPrice: null,
      quantity: null,
      price: round(item.price),
    },
  ]);
}

export async function updateVendorLineItem(
  vendorId: string,
  index: number,
  item: LineItemInput,
): Promise<MutationResult> {
  const problem = validateLineItem(item);

  if (problem) {
    return failure(problem);
  }

  return withLineItems(vendorId, (items) => {
    if (!items[index]) {
      return failure("That item no longer exists.");
    }

    return items.map((existing, position) =>
      position === index
        ? {
            ...existing,
            description: item.description.trim(),
            price: round(item.price),
          }
        : existing,
    );
  });
}

export async function deleteVendorLineItem(
  vendorId: string,
  index: number,
): Promise<MutationResult> {
  return withLineItems(vendorId, (items) => {
    if (!items[index]) {
      return failure("That item no longer exists.");
    }

    return items.filter((_, position) => position !== index);
  });
}

export type VendorDetails = {
  name: string;
  category: string;
  totalCost: number;
  paymentDetails?: string;
  finalPaymentDeadline?: string;
  notes?: string;
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function validateDetails(details: VendorDetails) {
  if (!details.name.trim()) {
    return "Enter a vendor name.";
  }

  if (!Number.isFinite(details.totalCost) || details.totalCost < 0) {
    return "Enter a cost of zero or more.";
  }

  if (
    details.finalPaymentDeadline &&
    !/^\d{4}-\d{2}-\d{2}$/.test(details.finalPaymentDeadline)
  ) {
    return "Enter the deadline as a date.";
  }

  return null;
}

function toFields(details: VendorDetails) {
  return {
    name: details.name.trim(),
    category: details.category.trim() || "Misc",
    totalCost: round(details.totalCost),
    paymentDetails: details.paymentDetails?.trim() || null,
    finalPaymentDeadline: details.finalPaymentDeadline || null,
    notes: details.notes?.trim() || null,
    updatedAt: FieldValue.serverTimestamp(),
  };
}

export async function createVendor(details: VendorDetails): Promise<MutationResult> {
  const problem = validateDetails(details);

  if (problem) {
    return failure(problem);
  }

  const db = getDb();
  const base = slugify(details.name) || "vendor";
  const collection = db.collection(VENDORS_COLLECTION);

  // Keep ids readable but unique when two vendors share a name.
  let id = base;
  for (let attempt = 2; (await collection.doc(id).get()).exists; attempt += 1) {
    id = `${base}-${attempt}`;
  }

  await collection.doc(id).set({
    ...toFields(details),
    entries: [],
    lineItems: [],
    createdAt: FieldValue.serverTimestamp(),
  });

  return { success: true, message: `${details.name.trim()} added.` };
}

export async function updateVendorDetails(
  vendorId: string,
  details: VendorDetails,
): Promise<MutationResult> {
  const problem = validateDetails(details);

  if (problem) {
    return failure(problem);
  }

  const vendorRef = getDb().collection(VENDORS_COLLECTION).doc(vendorId);

  if (!(await vendorRef.get()).exists) {
    return failure("That vendor no longer exists.");
  }

  await vendorRef.update(toFields(details));

  return { success: true, message: "Saved." };
}

export async function deleteVendor(vendorId: string): Promise<MutationResult> {
  const vendorRef = getDb().collection(VENDORS_COLLECTION).doc(vendorId);

  if (!(await vendorRef.get()).exists) {
    return failure("That vendor no longer exists.");
  }

  await vendorRef.delete();

  return { success: true, message: "Vendor removed." };
}

export async function updateSavings(values: Savings): Promise<MutationResult> {
  const lisa = Number(values.lisa);
  const james = Number(values.james);

  if (!Number.isFinite(lisa) || lisa < 0 || !Number.isFinite(james) || james < 0) {
    return failure("Enter both balances as positive amounts.");
  }

  await getDb()
    .doc(SAVINGS_DOC)
    .set(
      { lisa: round(lisa), james: round(james), updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );

  return { success: true, message: "Savings updated." };
}
