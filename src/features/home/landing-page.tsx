import Link from "next/link";
import { preload } from "react-dom";
import { ChevronDown, Heart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LandingHeader } from "@/features/home/components/landing-header";
import { LandingHeroMedia } from "@/features/home/components/landing-hero-media";
import { WeddingCountdown } from "@/features/home/components/wedding-countdown";
import { RsvpLookupForm } from "@/features/rsvp/components/rsvp-lookup-form";
import { getDaysSinceDate } from "@/lib/date";
import { displayFont } from "@/lib/fonts";
import { registryUrl, weddingDate } from "@/lib/wedding";
import { getLandingMedia } from "@/server/content/landing-media";


export async function LandingPage() {
  const media = await getLandingMedia();

  // The hero still is the first thing on screen; fetch it before anything else.
  if (media.poster) {
    preload(media.poster, { as: "image", fetchPriority: "high" });
  }
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
      <section className="relative" id="top">
        <div className="relative min-h-svh overflow-hidden bg-[#0b0d14] sm:bg-[#d8d0d1]">
          {hasHeroVideos ? (
            <div className="absolute inset-0">
              <LandingHeroMedia poster={media.poster} song={media.song} videos={media.videos} />
            </div>
          ) : null}
          <div
            className={`absolute inset-0 ${
              hasHeroVideos
                ? // A soft dark wash so white text holds up over bright footage:
                  // deeper at the top (nav) and bottom (buttons), a gentle
                  // shade behind the names, and a light vignette at the edges.
                  "bg-[radial-gradient(ellipse_60%_38%_at_50%_48%,rgba(8,10,18,0.32),transparent_72%),radial-gradient(ellipse_at_center,transparent_45%,rgba(8,10,18,0.38)_100%),linear-gradient(180deg,rgba(8,10,18,0.58)_0%,rgba(8,10,18,0.26)_24%,rgba(8,10,18,0.3)_58%,rgba(8,10,18,0.68)_100%)]"
                : "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.75),transparent_38%),linear-gradient(180deg,rgba(214,205,207,0.86),rgba(176,180,191,0.62)_68%,rgba(210,193,182,0.72))]"
            }`}
          />
          {!hasHeroVideos ? (
            <div className="absolute inset-0">
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

          <div className="relative px-5 pb-5 sm:px-10 sm:py-8 lg:px-14 lg:py-10">
            <LandingHeader />

            <div className="relative flex min-h-[calc(100svh-1.25rem)] flex-col items-center px-1 pb-28 pt-8 text-center text-white [text-shadow:0_2px_28px_rgba(0,0,0,0.4)] sm:min-h-[76vh] sm:justify-center sm:px-2 sm:py-20 lg:min-h-[82vh]">
              <div className="mt-40 max-w-5xl space-y-5 sm:mt-0 sm:space-y-7">
                <p className={`${displayFont.className} text-3xl italic text-white sm:text-5xl`}>
                  We&apos;re getting married
                </p>
                <h1
                  className={`${displayFont.className} text-6xl leading-[0.9] tracking-[-0.01em] sm:text-8xl lg:text-[8.8rem]`}
                >
                  James <span className="italic text-white">&amp;</span> Lisa
                </h1>
                <div aria-hidden className="flex items-center justify-center gap-4 pt-1 sm:pt-2">
                  <span className="h-px w-12 bg-white/60 sm:w-20" />
                  <Heart className="h-3.5 w-3.5 fill-white text-white" />
                  <span className="h-px w-12 bg-white/60 sm:w-20" />
                </div>
                {weddingDate ? null : (
                  <p className="text-xs font-medium uppercase tracking-[0.3em] text-white sm:text-sm">
                    Traditional wedding
                  </p>
                )}
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
                    className="w-full rounded-sm bg-white px-5 py-6 text-base tracking-[0.24em] text-primary [text-shadow:none] hover:bg-white/90"
                  >
                    <a href="#rsvp">RSVP</a>
                  </Button>
                </div>
                <a
                  href="#story"
                  className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-white underline-offset-4 hover:underline sm:tracking-[0.26em]"
                >
                  Scroll
                  <ChevronDown className="h-4 w-4 motion-safe:animate-scroll-nudge" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mt-16 grid gap-12 sm:mt-24 lg:grid-cols-2 lg:gap-0">
        <div className="scroll-mt-24 lg:pr-14" id="story">
          <p className="font-serif text-lg italic text-primary">Our story</p>
          <p className="mt-3 font-serif text-7xl leading-none tracking-tight text-primary tabular-nums sm:text-8xl">
            {daysSinceMet.toLocaleString("en-GB")}
          </p>
          <p className="mt-4 max-w-md text-balance text-lg leading-8 text-muted-foreground">
            days since we first met, and every one of them a blessing.
          </p>
        </div>

        <div className="scroll-mt-24 border-t border-primary/10 pt-12 lg:border-l lg:border-t-0 lg:pl-14 lg:pt-0" id="registry">
          <p className="font-serif text-lg italic text-primary">Registry</p>
          {registryUrl ? (
            <>
              <h2 className="mt-3 text-balance font-serif text-3xl leading-tight text-primary sm:text-5xl">
                Our gift registry.
              </h2>
              <Button asChild className="mt-6">
                <a href={registryUrl} rel="noopener noreferrer" target="_blank">
                  View our registry
                </a>
              </Button>
            </>
          ) : (
            <>
              <h2 className="mt-3 text-balance font-serif text-3xl leading-tight text-primary sm:text-5xl">
                Coming soon.
              </h2>
              <p className="mt-4 max-w-md text-balance text-lg leading-8 text-muted-foreground">
                We&apos;ll add our registry here closer to the day.
              </p>
            </>
          )}
        </div>
      </section>

      <section className="container mt-16 scroll-mt-24 sm:mt-24" id="rsvp">
        <div className="rounded-[2rem] border border-primary/10 bg-primary px-6 py-12 text-center text-primary-foreground shadow-soft sm:px-10 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary-foreground">
            RSVP
          </p>
          <h2 className="mt-3 font-serif text-3xl sm:text-5xl">Will you join us?</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-primary-foreground sm:text-base">
            Use your email, phone number or RSVP code.
          </p>
          <div className="mx-auto mt-8 max-w-xl text-left">
            <RsvpLookupForm tone="light" />
          </div>
        </div>
      </section>

      <footer className="container mt-12 border-t border-white/70 py-6 text-center text-sm text-muted-foreground sm:mt-16 sm:py-8">
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-6">
          <p>&copy; {currentYear} James &amp; Lisa. All rights reserved.</p>
          <Link
            href="/admin/login"
            className="text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            Admin
          </Link>
        </div>
      </footer>
    </main>
  );
}
