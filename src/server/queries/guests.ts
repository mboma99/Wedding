import {
  GuestSide,
  Prisma,
} from "@prisma/client";

import type {
  GuestFormRecord,
  InviteKind,
  GuestListItem,
  GuestListResult,
  GuestListSearchParams,
  GuestSortField,
  HouseholdOption,
} from "@/features/guests/types";
import { buildInviteCodeFromToken } from "@/lib/rsvp";
import { prisma } from "@/server/db/prisma";

const PAGE_SIZE = 8;

function buildHouseholdKey(side: GuestSide, householdName: string) {
  return `${side}::${householdName}`;
}

type HouseholdInviteMaps = {
  householdCountMap: Map<string, number>;
  householdTokenMap: Map<string, string>;
};

function buildGuestWhereClause(
  filters: GuestListSearchParams,
): Prisma.GuestWhereInput {
  const search = filters.q.trim();

  return {
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { householdName: { contains: search, mode: "insensitive" } },
            { relation: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(filters.side ? { side: filters.side } : {}),
    ...(filters.groupType ? { groupType: filters.groupType } : {}),
    ...(filters.inviteStatus || filters.rsvpStatus
      ? {
          invitation: {
            is: {
              ...(filters.inviteStatus
                ? { inviteStatus: filters.inviteStatus }
                : {}),
              ...(filters.rsvpStatus ? { rsvpStatus: filters.rsvpStatus } : {}),
            },
          },
        }
      : {}),
  };
}

function buildGuestOrderBy(
  sortBy: GuestSortField,
  sortDirection: GuestListSearchParams["sortDirection"],
): Prisma.GuestOrderByWithRelationInput[] {
  const direction = sortDirection;

  switch (sortBy) {
    case "side":
      return [{ side: direction }, { fullName: "asc" }];
    case "groupType":
      return [{ groupType: direction }, { fullName: "asc" }];
    case "inviteStatus":
      return [{ invitation: { inviteStatus: direction } }, { fullName: "asc" }];
    case "rsvpStatus":
      return [{ invitation: { rsvpStatus: direction } }, { fullName: "asc" }];
    case "fullName":
    default:
      return [{ fullName: direction }, { createdAt: "desc" }];
  }
}

function toSideTotals(
  sideCounts: Array<{ side: GuestSide; _count: { _all: number } }>,
): Record<GuestSide, number> {
  return {
    [GuestSide.JAMES]:
      sideCounts.find((item) => item.side === GuestSide.JAMES)?._count._all ?? 0,
    [GuestSide.LISA]:
      sideCounts.find((item) => item.side === GuestSide.LISA)?._count._all ?? 0,
  };
}

async function getHouseholdInviteMaps(
  householdNames: string[],
): Promise<HouseholdInviteMaps> {
  if (householdNames.length === 0) {
    return {
      householdCountMap: new Map(),
      householdTokenMap: new Map(),
    };
  }

  const [householdCounts, householdTokens] = await Promise.all([
    prisma.guest.groupBy({
      by: ["side", "householdName"],
      where: {
        householdName: {
          in: householdNames,
        },
      },
      _count: {
        _all: true,
      },
    }),
    prisma.guest.findMany({
      where: {
        householdName: {
          in: householdNames,
        },
        invitation: {
          isNot: null,
        },
      },
      orderBy: [{ householdName: "asc" }, { side: "asc" }, { fullName: "asc" }],
      select: {
        side: true,
        householdName: true,
        invitation: {
          select: {
            inviteToken: true,
          },
        },
      },
    }),
  ]);

  const householdCountMap = new Map<string, number>();
  for (const household of householdCounts) {
    if (!household.householdName) {
      continue;
    }

    householdCountMap.set(
      buildHouseholdKey(household.side, household.householdName),
      household._count._all,
    );
  }

  const householdTokenMap = new Map<string, string>();
  for (const guest of householdTokens) {
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
  const where = buildGuestWhereClause(filters);
  const totalGuests = await prisma.guest.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalGuests / PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  const skip = (page - 1) * PAGE_SIZE;
  const orderBy = buildGuestOrderBy(filters.sortBy, filters.sortDirection);

  const [guests, sideCounts] = await Promise.all([
    prisma.guest.findMany({
      where,
      orderBy,
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        fullName: true,
        side: true,
        groupType: true,
        relation: true,
        guestType: true,
        householdName: true,
        phone: true,
        email: true,
        invitation: {
          select: {
            inviteStatus: true,
            rsvpStatus: true,
            plusOneAllowed: true,
            inviteToken: true,
          },
        },
      },
    }),
    prisma.guest.groupBy({
      by: ["side"],
      where,
      _count: {
        _all: true,
      },
    }),
  ]);

  const householdNames = Array.from(
    new Set(
      guests
        .map((guest) => guest.householdName?.trim())
        .filter((householdName): householdName is string => Boolean(householdName)),
    ),
  );

  const { householdCountMap, householdTokenMap } =
    await getHouseholdInviteMaps(householdNames);

  const guestsWithInviteMetadata: GuestListItem[] = guests.map((guest) => {
    const householdGuestCount = guest.householdName
      ? householdCountMap.get(buildHouseholdKey(guest.side, guest.householdName)) ?? 1
      : 1;
    const inviteKind: InviteKind =
      householdGuestCount > 1 ? "HOUSEHOLD" : "INDIVIDUAL";
    const invitation = guest.invitation
      ? {
          ...guest.invitation,
          inviteCode: buildInviteCodeFromToken(
            guest.householdName
              ? householdTokenMap.get(buildHouseholdKey(guest.side, guest.householdName)) ??
                  guest.invitation.inviteToken
              : guest.invitation.inviteToken,
          ),
          inviteKind,
          householdGuestCount,
          inviteToken: guest.householdName
            ? householdTokenMap.get(buildHouseholdKey(guest.side, guest.householdName)) ??
              guest.invitation.inviteToken
            : guest.invitation.inviteToken,
        }
      : null;

    return {
      ...guest,
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
    sideTotals: toSideTotals(sideCounts),
  };
}

export async function getHouseholdOptions(
  excludeGuestId?: string,
): Promise<HouseholdOption[]> {
  const households = await prisma.guest.groupBy({
    by: ["side", "householdName"],
    where: {
      householdName: {
        not: null,
      },
      ...(excludeGuestId
        ? {
            id: {
              not: excludeGuestId,
            },
          }
        : {}),
    },
    _count: {
      _all: true,
    },
    orderBy: [{ side: "asc" }, { householdName: "asc" }],
  });

  return households
    .filter(
      (household): household is typeof household & { householdName: string } =>
        Boolean(household.householdName?.trim()),
    )
    .map((household) => ({
      householdName: household.householdName,
      side: household.side,
      linkedGuestCount: household._count._all,
    }));
}

export async function getGuestForEdit(
  guestId: string,
): Promise<GuestFormRecord | null> {
  return prisma.guest.findUnique({
    where: {
      id: guestId,
    },
    select: {
      id: true,
      fullName: true,
      side: true,
      groupType: true,
      relation: true,
      guestType: true,
      householdName: true,
      phone: true,
      email: true,
      notes: true,
      invitation: {
        select: {
          inviteStatus: true,
          rsvpStatus: true,
          plusOneAllowed: true,
          plusOneName: true,
          dietaryRequirements: true,
          inviteToken: true,
        },
      },
    },
  });
}
