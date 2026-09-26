/**
 * The two wedding days: the Rora (stored under the key "lobola") and the
 * celebration. Everyone on the guest list is invited to the
 * celebration; only guests marked for it are invited to the lobola. Date and
 * location stay hidden from guests until each is revealed, and even then only
 * guests who have said yes to that day see them.
 */

export const DAY_KEYS = ["lobola", "celebration"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export type ScheduleItem = {
  id: string;
  /** "14:00" style, or blank. */
  time: string;
  title: string;
};

export type WeddingDay = {
  /** ISO date, e.g. "2027-07-12", or null until chosen. */
  date: string | null;
  /** "14:00" style, or blank. */
  startTime: string;
  venueName: string;
  address: string;
  /** Optional link to share instead of one built from the address. */
  mapUrl: string;
  revealDate: boolean;
  revealLocation: boolean;
  schedule: ScheduleItem[];
};

export type WeddingDays = Record<DayKey, WeddingDay>;

export const DAY_NAMES: Record<DayKey, string> = {
  lobola: "Rora",
  celebration: "Celebration",
};

export const DAY_BLURBS: Record<DayKey, string> = {
  lobola: "The Rora, with close family.",
  celebration: "The wedding celebration.",
};

export function emptyDay(): WeddingDay {
  return {
    date: null,
    startTime: "",
    venueName: "",
    address: "",
    mapUrl: "",
    revealDate: false,
    revealLocation: false,
    schedule: [],
  };
}

export function defaultWeddingDays(): WeddingDays {
  return { lobola: emptyDay(), celebration: emptyDay() };
}

/** "Saturday 12 July 2027" */
export function formatDayDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "2:00 pm" from "14:00"; anything else is shown as typed. */
export function formatTime(time: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return time.trim();
  const hours = Number(match[1]);
  const suffix = hours >= 12 ? "pm" : "am";
  return `${hours % 12 || 12}:${match[2]} ${suffix}`;
}

export function mapLink(day: Pick<WeddingDay, "mapUrl" | "venueName" | "address">) {
  // Only https links reach guests, whatever was saved before that rule existed.
  if (day.mapUrl.trim().startsWith("https://")) return day.mapUrl.trim();
  const query = [day.venueName, day.address].filter((part) => part.trim()).join(", ");
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}

/**
 * What one invitation may see about a day. Built on the server so hidden
 * details never reach the guest's browser.
 */
export type GuestDayView = {
  key: DayKey;
  name: string;
  blurb: string;
  /** Names on this invitation who are invited to this day. */
  invitedNames: string[];
  /** Somebody on the invitation has said yes to this day. */
  attending: boolean;
  date: string | null;
  startTime: string;
  location: { venueName: string; address: string; mapUrl: string | null } | null;
  schedule: ScheduleItem[];
};
