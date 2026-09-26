import { Timestamp, type DocumentSnapshot } from "firebase-admin/firestore";

import {
  GroupType,
  GuestSide,
  GuestType,
  InviteStatus,
  RsvpStatus,
} from "@/domain/enums";

/**
 * Guest and Invitation were a 1:1 pair that every read joined, so they live in
 * a single document here: the invitation is a nested map on the guest.
 */
export type InvitationDoc = {
  inviteStatus: InviteStatus;
  rsvpStatus: RsvpStatus;
  plusOneAllowed: boolean;
  plusOneName: string | null;
  dietaryRequirements: string[];
  inviteToken: string;
};

export type GuestDoc = {
  fullName: string;
  side: GuestSide;
  groupType: GroupType;
  relation: string;
  guestType: GuestType;
  householdName: string | null;
  notes: string | null;
  phone: string | null;
  email: string | null;
  invitation: InvitationDoc | null;
  /** Everyone is invited to the celebration; only a few also to the lobola. */
  lobolaInvited: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};

export type GuestRecord = Omit<GuestDoc, "createdAt" | "updatedAt"> & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

function toDate(value: unknown): Date {
  // A pending server timestamp reads back as null until the write lands.
  return value instanceof Timestamp ? value.toDate() : new Date(0);
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function toInvitation(value: unknown): InvitationDoc | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Partial<InvitationDoc>;

  if (!raw.inviteToken) {
    return null;
  }

  return {
    inviteStatus: raw.inviteStatus ?? InviteStatus.NOT_SENT,
    rsvpStatus: raw.rsvpStatus ?? RsvpStatus.PENDING,
    plusOneAllowed: Boolean(raw.plusOneAllowed),
    plusOneName: toStringOrNull(raw.plusOneName),
    dietaryRequirements: Array.isArray(raw.dietaryRequirements)
      ? raw.dietaryRequirements.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
    inviteToken: raw.inviteToken,
  };
}

export function toGuestRecord(snapshot: DocumentSnapshot): GuestRecord | null {
  const data = snapshot.data() as Partial<GuestDoc> | undefined;

  if (!data) {
    return null;
  }

  return {
    id: snapshot.id,
    fullName: data.fullName ?? "",
    side: data.side ?? GuestSide.JAMES,
    groupType: data.groupType ?? GroupType.OTHER,
    relation: data.relation ?? "",
    guestType: data.guestType ?? GuestType.ADULT,
    householdName: toStringOrNull(data.householdName),
    notes: toStringOrNull(data.notes),
    phone: toStringOrNull(data.phone),
    email: toStringOrNull(data.email),
    invitation: toInvitation(data.invitation),
    lobolaInvited: data.lobolaInvited === true,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export function toGuestRecords(
  snapshots: readonly DocumentSnapshot[],
): GuestRecord[] {
  return snapshots
    .map((snapshot) => toGuestRecord(snapshot))
    .filter((guest): guest is GuestRecord => guest !== null);
}
