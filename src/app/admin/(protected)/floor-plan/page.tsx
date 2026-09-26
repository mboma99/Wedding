import type { Metadata } from "next";

import { FloorPlanPage } from "@/features/floor-plan/floor-plan-page";

export const metadata: Metadata = {
  title: "Floor plan | Traditional Wedding Admin",
};

export const dynamic = "force-dynamic";

export default function AdminFloorPlanPage() {
  return <FloorPlanPage />;
}
