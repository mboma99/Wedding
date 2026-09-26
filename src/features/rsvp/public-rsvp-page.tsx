import { InvitationExperience } from "@/features/rsvp/components/invitation-experience";
import { RsvpLookupForm } from "@/features/rsvp/components/rsvp-lookup-form";
import { cn } from "@/lib/utils";
import { buildGuestDays, getWeddingDays } from "@/server/days";
import { getPublicInvitationByToken } from "@/server/queries/rsvp";

/** Warm paper backdrop, so the invitation reads as stationery on a table. */
function InvitationBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <main
      className={cn(
        "min-h-dvh bg-[#e9e1d5] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.7),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(214,196,172,0.45),transparent_55%)] [--control-radius:0.75rem]",
      )}
    >
      {children}
    </main>
  );
}

function InvalidInvitationState() {
  return (
    <InvitationBackdrop>
      <div className="flex min-h-dvh items-center justify-center px-4 py-12">
        <div className="animate-enter w-full max-w-md rounded-[4px] bg-[#fbf8f2] px-6 py-10 shadow-[0_30px_80px_-30px_rgba(60,40,20,0.45)] sm:px-10">
          <div className="space-y-2 text-center">
            <h1 className="font-serif text-3xl text-primary">
              We couldn&apos;t open this invitation
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              The link may be incomplete. You can still find it below.
            </p>
          </div>
          <div className="mt-8">
            <RsvpLookupForm />
          </div>
        </div>
      </div>
    </InvitationBackdrop>
  );
}

export async function PublicRsvpPage({ token }: { token: string }) {
  try {
    const invitation = await getPublicInvitationByToken(token);

    if (!invitation) {
      return <InvalidInvitationState />;
    }

    // Worked out here so a hidden date or venue never reaches the browser.
    const days = buildGuestDays(invitation, await getWeddingDays());

    return (
      <InvitationBackdrop>
        <InvitationExperience days={days} invitation={invitation} />
      </InvitationBackdrop>
    );
  } catch {
    return <InvalidInvitationState />;
  }
}
