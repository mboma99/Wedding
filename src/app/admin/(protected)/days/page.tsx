import type { Metadata } from "next";

import { DaysPage } from "@/features/days/days-page";
import { requireAdminSession } from "@/server/auth/admin";

export const metadata: Metadata = {
  title: "Wedding days | Traditional Wedding Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminDaysPage() {
  // Check the login before loading anything: the layout's check runs at the
  // same time as the page, so on its own it lets logged-out visits (and bots
  // probing /admin) trigger database reads before the redirect.
  await requireAdminSession();

  return <DaysPage />;
}
