import { CalendarDays, Clock, MapPin } from "lucide-react";

import { formatDayDate, formatTime, type GuestDayView } from "@/domain/days";

/**
 * Everything a guest needs for each day they're invited to: when, where and
 * the plan. Details only arrive here once revealed and once they've said yes.
 */
export function YourDays({ days, isHousehold }: { days: GuestDayView[]; isHousehold: boolean }) {
  if (!days.length) return null;

  return (
    <section aria-labelledby="days-heading" className="relative mt-12 border-t border-primary/10 pt-10 text-left">
      <div className="mb-8 text-center">
        <h2 className="font-serif text-3xl text-primary" id="days-heading">
          {days.length > 1 ? "Your days" : "The day"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {days.length > 1
            ? "You're invited to both days of the wedding."
            : "Everything you need for the day, in one place."}
        </p>
      </div>

      <div className="space-y-5">
        {days.map((day) => (
          <DayCard day={day} key={day.key} showNames={isHousehold} />
        ))}
      </div>
    </section>
  );
}

function DayCard({ day, showNames }: { day: GuestDayView; showNames: boolean }) {
  const pending = day.attending && (!day.date || !day.location);

  return (
    <article className="rounded-lg border border-primary/15 bg-white/70 px-5 py-5 sm:px-6">
      <header className="space-y-1">
        <h3 className="font-serif text-2xl text-primary">{day.name}</h3>
        <p className="text-sm text-muted-foreground">
          {day.blurb}
          {showNames ? ` For ${joinNames(day.invitedNames)}.` : ""}
        </p>
      </header>

      {!day.attending ? (
        <p className="mt-4 rounded-md bg-[#efe7da] px-4 py-3 text-sm text-primary">
          The date, place and plan are shared with guests who say they&apos;re coming.
        </p>
      ) : (
        <div className="mt-5 space-y-5">
          <dl className="space-y-3 text-sm">
            <div className="flex gap-3">
              <CalendarDays aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <dt className="sr-only">When</dt>
                <dd className="text-primary">
                  {day.date ? (
                    <>
                      <span className="font-semibold">{formatDayDate(day.date)}</span>
                      {day.startTime ? ` from ${formatTime(day.startTime)}` : ""}
                    </>
                  ) : (
                    <span className="text-muted-foreground">Date coming soon</span>
                  )}
                </dd>
              </div>
            </div>
            <div className="flex gap-3">
              <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <dt className="sr-only">Where</dt>
                <dd className="space-y-0.5 text-primary">
                  {day.location ? (
                    <>
                      {day.location.venueName ? <p className="font-semibold">{day.location.venueName}</p> : null}
                      {day.location.address ? <p>{day.location.address}</p> : null}
                      {day.location.mapUrl ? (
                        <a
                          className="inline-block pt-1 font-medium underline underline-offset-4"
                          href={day.location.mapUrl}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          Open in maps
                        </a>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-muted-foreground">Location coming soon</span>
                  )}
                </dd>
              </div>
            </div>
          </dl>

          {day.schedule.length ? (
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
                <Clock aria-hidden className="h-4 w-4" />
                Plan for the day
              </p>
              <ol className="relative space-y-3 border-l border-primary/15 pl-5">
                {day.schedule.map((item) => (
                  <li className="relative text-sm" key={item.id}>
                    <span aria-hidden className="absolute -left-[1.4rem] top-1.5 h-2 w-2 rounded-full bg-primary" />
                    {item.time ? <span className="mr-2 font-semibold tabular-nums text-primary">{formatTime(item.time)}</span> : null}
                    <span className="text-primary">{item.title}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {pending ? (
            <p className="text-xs text-muted-foreground">We&apos;ll add the rest here as soon as it&apos;s confirmed.</p>
          ) : null}
        </div>
      )}
    </article>
  );
}

function joinNames(names: string[]) {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
