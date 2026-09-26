"use server";

import type { FloorPlan } from "@/domain/floor-plan";
import { requireAdminSession } from "@/server/auth/admin";
import { saveFloorPlan } from "@/server/floor-plan";
import type { MutationResult } from "@/server/vendors";

// No revalidatePath: the editor already shows what it saved, and a refresh
// mid-drag would reset the plan under the pointer. The page is force-dynamic,
// so the next visit reads the saved plan.
export async function saveFloorPlanAction(plan: FloorPlan): Promise<MutationResult> {
  await requireAdminSession();

  try {
    return await saveFloorPlan(plan);
  } catch {
    return { success: false, message: "The floor plan could not be saved." };
  }
}
