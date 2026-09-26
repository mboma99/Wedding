import { PageHeader } from "@/components/shared/page-header";
import { DAY_KEYS } from "@/domain/days";
import { DayEditor } from "@/features/days/components/day-editor";
import { LobolaGuests } from "@/features/days/components/lobola-guests";
import { getLobolaGuests, getWeddingDays } from "@/server/days";

export async function DaysPage() {
  const [days, guests] = await Promise.all([getWeddingDays(), getLobolaGuests()]);
  const lobolaCount = guests.filter((guest) => guest.invited).length;

  return (
    <main className="container space-y-6 py-6 sm:space-y-8 sm:py-10">
      <PageHeader
        meta="Set each day's details and plan, choose when guests can see the date and location, and pick who's invited to the Rora."
        title="Wedding days"
      />
      <section className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        {DAY_KEYS.map((key) => (
          <DayEditor dayKey={key} initialDay={days[key]} invitedCount={lobolaCount} key={key} />
        ))}
      </section>
      <LobolaGuests initialGuests={guests} />
    </main>
  );
}
