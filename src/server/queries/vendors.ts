import {
  FundingSource,
  formatMonth,
  round,
  sumEntries,
  sumShares,
  type Savings,
  type Vendor,
  type VendorEntry,
  type VendorLineItem,
} from "@/domain/vendors";
import { getDb } from "@/server/db/firestore";
import { toSavings, toVendor } from "@/server/db/vendor-doc";

export const VENDORS_COLLECTION = "vendors";
export const VENDOR_META_DOC = "meta/proposal";
export const SAVINGS_DOC = "meta/savings";

export type TimelineEntry = VendorEntry & {
  vendorId: string;
  vendorName: string;
};

export type TimelineMonth = {
  month: string;
  label: string;
  short: string;
  entries: TimelineEntry[];
  paid: number;
  setAside: number;
  total: number;
  /** Per-source totals, keyed for the stacked chart. */
  bySource: Partial<Record<FundingSource, number>>;
  /** Who put in what toward this month's joint money. */
  jointSplit: { lisa: number; james: number } | null;
};

export type VendorCategoryGroup = {
  category: string;
  vendors: Vendor[];
  totalCost: number;
  stillToFind: number;
  sharedLineItems: VendorLineItem[];
};

export type PersonPot = {
  key: "lisa" | "james";
  name: string;
  saved: number;
  /** Own entries plus their share of joint money. */
  allocated: number;
  ownAllocated: number;
  jointShare: number;
  /** Of what they put in, how much has reached a vendor. */
  paid: number;
  stillHeld: number;
  unallocated: number;
};

export type VendorBoard = {
  groups: VendorCategoryGroup[];
  timeline: TimelineMonth[];
  pots: PersonPot[];
  joint: { allocated: number; paid: number };
  unassigned: number;
  totals: {
    totalCost: number;
    paid: number;
    setAside: number;
    stillToFind: number;
    nextDeadline: Vendor | null;
  };
};

const categoryOrder = ["Venue", "Food", "Décor", "Misc"];

function categoryRank(category: string) {
  const index = categoryOrder.indexOf(category);

  return index === -1 ? categoryOrder.length : index;
}

function buildPot(
  key: "lisa" | "james",
  name: string,
  saved: number,
  entries: readonly TimelineEntry[],
): PersonPot {
  const source = key === "lisa" ? FundingSource.LISA : FundingSource.JAMES;
  const ownAllocated = sumEntries(entries, (entry) => entry.source === source);
  const allocated = sumShares(entries, key);
  const paid = sumShares(
    entries.filter((entry) => entry.paid),
    key,
  );

  return {
    key,
    name,
    saved,
    allocated,
    ownAllocated,
    jointShare: round(allocated - ownAllocated),
    paid,
    stillHeld: round(allocated - paid),
    unallocated: round(saved - allocated),
  };
}

export async function getVendorBoard(): Promise<VendorBoard> {
  const db = getDb();
  const [snapshot, metaSnapshot, savingsSnapshot] = await Promise.all([
    db.collection(VENDORS_COLLECTION).get(),
    db.doc(VENDOR_META_DOC).get(),
    db.doc(SAVINGS_DOC).get(),
  ]);

  const vendors = snapshot.docs
    .map((doc) => toVendor(doc))
    .filter((vendor): vendor is Vendor => vendor !== null);
  const savings: Savings = toSavings(savingsSnapshot);
  const sharedItems = (metaSnapshot.data()?.unassignedItems ?? []) as VendorLineItem[];

  const allEntries: TimelineEntry[] = vendors.flatMap((vendor) =>
    vendor.entries.map((entry) => ({
      ...entry,
      vendorId: vendor.id,
      vendorName: vendor.name,
    })),
  );

  const byMonth = new Map<string, TimelineEntry[]>();
  for (const entry of allEntries) {
    byMonth.set(entry.month, [...(byMonth.get(entry.month) ?? []), entry]);
  }

  const timeline: TimelineMonth[] = Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, entries]) => {
      const paid = sumEntries(entries, (entry) => entry.paid);
      const setAside = sumEntries(entries, (entry) => !entry.paid);

      const bySource: Partial<Record<FundingSource, number>> = {};
      for (const entry of entries) {
        bySource[entry.source] = round((bySource[entry.source] ?? 0) + entry.amount);
      }

      const jointEntries = entries.filter(
        (entry) => entry.source === FundingSource.JOINT,
      );

      return {
        month,
        label: formatMonth(month),
        short: formatMonth(month, "short"),
        entries: [...entries].sort((a, b) => b.amount - a.amount),
        paid,
        setAside,
        total: round(paid + setAside),
        bySource,
        jointSplit: jointEntries.length
          ? {
              lisa: sumShares(jointEntries, "lisa"),
              james: sumShares(jointEntries, "james"),
            }
          : null,
      };
    });

  const byCategory = new Map<string, Vendor[]>();
  for (const vendor of vendors) {
    byCategory.set(vendor.category, [...(byCategory.get(vendor.category) ?? []), vendor]);
  }

  const groups = Array.from(byCategory.entries())
    .map(([category, categoryVendors]) => ({
      category,
      vendors: [...categoryVendors].sort((a, b) => b.totalCost - a.totalCost),
      totalCost: round(
        categoryVendors.reduce((total, vendor) => total + vendor.totalCost, 0),
      ),
      stillToFind: round(
        categoryVendors.reduce((total, vendor) => total + vendor.stillToFind, 0),
      ),
      sharedLineItems: sharedItems.filter((item) => item.category === category),
    }))
    .sort(
      (a, b) =>
        categoryRank(a.category) - categoryRank(b.category) ||
        a.category.localeCompare(b.category),
    );

  const upcoming = vendors
    .filter((vendor) => vendor.finalPaymentDeadline && vendor.stillToFind > 0)
    .sort((a, b) =>
      (a.finalPaymentDeadline ?? "").localeCompare(b.finalPaymentDeadline ?? ""),
    );

  return {
    groups,
    timeline,
    pots: [
      buildPot("lisa", "Lisa", savings.lisa, allEntries),
      buildPot("james", "James", savings.james, allEntries),
    ],
    joint: {
      allocated: sumEntries(allEntries, (entry) => entry.source === FundingSource.JOINT),
      paid: sumEntries(
        allEntries,
        (entry) => entry.source === FundingSource.JOINT && entry.paid,
      ),
    },
    unassigned: sumEntries(
      allEntries,
      (entry) => entry.source === FundingSource.UNASSIGNED,
    ),
    totals: {
      totalCost: round(vendors.reduce((total, vendor) => total + vendor.totalCost, 0)),
      paid: round(vendors.reduce((total, vendor) => total + vendor.paid, 0)),
      setAside: round(vendors.reduce((total, vendor) => total + vendor.setAside, 0)),
      stillToFind: round(
        vendors.reduce((total, vendor) => total + vendor.stillToFind, 0),
      ),
      nextDeadline: upcoming[0] ?? null,
    },
  };
}
