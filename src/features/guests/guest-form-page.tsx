import Link from "next/link";
import { Mail, Phone, Ticket } from "lucide-react";

import { AppShellNav } from "@/components/shared/app-shell-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
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
                    ? "Add a guest to the traditional wedding list."
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

        <Card className="overflow-hidden border-white/80 bg-white/85">
          <CardHeader>
            <CardTitle>Guest admin tools</CardTitle>
            <CardDescription>
              This flow is limited to guest creation and maintenance for the one
              traditional wedding event.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.5rem] border border-james/15 bg-james/10 p-4">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-james" />
                <div>
                  <p className="text-sm font-medium text-james">Email optional</p>
                  <p className="text-sm text-muted-foreground">
                    Add it now or later when email outreach is available.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-lisa/15 bg-lisa/10 p-4">
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-lisa" />
                <div>
                  <p className="text-sm font-medium text-lisa">Phone optional</p>
                  <p className="text-sm text-muted-foreground">
                    Add it now or later when direct phone outreach is available.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-border/80 bg-muted/30 p-4">
              <div className="flex items-center gap-3">
                <Ticket className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-primary">
                    Invitation lifecycle
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Invite status, RSVP status, plus one details, and dietary
                    requirements stay attached to the guest record.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-border/80 bg-white/85 p-4">
              <p className="text-sm font-medium text-primary">Household invites</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Link guests into the same household while editing. As soon as a
                household has more than one guest, its public RSVP behaves as a
                household invite.
              </p>
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {householdOptions.length} household options available to link
              </p>
            </div>
            {publicRsvpLink ? (
              <div className="rounded-[1.5rem] border border-border/80 bg-white/85 p-4">
                <p className="text-sm font-medium text-primary">Public RSVP link</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {inviteKind === "HOUSEHOLD"
                    ? "This link and code open the household RSVP page for matching household members on the same side."
                    : "This link and code open the individual RSVP page."}
                </p>
                {publicRsvpCode ? (
                  <div className="mt-4 rounded-[1rem] border border-border/70 bg-muted/20 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      RSVP code
                    </p>
                    <p className="mt-2 text-lg font-semibold tracking-[0.2em] text-primary">
                      {formatInviteCode(publicRsvpCode)}
                    </p>
                  </div>
                ) : null}
                <Button asChild className="mt-4 w-full">
                  <Link href={publicRsvpLink} rel="noreferrer" target="_blank">
                    Open RSVP page
                  </Link>
                </Button>
                {publicRsvpCode ? (
                  <ShareInvitationButton
                    className="mt-3 w-full"
                    guestName={initialValues.fullName}
                    householdName={initialValues.householdName}
                    inviteCode={publicRsvpCode}
                    inviteKind={inviteKind ?? "INDIVIDUAL"}
                    invitePath={publicRsvpLink}
                    size="default"
                  />
                ) : null}
              </div>
            ) : null}
            <Button asChild className="w-full sm:w-auto" variant="outline">
              <Link href="/admin/guests">Back to guest list</Link>
            </Button>
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
