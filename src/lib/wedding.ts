/**
 * Event details shared by the landing page and the RSVP invitation.
 * Leave `weddingDate` null while the date is TBC. When confirmed:
 * { targetDate: "2027-07-12T00:00:00Z", dateLabel: "12th July 2027" }
 */
export const weddingDate: {
  targetDate: string;
  dateLabel: string;
} | null = null;

/** Venue line for the invitation; null until it is confirmed. */
export const weddingVenue: string | null = null;

/** Gift registry link; the home page shows "Coming soon" in its Registry section until this is set. */
export const registryUrl: string | null = null;
