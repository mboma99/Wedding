import { GroupType, GuestSide, GuestType, InviteStatus, RsvpStatus } from "@/domain/enums";

import { Badge } from "@/components/ui/badge";
import {
  groupTypeLabels,
  guestTypeLabels,
  inviteStatusLabels,
  rsvpStatusLabels,
} from "@/features/guests/types";

export function SideBadge({ side }: { side: GuestSide }) {
  return (
    <Badge variant={side === GuestSide.JAMES ? "james" : "lisa"}>{side === GuestSide.JAMES ? "James" : "Lisa"}</Badge>
  );
}

export function GroupTypeBadge({ groupType }: { groupType: GroupType }) {
  return <Badge variant="outline">{groupTypeLabels[groupType]}</Badge>;
}

export function GuestTypeBadge({ guestType }: { guestType: GuestType }) {
  return <Badge variant="outline">{guestTypeLabels[guestType]}</Badge>;
}

export function InviteStatusBadge({
  status,
}: {
  status: InviteStatus;
}) {
  const variant =
    status === InviteStatus.DELIVERED
      ? "success"
      : status === InviteStatus.SENT
        ? "james"
        : "outline";

  return <Badge variant={variant}>{inviteStatusLabels[status]}</Badge>;
}

export function RsvpStatusBadge({ status }: { status: RsvpStatus }) {
  const variant =
    status === RsvpStatus.ATTENDING
      ? "success"
      : status === RsvpStatus.DECLINED
        ? "danger"
        : "warning";

  return <Badge variant={variant}>{rsvpStatusLabels[status]}</Badge>;
}

