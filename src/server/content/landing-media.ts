import { readdir } from "node:fs/promises";
import path from "node:path";

const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".m4v"]);
const AUDIO_EXTENSIONS = new Set([".mp3", ".m4a", ".aac", ".wav", ".ogg"]);
const VIDEO_EXTENSION_PRIORITY = [".mp4", ".webm", ".m4v", ".mov"];

type LandingSong = {
  src: string;
  title: string;
};

export type LandingMedia = {
  videos: string[];
  song: LandingSong | null;
};

function toPublicUrl(...segments: string[]) {
  return `/${segments.map((segment) => encodeURIComponent(segment)).join("/")}`;
}

function formatMediaTitle(filename: string) {
  const basename = filename.replace(/\.[^/.]+$/, "");
  return basename
    .replace(/_/g, " ")
    .replace(/\s*-\s*/g, " - ")
    .replace(/\s+/g, " ")
    .trim();
}

async function readMediaFiles(
  relativeDirectory: string[],
  allowedExtensions: Set<string>,
) {
  const directoryPath = path.join(process.cwd(), "public", ...relativeDirectory);

  try {
    const entries = await readdir(directoryPath, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((filename) =>
        allowedExtensions.has(path.extname(filename).toLowerCase()),
      )
      .sort((left, right) => left.localeCompare(right));
  } catch {
    return [];
  }
}

export async function getLandingMedia(): Promise<LandingMedia> {
  const [videoFiles, audioFiles] = await Promise.all([
    readMediaFiles(["media", "landing", "videos"], VIDEO_EXTENSIONS),
    readMediaFiles(["media", "landing", "audio"], AUDIO_EXTENSIONS),
  ]);

  const preferredVideoFiles = Array.from(
    videoFiles.reduce((selected, filename) => {
      const extension = path.extname(filename).toLowerCase();
      const basename = path.basename(filename, extension);
      const existing = selected.get(basename);

      if (!existing) {
        selected.set(basename, filename);
        return selected;
      }

      const existingExtension = path.extname(existing).toLowerCase();
      const currentPriority = VIDEO_EXTENSION_PRIORITY.indexOf(extension);
      const existingPriority = VIDEO_EXTENSION_PRIORITY.indexOf(existingExtension);

      if (
        currentPriority !== -1 &&
        (existingPriority === -1 || currentPriority < existingPriority)
      ) {
        selected.set(basename, filename);
      }

      return selected;
    }, new Map<string, string>()),
  )
    .map(([, filename]) => filename)
    .sort((left, right) => left.localeCompare(right));

  return {
    videos: preferredVideoFiles.map((filename) =>
      toPublicUrl("media", "landing", "videos", filename),
    ),
    song: audioFiles[0]
      ? {
          src: toPublicUrl("media", "landing", "audio", audioFiles[0]),
          title: formatMediaTitle(audioFiles[0]),
        }
      : null,
  };
}
