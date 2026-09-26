"use server";

import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { InviteStatus, RsvpStatus } from "@/domain/enums";
import {
  parseDietaryRequirements,
} from "@/features/guests/form-schema";
import {
  publicRsvpFormSchema,
  type PublicRsvpFormValues,
} from "@/features/rsvp/types";
import { getDb, guestsCollection } from "@/server/db/firestore";
import {
  getPublicInvitationByToken,
  resolvePublicInvitationAccessToken,
} from "@/server/queries/rsvp";

type PublicRsvpActionResult =
  | {
      success: true;
    }
  | {
      success: false;
      message: string;
    };

export type PublicRsvpLookupState = {
  error?: string;
};

function buildFailure(
  message = "RSVP submission failed. Please try again.",
): PublicRsvpActionResult {
  return {
    success: false,
    message,
  };
}

export async function resolvePublicRsvpLookupAction(
  _: PublicRsvpLookupState,
  formData: FormData,
): Promise<PublicRsvpLookupState> {
  const lookupValue = String(formData.get("lookup") ?? "").trim();

  if (!lookupValue) {
    return {
      error: "Enter your RSVP code or paste the RSVP link from your invitation.",
    };
  }

  const accessToken = await resolvePublicInvitationAccessToken(lookupValue);

  if (!accessToken) {
    return {
      error:
        "We could not find an invitation with that code or link. Check it and try again.",
    };
  }

  redirect(`/rsvp/${accessToken}`);
}

export async function submitPublicRsvpAction(
  token: string,
  values: PublicRsvpFormValues,
): Promise<PublicRsvpActionResult> {
  const parsed = publicRsvpFormSchema.safeParse(values);

  if (!parsed.success) {
    return buildFailure("Please correct the RSVP form values and try again.");
  }

  const invitation = await getPublicInvitationByToken(token);

  if (!invitation) {
    return buildFailure("This RSVP link is invalid or no longer available.");
  }

  const allowedGuests = new Map(
    invitation.guests.map((guest) => [guest.id, guest]),
  );
  const submittedIds = parsed.data.guests.map((guest) => guest.guestId);
  const uniqueSubmittedIds = new Set(submittedIds);

  if (
    uniqueSubmittedIds.size !== invitation.guests.length ||
    invitation.guests.some((guest) => !uniqueSubmittedIds.has(guest.id))
  ) {
    return buildFailure("The RSVP guest list does not match this invitation.");
  }

  try {
    // Every guest on the invitation is updated in one atomic batch, as the
    // single Prisma transaction did.
    const batch = getDb().batch();

    for (const guest of parsed.data.guests) {
      const allowedGuest = allowedGuests.get(guest.guestId);

      if (!allowedGuest) {
        throw new Error("Guest not allowed");
      }

      const canUsePlusOne =
        guest.rsvpStatus === RsvpStatus.ATTENDING &&
        allowedGuest.invitation.plusOneAllowed;

      batch.update(guestsCollection().doc(guest.guestId), {
        "invitation.inviteStatus": InviteStatus.DELIVERED,
        "invitation.rsvpStatus": guest.rsvpStatus,
        "invitation.plusOneName":
          canUsePlusOne && guest.plusOneName.trim()
            ? guest.plusOneName.trim()
            : null,
        "invitation.dietaryRequirements":
          guest.rsvpStatus === RsvpStatus.ATTENDING
            ? parseDietaryRequirements(guest.dietaryRequirements)
            : [],
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    revalidatePath("/admin");
    revalidatePath("/admin/guests");
    revalidatePath(`/rsvp/${token}`);
    for (const guest of invitation.guests) {
      revalidatePath(`/admin/guests/${guest.id}/edit`);
    }

    return {
      success: true,
    };
  } catch {
    return buildFailure();
  }
}
