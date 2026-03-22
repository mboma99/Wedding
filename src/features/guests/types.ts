import {
  GroupType,
  GuestSide,
  GuestType,
  InviteStatus,
  RsvpStatus,
} from "@prisma/client";
import { z } from "zod";

export const guestSideOptions = [GuestSide.JAMES, GuestSide.LISA] as const;
export const groupTypeOptions = [
  GroupType.FAMILY,
  GroupType.FRIEND,
  GroupType.FAMILY_FRIEND,
  GroupType.OTHER,
] as const;
export const guestTypeOptions = [
  GuestType.ADULT,
  GuestType.CHILD,
  GuestType.ELDER,
] as const;
export const inviteStatusOptions = [
  InviteStatus.NOT_SENT,
  InviteStatus.SENT,
  InviteStatus.DELIVERED,
] as const;
export const rsvpStatusOptions = [
  RsvpStatus.PENDING,
  RsvpStatus.ATTENDING,
  RsvpStatus.DECLINED,
] as const;
export const guestSortFieldOptions = [
  "fullName",
  "side",
  "groupType",
  "inviteStatus",
  "rsvpStatus",
] as const;
export const sortDirectionOptions = ["asc", "desc"] as const;

export type GuestSortField = (typeof guestSortFieldOptions)[number];
export type SortDirection = (typeof sortDirectionOptions)[number];
export type InviteKind = "HOUSEHOLD" | "INDIVIDUAL";

export const sideLabels: Record<GuestSide, string> = {
  [GuestSide.JAMES]: "James side",
  [GuestSide.LISA]: "Lisa side",
};

export const groupTypeLabels: Record<GroupType, string> = {
  [GroupType.FAMILY]: "Family",
  [GroupType.FRIEND]: "Friend",
  [GroupType.FAMILY_FRIEND]: "Family friend",
  [GroupType.OTHER]: "Other",
};

export const guestTypeLabels: Record<GuestType, string> = {
  [GuestType.ADULT]: "Adult",
  [GuestType.CHILD]: "Child",
  [GuestType.ELDER]: "Teenager",
};

export const inviteStatusLabels: Record<InviteStatus, string> = {
  [InviteStatus.NOT_SENT]: "Not sent",
  [InviteStatus.SENT]: "Sent",
  [InviteStatus.DELIVERED]: "Delivered",
};

export const rsvpStatusLabels: Record<RsvpStatus, string> = {
  [RsvpStatus.PENDING]: "Pending",
  [RsvpStatus.ATTENDING]: "Attending",
  [RsvpStatus.DECLINED]: "Declined",
};

export const guestSortFieldLabels: Record<GuestSortField, string> = {
  fullName: "Full name",
  side: "Side",
  groupType: "Group type",
  inviteStatus: "Invitation status",
  rsvpStatus: "RSVP status",
};

export type RawGuestListSearchParams = Record<
  string,
  string | string[] | undefined
>;

export type GuestListSearchParams = {
  q: string;
  side?: GuestSide;
  groupType?: GroupType;
  inviteStatus?: InviteStatus;
  rsvpStatus?: RsvpStatus;
  sortBy: GuestSortField;
  sortDirection: SortDirection;
  page: number;
};

export type GuestListItem = {
  id: string;
  fullName: string;
  side: GuestSide;
  groupType: GroupType;
  relation: string;
  guestType: GuestType;
  householdName: string | null;
  phone: string | null;
  email: string | null;
  invitation: {
    inviteStatus: InviteStatus;
    rsvpStatus: RsvpStatus;
    plusOneAllowed: boolean;
    inviteToken: string;
    inviteCode: string;
    inviteKind: InviteKind;
    householdGuestCount: number;
  } | null;
};

export type GuestListResult = {
  guests: GuestListItem[];
  totalGuests: number;
  page: number;
  pageSize: number;
  totalPages: number;
  pageStart: number;
  pageEnd: number;
  sideTotals: Record<GuestSide, number>;
};

export type GuestFormRecord = {
  id: string;
  fullName: string;
  side: GuestSide;
  groupType: GroupType;
  relation: string;
  guestType: GuestType;
  householdName: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  invitation: {
    inviteStatus: InviteStatus;
    rsvpStatus: RsvpStatus;
    plusOneAllowed: boolean;
    plusOneName: string | null;
    dietaryRequirements: string[];
    inviteToken: string;
  } | null;
};

export type HouseholdOption = {
  householdName: string;
  side: GuestSide;
  linkedGuestCount: number;
};

const guestListSearchParamsSchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  side: z.nativeEnum(GuestSide).optional(),
  groupType: z.nativeEnum(GroupType).optional(),
  inviteStatus: z.nativeEnum(InviteStatus).optional(),
  rsvpStatus: z.nativeEnum(RsvpStatus).optional(),
  sortBy: z.enum(guestSortFieldOptions).optional().default("fullName"),
  sortDirection: z.enum(sortDirectionOptions).optional().default("asc"),
  page: z.coerce.number().int().min(1).optional().default(1),
});

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseGuestListSearchParams(
  searchParams: RawGuestListSearchParams,
): GuestListSearchParams {
  const normalized = {
    q: getSingleValue(searchParams.q),
    side: getSingleValue(searchParams.side),
    groupType: getSingleValue(searchParams.groupType),
    inviteStatus: getSingleValue(searchParams.inviteStatus),
    rsvpStatus: getSingleValue(searchParams.rsvpStatus),
    sortBy: getSingleValue(searchParams.sortBy),
    sortDirection: getSingleValue(searchParams.sortDirection),
    page: getSingleValue(searchParams.page),
  };

  const parsed = guestListSearchParamsSchema.safeParse(normalized);

  if (!parsed.success) {
    return {
      q: "",
      sortBy: "fullName",
      sortDirection: "asc",
      page: 1,
    };
  }

  return parsed.data;
}

export function buildGuestListHref(
  params: GuestListSearchParams,
  overrides: Partial<GuestListSearchParams> = {},
) {
  const nextParams = {
    ...params,
    ...overrides,
  };
  const query = new URLSearchParams();

  if (nextParams.q) {
    query.set("q", nextParams.q);
  }

  if (nextParams.side) {
    query.set("side", nextParams.side);
  }

  if (nextParams.groupType) {
    query.set("groupType", nextParams.groupType);
  }

  if (nextParams.inviteStatus) {
    query.set("inviteStatus", nextParams.inviteStatus);
  }

  if (nextParams.rsvpStatus) {
    query.set("rsvpStatus", nextParams.rsvpStatus);
  }

  if (nextParams.sortBy !== "fullName") {
    query.set("sortBy", nextParams.sortBy);
  }

  if (nextParams.sortDirection !== "asc") {
    query.set("sortDirection", nextParams.sortDirection);
  }

  if (nextParams.page > 1) {
    query.set("page", String(nextParams.page));
  }

  const queryString = query.toString();

  return queryString ? `/admin/guests?${queryString}` : "/admin/guests";
}
