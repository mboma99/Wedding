import type { Viewport } from "next";

export const dynamic = "force-dynamic";

// The phone browser bar matches the dark top of the hero and the header.
export const viewport: Viewport = {
  themeColor: "#0b0d14",
};

export { LandingPage as default } from "@/features/home/landing-page";
