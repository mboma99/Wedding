"use client";

import { useEffect, useRef, useState } from "react";

import type { GuestDayView } from "@/domain/days";
import { PublicRsvpForm } from "@/features/rsvp/components/public-rsvp-form";
import { YourDays } from "@/features/rsvp/components/your-days";
import { WaxSeal } from "@/features/rsvp/components/wax-seal";
import {
  getInvitationHeading,
  hasReplied,
  type PublicInvitationRecord,
} from "@/features/rsvp/types";
import { displayFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { weddingDate, weddingVenue } from "@/lib/wedding";

type Stage = "sealed" | "opening" | "leaving" | "revealed";

// Seal breaks, flap lifts, letter rises (see .envelope-* in globals.css),
// then the scene fades before the full letter takes its place.
const OPENING_MS = 1300;
const LEAVING_MS = 300;

/** Same lockup as the landing page header: "J & L", upright Playfair. */
function Monogram({ className }: { className?: string }) {
  return (
    <span className={cn(displayFont.className, "whitespace-nowrap leading-none tracking-[0.04em]", className)}>
      J &amp; L
    </span>
  );
}

function Envelope({
  heading,
  stage,
  onOpen,
}: {
  heading: string;
  stage: Stage;
  onOpen: () => void;
}) {
  return (
    <div
      className="envelope-scene flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-12"
      data-state={stage}
    >
      <p className="envelope-caption text-center text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
        You have mail
      </p>

      <button
        aria-label="Open your invitation"
        className="envelope block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-8 focus-visible:ring-offset-[#e9e1d5]"
        disabled={stage !== "sealed"}
        onClick={onOpen}
        type="button"
      >
        <span aria-hidden className="envelope-back" />
        <span
          aria-hidden
          className="envelope-letter flex flex-col items-center justify-start gap-2 pt-[9%] text-primary"
        >
          <Monogram className="text-3xl sm:text-4xl" />
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-primary/60">
            You&apos;re invited
          </span>
        </span>
        <span
          aria-hidden
          className="envelope-pocket flex flex-col items-center justify-end gap-1 pb-[7%]"
        >
          <svg
            className="envelope-shape"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
            <defs>
              <linearGradient id="envelope-pocket-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#f1e9dc" />
                <stop offset="1" stopColor="#ebe1d1" />
              </linearGradient>
            </defs>
            <path d="M0 0 L50 50 L100 0 V98 Q100 100 98 100 H2 Q0 100 0 98 Z" fill="url(#envelope-pocket-fill)" />
            {/* Soft crease along the pocket's V. */}
            <path d="M0 0 L50 50 L100 0" fill="none" stroke="rgba(120,90,60,0.12)" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
          </svg>
          <span className="relative text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-primary/60">
            For
          </span>
          <span className={cn(displayFont.className, "relative max-w-[80%] truncate text-xl text-primary sm:text-2xl")}>
            {heading}
          </span>
        </span>
        <span aria-hidden className="envelope-flap">
          <svg className="envelope-shape" preserveAspectRatio="none" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="envelope-flap-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#e4d7c2" />
                <stop offset="1" stopColor="#ddcfb8" />
              </linearGradient>
            </defs>
            <path d="M0 0 H100 L50 100 Z" fill="url(#envelope-flap-fill)" />
          </svg>
        </span>
        <span aria-hidden className="envelope-seal">
          <WaxSeal breakable />
        </span>
      </button>

      <p className="envelope-caption text-sm text-primary/70">Tap the envelope to open it</p>
    </div>
  );
}

export function InvitationExperience({
  invitation,
  days,
}: {
  invitation: PublicInvitationRecord;
  days: GuestDayView[];
}) {
  // The envelope is a first-time moment. Someone coming back to their reply
  // has already opened it, so they go straight to the letter.
  const everyoneReplied = invitation.guests.every(hasReplied);
  const [stage, setStage] = useState<Stage>(everyoneReplied ? "revealed" : "sealed");
  const daysFirst = everyoneReplied && days.some((day) => day.attending);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const heading = getInvitationHeading(invitation);
  const names = invitation.guests.map((guest) => guest.fullName);

  useEffect(() => {
    if (stage === "opening") {
      const timeout = window.setTimeout(() => setStage("leaving"), OPENING_MS);
      return () => window.clearTimeout(timeout);
    }

    if (stage === "leaving") {
      const timeout = window.setTimeout(() => setStage("revealed"), LEAVING_MS);
      return () => window.clearTimeout(timeout);
    }

    if (stage === "revealed") {
      // The envelope button the user pressed is gone; land them on the letter.
      headingRef.current?.focus({ preventScroll: true });
    }
  }, [stage]);

  function open() {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setStage(reduceMotion ? "revealed" : "opening");
  }

  if (stage !== "revealed") {
    return <Envelope heading={heading} onOpen={open} stage={stage} />;
  }

  return (
    <div className="px-4 py-8 sm:py-14">
      <article className="letter-enter relative mx-auto max-w-2xl rounded-[4px] bg-[#fbf8f2] px-6 py-12 text-center shadow-[0_30px_80px_-30px_rgba(60,40,20,0.45)] sm:px-14 sm:py-16">
        {/* Inset rule, like a printed card. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-3 rounded-[2px] border border-primary/15 sm:inset-4"
        />

        <header className="letter-stagger relative space-y-6">
          <WaxSeal className="mx-auto h-24 w-24" />

          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
            Together with their families
          </p>

          <h1
            className={cn(displayFont.className, "text-5xl leading-[1.05] text-primary outline-none sm:text-7xl")}
            ref={headingRef}
            tabIndex={-1}
          >
            James &amp; Lisa
          </h1>

          <p className="mx-auto max-w-md text-base leading-7 text-muted-foreground sm:text-lg">
            invite you to celebrate their traditional wedding
          </p>

          {weddingDate || weddingVenue ? (
            <div className="space-y-1">
              <div aria-hidden className="mx-auto mb-5 flex items-center justify-center gap-3 text-primary/40">
                <span className="h-px w-12 bg-current" />
                <span className="h-1.5 w-1.5 rotate-45 bg-current" />
                <span className="h-px w-12 bg-current" />
              </div>
              {weddingDate ? (
                <p className={cn(displayFont.className, "text-xl text-primary sm:text-2xl")}>
                  {weddingDate.dateLabel}
                </p>
              ) : null}
              {weddingVenue ? <p className="text-sm text-muted-foreground">{weddingVenue}</p> : null}
            </div>
          ) : null}
        </header>

        {/* Once everyone has replied and someone is coming, the days come first.
            The reply stays in the same place in the tree either way, so the
            "Reply sent" confirmation isn't lost when the order changes. */}
        {daysFirst ? <YourDays days={days} isHousehold={invitation.inviteKind === "HOUSEHOLD"} /> : null}
        <section
          aria-labelledby="reply-heading"
          className="relative mt-12 border-t border-primary/10 pt-10 text-left"
        >
          <div className="mb-8 text-center">
            <h2 className="font-serif text-3xl text-primary" id="reply-heading">
              {everyoneReplied ? "Your reply" : "Kindly reply"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {invitation.inviteKind === "HOUSEHOLD"
                ? `For ${formatNames(names)}`
                : `For ${names[0]}`}
            </p>
          </div>

          <PublicRsvpForm invitation={invitation} />
        </section>
        {daysFirst ? null : <YourDays days={days} isHousehold={invitation.inviteKind === "HOUSEHOLD"} />}
      </article>

      <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-primary/60">
        Questions? Get in touch with James or Lisa directly.
      </p>
    </div>
  );
}

function formatNames(names: string[]) {
  if (names.length <= 1) {
    return names.join("");
  }

  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
