import type { PublicInvitationRecord } from "@/features/rsvp/types";
import {
  buildInviteCodeFromToken,
  normalizeInviteCode,
  normalizeEmailKey,
  normalizeInviteTokenCandidate,
  normalizePhoneKey,
  RSVP_CODE_LENGTH,
} from "@/lib/rsvp";
import type { GuestRecord } from "@/server/db/guest-doc";
import { getAllGuestRecords } from "@/server/guest-cache";

async function findGuestByInviteToken(token: string): Promise<GuestRecord | null> {
  if (!token) {
    return null;
  }

  const guests = await getAllGuestRecords();

  return guests.find((guest) => guest.invitation?.inviteToken === token) ?? null;
}

async function findHouseholdGuests(guest: GuestRecord): Promise<GuestRecord[]> {
  const householdName = guest.householdName?.trim();

  if (!householdName) {
    return [guest];
  }

  // A household is guests on the same side sharing a household name.
  return (await getAllGuestRecords())
    .filter(
      (candidate) =>
        candidate.side === guest.side && candidate.householdName?.trim() === householdName,
    )
    .sort((a, b) =>
      a.fullName.localeCompare(b.fullName, "en", { sensitivity: "base" }),
    );
}

export async function getPublicInvitationByToken(
  token: string,
): Promise<PublicInvitationRecord | null> {
  const tokenGuest = await findGuestByInviteToken(token);

  if (!tokenGuest?.invitation) {
    return null;
  }

  const householdGuests = await findHouseholdGuests(tokenGuest);
  const invitedGuests = householdGuests.filter((guest) => guest.invitation);

  if (!invitedGuests.length) {
    return null;
  }

  const primaryGuest =
    invitedGuests.find((guest) => guest.id === tokenGuest.id) ?? invitedGuests[0];
  const accessToken =
    invitedGuests.length > 1
      ? invitedGuests[0]?.invitation?.inviteToken ?? tokenGuest.invitation.inviteToken
      : tokenGuest.invitation.inviteToken;

  return {
    token: tokenGuest.invitation.inviteToken,
    accessToken,
    inviteCode: buildInviteCodeFromToken(accessToken),
    inviteKind: invitedGuests.length > 1 ? "HOUSEHOLD" : "INDIVIDUAL",
    householdName: tokenGuest.householdName,
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
      lobolaInvited: guest.lobolaInvited,
      invitation: guest.invitation!,
    })),
  };
}

async function resolveAccessTokenByContact(
  field: "phone" | "email",
  matches: (guest: GuestRecord) => boolean,
): Promise<string | null> {
  // Phones and emails are stored free-form (spacing, capitals), so they are
  // matched in memory against the remembered guest list.
  const matchingGuests = (await getAllGuestRecords()).filter(
    (guest) => guest.invitation && matches(guest),
  );
  const accessTokens = new Set<string>();

  for (const guest of matchingGuests) {
    const publicInvitation = await getPublicInvitationByToken(
      guest.invitation!.inviteToken,
    );

    if (publicInvitation) {
      accessTokens.add(publicInvitation.accessToken);
    }
  }

  // Guests in one household sharing a number or email collapse to one
  // invitation; one shared across separate invitations is ambiguous, so it fails.
  return accessTokens.size === 1 ? [...accessTokens][0] : null;
}

export async function resolvePublicInvitationAccessToken(
  lookupValue: string,
): Promise<string | null> {
  const emailKey = normalizeEmailKey(lookupValue);

  if (emailKey) {
    return resolveAccessTokenByContact(
      "email",
      (guest) => normalizeEmailKey(guest.email) === emailKey,
    );
  }

  const phoneKey = normalizePhoneKey(lookupValue);

  if (phoneKey) {
    const accessToken = await resolveAccessTokenByContact(
      "phone",
      (guest) => normalizePhoneKey(guest.phone) === phoneKey,
    );

    if (accessToken) {
      return accessToken;
    }
  }

  const tokenCandidate = normalizeInviteTokenCandidate(lookupValue);
  const exactTokenCandidates = Array.from(
    new Set([tokenCandidate, tokenCandidate.toLowerCase()].filter(Boolean)),
  );

  for (const candidate of exactTokenCandidates) {
    const guest = await findGuestByInviteToken(candidate);

    if (!guest?.invitation) {
      continue;
    }

    const publicInvitation = await getPublicInvitationByToken(
      guest.invitation.inviteToken,
    );

    if (publicInvitation) {
      return publicInvitation.accessToken;
    }
  }

  const inviteCode = normalizeInviteCode(lookupValue);

  if (inviteCode.length !== RSVP_CODE_LENGTH) {
    return null;
  }

  // The code is the start of an invitation token. Two matches means the code
  // is ambiguous, so it fails.
  const prefix = inviteCode.toLowerCase();
  const matchingGuests = (await getAllGuestRecords()).filter(
    (guest) => guest.invitation?.inviteToken.toLowerCase().startsWith(prefix),
  );

  if (matchingGuests.length !== 1) {
    return null;
  }

  const publicInvitation = await getPublicInvitationByToken(
    matchingGuests[0].invitation!.inviteToken,
  );

  return publicInvitation?.accessToken ?? null;
}
