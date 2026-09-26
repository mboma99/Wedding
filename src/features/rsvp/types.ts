import { GuestSide, GuestType, RsvpStatus } from "@/domain/enums";
import { z } from "zod";

import { sideLabels, guestTypeLabels } from "@/features/guests/types";

export type PublicInvitationGuest = {
  id: string;
  fullName: string;
  relation: string;
  side: GuestSide;
  guestType: GuestType;
  householdName: string | null;
  lobolaInvited: boolean;
  invitation: {
    inviteToken: string;
    rsvpStatus: RsvpStatus;
    plusOneAllowed: boolean;
    plusOneName: string | null;
    dietaryRequirements: string[];
  };
};

export type PublicInvitationRecord = {
  token: string;
  accessToken: string;
  inviteCode: string;
  inviteKind: "HOUSEHOLD" | "INDIVIDUAL";
  householdName: string | null;
  primaryGuest: Pick<PublicInvitationGuest, "id" | "fullName" | "relation" | "side">;
  guests: PublicInvitationGuest[];
};

export const publicRsvpGuestSchema = z.object({
  guestId: z.string().min(1),
  // An unanswered radio group reads as null, so every failure gets the same plain message.
  rsvpStatus: z.enum([RsvpStatus.ATTENDING, RsvpStatus.DECLINED], {
    errorMap: () => ({ message: "Choose whether they're coming." }),
  }),
  plusOneAllowed: z.boolean().default(false),
  plusOneName: z.string().trim().max(160).optional().default(""),
  dietaryRequirements: z.string().trim().max(500).optional().default(""),
});

export const publicRsvpFormSchema = z.object({
  guests: z.array(publicRsvpGuestSchema).min(1),
});

export type PublicRsvpFormValues = z.infer<typeof publicRsvpFormSchema>;

/** The form before anyone has chosen: a guest who hasn't replied has no answer selected. */
export type PublicRsvpDraftValues = {
  guests: Array<
    Omit<PublicRsvpFormValues["guests"][number], "rsvpStatus"> & {
      rsvpStatus?: PublicRsvpFormValues["guests"][number]["rsvpStatus"];
    }
  >;
};

export function hasReplied(guest: PublicInvitationGuest) {
  return guest.invitation.rsvpStatus !== RsvpStatus.PENDING;
}

export function getPublicRsvpInitialValues(
  invitation: PublicInvitationRecord,
): PublicRsvpDraftValues {
  return {
    guests: invitation.guests.map((guest) => ({
      guestId: guest.id,
      // Only a reply the guest actually gave is shown as selected.
      rsvpStatus: hasReplied(guest)
        ? (guest.invitation.rsvpStatus as PublicRsvpFormValues["guests"][number]["rsvpStatus"])
        : undefined,
      plusOneAllowed: guest.invitation.plusOneAllowed,
      plusOneName: guest.invitation.plusOneName ?? "",
      dietaryRequirements: guest.invitation.dietaryRequirements.join(", "),
    })),
  };
}

export function getInvitationHeading(invitation: PublicInvitationRecord) {
  return invitation.inviteKind === "HOUSEHOLD"
    ? invitation.householdName || `${invitation.primaryGuest.fullName}'s household`
    : invitation.primaryGuest.fullName;
}

export function getGuestSideLabel(side: GuestSide) {
  return sideLabels[side];
}

export function getGuestTypeLabel(guestType: GuestType) {
  return guestTypeLabels[guestType];
}
