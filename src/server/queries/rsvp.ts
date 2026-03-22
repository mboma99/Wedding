import type { PublicInvitationRecord } from "@/features/rsvp/types";
import {
  buildInviteCodeFromToken,
  normalizeInviteCode,
  normalizeInviteTokenCandidate,
  RSVP_CODE_LENGTH,
} from "@/lib/rsvp";
import { prisma } from "@/server/db/prisma";

export async function getPublicInvitationByToken(
  token: string,
): Promise<PublicInvitationRecord | null> {
  const invitation = await prisma.invitation.findUnique({
    where: {
      inviteToken: token,
    },
    select: {
      inviteToken: true,
      guest: {
        select: {
          id: true,
          fullName: true,
          relation: true,
          side: true,
          guestType: true,
          householdName: true,
        },
      },
    },
  });

  if (!invitation) {
    return null;
  }

  const householdGuests =
    invitation.guest.householdName?.trim()
      ? await prisma.guest.findMany({
          where: {
            householdName: invitation.guest.householdName,
            side: invitation.guest.side,
            invitation: {
              isNot: null,
            },
          },
          orderBy: [{ fullName: "asc" }],
          select: {
            id: true,
            fullName: true,
            relation: true,
            side: true,
            guestType: true,
            householdName: true,
            invitation: {
              select: {
                inviteToken: true,
                rsvpStatus: true,
                plusOneAllowed: true,
                plusOneName: true,
                dietaryRequirements: true,
              },
            },
          },
        })
      : await prisma.guest.findMany({
          where: {
            id: invitation.guest.id,
          },
          select: {
            id: true,
            fullName: true,
            relation: true,
            side: true,
            guestType: true,
            householdName: true,
            invitation: {
              select: {
                inviteToken: true,
                rsvpStatus: true,
                plusOneAllowed: true,
                plusOneName: true,
                dietaryRequirements: true,
              },
            },
          },
        });

  const invitedGuests = householdGuests.filter((guest) => guest.invitation);

  if (!invitedGuests.length) {
    return null;
  }

  const primaryGuest =
    invitedGuests.find((guest) => guest.id === invitation.guest.id) ?? invitedGuests[0];
  const accessToken =
    invitedGuests.length > 1
      ? invitedGuests[0]?.invitation?.inviteToken ?? invitation.inviteToken
      : invitation.inviteToken;

  return {
    token: invitation.inviteToken,
    accessToken,
    inviteCode: buildInviteCodeFromToken(accessToken),
    inviteKind: invitedGuests.length > 1 ? "HOUSEHOLD" : "INDIVIDUAL",
    householdName: invitation.guest.householdName,
    primaryGuest: {
      id: primaryGuest.id,
      fullName: primaryGuest.fullName,
      relation: primaryGuest.relation,
      side: primaryGuest.side,
    },
    guests: invitedGuests.map((guest) => ({
      id: guest.id,
      fullName: guest.fullName,
      relation: guest.relation,
      side: guest.side,
      guestType: guest.guestType,
      householdName: guest.householdName,
      invitation: guest.invitation!,
    })),
  };
}

export async function resolvePublicInvitationAccessToken(
  lookupValue: string,
): Promise<string | null> {
  const tokenCandidate = normalizeInviteTokenCandidate(lookupValue);
  const exactTokenCandidates = Array.from(
    new Set([tokenCandidate, tokenCandidate.toLowerCase()].filter(Boolean)),
  );

  for (const candidate of exactTokenCandidates) {
    const invitation = await prisma.invitation.findUnique({
      where: {
        inviteToken: candidate,
      },
      select: {
        inviteToken: true,
      },
    });

    if (!invitation) {
      continue;
    }

    const publicInvitation = await getPublicInvitationByToken(invitation.inviteToken);

    if (publicInvitation) {
      return publicInvitation.accessToken;
    }
  }

  const inviteCode = normalizeInviteCode(lookupValue);

  if (inviteCode.length !== RSVP_CODE_LENGTH) {
    return null;
  }

  const matchingInvitations = await prisma.invitation.findMany({
    where: {
      inviteToken: {
        startsWith: inviteCode.toLowerCase(),
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      inviteToken: true,
    },
    take: 2,
  });

  if (matchingInvitations.length !== 1) {
    return null;
  }

  const publicInvitation = await getPublicInvitationByToken(
    matchingInvitations[0].inviteToken,
  );

  return publicInvitation?.accessToken ?? null;
}
