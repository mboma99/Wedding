import type { PublicInvitationRecord } from "@/features/rsvp/types";
import {
  buildInviteCodeFromToken,
  normalizeInviteCode,
  normalizeInviteTokenCandidate,
  normalizePhoneKey,
  RSVP_CODE_LENGTH,
} from "@/lib/rsvp";
import { guestsCollection } from "@/server/db/firestore";
import { toGuestRecords, type GuestRecord } from "@/server/db/guest-doc";

const INVITE_TOKEN_FIELD = "invitation.inviteToken";

async function findGuestByInviteToken(token: string): Promise<GuestRecord | null> {
  if (!token) {
    return null;
  }

  const snapshot = await guestsCollection()
    .where(INVITE_TOKEN_FIELD, "==", token)
    .limit(1)
    .get();

  return toGuestRecords(snapshot.docs)[0] ?? null;
}

async function findHouseholdGuests(guest: GuestRecord): Promise<GuestRecord[]> {
  const householdName = guest.householdName?.trim();

  if (!householdName) {
    return [guest];
  }

  // Equality on householdName alone is served by the automatic single-field
  // index; side is narrowed here so no composite index has to be deployed.
  const snapshot = await guestsCollection()
    .where("householdName", "==", householdName)
    .get();

  return toGuestRecords(snapshot.docs)
    .filter((candidate) => candidate.side === guest.side)
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
      invitation: guest.invitation!,
    })),
  };
}

async function resolveAccessTokenByPhone(
  phoneKey: string,
): Promise<string | null> {
  // Phones are stored free-form, so they are matched in memory rather than
  // with an equality query. The guest list is small enough to scan.
  const snapshot = await guestsCollection()
    .select("phone", "householdName", "side", "invitation")
    .get();

  const matchingGuests = toGuestRecords(snapshot.docs).filter(
    (guest) => guest.invitation && normalizePhoneKey(guest.phone) === phoneKey,
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

  // Guests in one household sharing a number collapse to one invitation; a
  // number shared across separate invitations is ambiguous, so it fails.
  return accessTokens.size === 1 ? [...accessTokens][0] : null;
}

export async function resolvePublicInvitationAccessToken(
  lookupValue: string,
): Promise<string | null> {
  const phoneKey = normalizePhoneKey(lookupValue);

  if (phoneKey) {
    const accessToken = await resolveAccessTokenByPhone(phoneKey);

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

  // Prefix match: tokens sort as strings, so the range covers every token that
  // starts with the code. Two hits means the code is ambiguous, so it fails.
  const prefix = inviteCode.toLowerCase();
  const matches = await guestsCollection()
    .where(INVITE_TOKEN_FIELD, ">=", prefix)
    .where(INVITE_TOKEN_FIELD, "<", `${prefix}`)
    .limit(2)
    .get();

  const matchingGuests = toGuestRecords(matches.docs).filter(
    (guest) => guest.invitation,
  );

  if (matchingGuests.length !== 1) {
    return null;
  }

  const publicInvitation = await getPublicInvitationByToken(
    matchingGuests[0].invitation!.inviteToken,
  );

  return publicInvitation?.accessToken ?? null;
}
