import { revalidateTag, unstable_cache } from "next/cache";

import { guestsCollection } from "@/server/db/firestore";
import { toGuestRecords, type GuestRecord } from "@/server/db/guest-doc";

/**
 * The whole guest list, read once and remembered. Almost every page needs all
 * guests, and Firestore bills each document read, so reading ~80 guests on
 * every page view burned through the free daily allowance.
 *
 * Every change the app makes to a guest calls `guestsChanged()`, which drops
 * the remembered copy so the next read is fresh. The copy also expires after
 * a few minutes, to pick up edits made outside the app (import scripts, the
 * Firebase console).
 *
 * Writes that need to be exact (email uniqueness, household merges) still
 * query Firestore directly.
 */
export const GUESTS_TAG = "guests";
const MAX_AGE_SECONDS = 600;

type StoredGuest = Omit<GuestRecord, "createdAt" | "updatedAt"> & {
  createdAt: number;
  updatedAt: number;
};

// The cache stores JSON, so dates travel as timestamps and are rebuilt below.
const readGuests = unstable_cache(
  async (): Promise<StoredGuest[]> => {
    const snapshot = await guestsCollection().get();
    return toGuestRecords(snapshot.docs).map((guest) => ({
      ...guest,
      createdAt: guest.createdAt.getTime(),
      updatedAt: guest.updatedAt.getTime(),
    }));
  },
  ["all-guests"],
  { tags: [GUESTS_TAG], revalidate: MAX_AGE_SECONDS },
);

export async function getAllGuestRecords(): Promise<GuestRecord[]> {
  const stored = await readGuests();
  return stored.map((guest) => ({
    ...guest,
    createdAt: new Date(guest.createdAt),
    updatedAt: new Date(guest.updatedAt),
  }));
}

/** Call after any write to the guests collection. */
export function guestsChanged() {
  revalidateTag(GUESTS_TAG);
}
