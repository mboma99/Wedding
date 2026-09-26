import type { Metadata } from "next";

import { GuestFormPage } from "@/features/guests/guest-form-page";
import { getHouseholdOptions } from "@/server/queries/guests";
import { requireAdminSession } from "@/server/auth/admin";

export const metadata: Metadata = {
  title: "Create Guest | Traditional Wedding Admin",
  description:
    "Create a guest record and invitation details for the traditional wedding.",
};

export const dynamic = "force-dynamic";

export default async function NewAdminGuestPage() {
  // Check the login before loading anything: the layout's check runs at the
  // same time as the page, so on its own it lets logged-out visits (and bots
  // probing /admin) trigger database reads before the redirect.
  await requireAdminSession();

  const householdOptions = await getHouseholdOptions();

  return <GuestFormPage householdOptions={householdOptions} mode="create" />;
}
