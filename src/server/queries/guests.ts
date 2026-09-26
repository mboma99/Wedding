import {
  enumRank,
  groupTypeOrder,
  guestSideOrder,
  inviteStatusOrder,
  rsvpStatusOrder,
  GuestSide,
} from "@/domain/enums";

import type {
  GuestFormRecord,
  InviteKind,
  GuestListItem,
  GuestListResult,
  GuestListSearchParams,
  GuestSortField,
  HouseholdOption,
  SortDirection,
} from "@/features/guests/types";
import { buildInviteCodeFromToken } from "@/lib/rsvp";
import { guestsCollection } from "@/server/db/firestore";
import { toGuestRecord, toGuestRecords, type GuestRecord } from "@/server/db/guest-doc";

const PAGE_SIZE = 8;

function buildHouseholdKey(side: GuestSide, householdName: string) {
  return `${side}::${householdName}`;
}

type HouseholdInviteMaps = {
  householdCountMap: Map<string, number>;
  householdTokenMap: Map<string, string>;
};

/**
 * Firestore cannot do case-insensitive substring search, cross-field OR, or
 * offset pagination, so the guest list is filtered, sorted and paged in memory.
 * A guest list is a few hundred documents at most, well inside one read.
 */
async function getAllGuests(): Promise<GuestRecord[]> {
  const snapshot = await guestsCollection().get();

  return toGuestRecords(snapshot.docs);
}

function matchesSearch(guest: GuestRecord, search: string) {
  if (!search) {
    return true;
  }

  const needle = search.toLowerCase();

  return [
    guest.fullName,
    guest.householdName,
    guest.relation,
    guest.phone,
    guest.email,
  ].some((field) => (field ?? "").toLowerCase().includes(needle));
}

function matchesFilters(guest: GuestRecord, filters: GuestListSearchParams) {
  if (!matchesSearch(guest, filters.q.trim())) {
    return false;
  }

  if (filters.side && guest.side !== filters.side) {
    return false;
  }

  if (filters.groupType && guest.groupType !== filters.groupType) {
    return false;
  }

  // An invitation filter implied `invitation is not null` in the relation query.
  if (filters.inviteStatus || filters.rsvpStatus) {
    if (!guest.invitation) {
      return false;
    }

    if (
      filters.inviteStatus &&
      guest.invitation.inviteStatus !== filters.inviteStatus
    ) {
      return false;
    }

    if (filters.rsvpStatus && guest.invitation.rsvpStatus !== filters.rsvpStatus) {
      return false;
    }
  }

  return true;
}

function compareText(a: string, b: string) {
  return a.localeCompare(b, "en", { sensitivity: "base" });
}

/** Postgres orders ASC with nulls last and DESC with nulls first. */
function compareNullable<T>(
  a: T | null,
  b: T | null,
  direction: SortDirection,
  compare: (left: T, right: T) => number,
) {
  if (a === null && b === null) {
    return 0;
  }

  if (a === null) {
    return direction === "asc" ? 1 : -1;
  }

  if (b === null) {
    return direction === "asc" ? -1 : 1;
  }

  const result = compare(a, b);

  return direction === "asc" ? result : -result;
}

function buildGuestComparator(
  sortBy: GuestSortField,
  direction: SortDirection,
): (a: GuestRecord, b: GuestRecord) => number {
  const byFullNameAsc = (a: GuestRecord, b: GuestRecord) =>
    compareText(a.fullName, b.fullName);

  switch (sortBy) {
    case "side":
      return (a, b) =>
        compareNullable(
          enumRank(guestSideOrder, a.side),
          enumRank(guestSideOrder, b.side),
          direction,
          (left, right) => left - right,
        ) || byFullNameAsc(a, b);
    case "groupType":
      return (a, b) =>
        compareNullable(
          enumRank(groupTypeOrder, a.groupType),
          enumRank(groupTypeOrder, b.groupType),
          direction,
          (left, right) => left - right,
        ) || byFullNameAsc(a, b);
    case "inviteStatus":
      return (a, b) =>
        compareNullable(
          a.invitation ? enumRank(inviteStatusOrder, a.invitation.inviteStatus) : null,
          b.invitation ? enumRank(inviteStatusOrder, b.invitation.inviteStatus) : null,
          direction,
          (left, right) => left - right,
        ) || byFullNameAsc(a, b);
    case "rsvpStatus":
      return (a, b) =>
        compareNullable(
          a.invitation ? enumRank(rsvpStatusOrder, a.invitation.rsvpStatus) : null,
          b.invitation ? enumRank(rsvpStatusOrder, b.invitation.rsvpStatus) : null,
          direction,
          (left, right) => left - right,
        ) || byFullNameAsc(a, b);
    case "fullName":
    default:
      return (a, b) =>
        compareNullable(a.fullName, b.fullName, direction, compareText) ||
        b.createdAt.getTime() - a.createdAt.getTime();
  }
}

function toSideTotals(guests: readonly GuestRecord[]): Record<GuestSide, number> {
  return {
    [GuestSide.JAMES]: guests.filter((guest) => guest.side === GuestSide.JAMES).length,
    [GuestSide.LISA]: guests.filter((guest) => guest.side === GuestSide.LISA).length,
  };
}

function getHouseholdInviteMaps(
  allGuests: readonly GuestRecord[],
  householdNames: readonly string[],
): HouseholdInviteMaps {
  if (householdNames.length === 0) {
    return {
      householdCountMap: new Map(),
      householdTokenMap: new Map(),
    };
  }

  const wanted = new Set(householdNames);
  const householdGuests = allGuests.filter(
    (guest) => guest.householdName && wanted.has(guest.householdName),
  );

  const householdCountMap = new Map<string, number>();
  for (const guest of householdGuests) {
    if (!guest.householdName) {
      continue;
    }

    const householdKey = buildHouseholdKey(guest.side, guest.householdName);
    householdCountMap.set(householdKey, (householdCountMap.get(householdKey) ?? 0) + 1);
  }

  // The token shared by a household is the first one in (household, side, name)
  // order, so every member of a household resolves to the same RSVP link.
  const invitedHouseholdGuests = householdGuests
    .filter((guest) => guest.invitation)
    .sort(
      (a, b) =>
        compareText(a.householdName ?? "", b.householdName ?? "") ||
        enumRank(guestSideOrder, a.side) - enumRank(guestSideOrder, b.side) ||
        compareText(a.fullName, b.fullName),
    );

  const householdTokenMap = new Map<string, string>();
  for (const guest of invitedHouseholdGuests) {
    if (!guest.householdName || !guest.invitation) {
      continue;
    }

    const householdKey = buildHouseholdKey(guest.side, guest.householdName);

    if (!householdTokenMap.has(householdKey)) {
      householdTokenMap.set(householdKey, guest.invitation.inviteToken);
    }
  }

  return {
    householdCountMap,
    householdTokenMap,
  };
}

export async function getGuestList(
  filters: GuestListSearchParams,
): Promise<GuestListResult> {
  const allGuests = await getAllGuests();
  const matching = allGuests.filter((guest) => matchesFilters(guest, filters));

  const totalGuests = matching.length;
  const totalPages = Math.max(1, Math.ceil(totalGuests / PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  const skip = (page - 1) * PAGE_SIZE;

  const guests = [...matching]
    .sort(buildGuestComparator(filters.sortBy, filters.sortDirection))
    .slice(skip, skip + PAGE_SIZE);

  const householdNames = Array.from(
    new Set(
      guests
        .map((guest) => guest.householdName?.trim())
        .filter((householdName): householdName is string => Boolean(householdName)),
    ),
  );

  const { householdCountMap, householdTokenMap } = getHouseholdInviteMaps(
    allGuests,
    householdNames,
  );

  const guestsWithInviteMetadata: GuestListItem[] = guests.map((guest) => {
    const householdGuestCount = guest.householdName
      ? householdCountMap.get(buildHouseholdKey(guest.side, guest.householdName)) ?? 1
      : 1;
    const inviteKind: InviteKind =
      householdGuestCount > 1 ? "HOUSEHOLD" : "INDIVIDUAL";
    const sharedToken = guest.invitation
      ? guest.householdName
        ? householdTokenMap.get(buildHouseholdKey(guest.side, guest.householdName)) ??
          guest.invitation.inviteToken
        : guest.invitation.inviteToken
      : null;
    const invitation =
      guest.invitation && sharedToken
        ? {
            inviteStatus: guest.invitation.inviteStatus,
            rsvpStatus: guest.invitation.rsvpStatus,
            plusOneAllowed: guest.invitation.plusOneAllowed,
            inviteCode: buildInviteCodeFromToken(sharedToken),
            inviteKind,
            householdGuestCount,
            inviteToken: sharedToken,
          }
        : null;

    return {
      id: guest.id,
      fullName: guest.fullName,
      side: guest.side,
      groupType: guest.groupType,
      relation: guest.relation,
      guestType: guest.guestType,
      householdName: guest.householdName,
      phone: guest.phone,
      email: guest.email,
      invitation,
    };
  });

  return {
    guests: guestsWithInviteMetadata,
    totalGuests,
    page,
    pageSize: PAGE_SIZE,
    totalPages,
    pageStart: totalGuests === 0 ? 0 : skip + 1,
    pageEnd: totalGuests === 0 ? 0 : skip + guests.length,
    sideTotals: toSideTotals(matching),
  };
}

export async function getHouseholdOptions(
  excludeGuestId?: string,
): Promise<HouseholdOption[]> {
  const allGuests = await getAllGuests();
  const counts = new Map<string, HouseholdOption>();

  for (const guest of allGuests) {
    if (!guest.householdName?.trim() || guest.id === excludeGuestId) {
      continue;
    }

    const householdKey = buildHouseholdKey(guest.side, guest.householdName);
    const existing = counts.get(householdKey);

    if (existing) {
      existing.linkedGuestCount += 1;
      continue;
    }

    counts.set(householdKey, {
      householdName: guest.householdName,
      side: guest.side,
      linkedGuestCount: 1,
    });
  }

  return Array.from(counts.values()).sort(
    (a, b) =>
      enumRank(guestSideOrder, a.side) - enumRank(guestSideOrder, b.side) ||
      compareText(a.householdName, b.householdName),
  );
}

export async function getGuestForEdit(
  guestId: string,
): Promise<GuestFormRecord | null> {
  const snapshot = await guestsCollection().doc(guestId).get();
  const guest = toGuestRecord(snapshot);

  if (!guest) {
    return null;
  }

  return {
    id: guest.id,
    fullName: guest.fullName,
    side: guest.side,
    groupType: guest.groupType,
    relation: guest.relation,
    guestType: guest.guestType,
    householdName: guest.householdName,
    phone: guest.phone,
    email: guest.email,
    notes: guest.notes,
    invitation: guest.invitation
      ? {
          inviteStatus: guest.invitation.inviteStatus,
          rsvpStatus: guest.invitation.rsvpStatus,
          plusOneAllowed: guest.invitation.plusOneAllowed,
          plusOneName: guest.invitation.plusOneName,
          dietaryRequirements: guest.invitation.dietaryRequirements,
          inviteToken: guest.invitation.inviteToken,
        }
      : null,
  };
}
