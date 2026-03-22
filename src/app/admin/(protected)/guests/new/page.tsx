import type { Metadata } from "next";

import { GuestFormPage } from "@/features/guests/guest-form-page";
import { getHouseholdOptions } from "@/server/queries/guests";

export const metadata: Metadata = {
  title: "Create Guest | Traditional Wedding Admin",
  description:
    "Create a guest record and invitation details for the traditional wedding.",
};

export const dynamic = "force-dynamic";

export default async function NewAdminGuestPage() {
  const householdOptions = await getHouseholdOptions();

  return <GuestFormPage householdOptions={householdOptions} mode="create" />;
}
