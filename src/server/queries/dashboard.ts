import { GroupType, GuestSide, InviteStatus, RsvpStatus } from "@prisma/client";

import type {
  DashboardBreakdownItem,
  DashboardSummary,
} from "@/features/dashboard/types";
import { prisma } from "@/server/db/prisma";

const sideOrder = [GuestSide.JAMES, GuestSide.LISA] as const;
const groupOrder = [
  GroupType.FAMILY,
  GroupType.FRIEND,
  GroupType.FAMILY_FRIEND,
  GroupType.OTHER,
] as const;
const rsvpOrder = [
  RsvpStatus.PENDING,
  RsvpStatus.ATTENDING,
  RsvpStatus.DECLINED,
] as const;
const inviteOrder = [
  InviteStatus.NOT_SENT,
  InviteStatus.SENT,
  InviteStatus.DELIVERED,
] as const;

const sideMeta = {
  [GuestSide.JAMES]: { label: "James side", color: "#3b82f6" },
  [GuestSide.LISA]: { label: "Lisa side", color: "#ec4899" },
} satisfies Record<GuestSide, { label: string; color: string }>;

const groupMeta = {
  [GroupType.FAMILY]: { label: "Family", color: "#8b5cf6" },
  [GroupType.FRIEND]: { label: "Friend", color: "#06b6d4" },
  [GroupType.FAMILY_FRIEND]: { label: "Family friend", color: "#f59e0b" },
  [GroupType.OTHER]: { label: "Other", color: "#64748b" },
} satisfies Record<GroupType, { label: string; color: string }>;

const rsvpMeta = {
  [RsvpStatus.PENDING]: { label: "Pending", color: "#f59e0b" },
  [RsvpStatus.ATTENDING]: { label: "Attending", color: "#22c55e" },
  [RsvpStatus.DECLINED]: { label: "Declined", color: "#f43f5e" },
} satisfies Record<RsvpStatus, { label: string; color: string }>;

const inviteMeta = {
  [InviteStatus.NOT_SENT]: { label: "Not sent", color: "#94a3b8" },
  [InviteStatus.SENT]: { label: "Sent", color: "#3b82f6" },
  [InviteStatus.DELIVERED]: { label: "Delivered", color: "#10b981" },
} satisfies Record<InviteStatus, { label: string; color: string }>;

function toCountMap<T extends string>(
  entries: ReadonlyArray<{ key: T; count: number }>,
) {
  return new Map<T, number>(entries.map((entry) => [entry.key, entry.count]));
}

function buildBreakdown<T extends string>(
  order: readonly T[],
  meta: Record<T, { label: string; color: string }>,
  counts: Map<T, number>,
): DashboardBreakdownItem[] {
  return order.map((key) => ({
    key,
    label: meta[key].label,
    count: counts.get(key) ?? 0,
    color: meta[key].color,
  }));
}

function getCount(items: DashboardBreakdownItem[], key: string) {
  return items.find((item) => item.key === key)?.count ?? 0;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [
    totalGuests,
    householdGuests,
    sideCounts,
    groupCounts,
    rsvpCounts,
    inviteCounts,
  ] = await Promise.all([
    prisma.guest.count(),
    prisma.guest.findMany({
      select: {
        id: true,
        householdName: true,
      },
    }),
    prisma.guest.groupBy({
      by: ["side"],
      _count: {
        _all: true,
      },
    }),
    prisma.guest.groupBy({
      by: ["groupType"],
      _count: {
        _all: true,
      },
    }),
    prisma.invitation.groupBy({
      by: ["rsvpStatus"],
      _count: {
        _all: true,
      },
    }),
    prisma.invitation.groupBy({
      by: ["inviteStatus"],
      _count: {
        _all: true,
      },
    }),
  ]);

  const sideBreakdown = buildBreakdown(
    sideOrder,
    sideMeta,
    toCountMap(sideCounts.map((item) => ({ key: item.side, count: item._count._all }))),
  );
  const groupBreakdown = buildBreakdown(
    groupOrder,
    groupMeta,
    toCountMap(
      groupCounts.map((item) => ({
        key: item.groupType,
        count: item._count._all,
      })),
    ),
  );
  const rsvpBreakdown = buildBreakdown(
    rsvpOrder,
    rsvpMeta,
    toCountMap(
      rsvpCounts.map((item) => ({
        key: item.rsvpStatus,
        count: item._count._all,
      })),
    ),
  );
  const inviteBreakdown = buildBreakdown(
    inviteOrder,
    inviteMeta,
    toCountMap(
      inviteCounts.map((item) => ({
        key: item.inviteStatus,
        count: item._count._all,
      })),
    ),
  );

  const attending = getCount(rsvpBreakdown, RsvpStatus.ATTENDING);
  const pending = getCount(rsvpBreakdown, RsvpStatus.PENDING);
  const declined = getCount(rsvpBreakdown, RsvpStatus.DECLINED);
  const responsesReceived = attending + declined;
  const households = new Set(
    householdGuests.map((guest) => guest.householdName?.trim() || guest.id),
  ).size;
  const invitationsOut =
    getCount(inviteBreakdown, InviteStatus.SENT) +
    getCount(inviteBreakdown, InviteStatus.DELIVERED);
  const deliveredInvitations = getCount(inviteBreakdown, InviteStatus.DELIVERED);

  return {
    totals: {
      totalGuests,
      households,
      attending,
      pending,
      declined,
      invitationsOut,
      deliveredInvitations,
      responsesReceived,
      responseRate:
        totalGuests === 0 ? 0 : Math.round((responsesReceived / totalGuests) * 100),
      attendanceRate:
        totalGuests === 0 ? 0 : Math.round((attending / totalGuests) * 100),
    },
    sideBreakdown,
    groupBreakdown,
    rsvpBreakdown,
    inviteBreakdown,
  };
}
