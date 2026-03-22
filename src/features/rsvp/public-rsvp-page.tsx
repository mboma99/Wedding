import { AlertTriangle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicRsvpForm } from "@/features/rsvp/components/public-rsvp-form";
import { getPublicInvitationByToken } from "@/server/queries/rsvp";

function InvalidInvitationState() {
  return (
    <main className="container flex min-h-screen items-center py-8 sm:py-12">
      <Card className="mx-auto w-full max-w-2xl border-amber-200 bg-white/95">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-700">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <CardTitle className="mt-4">This RSVP link is unavailable.</CardTitle>
          <CardDescription>
            The RSVP code or link may be invalid, expired, or not yet ready for
            response. Please contact James or Lisa directly for help.
          </CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}

export async function PublicRsvpPage({ token }: { token: string }) {
  try {
    const invitation = await getPublicInvitationByToken(token);

    if (!invitation) {
      return <InvalidInvitationState />;
    }

    return (
      <main className="container py-6 sm:py-10">
        <div className="mx-auto max-w-4xl">
          <PublicRsvpForm invitation={invitation} />
        </div>
      </main>
    );
  } catch {
    return <InvalidInvitationState />;
  }
}
