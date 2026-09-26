"use client";

import { useEffect, useRef, useState } from "react";
import { Music, Pause } from "lucide-react";

import { Button } from "@/components/ui/button";

type LandingHeroMediaProps = {
  videos: string[];
  /** Shown before the first clip plays, and instead of the clips for reduced motion. */
  poster?: string | null;
  song?: {
    src: string;
    title: string;
  } | null;
};

function getVideoType(src: string) {
  if (src.endsWith(".webm")) {
    return "video/webm";
  }

  if (src.endsWith(".mov")) {
    return "video/quicktime";
  }

  return "video/mp4";
}

export function LandingHeroMedia({
  videos,
  poster = null,
  song = null,
}: LandingHeroMediaProps) {
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  // Looping background footage is ambient motion, so it stays on the still
  // for people who ask their device to reduce motion.
  const [reduceMotion, setReduceMotion] = useState(false);
  // The server can't know the motion setting, so the next clip only starts
  // downloading once the browser has said it's fine to play.
  const [canPreloadNext, setCanPreloadNext] = useState(false);
  const reduceMotionRef = useRef(false);
  // The song never starts by itself; a guest chooses to play it.
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pauseTimeoutRef = useRef<number | null>(null);
  const shouldResumeAudioRef = useRef(false);

  function pauseAllMedia() {
    const audio = audioRef.current;

    shouldResumeAudioRef.current = Boolean(audio && !audio.paused);
    audio?.pause();

    for (const video of videoRefs.current) {
      video?.pause();
    }
  }

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      reduceMotionRef.current = query.matches;
      setReduceMotion(query.matches);
      setCanPreloadNext(!query.matches);

      if (query.matches) {
        for (const video of videoRefs.current) {
          video?.pause();
        }
      } else {
        const activeVideo = videoRefs.current[activeVideoIndex];
        if (activeVideo) void startVideoPlayback(activeVideo, false);
      }
    };

    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [activeVideoIndex]);

  useEffect(() => {
    return () => {
      if (pauseTimeoutRef.current) {
        window.clearTimeout(pauseTimeoutRef.current);
      }

      pauseAllMedia();
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        pauseAllMedia();
        return;
      }

      const activeVideo = videoRefs.current[activeVideoIndex];

      if (activeVideo) {
        void startVideoPlayback(activeVideo, false);
      }

      const audio = audioRef.current;

      if (!audio || !song || !shouldResumeAudioRef.current) {
        return;
      }

      // Coming back to the tab picks the song up again only if it was playing.
      shouldResumeAudioRef.current = false;
      void audio.play().catch(() => setIsPlaying(false));
    };

    const handlePageHide = () => {
      pauseAllMedia();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [activeVideoIndex, song]);

  async function startVideoPlayback(
    video: HTMLVideoElement,
    resetToStart: boolean,
  ) {
    if (resetToStart) {
      video.currentTime = 0;
    }

    video.muted = true;
    video.playsInline = true;

    if (reduceMotionRef.current) {
      return false;
    }

    return video.play().then(() => true).catch(() => false);
  }

  async function transitionToNextVideo(currentIndex: number) {
    if (videos.length < 2 || currentIndex !== activeVideoIndex) {
      return;
    }

    const currentVideo = videoRefs.current[currentIndex];

    for (let offset = 1; offset < videos.length; offset += 1) {
      const nextIndex = (currentIndex + offset) % videos.length;
      const nextVideo = videoRefs.current[nextIndex];

      if (!nextVideo) {
        continue;
      }

      const didStart = await startVideoPlayback(nextVideo, true);

      if (!didStart) {
        continue;
      }

      setActiveVideoIndex(nextIndex);

      if (pauseTimeoutRef.current) {
        window.clearTimeout(pauseTimeoutRef.current);
      }

      pauseTimeoutRef.current = window.setTimeout(() => {
        if (!currentVideo) {
          return;
        }

        currentVideo.pause();
        currentVideo.currentTime = 0;
      }, 700);

      return;
    }

    if (currentVideo) {
      void startVideoPlayback(currentVideo, true);
    }
  }

  async function toggleSong() {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (audio.paused) {
      audio.volume = 0.65;
      await audio.play().catch(() => undefined);
      return;
    }

    audio.pause();
  }

  return (
    <>
      <div className="absolute inset-0">
        {videos.map((video, index) => (
          <video
            key={video}
            ref={(node) => {
              videoRefs.current[index] = node;
            }}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              index === activeVideoIndex ? "opacity-100" : "opacity-0"
            }`}
            loop={videos.length === 1}
            muted
            onError={() => {
              if (index === activeVideoIndex) {
                void transitionToNextVideo(index);
              }
            }}
            onEnded={() => {
              void transitionToNextVideo(index);
            }}
            playsInline
            poster={index === 0 ? (poster ?? undefined) : undefined}
            // Only the playing clip and the one after it download; the rest
            // wait their turn instead of all loading with the page.
            preload={
              index === activeVideoIndex && !reduceMotion
                ? "auto"
                : canPreloadNext && index === (activeVideoIndex + 1) % videos.length
                  ? "auto"
                  : "none"
            }
          >
            <source src={video} type={getVideoType(video)} />
          </video>
        ))}
      </div>

      {song ? (
        <>
          <audio
            loop
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            preload="none"
            ref={audioRef}
            src={song.src}
          />
          <Button
            aria-label={isPlaying ? `Pause ${song.title}` : `Play ${song.title}`}
            aria-pressed={isPlaying}
            className="absolute bottom-4 left-4 z-20 rounded-full border border-white/30 bg-black/25 px-4 text-white backdrop-blur-md hover:bg-black/35 hover:text-white sm:bottom-6 sm:left-6 sm:px-5"
            onClick={() => {
              void toggleSong();
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            {isPlaying ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Pause song
              </>
            ) : (
              <>
                <Music className="mr-2 h-4 w-4" />
                Play our song
              </>
            )}
          </Button>
        </>
      ) : null}
    </>
  );
}
