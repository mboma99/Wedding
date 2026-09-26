import { Playfair_Display } from "next/font/google";

/**
 * The landing page's display face, shared so the RSVP invitation matches it:
 * upright Playfair for the monogram and the couple's names.
 */
export const displayFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
