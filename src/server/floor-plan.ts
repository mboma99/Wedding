import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

import {
  CORNERS,
  defaultFloorPlan,
  ITEM_TYPES,
  upgradeFloorPlan,
  type FloorPlan,
} from "@/domain/floor-plan";
import { RsvpStatus } from "@/domain/enums";
import type { SeatingGuest } from "@/domain/floor-plan";
import { getDb, guestsCollection } from "@/server/db/firestore";
import { toGuestRecords } from "@/server/db/guest-doc";
import type { MutationResult } from "@/server/vendors";

export const FLOOR_PLAN_DOC = "meta/floorPlan";

// Firestore rejects NaN and Infinity, and a stray drag can produce either.
const cm = z.number().finite().min(-5000).max(10000);
const size = z.number().finite().min(1).max(5000);

const itemSchema = z.object({
  id: z.string().min(1).max(60),
  type: z.enum(ITEM_TYPES),
  label: z.string().max(40),
  x: cm,
  y: cm,
  rot: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
  w: size.optional(),
  h: size.optional(),
  d: size.optional(),
  seats: z.number().int().min(0).max(30).optional(),
  corner: z.enum(CORNERS).optional(),
  lx: cm.optional(),
  ly: cm.optional(),
});

const planSchema = z.object({
  revision: z.number().int().min(1).max(1000).optional(),
  room: z.object({
    w: z.number().finite().min(400).max(5000),
    h: z.number().finite().min(400).max(5000),
  }),
  items: z.array(itemSchema).max(200),
  assignments: z.record(z.string().min(1).max(60), z.string().min(1).max(60)).default({}),
});

/** The saved plan, or the layout drawn from the venue sketch if none is saved yet. */
export async function getFloorPlan(): Promise<FloorPlan> {
  const snapshot = await getDb().doc(FLOOR_PLAN_DOC).get();
  const parsed = planSchema.safeParse(snapshot.data());

  return parsed.success ? upgradeFloorPlan(parsed.data) : defaultFloorPlan();
}

/**
 * Everyone on the guest list, for the seating chart. Declined guests stay in
 * so a table they were put at can show it; they don't count towards seats.
 */
export async function getSeatingGuests(): Promise<SeatingGuest[]> {
  const snapshot = await guestsCollection().get();

  return toGuestRecords(snapshot.docs)
    .map((guest) => ({
      id: guest.id,
      name: guest.fullName,
      side: guest.side,
      household: guest.householdName,
      declined: guest.invitation?.rsvpStatus === RsvpStatus.DECLINED,
      plusOne: Boolean(guest.invitation?.plusOneAllowed),
      plusOneName: guest.invitation?.plusOneName ?? null,
    }))
    .sort(
      (a, b) =>
        a.side.localeCompare(b.side) ||
        (a.household ?? "\uffff").localeCompare(b.household ?? "\uffff") ||
        a.name.localeCompare(b.name),
    );
}

export async function saveFloorPlan(plan: FloorPlan): Promise<MutationResult> {
  const parsed = planSchema.safeParse(plan);

  if (!parsed.success) {
    return { success: false, message: "The floor plan has a value that can't be saved." };
  }

  const ids = new Set(parsed.data.items.map((item) => item.id));
  if (ids.size !== parsed.data.items.length) {
    return { success: false, message: "Two items on the floor plan share an id." };
  }

  await getDb()
    .doc(FLOOR_PLAN_DOC)
    .set({ ...parsed.data, updatedAt: FieldValue.serverTimestamp() });

  return { success: true, message: "Floor plan saved." };
}
