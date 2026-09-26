import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

import { RsvpStatus } from "@/domain/enums";
import {
  DAY_BLURBS,
  DAY_KEYS,
  DAY_NAMES,
  defaultWeddingDays,
  emptyDay,
  mapLink,
  type DayKey,
  type GuestDayView,
  type WeddingDay,
  type WeddingDays,
} from "@/domain/days";
import type { PublicInvitationRecord } from "@/features/rsvp/types";
import { getDb, guestsCollection } from "@/server/db/firestore";
import type { MutationResult } from "@/server/vendors";
import { getAllGuestRecords, guestsChanged } from "@/server/guest-cache";

export const WEDDING_DAYS_DOC = "meta/days";

const text = (max: number) => z.string().trim().max(max);

const daySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a full date.")
    .nullable(),
  startTime: text(20),
  venueName: text(120),
  address: text(300),
  // Only https links, so a pasted "javascript:" link can't run code when a guest taps it.
  mapUrl: z.union([
    z.literal(""),
    z.string().trim().max(500).url("Paste a full link, starting with https://").startsWith("https://", "Paste a full link, starting with https://"),
  ]),
  revealDate: z.boolean(),
  revealLocation: z.boolean(),
  schedule: z
    .array(z.object({ id: z.string().min(1).max(60), time: text(20), title: text(120) }))
    .max(40),
});

export async function getWeddingDays(): Promise<WeddingDays> {
  const snapshot = await getDb().doc(WEDDING_DAYS_DOC).get();
  const data = snapshot.data() ?? {};
  const days = defaultWeddingDays();

  for (const key of DAY_KEYS) {
    const parsed = daySchema.safeParse({ ...emptyDay(), ...(data[key] ?? {}) });
    if (parsed.success) days[key] = parsed.data;
  }

  return days;
}

export async function saveWeddingDay(key: DayKey, day: WeddingDay): Promise<MutationResult> {
  if (!DAY_KEYS.includes(key)) {
    return { success: false, message: "That day doesn't exist." };
  }

  const parsed = daySchema.safeParse(day);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Check the details and try again." };
  }

  const schedule = parsed.data.schedule.filter((item) => item.title || item.time);

  await getDb()
    .doc(WEDDING_DAYS_DOC)
    .set({ [key]: { ...parsed.data, schedule }, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

  return { success: true, message: `${DAY_NAMES[key]} saved.` };
}

export type LobolaGuest = {
  id: string;
  name: string;
  side: "JAMES" | "LISA";
  household: string | null;
  invited: boolean;
};

/** Everyone on the list, for picking who comes to the lobola. */
export async function getLobolaGuests(): Promise<LobolaGuest[]> {
  return (await getAllGuestRecords())
    .map((guest) => ({
      id: guest.id,
      name: guest.fullName,
      side: guest.side,
      household: guest.householdName,
      invited: guest.lobolaInvited,
    }))
    .sort(
      (a, b) =>
        a.side.localeCompare(b.side) ||
        (a.household ?? "￿").localeCompare(b.household ?? "￿") ||
        a.name.localeCompare(b.name),
    );
}

export async function setLobolaInvited(guestIds: string[], invited: boolean): Promise<MutationResult> {
  const ids = [...new Set(guestIds)].filter((id) => typeof id === "string" && id.length > 0 && id.length < 200);
  if (!ids.length || ids.length > 500) {
    return { success: false, message: "Choose at least one guest." };
  }

  const batch = getDb().batch();
  for (const id of ids) {
    batch.update(guestsCollection().doc(id), {
      lobolaInvited: invited,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  guestsChanged();

  return { success: true, message: invited ? "Added to the Rora." : "Removed from the Rora." };
}

/**
 * The days one invitation can see. Date, location and plan are left out
 * entirely unless the day is revealed and someone invited to it said yes, so
 * nothing hidden is ever sent to the guest's browser.
 */
export function buildGuestDays(invitation: PublicInvitationRecord, days: WeddingDays): GuestDayView[] {
  const views: GuestDayView[] = [];

  for (const key of DAY_KEYS) {
    const invited = invitation.guests.filter((guest) => key === "celebration" || guest.lobolaInvited);
    if (!invited.length) continue;

    const day = days[key];
    const attending = invited.some((guest) => guest.invitation.rsvpStatus === RsvpStatus.ATTENDING);
    const showDate = attending && day.revealDate && Boolean(day.date);
    const showLocation = attending && day.revealLocation && Boolean(day.venueName || day.address);

    views.push({
      key,
      name: DAY_NAMES[key],
      blurb: DAY_BLURBS[key],
      invitedNames: invited.map((guest) => guest.fullName),
      attending,
      date: showDate ? day.date : null,
      startTime: showDate ? day.startTime : "",
      location: showLocation
        ? { venueName: day.venueName, address: day.address, mapUrl: mapLink(day) }
        : null,
      // The plan carries times, so it follows the date.
      schedule: showDate ? day.schedule : [],
    });
  }

  return views;
}
