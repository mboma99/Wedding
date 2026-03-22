import type { Metadata } from "next";

import { PublicRsvpPage } from "@/features/rsvp/public-rsvp-page";

export const metadata: Metadata = {
  title: "RSVP | Traditional Wedding Guest Manager",
  description: "Respond to a traditional wedding invitation.",
};

export const dynamic = "force-dynamic";

type PublicRsvpRouteProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function RsvpTokenPage({ params }: PublicRsvpRouteProps) {
  const { token } = await params;

  return <PublicRsvpPage token={token} />;
}

