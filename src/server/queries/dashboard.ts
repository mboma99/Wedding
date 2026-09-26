import {
  GroupType,
  GuestSide,
  InviteStatus,
  RsvpStatus,
} from "@/domain/enums";

import type {
  DashboardBreakdownItem,
  DashboardHouseholdFilter,
  DashboardSummary,
} from "@/features/dashboard/types";
import type { GuestRecord } from "@/server/db/guest-doc";
import { getAllGuestRecords } from "@/server/guest-cache";

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

function countBy<T extends string>(
  guests: readonly GuestRecord[],
  getKey: (guest: GuestRecord) => T | null,
) {
  const counts = new Map<T, number>();

  for (const guest of guests) {
    const key = getKey(guest);

    if (key === null) {
      continue;
    }

    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
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

function matchesHouseholdFilter(
  guest: GuestRecord,
  householdFilter: DashboardHouseholdFilter | null,
) {
  if (!householdFilter) {
    return true;
  }

  return (
    guest.side === householdFilter.side &&
    guest.householdName === householdFilter.householdName
  );
}

export async function getDashboardSummary(
  householdFilter: DashboardHouseholdFilter | null = null,
): Promise<DashboardSummary> {
  const guests = (await getAllGuestRecords()).filter((guest) =>
    matchesHouseholdFilter(guest, householdFilter),
  );

  // The invitation counts only ever covered guests that have an invitation.
  const invitedGuests = guests.filter((guest) => guest.invitation);

  const totalGuests = guests.length;
  const sideBreakdown = buildBreakdown(
    sideOrder,
    sideMeta,
    countBy(guests, (guest) => guest.side),
  );
  const groupBreakdown = buildBreakdown(
    groupOrder,
    groupMeta,
    countBy(guests, (guest) => guest.groupType),
  );
  const rsvpBreakdown = buildBreakdown(
    rsvpOrder,
    rsvpMeta,
    countBy(invitedGuests, (guest) => guest.invitation?.rsvpStatus ?? null),
  );
  const inviteBreakdown = buildBreakdown(
    inviteOrder,
    inviteMeta,
    countBy(invitedGuests, (guest) => guest.invitation?.inviteStatus ?? null),
  );

  const attending = getCount(rsvpBreakdown, RsvpStatus.ATTENDING);
  const pending = getCount(rsvpBreakdown, RsvpStatus.PENDING);
  const declined = getCount(rsvpBreakdown, RsvpStatus.DECLINED);
  const responsesReceived = attending + declined;
  const households = new Set(
    guests.map((guest) => guest.householdName?.trim() || guest.id),
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
