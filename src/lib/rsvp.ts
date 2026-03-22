export const RSVP_CODE_LENGTH = 8;

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

  return `${greeting} You can RSVP via this link: ${inviteUrl}. Your RSVP code is ${formatInviteCode(
    inviteCode,
  )}.`;
}
