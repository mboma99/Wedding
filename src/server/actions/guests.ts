"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import {
  guestFormSchema,
  normalizeGuestFormValues,
  parseDietaryRequirements,
  type GuestFormValues,
} from "@/features/guests/form-schema";
import { prisma } from "@/server/db/prisma";
import { requireAdminSession } from "@/server/auth/admin";

type GuestFormActionResult =
  | {
      success: true;
      guestId: string;
    }
  | {
      success: false;
      message: string;
    };

type DeleteGuestActionResult =
  | {
      success: true;
    }
  | {
      success: false;
      message: string;
    };

function buildGuestPayload(values: GuestFormValues) {
  const normalized = normalizeGuestFormValues(values);
  const dietaryRequirements = parseDietaryRequirements(
    normalized.dietaryRequirements,
  );

  return {
    fullName: normalized.fullName,
    side: normalized.side,
    groupType: normalized.groupType,
    relation: normalized.relation,
    guestType: normalized.guestType,
    householdName: normalized.householdName || null,
    phone: normalized.phone || null,
    email: normalized.email || null,
    notes: normalized.notes || null,
    invitation: {
      inviteStatus: normalized.inviteStatus,
      rsvpStatus: normalized.rsvpStatus,
      plusOneAllowed: normalized.plusOneAllowed,
      plusOneName:
        normalized.plusOneAllowed && normalized.plusOneName
          ? normalized.plusOneName
          : null,
      dietaryRequirements,
    },
  };
}

function buildValidationError(
  message = "Please correct the form values and try again.",
): GuestFormActionResult {
  return {
    success: false,
    message,
  };
}

function revalidateGuestPaths(guestId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/guests");
  revalidatePath("/admin/guests/new");
  revalidatePath(`/admin/guests/${guestId}/edit`);
}

function buildDeleteFailure(
  message = "Guest deletion failed. Please try again.",
): DeleteGuestActionResult {
  return {
    success: false,
    message,
  };
}

export async function createGuestAction(
  values: GuestFormValues,
): Promise<GuestFormActionResult> {
  await requireAdminSession();
  const parsed = guestFormSchema.safeParse(values);

  if (!parsed.success) {
    return buildValidationError();
  }

  const payload = buildGuestPayload(parsed.data);

  try {
    const guest = await prisma.guest.create({
      data: {
        fullName: payload.fullName,
        side: payload.side,
        groupType: payload.groupType,
        relation: payload.relation,
        guestType: payload.guestType,
        householdName: payload.householdName,
        phone: payload.phone,
        email: payload.email,
        notes: payload.notes,
        invitation: {
          create: payload.invitation,
        },
      },
      select: {
        id: true,
      },
    });

    revalidateGuestPaths(guest.id);

    return {
      success: true,
      guestId: guest.id,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return buildValidationError(
        "A guest with this email address already exists.",
      );
    }

    return buildValidationError("Guest creation failed. Please try again.");
  }
}

export async function updateGuestAction(
  guestId: string,
  values: GuestFormValues,
): Promise<GuestFormActionResult> {
  await requireAdminSession();
  const parsed = guestFormSchema.safeParse(values);

  if (!parsed.success) {
    return buildValidationError();
  }

  const payload = buildGuestPayload(parsed.data);

  try {
    const guest = await prisma.guest.update({
      where: {
        id: guestId,
      },
      data: {
        fullName: payload.fullName,
        side: payload.side,
        groupType: payload.groupType,
        relation: payload.relation,
        guestType: payload.guestType,
        householdName: payload.householdName,
        phone: payload.phone,
        email: payload.email,
        notes: payload.notes,
        invitation: {
          upsert: {
            create: payload.invitation,
            update: payload.invitation,
          },
        },
      },
      select: {
        id: true,
      },
    });

    revalidateGuestPaths(guest.id);

    return {
      success: true,
      guestId: guest.id,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return buildValidationError(
        "Another guest already uses this email address.",
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return buildValidationError("This guest record no longer exists.");
    }

    return buildValidationError("Guest update failed. Please try again.");
  }
}

export async function deleteGuestAction(
  guestId: string,
): Promise<DeleteGuestActionResult> {
  await requireAdminSession();
  try {
    const guest = await prisma.guest.findUnique({
      where: {
        id: guestId,
      },
      select: {
        id: true,
        householdName: true,
        side: true,
        invitation: {
          select: {
            inviteToken: true,
          },
        },
      },
    });

    if (!guest) {
      return buildDeleteFailure("This guest record no longer exists.");
    }

    const relatedHouseholdGuests = guest.householdName
      ? await prisma.guest.findMany({
          where: {
            id: {
              not: guest.id,
            },
            householdName: guest.householdName,
            side: guest.side,
          },
          select: {
            id: true,
            invitation: {
              select: {
                inviteToken: true,
              },
            },
          },
        })
      : [];

    await prisma.guest.delete({
      where: {
        id: guest.id,
      },
    });

    revalidateGuestPaths(guest.id);

    if (guest.invitation?.inviteToken) {
      revalidatePath(`/rsvp/${guest.invitation.inviteToken}`);
    }

    for (const householdGuest of relatedHouseholdGuests) {
      revalidatePath(`/admin/guests/${householdGuest.id}/edit`);

      if (householdGuest.invitation?.inviteToken) {
        revalidatePath(`/rsvp/${householdGuest.invitation.inviteToken}`);
      }
    }

    return {
      success: true,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return buildDeleteFailure("This guest record no longer exists.");
    }

    return buildDeleteFailure();
  }
}
