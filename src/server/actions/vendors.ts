"use server";

import { revalidatePath } from "next/cache";

import type { JointSplit, Savings } from "@/domain/vendors";
import { requireAdminSession } from "@/server/auth/admin";
import {
  addVendorEntry,
  addVendorLineItem,
  createVendor,
  deleteVendor,
  deleteVendorEntry,
  deleteVendorLineItem,
  updateSavings,
  updateVendorDetails,
  updateVendorEntry,
  updateVendorLineItem,
  type MutationResult,
  type VendorDetails,
} from "@/server/vendors";

function revalidateVendors() {
  revalidatePath("/admin/vendors");
  revalidatePath("/admin");
}

async function run(work: () => Promise<MutationResult>): Promise<MutationResult> {
  await requireAdminSession();

  try {
    const result = await work();

    if (result.success) {
      revalidateVendors();
    }

    return result;
  } catch {
    return { success: false, message: "That change could not be saved." };
  }
}

export async function addVendorEntryAction(
  vendorId: string,
  values: {
    amount: number;
    month: string;
    source: string;
    note?: string;
    split?: JointSplit | null;
    paid?: boolean;
  },
) {
  return run(() => addVendorEntry(vendorId, values));
}

export async function updateVendorEntryAction(
  vendorId: string,
  entryId: string,
  values: {
    amount?: number;
    month?: string;
    source?: string;
    split?: JointSplit | null;
    paid?: boolean;
  },
) {
  return run(() => updateVendorEntry(vendorId, entryId, values));
}

export async function deleteVendorEntryAction(vendorId: string, entryId: string) {
  return run(() => deleteVendorEntry(vendorId, entryId));
}

export async function updateSavingsAction(values: Savings) {
  return run(() => updateSavings(values));
}

export async function createVendorAction(details: VendorDetails) {
  return run(() => createVendor(details));
}

export async function updateVendorDetailsAction(
  vendorId: string,
  details: VendorDetails,
) {
  return run(() => updateVendorDetails(vendorId, details));
}

export async function deleteVendorAction(vendorId: string) {
  return run(() => deleteVendor(vendorId));
}

export async function addVendorLineItemAction(
  vendorId: string,
  item: { description: string; price: number },
) {
  return run(() => addVendorLineItem(vendorId, item));
}

export async function updateVendorLineItemAction(
  vendorId: string,
  index: number,
  item: { description: string; price: number },
) {
  return run(() => updateVendorLineItem(vendorId, index, item));
}

export async function deleteVendorLineItemAction(vendorId: string, index: number) {
  return run(() => deleteVendorLineItem(vendorId, index));
}
