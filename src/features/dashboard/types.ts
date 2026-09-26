import { GuestSide } from "@/domain/enums";
import { z } from "zod";

export type DashboardBreakdownItem = {
  key: string;
  label: string;
  count: number;
  color: string;
};

export type RawDashboardSearchParams = Record<
  string,
  string | string[] | undefined
>;

export type DashboardSearchParams = {
  household: string;
};

export type DashboardHouseholdFilter = {
  side: GuestSide;
  householdName: string;
};

export type DashboardSummary = {
  totals: {
    totalGuests: number;
    households: number;
    attending: number;
    pending: number;
    declined: number;
    invitationsOut: number;
    deliveredInvitations: number;
    responsesReceived: number;
    responseRate: number;
    attendanceRate: number;
  };
  sideBreakdown: DashboardBreakdownItem[];
  groupBreakdown: DashboardBreakdownItem[];
  rsvpBreakdown: DashboardBreakdownItem[];
  inviteBreakdown: DashboardBreakdownItem[];
};

const dashboardSearchParamsSchema = z.object({
  household: z.string().trim().max(200).optional().default(""),
});

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseDashboardSearchParams(
  searchParams: RawDashboardSearchParams,
): DashboardSearchParams {
  const parsed = dashboardSearchParamsSchema.safeParse({
    household: getSingleValue(searchParams.household),
  });

  if (!parsed.success) {
    return {
      household: "",
    };
  }

  return parsed.data;
}

export function parseDashboardHouseholdFilter(
  householdKey: string,
): DashboardHouseholdFilter | null {
  if (!householdKey) {
    return null;
  }

  const separatorIndex = householdKey.indexOf("::");

  if (separatorIndex === -1) {
    return null;
  }

  const side = householdKey.slice(0, separatorIndex);
  const householdName = householdKey.slice(separatorIndex + 2).trim();

  if (
    (side !== GuestSide.JAMES && side !== GuestSide.LISA) ||
    !householdName
  ) {
    return null;
  }

  return {
    side,
    householdName,
  };
}

export function buildDashboardHouseholdKey(household: {
  side: GuestSide;
  householdName: string;
}) {
  return `${household.side}::${household.householdName}`;
}
