export const GuestSide = {
  JAMES: "JAMES",
  LISA: "LISA",
} as const;

export const GroupType = {
  FAMILY: "FAMILY",
  FRIEND: "FRIEND",
  FAMILY_FRIEND: "FAMILY_FRIEND",
  OTHER: "OTHER",
} as const;

export const GuestType = {
  ADULT: "ADULT",
  CHILD: "CHILD",
  ELDER: "ELDER",
} as const;

export const InviteStatus = {
  NOT_SENT: "NOT_SENT",
  SENT: "SENT",
  DELIVERED: "DELIVERED",
} as const;

export const RsvpStatus = {
  PENDING: "PENDING",
  ATTENDING: "ATTENDING",
  DECLINED: "DECLINED",
} as const;

export type GuestSide = (typeof GuestSide)[keyof typeof GuestSide];
export type GroupType = (typeof GroupType)[keyof typeof GroupType];
export type GuestType = (typeof GuestType)[keyof typeof GuestType];
export type InviteStatus = (typeof InviteStatus)[keyof typeof InviteStatus];
export type RsvpStatus = (typeof RsvpStatus)[keyof typeof RsvpStatus];

/**
 * Declaration order matters: Postgres sorted enum columns by the order the
 * values were declared, not alphabetically. The in-memory sorts rank by these
 * arrays so the guest list keeps the ordering it had on Prisma.
 */
export const guestSideOrder = [GuestSide.JAMES, GuestSide.LISA] as const;
export const groupTypeOrder = [
  GroupType.FAMILY,
  GroupType.FRIEND,
  GroupType.FAMILY_FRIEND,
  GroupType.OTHER,
] as const;
export const guestTypeOrder = [
  GuestType.ADULT,
  GuestType.CHILD,
  GuestType.ELDER,
] as const;
export const inviteStatusOrder = [
  InviteStatus.NOT_SENT,
  InviteStatus.SENT,
  InviteStatus.DELIVERED,
] as const;
export const rsvpStatusOrder = [
  RsvpStatus.PENDING,
  RsvpStatus.ATTENDING,
  RsvpStatus.DECLINED,
] as const;

export function enumRank<T extends string>(order: readonly T[], value: T) {
  const index = order.indexOf(value);

  return index === -1 ? order.length : index;
}
