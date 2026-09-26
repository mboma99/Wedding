"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

import { Button } from "@/components/ui/button";

type LandingHeroMediaProps = {
  videos: string[];
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
  song = null,
}: LandingHeroMediaProps) {
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [needsPlaybackResume, setNeedsPlaybackResume] = useState(false);
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
    const activeVideo = videoRefs.current[activeVideoIndex];

    if (!activeVideo) {
      return;
    }

    void startVideoPlayback(activeVideo, false);
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
    const audio = audioRef.current;

    if (!audio || !song) {
      return;
    }

    audio.volume = 0.65;
    audio.muted = false;
    setIsMuted(false);

    void audio.play().catch(() => {
      audio.pause();
      audio.currentTime = 0;
      setNeedsPlaybackResume(true);
    });
  }, [song]);

  useEffect(() => {
    if (!needsPlaybackResume) {
      return;
    }

    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const resumePlayback = () => {
      audio.muted = isMuted;
      void audio.play().then(() => {
        setNeedsPlaybackResume(false);
      }).catch(() => {
        return;
      });
    };

    window.addEventListener("pointerdown", resumePlayback, { once: true });
    window.addEventListener("keydown", resumePlayback, { once: true });

    return () => {
      window.removeEventListener("pointerdown", resumePlayback);
      window.removeEventListener("keydown", resumePlayback);
    };
  }, [isMuted, needsPlaybackResume]);

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

      audio.muted = isMuted;
      void audio.play().then(() => {
        shouldResumeAudioRef.current = false;
      }).catch(() => {
        setNeedsPlaybackResume(true);
      });
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
  }, [activeVideoIndex, isMuted, song]);

  async function startVideoPlayback(
    video: HTMLVideoElement,
    resetToStart: boolean,
  ) {
    if (resetToStart) {
      video.currentTime = 0;
    }

    video.muted = true;
    video.playsInline = true;

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

  async function toggleMute() {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (audio.paused) {
      const nextMuted = !isMuted;
      audio.muted = nextMuted;
      setIsMuted(nextMuted);
      await audio.play().catch(() => {
        return;
      });
      setNeedsPlaybackResume(false);
      return;
    }

    audio.muted = !audio.muted;
    setIsMuted(audio.muted);
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
            autoPlay={index === 0}
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
            preload="auto"
          >
            <source src={video} type={getVideoType(video)} />
          </video>
        ))}
      </div>

      {song ? (
        <>
          <audio
            autoPlay
            loop
            preload="auto"
            ref={audioRef}
            src={song.src}
          />
          <Button
            aria-label={isMuted ? `Unmute ${song.title}` : `Mute ${song.title}`}
            className="absolute bottom-4 left-4 z-20 rounded-full border border-white/30 bg-black/25 px-4 text-white backdrop-blur-md hover:bg-black/35 sm:bottom-6 sm:left-6 sm:px-5"
            onClick={() => {
              void toggleMute();
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            {isMuted ? (
              <>
                <VolumeX className="mr-2 h-4 w-4" />
                Unmute
              </>
            ) : (
              <>
                <Volume2 className="mr-2 h-4 w-4" />
                Mute
              </>
            )}
          </Button>
        </>
      ) : null}
    </>
  );
}
