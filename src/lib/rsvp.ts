export const RSVP_CODE_LENGTH = 8;

// Numbers are compared on their last 9 digits so "07123 456789",
// "+44 7123 456789" and "0044 7123 456789" all resolve to the same key.
const PHONE_KEY_LENGTH = 9;

function getPathSegments(pathname: string) {
  return pathname
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

export function buildInviteCodeFromToken(token: string) {
  return token.replace(/[^a-zA-Z0-9]/g, "").slice(0, RSVP_CODE_LENGTH).toUpperCase();
}

export function formatInviteCode(code: string) {
  if (code.length <= 4) {
    return code;
  }

  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export function extractInviteLookupValue(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  try {
    const url = new URL(
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://lookup.local${trimmed.startsWith("/") ? "" : "/"}${trimmed}`,
    );
    const segments = getPathSegments(url.pathname);
    const rsvpIndex = segments.findIndex(
      (segment) => segment.toLowerCase() === "rsvp",
    );

    if (rsvpIndex >= 0 && segments[rsvpIndex + 1]) {
      return segments[rsvpIndex + 1];
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

export function normalizeInviteTokenCandidate(value: string) {
  return extractInviteLookupValue(value).trim().replace(/\/+$/, "");
}

export function normalizeInviteCode(value: string) {
  return extractInviteLookupValue(value).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

/** An email typed into the RSVP lookup, compared case-insensitively. */
export function normalizeEmailKey(value: string | null | undefined) {
  const trimmed = value?.trim().toLowerCase() ?? "";

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : null;
}

export function normalizePhoneKey(value: string | null | undefined) {
  if (!value || !/^[+0-9()\-\s.]+$/.test(value.trim())) {
    return null;
  }

  const digits = value.replace(/\D/g, "");

  return digits.length >= PHONE_KEY_LENGTH ? digits.slice(-PHONE_KEY_LENGTH) : null;
}

export function buildInvitationShareMessage({
  inviteKind,
  guestName,
  householdName,
  inviteCode,
  inviteUrl,
}: {
  inviteKind: "HOUSEHOLD" | "INDIVIDUAL";
  guestName: string;
  householdName?: string | null;
  inviteCode: string;
  inviteUrl: string;
}) {
  const greeting =
    inviteKind === "HOUSEHOLD"
      ? `James and Lisa would love to invite ${
          householdName ? `the ${householdName}` : `${guestName}'s household`
        } to their traditional wedding.`
      : "James and Lisa would love to invite you to their traditional wedding.";

  return `${greeting} You can RSVP via this link: ${inviteUrl}, or enter your phone number on the wedding website. Your RSVP code is ${formatInviteCode(
    inviteCode,
  )}.`;
}
