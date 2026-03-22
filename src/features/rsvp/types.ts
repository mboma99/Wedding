import { GuestSide, GuestType, RsvpStatus } from "@prisma/client";
import { z } from "zod";

import { sideLabels, guestTypeLabels } from "@/features/guests/types";

export type PublicInvitationGuest = {
  id: string;
  fullName: string;
  relation: string;
  side: GuestSide;
  guestType: GuestType;
  householdName: string | null;
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
  rsvpStatus: z.union([z.literal(RsvpStatus.ATTENDING), z.literal(RsvpStatus.DECLINED)]),
  plusOneAllowed: z.boolean().default(false),
  plusOneName: z.string().trim().max(160).optional().default(""),
  dietaryRequirements: z.string().trim().max(500).optional().default(""),
});

export const publicRsvpFormSchema = z.object({
  guests: z.array(publicRsvpGuestSchema).min(1),
});

export type PublicRsvpFormValues = z.infer<typeof publicRsvpFormSchema>;

export function getPublicRsvpInitialValues(
  invitation: PublicInvitationRecord,
): PublicRsvpFormValues {
  return {
    guests: invitation.guests.map((guest) => ({
      guestId: guest.id,
      rsvpStatus:
        guest.invitation.rsvpStatus === RsvpStatus.DECLINED
          ? RsvpStatus.DECLINED
          : RsvpStatus.ATTENDING,
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

export function getInvitationSummary(invitation: PublicInvitationRecord) {
  return invitation.inviteKind === "HOUSEHOLD"
    ? `This link covers ${invitation.guests.length} guests in the ${getInvitationHeading(
        invitation,
      )} invitation.`
    : "This link covers one invited guest.";
}

export function getGuestSideLabel(side: GuestSide) {
  return sideLabels[side];
}

export function getGuestTypeLabel(guestType: GuestType) {
  return guestTypeLabels[guestType];
}
