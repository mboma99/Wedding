import Link from "next/link";
import { ChevronDown, Heart, LockKeyhole, MapPinHouse, MessageCircleHeart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LandingHeroMedia } from "@/features/home/components/landing-hero-media";
import { WeddingCountdown } from "@/features/home/components/wedding-countdown";
import { RsvpLookupForm } from "@/features/rsvp/components/rsvp-lookup-form";
import { getDaysSinceDate } from "@/lib/date";
import { displayFont } from "@/lib/fonts";
import { weddingDate } from "@/lib/wedding";
import { getLandingMedia } from "@/server/content/landing-media";


function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
        {eyebrow}
      </p>
      <h2 className="font-serif text-3xl text-primary sm:text-5xl">{title}</h2>
      <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
        {description}
      </p>
    </div>
  );
}

export async function LandingPage() {
  const media = await getLandingMedia();
  const hasHeroVideos = media.videos.length > 0;
  const initialNow = Date.now();
  const currentYear = new Date().getFullYear();
  const daysSinceMet = getDaysSinceDate({
    from: {
      year: 2019,
      month: 3,
      day: 30,
    },
    timeZone: "Africa/Accra",
  });

  return (
    <main className="pb-12 sm:pb-16">
      <section className="relative">
        <div className="relative min-h-screen overflow-hidden bg-black sm:bg-[#d8d0d1]">
          {hasHeroVideos ? (
            <div className="absolute inset-x-0 bottom-0 top-[7.75rem] sm:inset-0">
              <LandingHeroMedia song={media.song} videos={media.videos} />
            </div>
          ) : null}
          <div
            className={`absolute inset-x-0 bottom-0 top-[7.75rem] sm:inset-0 ${
              hasHeroVideos
                ? "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_26%),linear-gradient(180deg,rgba(32,33,36,0.28),rgba(28,29,31,0.48)_54%,rgba(22,23,26,0.58))]"
                : "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.75),transparent_38%),linear-gradient(180deg,rgba(214,205,207,0.86),rgba(176,180,191,0.62)_68%,rgba(210,193,182,0.72))]"
            }`}
          />
          {!hasHeroVideos ? (
            <div className="absolute inset-x-0 bottom-0 top-[7.75rem] sm:inset-0">
              <div className="absolute inset-x-0 bottom-0 h-[46%] bg-[linear-gradient(180deg,rgba(198,204,214,0),rgba(132,145,160,0.24)_45%,rgba(126,120,118,0.28))]" />
              <div className="absolute inset-x-[8%] bottom-[26%] h-[36%] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.22),transparent_50%)] blur-3xl" />
              <div className="absolute bottom-[20%] left-[12%] h-[24%] w-[9%] rounded-t-[2rem] bg-primary/8 blur-[1px]" />
              <div className="absolute bottom-[20%] left-[24%] h-[18%] w-[7%] rounded-t-[1.5rem] bg-primary/10 blur-[1px]" />
              <div className="absolute bottom-[20%] left-[40%] h-[30%] w-[8%] rounded-t-[2rem] bg-primary/12 blur-[1px]" />
              <div className="absolute bottom-[20%] left-[58%] h-[40%] w-[10%] rounded-t-[2rem] bg-primary/14 blur-[1px]" />
              <div className="absolute bottom-[20%] right-[18%] h-[28%] w-[9%] rounded-t-[2rem] bg-primary/10 blur-[1px]" />
              <div className="absolute bottom-[20%] right-[8%] h-[22%] w-[7%] rounded-t-[1.5rem] bg-primary/8 blur-[1px]" />
              <div className="absolute inset-x-0 bottom-[14%] h-[10%] bg-[linear-gradient(180deg,rgba(126,145,165,0.18),rgba(91,101,116,0.18))]" />
              <div className="absolute inset-x-0 bottom-0 h-[18%] bg-[linear-gradient(180deg,rgba(196,181,168,0.16),rgba(212,193,176,0.68))]" />
            </div>
          ) : null}

          <div className="relative px-5 pb-5 pt-[7.75rem] sm:px-10 sm:py-8 lg:px-14 lg:py-10">
            <header className="fixed inset-x-0 top-0 z-40 flex flex-col gap-5 bg-black px-5 py-4 text-[0.65rem] uppercase tracking-[0.24em] text-white shadow-lg shadow-black/25 sm:static sm:z-auto sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-4 sm:bg-transparent sm:px-0 sm:py-0 sm:text-[0.7rem] sm:shadow-none">
              <p
                className={`${displayFont.className} text-center text-4xl normal-case tracking-[0.04em] text-white sm:hidden`}
              >
                J &amp; L
              </p>
              <nav className="flex flex-wrap items-center justify-center gap-3 text-center sm:justify-self-start sm:gap-6">
                <a href="#story" className="transition-opacity hover:opacity-70">
                   Our Story
                </a>
                <span aria-hidden="true" className="text-white/70">
                  &middot;
                </span>
                <a href="#details" className="transition-opacity hover:opacity-70">
                  Details
                </a>
                <span aria-hidden="true" className="text-white/70">
                  &middot;
                </span>
                <a href="" className="transition-opacity hover:opacity-70">
                  Registry
                </a>
              </nav>
              <p
                className={`${displayFont.className} hidden text-center text-4xl normal-case tracking-[0.04em] text-white sm:block sm:justify-self-center`}
              >
                J &amp; L
              </p>
              <Button
                asChild
                className="hidden rounded-sm bg-white px-5 text-primary hover:bg-white/90 sm:inline-flex sm:w-fit sm:justify-self-end"
              >
                <a href="#rsvp">RSVP</a>
              </Button>
            </header>

            <div className="relative flex min-h-[calc(100svh-7.75rem)] flex-col items-center px-1 pb-28 pt-8 text-center text-white sm:min-h-[76vh] sm:justify-center sm:px-2 sm:py-20 lg:min-h-[82vh]">
              <div className="mt-24 max-w-5xl space-y-5 sm:mt-0 sm:space-y-6">
                <p className={`${displayFont.className} text-4xl text-white sm:text-5xl`}>
                  We&apos;re Getting Married!
                </p>
                <h1
                  className={`${displayFont.className} text-6xl leading-[0.9] sm:text-8xl lg:text-[8.8rem]`}
                >
                  James &amp; Lisa
                </h1>
                {weddingDate ? (
                  <div className="pt-6 sm:pt-8">
                    <WeddingCountdown
                      dateLabel={weddingDate.dateLabel}
                      initialNow={initialNow}
                      targetDate={weddingDate.targetDate}
                    />
                  </div>
                ) : null}
                {hasHeroVideos ? null : (
                  <p className="text-xs uppercase tracking-[0.22em] text-white sm:text-sm sm:tracking-[0.26em]">
                    Add hero videos to <span className="font-semibold">public/media/landing/videos</span>
                    {" "}and a song to{" "}
                    <span className="font-semibold">public/media/landing/audio</span>
                  </p>
                )}
              </div>
              <div className="absolute inset-x-0 bottom-6 flex flex-col items-center gap-4 px-5 sm:bottom-8">
                <div className="w-full max-w-xs sm:hidden">
                  <Button
                    asChild
                    className="w-full rounded-sm bg-white px-5 py-6 text-base tracking-[0.24em] text-primary hover:bg-white/90"
                  >
                    <a href="#rsvp">RSVP</a>
                  </Button>
                </div>
                <a
                  href="#story"
                  className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-white transition-opacity hover:opacity-70 sm:tracking-[0.26em]"
                >
                  Scroll
                  <ChevronDown className="h-4 w-4 motion-safe:animate-scroll-nudge" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mt-12 grid gap-6 sm:mt-16 lg:grid-cols-[1.1fr_0.9fr]" id="story">
        <div className="rounded-[2rem] border border-white/80 bg-white/80 p-6 shadow-soft sm:p-10">
          <SectionHeading
            eyebrow="Our Story"
            title={`${daysSinceMet.toLocaleString()} days since we first met, and every moment has been a blessing.`}
            description="What began with joy grew into a love shaped by care, compassion, patience, laughter, and deep devotion. Every day James and Lisa fall for each other more, and now they are choosing each other for life."
          />
        </div>

        <div className="rounded-[2rem] border border-white/80 bg-white/82 p-6 shadow-soft sm:rounded-[2.25rem] sm:p-10">
          <SectionHeading
            eyebrow="Details"
            title="Wedding information is shared directly with invited guests."
            description="To keep the celebration personal and intentional, venue timing, family notes, and arrival details are not published broadly here. Invited households receive the exact information through their invitation message."
          />
        </div>
      </section>

      <section className="container mt-12 sm:mt-16" id="rsvp">
        <div className="rounded-[2rem] border border-primary/10 bg-primary px-6 py-10 text-primary-foreground shadow-soft sm:px-8 sm:py-14">
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-primary-foreground/70">
              RSVP
            </p>
            <h2 className="mt-4 font-serif text-3xl sm:text-5xl">
              Use your RSVP code or private link.
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-primary-foreground/80 sm:text-base">
              Every invited guest or household has a private RSVP link and a
              short RSVP code. Enter the code below or use the link sent by
              phone or email to respond for yourself or your household.
            </p>
            <div className="mt-8">
              <RsvpLookupForm tone="light" />
            </div>
        </div>
      </section>

      <footer className="container mt-12 border-t border-white/70 py-6 text-center text-sm text-muted-foreground sm:mt-16 sm:py-8">
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-6">
          <p>&copy; {currentYear} James &amp; Lisa. All rights reserved.</p>
          <Link
            href="/admin/login"
            className="text-primary transition-opacity hover:opacity-70"
          >
            Admin login
          </Link>
        </div>
      </footer>
    </main>
  );
}
