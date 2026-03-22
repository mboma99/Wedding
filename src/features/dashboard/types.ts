export type DashboardBreakdownItem = {
  key: string;
  label: string;
  count: number;
  color: string;
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

