import {
  GroupType,
  GuestSide,
  GuestType,
  InviteStatus,
  RsvpStatus,
} from "@/domain/enums";
import { z } from "zod";

import type { GuestFormRecord } from "@/features/guests/types";

const phonePattern = /^[+0-9()\-\s]{7,32}$/;

function normalizeHouseholdName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export const guestFormSchema = z
  .object({
    fullName: z.string().trim().min(2, "Full name is required.").max(160),
    side: z.nativeEnum(GuestSide),
    groupType: z.nativeEnum(GroupType),
    relation: z.string().trim().min(2, "Relation is required.").max(100),
    guestType: z.nativeEnum(GuestType),
    householdName: z.string().trim().max(120).optional().default(""),
    phone: z
      .string()
      .trim()
      .max(32)
      .refine((value) => !value || phonePattern.test(value), {
        message: "Use a valid phone number format.",
      }),
    email: z
      .string()
      .trim()
      .max(320)
      .refine(
        (value) => !value || z.string().email().safeParse(value).success,
        {
          message: "Use a valid email address.",
        },
      ),
    notes: z.string().trim().max(1000).optional().default(""),
    inviteStatus: z.nativeEnum(InviteStatus),
    rsvpStatus: z.nativeEnum(RsvpStatus),
    plusOneAllowed: z.boolean().default(false),
    plusOneName: z.string().trim().max(160).optional().default(""),
    dietaryRequirements: z.string().trim().max(500).optional().default(""),
  });

export type GuestFormValues = z.infer<typeof guestFormSchema>;

export type GuestFormInitialValues = GuestFormValues;

export function getEmptyGuestFormValues(): GuestFormInitialValues {
  return {
    fullName: "",
    side: GuestSide.JAMES,
    groupType: GroupType.FAMILY,
    relation: "",
    guestType: GuestType.ADULT,
    householdName: "",
    phone: "",
    email: "",
    notes: "",
    inviteStatus: InviteStatus.NOT_SENT,
    rsvpStatus: RsvpStatus.PENDING,
    plusOneAllowed: false,
    plusOneName: "",
    dietaryRequirements: "",
  };
}

export function formatDietaryRequirements(
  dietaryRequirements: string[] | null | undefined,
) {
  return dietaryRequirements?.join(", ") ?? "";
}

export function getGuestFormInitialValues(
  guest: GuestFormRecord,
): GuestFormInitialValues {
  return {
    fullName: guest.fullName,
    side: guest.side,
    groupType: guest.groupType,
    relation: guest.relation,
    guestType: guest.guestType,
    householdName: guest.householdName ?? "",
    phone: guest.phone ?? "",
    email: guest.email ?? "",
    notes: guest.notes ?? "",
    inviteStatus: guest.invitation?.inviteStatus ?? InviteStatus.NOT_SENT,
    rsvpStatus: guest.invitation?.rsvpStatus ?? RsvpStatus.PENDING,
    plusOneAllowed: guest.invitation?.plusOneAllowed ?? false,
    plusOneName: guest.invitation?.plusOneName ?? "",
    dietaryRequirements: formatDietaryRequirements(
      guest.invitation?.dietaryRequirements,
    ),
  };
}

export function parseDietaryRequirements(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

export function normalizeGuestFormValues(
  values: GuestFormValues,
): GuestFormValues {
  return {
    ...values,
    fullName: values.fullName.trim(),
    relation: values.relation.trim(),
    householdName: normalizeHouseholdName(values.householdName),
    phone: values.phone.trim(),
    email: values.email.trim().toLowerCase(),
    notes: values.notes.trim(),
    plusOneName: values.plusOneAllowed ? values.plusOneName.trim() : "",
    dietaryRequirements: values.dietaryRequirements.trim(),
  };
}
