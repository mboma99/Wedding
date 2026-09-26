import { FieldValue } from "firebase-admin/firestore";

import type { GuestSide } from "@/domain/enums";
import { sideLabels } from "@/features/guests/types";
import { getDb, guestsCollection } from "@/server/db/firestore";
import { toGuestRecord } from "@/server/db/guest-doc";

export type SetHouseholdResult =
  | {
      success: true;
      householdName: string | null;
      guestCount: number;
      guestIds: string[];
      inviteTokens: string[];
    }
  | {
      success: false;
      message: string;
    };

function normalizeHouseholdName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function failure(message: string): SetHouseholdResult {
  return { success: false, message };
}

/**
 * Households are not records: guests belong to one by sharing `side` and
 * `householdName`. Grouping is therefore just writing the same name to each
 * selected guest, and re-using an existing name merges guests into it.
 *
 * Invite tokens are left alone. Every member keeps their own token and all of
 * them resolve to the shared household RSVP page, so links already sent out
 * keep working.
 */

/**
 * Household membership is an exact name match, so "moyo family" typed against an
 * existing "Moyo Family" would silently create a second household. An existing
 * household on the same side wins, and its spelling is reused.
 */
async function canonicalizeHouseholdName(
  side: GuestSide,
  householdName: string | null,
) {
  if (!householdName) {
    return null;
  }

  const snapshot = await guestsCollection().where("side", "==", side).get();
  const existing = snapshot.docs
    .map((doc) => doc.get("householdName"))
    .filter((name): name is string => typeof name === "string" && Boolean(name.trim()));

  return (
    existing.find(
      (name) => name.toLowerCase() === householdName.toLowerCase(),
    ) ?? householdName
  );
}

export async function setHouseholdForGuests(
  guestIds: readonly string[],
  householdName: string | null,
): Promise<SetHouseholdResult> {
  const uniqueIds = Array.from(new Set(guestIds.filter(Boolean)));

  if (uniqueIds.length === 0) {
    return failure("Select at least one guest first.");
  }

  const normalizedName =
    householdName === null ? null : normalizeHouseholdName(householdName);

  if (normalizedName !== null && !normalizedName) {
    return failure("Enter a household name.");
  }

  if (normalizedName !== null && normalizedName.length > 120) {
    return failure("Household names are limited to 120 characters.");
  }

  const db = getDb();
  const snapshots = await db.getAll(
    ...uniqueIds.map((guestId) => guestsCollection().doc(guestId)),
  );
  const guests = snapshots
    .map((snapshot) => toGuestRecord(snapshot))
    .filter((guest): guest is NonNullable<typeof guest> => guest !== null);

  if (guests.length !== uniqueIds.length) {
    return failure(
      "Some of the selected guests no longer exist. Refresh the list and try again.",
    );
  }

  // A household is keyed by side and name, so guests on different sides cannot
  // share one: writing the same name would silently create two households.
  const sides = Array.from(new Set(guests.map((guest) => guest.side)));

  if (sides.length > 1) {
    const bySide = sides
      .map(
        (side) =>
          `${sideLabels[side]}: ${guests
            .filter((guest) => guest.side === side)
            .map((guest) => guest.fullName)
            .join(", ")}`,
      )
      .join(" — ");

    return failure(
      `A household cannot span both sides. Group these separately (${bySide}).`,
    );
  }

  const householdName_ = await canonicalizeHouseholdName(sides[0], normalizedName);

  const batch = db.batch();

  for (const guest of guests) {
    batch.update(guestsCollection().doc(guest.id), {
      householdName: householdName_,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();

  return {
    success: true,
    householdName: householdName_,
    guestCount: guests.length,
    guestIds: guests.map((guest) => guest.id),
    inviteTokens: guests
      .map((guest) => guest.invitation?.inviteToken)
      .filter((token): token is string => Boolean(token)),
  };
}
