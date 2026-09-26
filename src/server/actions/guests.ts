"use server";

import { randomUUID } from "node:crypto";

import { FieldValue, type Transaction } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";


import {
  guestFormSchema,
  normalizeGuestFormValues,
  parseDietaryRequirements,
  type GuestFormValues,
} from "@/features/guests/form-schema";
import { getDb, guestsCollection } from "@/server/db/firestore";
import { toGuestRecord } from "@/server/db/guest-doc";
import { setHouseholdForGuests } from "@/server/households";
import { requireAdminSession } from "@/server/auth/admin";
import { guestsChanged } from "@/server/guest-cache";

type GuestFormActionResult =
  | {
      success: true;
      guestId: string;
    }
  | {
      success: false;
      message: string;
    };

type DeleteGuestActionResult =
  | {
      success: true;
    }
  | {
      success: false;
      message: string;
    };

/** Firestore has no unique constraints, so these stand in for P2002/P2025. */
class DuplicateEmailError extends Error {}
class GuestNotFoundError extends Error {}

/**
 * Cleared fields must be `null`, never `undefined`: writes use `{ merge: true }`
 * and the client ignores undefined properties, so an undefined field would keep
 * its old value instead of being cleared.
 */
function buildGuestPayload(values: GuestFormValues) {
  const normalized = normalizeGuestFormValues(values);
  const dietaryRequirements = parseDietaryRequirements(
    normalized.dietaryRequirements,
  );

  return {
    fullName: normalized.fullName,
    side: normalized.side,
    groupType: normalized.groupType,
    relation: normalized.relation,
    guestType: normalized.guestType,
    householdName: normalized.householdName || null,
    phone: normalized.phone || null,
    email: normalized.email || null,
    notes: normalized.notes || null,
    invitation: {
      inviteStatus: normalized.inviteStatus,
      rsvpStatus: normalized.rsvpStatus,
      plusOneAllowed: normalized.plusOneAllowed,
      plusOneName:
        normalized.plusOneAllowed && normalized.plusOneName
          ? normalized.plusOneName
          : null,
      dietaryRequirements,
    },
  };
}

function buildValidationError(
  message = "Please correct the form values and try again.",
): GuestFormActionResult {
  return {
    success: false,
    message,
  };
}

function revalidateGuestPaths(guestId: string) {
  guestsChanged();
  revalidatePath("/admin");
  revalidatePath("/admin/guests");
  revalidatePath("/admin/guests/new");
  revalidatePath(`/admin/guests/${guestId}/edit`);
}

function buildDeleteFailure(
  message = "Guest deletion failed. Please try again.",
): DeleteGuestActionResult {
  return {
    success: false,
    message,
  };
}

/**
 * Email was a unique column. The check runs inside the transaction that writes
 * the guest so two concurrent submissions cannot both claim the same address.
 */
async function assertEmailIsFree(
  transaction: Transaction,
  email: string | null,
  excludeGuestId?: string,
) {
  if (!email) {
    return;
  }

  const existing = await transaction.get(
    guestsCollection().where("email", "==", email).limit(2),
  );

  const clash = existing.docs.some((doc) => doc.id !== excludeGuestId);

  if (clash) {
    throw new DuplicateEmailError();
  }
}

export async function createGuestAction(
  values: GuestFormValues,
): Promise<GuestFormActionResult> {
  await requireAdminSession();
  const parsed = guestFormSchema.safeParse(values);

  if (!parsed.success) {
    return buildValidationError();
  }

  const payload = buildGuestPayload(parsed.data);

  try {
    const guestRef = guestsCollection().doc();

    await getDb().runTransaction(async (transaction) => {
      await assertEmailIsFree(transaction, payload.email);

      transaction.set(guestRef, {
        ...payload,
        invitation: {
          ...payload.invitation,
          inviteToken: randomUUID(),
        },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    revalidateGuestPaths(guestRef.id);

    return {
      success: true,
      guestId: guestRef.id,
    };
  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      return buildValidationError(
        "A guest with this email address already exists.",
      );
    }

    return buildValidationError("Guest creation failed. Please try again.");
  }
}

export async function updateGuestAction(
  guestId: string,
  values: GuestFormValues,
): Promise<GuestFormActionResult> {
  await requireAdminSession();
  const parsed = guestFormSchema.safeParse(values);

  if (!parsed.success) {
    return buildValidationError();
  }

  const payload = buildGuestPayload(parsed.data);

  try {
    const guestRef = guestsCollection().doc(guestId);

    await getDb().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(guestRef);
      const existing = toGuestRecord(snapshot);

      if (!existing) {
        throw new GuestNotFoundError();
      }

      await assertEmailIsFree(transaction, payload.email, guestId);

      transaction.set(
        guestRef,
        {
          ...payload,
          invitation: {
            ...payload.invitation,
            // An existing invitation keeps its token so shared RSVP links live on.
            inviteToken: existing.invitation?.inviteToken ?? randomUUID(),
          },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });

    revalidateGuestPaths(guestId);

    return {
      success: true,
      guestId,
    };
  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      return buildValidationError(
        "Another guest already uses this email address.",
      );
    }

    if (error instanceof GuestNotFoundError) {
      return buildValidationError("This guest record no longer exists.");
    }

    return buildValidationError("Guest update failed. Please try again.");
  }
}

export async function deleteGuestAction(
  guestId: string,
): Promise<DeleteGuestActionResult> {
  await requireAdminSession();

  try {
    const snapshot = await guestsCollection().doc(guestId).get();
    const guest = toGuestRecord(snapshot);

    if (!guest) {
      return buildDeleteFailure("This guest record no longer exists.");
    }

    const relatedHouseholdGuests = guest.householdName
      ? (
          await guestsCollection()
            .where("householdName", "==", guest.householdName)
            .get()
        ).docs
          .map((doc) => toGuestRecord(doc))
          .filter(
            (candidate) =>
              candidate !== null &&
              candidate.id !== guest.id &&
              candidate.side === guest.side,
          )
      : [];

    await guestsCollection().doc(guest.id).delete();

    revalidateGuestPaths(guest.id);

    if (guest.invitation?.inviteToken) {
      revalidatePath(`/rsvp/${guest.invitation.inviteToken}`);
    }

    for (const householdGuest of relatedHouseholdGuests) {
      if (!householdGuest) {
        continue;
      }

      revalidatePath(`/admin/guests/${householdGuest.id}/edit`);

      if (householdGuest.invitation?.inviteToken) {
        revalidatePath(`/rsvp/${householdGuest.invitation.inviteToken}`);
      }
    }

    return {
      success: true,
    };
  } catch {
    return buildDeleteFailure();
  }
}


export type AssignHouseholdActionResult =
  | {
      success: true;
      householdName: string | null;
      guestCount: number;
    }
  | {
      success: false;
      message: string;
    };

/**
 * Groups the selected guests into a household, or clears theirs when
 * `householdName` is null. Passing a name that already exists on their side
 * merges them into that household.
 */
export async function assignHouseholdAction(
  guestIds: string[],
  householdName: string | null,
): Promise<AssignHouseholdActionResult> {
  await requireAdminSession();

  try {
    const result = await setHouseholdForGuests(guestIds, householdName);

    if (!result.success) {
      return result;
    }

    guestsChanged();
    revalidatePath("/admin");
    revalidatePath("/admin/guests");

    for (const guestId of result.guestIds) {
      revalidatePath(`/admin/guests/${guestId}/edit`);
    }

    // Grouping changes which guests a household RSVP page covers.
    for (const inviteToken of result.inviteTokens) {
      revalidatePath(`/rsvp/${inviteToken}`);
    }

    return {
      success: true,
      householdName: result.householdName,
      guestCount: result.guestCount,
    };
  } catch {
    return {
      success: false,
      message: "Household update failed. Please try again.",
    };
  }
}
