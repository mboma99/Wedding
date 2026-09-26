import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { FieldValue } from "firebase-admin/firestore";

import { randomUUID } from "node:crypto";

import {
  evenSplit,
  FundingSource,
  type VendorEntry,
  type VendorLineItem,
} from "@/domain/vendors";
import { getDb } from "@/server/db/firestore";
import {
  SAVINGS_DOC,
  VENDOR_META_DOC,
  VENDORS_COLLECTION,
} from "@/server/queries/vendors";

const DEFAULT_SOURCE = "data/vendors.json";

type SourceVendor = {
  key: string;
  name: string;
  category: string;
  totalCost: number;
  leftToPay: number;
  entries: {
    month: string;
    amount: number;
    source: FundingSource;
    paid: boolean;
    split?: { lisa: number; james: number };
  }[];
  lineItems: VendorLineItem[];
  paymentDetails: string | null;
  finalPaymentDeadline: string | null;
};

type SourceFile = {
  vendors: SourceVendor[];
  unassignedItems: VendorLineItem[];
  savings: { lisa: number; james: number };
};

async function main() {
  const sourcePath = resolve(process.argv[2] ?? DEFAULT_SOURCE);
  const source = JSON.parse(readFileSync(sourcePath, "utf8")) as SourceFile;
  const db = getDb();
  const collection = db.collection(VENDORS_COLLECTION);

  let created = 0;
  let refreshed = 0;

  for (const vendor of source.vendors) {
    const vendorRef = collection.doc(vendor.key);
    const existing = await vendorRef.get();

    const structure = {
      name: vendor.name,
      category: vendor.category,
      totalCost: vendor.totalCost,
      paymentDetails: vendor.paymentDetails,
      finalPaymentDeadline: vendor.finalPaymentDeadline,
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Costs, bank details and deadlines are refreshed from the workbook on every
    // run. Entries, line items and notes are editable in the app, so they are
    // written once at creation and never overwritten here.
    if (existing.exists) {
      await vendorRef.update(structure);
      refreshed += 1;
      continue;
    }

    const entries: VendorEntry[] = vendor.entries.map((entry) => ({
      id: randomUUID(),
      month: entry.month,
      amount: entry.amount,
      source: entry.source,
      paid: entry.paid,
      // Joint splits come from the bank-row formulas; even is only a fallback.
      split:
        entry.source === FundingSource.JOINT
          ? (entry.split ?? evenSplit(entry.amount))
          : null,
      note: null,
    }));

    await vendorRef.set({
      ...structure,
      lineItems: vendor.lineItems,
      entries,
      notes: null,
      createdAt: FieldValue.serverTimestamp(),
    });
    created += 1;
  }

  // Savings balances are seeded once; afterwards the app owns them.
  const savingsRef = db.doc(SAVINGS_DOC);
  if (!(await savingsRef.get()).exists) {
    await savingsRef.set({
      lisa: source.savings.lisa,
      james: source.savings.james,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  await db.doc(VENDOR_META_DOC).set(
    {
      unassignedItems: source.unassignedItems,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  console.log(`Source: ${sourcePath}`);
  console.log(`Vendors created: ${created}`);
  console.log(`Vendors refreshed (entries, covers and notes untouched): ${refreshed}`);
  console.log(`Shared line items: ${source.unassignedItems.length}`);
}

main().catch((error) => {
  console.error("Vendor import failed", error);
  process.exitCode = 1;
});
