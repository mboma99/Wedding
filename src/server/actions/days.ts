"use server";

import type { DayKey, WeddingDay } from "@/domain/days";
import { requireAdminSession } from "@/server/auth/admin";
import { saveWeddingDay, setLobolaInvited } from "@/server/days";
import type { MutationResult } from "@/server/vendors";

// No revalidatePath: the Days page already shows each change the moment it's
// made, and re-rendering it after every tick would re-read the whole guest
// list each time. The page is force-dynamic, so the next visit reads fresh.
async function run(work: () => Promise<MutationResult>): Promise<MutationResult> {
  await requireAdminSession();

  try {
    return await work();
  } catch {
    return { success: false, message: "That change could not be saved." };
  }
}

export async function saveWeddingDayAction(key: DayKey, day: WeddingDay) {
  return run(() => saveWeddingDay(key, day));
}

export async function setLobolaInvitedAction(guestIds: string[], invited: boolean) {
  return run(() => setLobolaInvited(guestIds, invited));
}
