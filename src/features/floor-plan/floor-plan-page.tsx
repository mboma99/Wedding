import { FloorPlanEditor } from "@/features/floor-plan/components/floor-plan-editor";
import { getFloorPlan, getSeatingGuests } from "@/server/floor-plan";

export async function FloorPlanPage() {
  const [plan, guests] = await Promise.all([getFloorPlan(), getSeatingGuests()]);

  return <FloorPlanEditor guests={guests} initialPlan={plan} />;
}
