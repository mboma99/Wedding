import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
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
  const hasInvite = !isCreateMode && publicRsvpLink && publicRsvpCode && inviteKind;

  return (
    <main className="container max-w-4xl space-y-5 py-6 sm:space-y-6 sm:py-8">
      <PageHeader
        back={{ href: "/admin/guests", label: "Guests" }}
        meta={
          isCreateMode
            ? "Only name and relation are required. Everything else can wait."
            : [initialValues.relation, initialValues.householdName]
                .filter(Boolean)
                .join(" · ") || undefined
        }
        title={isCreateMode ? "Add guest" : initialValues.fullName || "Edit guest"}
      />

      {hasInvite ? (
        <div className="flex flex-col gap-3 rounded-[var(--card-radius)] border border-border/80 bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <p className="text-muted-foreground">
              {inviteKind === "HOUSEHOLD" ? "Household RSVP code" : "RSVP code"}
            </p>
            <p className="font-mono text-base font-semibold tracking-wider text-primary">
              {formatInviteCode(publicRsvpCode)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={publicRsvpLink} rel="noreferrer" target="_blank">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open RSVP page
              </Link>
            </Button>
            <ShareInvitationButton
              guestName={initialValues.fullName}
              householdName={initialValues.householdName || null}
              inviteCode={publicRsvpCode}
              inviteKind={inviteKind}
              invitePath={publicRsvpLink}
            />
          </div>
        </div>
      ) : null}

      <GuestForm
        guestId={guestId}
        householdOptions={householdOptions}
        initialValues={initialValues}
        mode={mode}
      />
    </main>
  );
}
