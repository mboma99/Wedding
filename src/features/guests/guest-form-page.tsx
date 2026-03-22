import Link from "next/link";

import { AppShellNav } from "@/components/shared/app-shell-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getEmptyGuestFormValues,
  type GuestFormInitialValues,
} from "@/features/guests/form-schema";
import { GuestForm } from "@/features/guests/components/guest-form";
import { ShareInvitationButton } from "@/features/guests/components/share-invitation-button";
import type { HouseholdOption } from "@/features/guests/types";
import { formatInviteCode } from "@/lib/rsvp";

type GuestFormPageProps = {
  mode: "create" | "edit";
  guestId?: string;
  initialValues?: GuestFormInitialValues;
  householdOptions?: HouseholdOption[];
  publicRsvpLink?: string;
  publicRsvpCode?: string;
  inviteKind?: "HOUSEHOLD" | "INDIVIDUAL";
};

export function GuestFormPage({
  mode,
  guestId,
  initialValues = getEmptyGuestFormValues(),
  householdOptions = [],
  publicRsvpLink,
  publicRsvpCode,
  inviteKind,
}: GuestFormPageProps) {
  const isCreateMode = mode === "create";

  return (
    <main className="container space-y-6 py-6 sm:space-y-8 sm:py-10">
      <section className="">
        <Card className="overflow-hidden border-white/80 bg-white/85">
          <CardContent className="space-y-6 p-5 sm:space-y-8 sm:p-8">
            <AppShellNav currentPath="/admin/guests" />
            <div className="space-y-4">
              <Badge variant="outline" className="w-fit bg-white/80">
                {isCreateMode ? "Create guest" : "Edit guest"}
              </Badge>
              <div className="space-y-3">
                <h1 className="font-serif text-3xl leading-tight text-primary sm:text-6xl sm:leading-none">
                  {isCreateMode
                    ? "Add a guest"
                    : "Update guest and invitation details."}
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  {isCreateMode
                    ? "Capture the guest profile, invitation status, RSVP state, and any contact channels already available."
                    : "Keep guest contact details, RSVP progress, plus one access, and planning notes current from a single edit screen."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <GuestForm
        guestId={guestId}
        householdOptions={householdOptions}
        initialValues={initialValues}
        mode={mode}
      />
    </main>
  );
}
