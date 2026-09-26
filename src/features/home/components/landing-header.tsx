"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { displayFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

/**
 * On phones the header floats over the hero video with only a soft fade
 * behind it, then turns solid once the page scrolls so the links stay
 * readable over the cream sections. On larger screens it sits in the hero.
 */
export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  const separator = (
    <span aria-hidden="true" className="text-white">
      &middot;
    </span>
  );

  return (
    <header className="fixed inset-x-0 top-0 z-40 text-white sm:static sm:z-auto">
      {/* Phones: a fade over the video, swapped for a solid bar once scrolled.
          Only opacity changes, so it stays smooth. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(8,10,18,0.55),rgba(8,10,18,0))] transition-opacity duration-200 ease-out sm:hidden"
        style={{ opacity: scrolled ? 0 : 1 }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[#0b0d14] shadow-lg shadow-black/20 transition-opacity duration-200 ease-out sm:hidden"
        style={{ opacity: scrolled ? 1 : 0 }}
      />

      <div className="relative flex flex-col items-center gap-1.5 px-5 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-[0.65rem] uppercase tracking-[0.22em] [text-shadow:0_1px_12px_rgba(0,0,0,0.45)] sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-4 sm:px-0 sm:pb-0 sm:pt-0 sm:text-[0.72rem] sm:font-medium sm:tracking-[0.24em]">
        <a
          className={`${displayFont.className} text-3xl normal-case tracking-[0.04em] sm:hidden`}
          href="#top"
        >
          J &amp; L
        </a>
        <nav className="flex items-center gap-3 sm:justify-self-start sm:gap-6">
          <a className="underline-offset-4 hover:underline" href="#story">
            Our story
          </a>
          {separator}
          <a className="underline-offset-4 hover:underline" href="#registry">
            Registry
          </a>
        </nav>
        <p
          className={cn(
            displayFont.className,
            "hidden text-center text-4xl normal-case tracking-[0.04em] sm:block sm:justify-self-center",
          )}
        >
          J &amp; L
        </p>
        <Button
          asChild
          className="hidden rounded-sm bg-white px-5 text-primary [text-shadow:none] hover:bg-white/90 sm:inline-flex sm:w-fit sm:justify-self-end"
        >
          <a href="#rsvp">RSVP</a>
        </Button>
      </div>
    </header>
  );
}
