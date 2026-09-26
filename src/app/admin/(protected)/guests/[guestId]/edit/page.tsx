import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getGuestFormInitialValues } from "@/features/guests/form-schema";
import { GuestFormPage } from "@/features/guests/guest-form-page";
import { getGuestForEdit, getHouseholdOptions } from "@/server/queries/guests";
import { getPublicInvitationByToken } from "@/server/queries/rsvp";
import { requireAdminSession } from "@/server/auth/admin";

export const metadata: Metadata = {
  title: "Edit Guest | Traditional Wedding Admin",
  description:
    "Edit guest contact details, invitation status, RSVP state, and notes.",
};

export const dynamic = "force-dynamic";

type EditAdminGuestPageProps = {
  params: Promise<{
    guestId: string;
  }>;
};

export default async function EditAdminGuestPage({
  params,
}: EditAdminGuestPageProps) {
  // Check the login before loading anything: the layout's check runs at the
  // same time as the page, so on its own it lets logged-out visits (and bots
  // probing /admin) trigger database reads before the redirect.
  await requireAdminSession();

  const { guestId } = await params;
  const guest = await getGuestForEdit(guestId);

  if (!guest) {
    notFound();
  }

  const publicInvitation = guest.invitation?.inviteToken
    ? await getPublicInvitationByToken(guest.invitation.inviteToken)
    : null;
  const householdOptions = await getHouseholdOptions(guest.id);

  return (
    <GuestFormPage
      guestId={guest.id}
      householdOptions={householdOptions}
      initialValues={getGuestFormInitialValues(guest)}
      inviteKind={publicInvitation?.inviteKind}
      mode="edit"
      publicRsvpCode={publicInvitation?.inviteCode}
      publicRsvpLink={
        publicInvitation?.accessToken
          ? `/rsvp/${publicInvitation.accessToken}`
          : undefined
      }
    />
  );
}
