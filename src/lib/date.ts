const DAY_IN_MS = 24 * 60 * 60 * 1000;

function getTimeZoneDateParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return { year, month, day };
}

export function getDaysSinceDate({
  from,
  now = new Date(),
  timeZone,
}: {
  from: { year: number; month: number; day: number };
  now?: Date;
  timeZone: string;
}) {
  const today = getTimeZoneDateParts(now, timeZone);
  const startUtc = Date.UTC(from.year, from.month - 1, from.day);
  const todayUtc = Date.UTC(today.year, today.month - 1, today.day);

  return Math.max(0, Math.floor((todayUtc - startUtc) / DAY_IN_MS));
}
